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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("./entities/order.entity");
const order_item_entity_1 = require("../order-items/entities/order-item.entity");
const table_entity_1 = require("../tables/entities/table.entity");
const menu_item_entity_1 = require("../menu/entities/menu-item.entity");
const order_status_enum_1 = require("../common/enums/order-status.enum");
const order_item_status_enum_1 = require("../common/enums/order-item-status.enum");
const table_status_enum_1 = require("../common/enums/table-status.enum");
const exceptions_1 = require("./exceptions");
const orders_gateway_1 = require("../websocket/orders.gateway");
let OrdersService = class OrdersService {
    orderRepository;
    orderItemRepository;
    tableRepository;
    menuItemRepository;
    ordersGateway;
    constructor(orderRepository, orderItemRepository, tableRepository, menuItemRepository, ordersGateway) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.tableRepository = tableRepository;
        this.menuItemRepository = menuItemRepository;
        this.ordersGateway = ordersGateway;
    }
    async create(createOrderDto, waiterId) {
        const { tableId, items = [] } = createOrderDto;
        const table = await this.tableRepository.findOne({
            where: { id: tableId }
        });
        if (!table) {
            throw new common_1.NotFoundException(`Mesa ${tableId} não encontrada`);
        }
        await this.validateTableAvailability(tableId);
        const order = this.orderRepository.create({
            tableId,
            waiterId,
            status: order_status_enum_1.OrderStatus.OPEN,
            totalAmount: 0,
        });
        const savedOrder = await this.orderRepository.save(order);
        if (items.length > 0) {
            for (const itemDto of items) {
                await this.addItemToOrder(savedOrder.id, itemDto);
            }
        }
        await this.tableRepository.update(tableId, {
            status: table_status_enum_1.TableStatus.OCCUPIED
        });
        const completeOrder = await this.findOne(savedOrder.id);
        const updatedTable = await this.tableRepository.findOne({ where: { id: tableId } });
        if (updatedTable) {
            this.ordersGateway.notifyTableStatusUpdate(updatedTable);
        }
        this.ordersGateway.notifyTableOrderUpdate(tableId, {
            orderId: completeOrder.id,
            totalAmount: completeOrder.totalAmount,
            itemsCount: completeOrder.items?.length || 0,
            waiterName: completeOrder.waiter.name,
            status: completeOrder.status,
        });
        if (items.length > 0) {
            this.ordersGateway.notifyNewOrder(completeOrder);
        }
        return completeOrder;
    }
    async findAll() {
        return this.orderRepository.find({
            relations: ['table', 'waiter', 'items', 'items.menuItem'],
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['table', 'waiter', 'items', 'items.menuItem', 'items.statusUpdatedBy'],
        });
        if (!order) {
            throw new exceptions_1.OrderNotFoundException(id);
        }
        return order;
    }
    async findByTable(tableId) {
        return this.orderRepository.find({
            where: { tableId, status: order_status_enum_1.OrderStatus.OPEN },
            relations: ['table', 'waiter', 'items', 'items.menuItem', 'items.statusUpdatedBy'],
            order: { createdAt: 'DESC' },
        });
    }
    async findActiveOrderByTable(tableId) {
        return this.orderRepository.findOne({
            where: { tableId, status: order_status_enum_1.OrderStatus.OPEN },
            relations: ['table', 'waiter', 'items', 'items.menuItem', 'items.statusUpdatedBy'],
        });
    }
    async addItemToOrder(orderId, addItemDto) {
        const { menuItemId, quantity, specialInstructions } = addItemDto;
        const order = await this.findOne(orderId);
        if (order.status !== order_status_enum_1.OrderStatus.OPEN) {
            throw new common_1.BadRequestException('Não é possível adicionar itens a uma comanda fechada');
        }
        const menuItem = await this.menuItemRepository.findOne({
            where: { id: menuItemId }
        });
        if (!menuItem) {
            throw new common_1.NotFoundException(`Item do menu ${menuItemId} não encontrado`);
        }
        if (!menuItem.isAvailable) {
            throw new exceptions_1.MenuItemNotAvailableException(menuItem.name);
        }
        const orderItem = this.orderItemRepository.create({
            orderId,
            menuItemId,
            quantity,
            unitPrice: menuItem.price,
            specialInstructions,
            status: order_item_status_enum_1.OrderItemStatus.PENDING,
        });
        await this.orderItemRepository.save(orderItem);
        await this.updateOrderTotal(orderId);
        const updatedOrder = await this.findOne(orderId);
        this.ordersGateway.notifyNewOrder(updatedOrder);
        this.ordersGateway.notifyTableOrderUpdate(updatedOrder.table.id, {
            orderId: updatedOrder.id,
            totalAmount: updatedOrder.totalAmount,
            itemsCount: updatedOrder.items?.length || 0,
            waiterName: updatedOrder.waiter.name,
            status: updatedOrder.status,
        });
        return updatedOrder;
    }
    async removeItemFromOrder(orderId, itemId) {
        const order = await this.findOne(orderId);
        if (order.status !== order_status_enum_1.OrderStatus.OPEN) {
            throw new common_1.BadRequestException('Não é possível remover itens de uma comanda fechada');
        }
        const orderItem = await this.orderItemRepository.findOne({
            where: { id: itemId, orderId }
        });
        if (!orderItem) {
            throw new common_1.NotFoundException(`Item ${itemId} não encontrado na comanda`);
        }
        if (orderItem.status !== order_item_status_enum_1.OrderItemStatus.PENDING) {
            throw new common_1.BadRequestException('Não é possível remover itens que já foram enviados para a cozinha. Use cancelamento.');
        }
        await this.orderItemRepository.remove(orderItem);
        await this.updateOrderTotal(orderId);
        return this.findOne(orderId);
    }
    async updateItemQuantity(orderId, itemId, newQuantity) {
        if (newQuantity < 1) {
            throw new common_1.BadRequestException('Quantidade deve ser maior que 0');
        }
        const order = await this.findOne(orderId);
        if (order.status !== order_status_enum_1.OrderStatus.OPEN) {
            throw new common_1.BadRequestException('Não é possível modificar itens de uma comanda fechada');
        }
        const orderItem = await this.orderItemRepository.findOne({
            where: { id: itemId, orderId }
        });
        if (!orderItem) {
            throw new common_1.NotFoundException(`Item ${itemId} não encontrado na comanda`);
        }
        if (orderItem.status !== order_item_status_enum_1.OrderItemStatus.PENDING) {
            throw new common_1.BadRequestException('Não é possível modificar itens que já foram enviados para a cozinha');
        }
        orderItem.quantity = newQuantity;
        await this.orderItemRepository.save(orderItem);
        await this.updateOrderTotal(orderId);
        return this.findOne(orderId);
    }
    async update(id, updateOrderDto) {
        const order = await this.findOne(id);
        if (order.status !== order_status_enum_1.OrderStatus.OPEN) {
            throw new common_1.BadRequestException('Não é possível atualizar uma comanda fechada');
        }
        await this.orderRepository.update(id, updateOrderDto);
        return this.findOne(id);
    }
    async closeOrder(id) {
        const order = await this.findOne(id);
        if (order.status !== order_status_enum_1.OrderStatus.OPEN) {
            throw new common_1.BadRequestException('Comanda já está fechada');
        }
        this.validateNoPendingItems(order);
        const totals = this.calculateOrderTotals(order);
        const summary = this.generateOrderSummary(order, totals);
        order.status = order_status_enum_1.OrderStatus.CLOSED;
        order.closedAt = new Date();
        order.totalAmount = totals.finalTotal;
        await this.orderRepository.save(order);
        await this.tableRepository.update(order.tableId, {
            status: table_status_enum_1.TableStatus.AVAILABLE
        });
        const updatedOrder = await this.findOne(id);
        this.ordersGateway.notifyOrderClosed(updatedOrder);
        const updatedTable = await this.tableRepository.findOne({ where: { id: order.tableId } });
        if (updatedTable) {
            this.ordersGateway.notifyTableStatusUpdate(updatedTable);
        }
        this.ordersGateway.notifyTableOrderUpdate(order.tableId, {
            orderId: null,
            totalAmount: 0,
            itemsCount: 0,
            waiterName: null,
            status: 'closed',
        });
        return { order: updatedOrder, summary };
    }
    validateNoPendingItems(order) {
        const pendingItems = order.items.filter(item => item.status === order_item_status_enum_1.OrderItemStatus.PENDING ||
            item.status === order_item_status_enum_1.OrderItemStatus.IN_PREPARATION);
        if (pendingItems.length > 0) {
            const pendingItemNames = pendingItems.map(item => item.menuItem.name);
            throw new common_1.BadRequestException(`Não é possível fechar a comanda. Existem ${pendingItems.length} item(ns) pendente(s) na cozinha: ${pendingItemNames.join(', ')}`);
        }
    }
    calculateOrderTotals(order) {
        const subtotal = order.items.reduce((total, item) => {
            return total + item.getSubtotal();
        }, 0);
        const serviceChargeRate = 0.10;
        const taxRate = 0.08;
        const serviceCharge = subtotal * serviceChargeRate;
        const taxAmount = subtotal * taxRate;
        const finalTotal = subtotal + serviceCharge + taxAmount;
        return {
            subtotal: Number(subtotal.toFixed(2)),
            serviceCharge: Number(serviceCharge.toFixed(2)),
            taxAmount: Number(taxAmount.toFixed(2)),
            finalTotal: Number(finalTotal.toFixed(2)),
            serviceChargeRate,
            taxRate,
        };
    }
    generateOrderSummary(order, totals) {
        const itemsSummary = order.items.map(item => ({
            id: item.id,
            name: item.menuItem.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.getSubtotal(),
            specialInstructions: item.specialInstructions,
            status: item.status,
        }));
        return {
            orderId: order.id,
            tableNumber: order.table.number,
            waiterName: order.waiter.name,
            openedAt: order.createdAt,
            closedAt: order.closedAt,
            items: itemsSummary,
            totals,
            totalItems: order.items.length,
            totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
        };
    }
    async archiveOrder(orderId) {
        const order = await this.findOne(orderId);
        if (order.status !== order_status_enum_1.OrderStatus.CLOSED) {
            throw new common_1.BadRequestException('Apenas comandas fechadas podem ser arquivadas');
        }
        console.log(`Comanda ${orderId} arquivada em ${new Date().toISOString()}`);
    }
    async cancelOrder(id) {
        const order = await this.findOne(id);
        if (order.status !== order_status_enum_1.OrderStatus.OPEN) {
            throw new common_1.BadRequestException('Apenas comandas abertas podem ser canceladas');
        }
        for (const item of order.items) {
            if (item.canBeCancelled()) {
                item.status = order_item_status_enum_1.OrderItemStatus.CANCELLED;
                await this.orderItemRepository.save(item);
            }
        }
        order.status = order_status_enum_1.OrderStatus.CANCELLED;
        order.closedAt = new Date();
        await this.orderRepository.save(order);
        await this.tableRepository.update(order.tableId, {
            status: table_status_enum_1.TableStatus.AVAILABLE
        });
        const updatedOrder = await this.findOne(id);
        const updatedTable = await this.tableRepository.findOne({ where: { id: order.tableId } });
        if (updatedTable) {
            this.ordersGateway.notifyTableStatusUpdate(updatedTable);
        }
        return updatedOrder;
    }
    async remove(id) {
        const order = await this.findOne(id);
        await this.orderRepository.remove(order);
    }
    async validateTableAvailability(tableId) {
        const existingOrder = await this.orderRepository.findOne({
            where: { tableId, status: order_status_enum_1.OrderStatus.OPEN },
        });
        if (existingOrder) {
            const table = await this.tableRepository.findOne({
                where: { id: tableId }
            });
            throw new exceptions_1.TableOccupiedException(table?.number || tableId);
        }
    }
    async updateOrderTotal(orderId) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items'],
        });
        if (order) {
            order.updateTotal();
            await this.orderRepository.save(order);
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __param(2, (0, typeorm_1.InjectRepository)(table_entity_1.Table)),
    __param(3, (0, typeorm_1.InjectRepository)(menu_item_entity_1.MenuItem)),
    __param(4, (0, common_1.Inject)((0, common_1.forwardRef)(() => orders_gateway_1.OrdersGateway))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        orders_gateway_1.OrdersGateway])
], OrdersService);
//# sourceMappingURL=orders.service.js.map