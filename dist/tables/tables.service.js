"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TablesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const table_entity_1 = require("./entities/table.entity");
const table_status_enum_1 = require("../common/enums/table-status.enum");
const order_item_status_enum_1 = require("../common/enums/order-item-status.enum");
const order_status_enum_1 = require("../common/enums/order-status.enum");
const order_entity_1 = require("../orders/entities/order.entity");
const orders_gateway_1 = require("../websocket/orders.gateway");
let TablesService = class TablesService {
    tableRepository;
    orderRepository;
    ordersGateway;
    constructor(tableRepository, orderRepository, ordersGateway) {
        this.tableRepository = tableRepository;
        this.orderRepository = orderRepository;
        this.ordersGateway = ordersGateway;
    }
    async create(createTableDto) {
        const existingTable = await this.tableRepository.findOne({
            where: { number: createTableDto.number },
        });
        if (existingTable) {
            throw new common_1.ConflictException(`Mesa número ${createTableDto.number} já existe`);
        }
        const table = this.tableRepository.create({
            ...createTableDto,
            capacity: createTableDto.capacity || 4,
        });
        return await this.tableRepository.save(table);
    }
    async findAll() {
        return await this.tableRepository.find({
            order: { number: 'ASC' },
        });
    }
    async findOne(id) {
        const table = await this.tableRepository.findOne({
            where: { id },
        });
        if (!table) {
            throw new common_1.NotFoundException(`Mesa com ID ${id} não encontrada`);
        }
        return table;
    }
    async findByNumber(number) {
        const table = await this.tableRepository.findOne({
            where: { number },
        });
        if (!table) {
            throw new common_1.NotFoundException(`Mesa número ${number} não encontrada`);
        }
        return table;
    }
    async update(id, updateTableDto) {
        const table = await this.findOne(id);
        if (updateTableDto.number && updateTableDto.number !== table.number) {
            const existingTable = await this.tableRepository.findOne({
                where: { number: updateTableDto.number },
            });
            if (existingTable) {
                throw new common_1.ConflictException(`Mesa número ${updateTableDto.number} já existe`);
            }
        }
        Object.assign(table, updateTableDto);
        return await this.tableRepository.save(table);
    }
    async updateStatus(id, updateStatusDto) {
        const table = await this.findOne(id);
        table.status = updateStatusDto.status;
        const updatedTable = await this.tableRepository.save(table);
        this.ordersGateway.notifyTableStatusUpdate(updatedTable);
        return updatedTable;
    }
    async remove(id) {
        const table = await this.findOne(id);
        if (table.status === table_status_enum_1.TableStatus.OCCUPIED) {
            throw new common_1.ConflictException('Não é possível remover uma mesa ocupada');
        }
        await this.tableRepository.remove(table);
    }
    async findAvailable() {
        return await this.tableRepository.find({
            where: { status: table_status_enum_1.TableStatus.AVAILABLE },
            order: { number: 'ASC' },
        });
    }
    async findOccupied() {
        return await this.tableRepository.find({
            where: { status: table_status_enum_1.TableStatus.OCCUPIED },
            order: { number: 'ASC' },
        });
    }
    async checkAvailability(id) {
        const table = await this.findOne(id);
        return table.status === table_status_enum_1.TableStatus.AVAILABLE;
    }
    async getTablesSummary() {
        const [total, available, occupied, reserved, cleaning] = await Promise.all([
            this.tableRepository.count(),
            this.tableRepository.count({ where: { status: table_status_enum_1.TableStatus.AVAILABLE } }),
            this.tableRepository.count({ where: { status: table_status_enum_1.TableStatus.OCCUPIED } }),
            this.tableRepository.count({ where: { status: table_status_enum_1.TableStatus.RESERVED } }),
            this.tableRepository.count({ where: { status: table_status_enum_1.TableStatus.CLEANING } }),
        ]);
        return {
            total,
            available,
            occupied,
            reserved,
            cleaning,
        };
    }
    async getTablesOverview(query = {}) {
        const { status, hasPendingOrders, sortBy = 'number', sortOrder = 'ASC', includeOrderDetails = false, } = query;
        let tablesQuery = this.tableRepository
            .createQueryBuilder('table')
            .leftJoinAndSelect('table.orders', 'order', 'order.status = :orderStatus', {
            orderStatus: order_status_enum_1.OrderStatus.OPEN
        })
            .leftJoinAndSelect('order.waiter', 'waiter')
            .leftJoinAndSelect('order.items', 'orderItem')
            .leftJoinAndSelect('orderItem.menuItem', 'menuItem');
        if (status) {
            tablesQuery = tablesQuery.where('table.status = :status', { status });
        }
        const tables = await tablesQuery.getMany();
        let tablesOverview = tables.map(table => this.transformToTableOverview(table, includeOrderDetails));
        if (hasPendingOrders !== undefined) {
            tablesOverview = tablesOverview.filter(table => table.hasPendingOrders === hasPendingOrders);
        }
        tablesOverview = this.sortTablesOverview(tablesOverview, sortBy, sortOrder);
        return tablesOverview;
    }
    transformToTableOverview(table, includeOrderDetails) {
        const activeOrder = table.orders?.[0];
        let pendingItems = 0;
        let itemsInPreparation = 0;
        let readyItems = 0;
        let totalItems = 0;
        let pendingOrderItems = [];
        let orderDurationMinutes = 0;
        if (activeOrder) {
            totalItems = activeOrder.items?.length || 0;
            activeOrder.items?.forEach(item => {
                switch (item.status) {
                    case order_item_status_enum_1.OrderItemStatus.PENDING:
                        pendingItems++;
                        break;
                    case order_item_status_enum_1.OrderItemStatus.IN_PREPARATION:
                        itemsInPreparation++;
                        break;
                    case order_item_status_enum_1.OrderItemStatus.READY:
                        readyItems++;
                        break;
                }
            });
            if (activeOrder.createdAt) {
                const now = new Date();
                orderDurationMinutes = Math.floor((now.getTime() - activeOrder.createdAt.getTime()) / (1000 * 60));
            }
            if (includeOrderDetails) {
                pendingOrderItems = activeOrder.items
                    ?.filter(item => item.status === order_item_status_enum_1.OrderItemStatus.PENDING ||
                    item.status === order_item_status_enum_1.OrderItemStatus.IN_PREPARATION ||
                    item.status === order_item_status_enum_1.OrderItemStatus.READY)
                    .map(item => ({
                    id: item.id,
                    menuItemName: item.menuItem?.name || 'Item não encontrado',
                    quantity: item.quantity,
                    status: item.status,
                    specialInstructions: item.specialInstructions,
                    createdAt: item.createdAt,
                    estimatedPreparationTime: item.menuItem?.preparationTime,
                })) || [];
            }
        }
        const hasPendingOrders = pendingItems > 0 || itemsInPreparation > 0 || readyItems > 0;
        const priority = this.calculateTablePriority(orderDurationMinutes, pendingItems, itemsInPreparation);
        return {
            id: table.id,
            number: table.number,
            capacity: table.capacity,
            status: table.status,
            activeOrderId: activeOrder?.id,
            waiterName: activeOrder?.waiter?.name,
            orderTotal: activeOrder?.totalAmount ? Number(activeOrder.totalAmount) : undefined,
            totalItems: totalItems > 0 ? totalItems : undefined,
            pendingItems: pendingItems > 0 ? pendingItems : undefined,
            itemsInPreparation: itemsInPreparation > 0 ? itemsInPreparation : undefined,
            readyItems: readyItems > 0 ? readyItems : undefined,
            pendingOrderItems: includeOrderDetails ? pendingOrderItems : undefined,
            orderOpenedAt: activeOrder?.createdAt,
            orderDurationMinutes: orderDurationMinutes > 0 ? orderDurationMinutes : undefined,
            hasPendingOrders,
            priority,
        };
    }
    calculateTablePriority(orderDurationMinutes, pendingItems, itemsInPreparation) {
        if (pendingItems === 0 && itemsInPreparation === 0) {
            return 'low';
        }
        if (pendingItems >= 5 || itemsInPreparation >= 3 || orderDurationMinutes >= 60) {
            return 'high';
        }
        if (pendingItems >= 2 || itemsInPreparation >= 1 || orderDurationMinutes >= 30) {
            return 'medium';
        }
        return 'low';
    }
    sortTablesOverview(tables, sortBy, sortOrder) {
        return tables.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'number':
                    comparison = a.number - b.number;
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
                case 'orderDuration':
                    const aDuration = a.orderDurationMinutes || 0;
                    const bDuration = b.orderDurationMinutes || 0;
                    comparison = aDuration - bDuration;
                    break;
                case 'pendingItems':
                    const aPending = a.pendingItems || 0;
                    const bPending = b.pendingItems || 0;
                    comparison = aPending - bPending;
                    break;
                default:
                    comparison = a.number - b.number;
            }
            return sortOrder === 'DESC' ? -comparison : comparison;
        });
    }
};
exports.TablesService = TablesService;
exports.TablesService = TablesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(table_entity_1.Table)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => orders_gateway_1.OrdersGateway))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        orders_gateway_1.OrdersGateway])
], TablesService);
//# sourceMappingURL=tables.service.js.map