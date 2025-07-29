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
exports.OrderItemsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_item_entity_1 = require("./entities/order-item.entity");
const user_entity_1 = require("../users/entities/user.entity");
const order_item_status_enum_1 = require("../common/enums/order-item-status.enum");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const exceptions_1 = require("./exceptions");
const orders_gateway_1 = require("../websocket/orders.gateway");
let OrderItemsService = class OrderItemsService {
    orderItemRepository;
    userRepository;
    ordersGateway;
    constructor(orderItemRepository, userRepository, ordersGateway) {
        this.orderItemRepository = orderItemRepository;
        this.userRepository = userRepository;
        this.ordersGateway = ordersGateway;
    }
    async findAll() {
        return this.orderItemRepository.find({
            relations: ['order', 'order.table', 'menuItem', 'statusUpdatedBy'],
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const orderItem = await this.orderItemRepository.findOne({
            where: { id },
            relations: ['order', 'order.table', 'order.waiter', 'menuItem', 'statusUpdatedBy'],
        });
        if (!orderItem) {
            throw new exceptions_1.OrderItemNotFoundException(id);
        }
        return orderItem;
    }
    async findByStatus(status) {
        return this.orderItemRepository.find({
            where: { status },
            relations: ['order', 'order.table', 'menuItem', 'statusUpdatedBy'],
            order: { createdAt: 'ASC' },
        });
    }
    async findPendingForKitchen() {
        return this.orderItemRepository.find({
            where: [
                { status: order_item_status_enum_1.OrderItemStatus.PENDING },
                { status: order_item_status_enum_1.OrderItemStatus.IN_PREPARATION }
            ],
            relations: ['order', 'order.table', 'menuItem'],
            order: { createdAt: 'ASC' },
        });
    }
    async findReadyForDelivery() {
        return this.orderItemRepository.find({
            where: { status: order_item_status_enum_1.OrderItemStatus.READY },
            relations: ['order', 'order.table', 'menuItem', 'statusUpdatedBy'],
            order: { updatedAt: 'ASC' },
        });
    }
    async updateStatus(id, updateStatusDto) {
        const { status, updatedBy } = updateStatusDto;
        const orderItem = await this.findOne(id);
        const user = await this.userRepository.findOne({
            where: { id: updatedBy }
        });
        if (!user) {
            throw new common_1.BadRequestException(`Usuário ${updatedBy} não encontrado`);
        }
        this.validateUserPermission(user.role, status);
        if (!orderItem.canUpdateStatus(status)) {
            throw new exceptions_1.InvalidStatusTransitionException(orderItem.status, status);
        }
        orderItem.status = status;
        orderItem.statusUpdatedById = updatedBy;
        await this.orderItemRepository.save(orderItem);
        const updatedOrderItem = await this.findOne(id);
        this.ordersGateway.notifyOrderItemStatusUpdate(updatedOrderItem);
        if (updatedOrderItem.order?.table) {
            this.ordersGateway.notifyTableOrderUpdate(updatedOrderItem.order.table.id, {
                orderId: updatedOrderItem.order.id,
                totalAmount: updatedOrderItem.order.totalAmount,
                itemsCount: updatedOrderItem.order.items?.length || 0,
                waiterName: updatedOrderItem.order.waiter?.name,
                status: updatedOrderItem.order.status,
                itemStatusUpdate: {
                    itemId: updatedOrderItem.id,
                    newStatus: status,
                    menuItemName: updatedOrderItem.menuItem?.name,
                },
            });
        }
        return updatedOrderItem;
    }
    async markAsInPreparation(id, userId) {
        return this.updateStatus(id, {
            status: order_item_status_enum_1.OrderItemStatus.IN_PREPARATION,
            updatedBy: userId
        });
    }
    async markAsReady(id, userId) {
        return this.updateStatus(id, {
            status: order_item_status_enum_1.OrderItemStatus.READY,
            updatedBy: userId
        });
    }
    async markAsDelivered(id, userId) {
        return this.updateStatus(id, {
            status: order_item_status_enum_1.OrderItemStatus.DELIVERED,
            updatedBy: userId
        });
    }
    async cancelItem(id, userId) {
        return this.updateStatus(id, {
            status: order_item_status_enum_1.OrderItemStatus.CANCELLED,
            updatedBy: userId
        });
    }
    async getStatusHistory(id) {
        const orderItem = await this.findOne(id);
        return [orderItem];
    }
    async getStatusStatistics() {
        const statistics = await this.orderItemRepository
            .createQueryBuilder('orderItem')
            .select('orderItem.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('orderItem.status')
            .getRawMany();
        const result = {
            [order_item_status_enum_1.OrderItemStatus.PENDING]: 0,
            [order_item_status_enum_1.OrderItemStatus.IN_PREPARATION]: 0,
            [order_item_status_enum_1.OrderItemStatus.READY]: 0,
            [order_item_status_enum_1.OrderItemStatus.DELIVERED]: 0,
            [order_item_status_enum_1.OrderItemStatus.CANCELLED]: 0,
        };
        statistics.forEach(stat => {
            result[stat.status] = parseInt(stat.count);
        });
        return result;
    }
    validateUserPermission(userRole, newStatus) {
        const permissions = {
            [user_role_enum_1.UserRole.ADMIN]: [
                order_item_status_enum_1.OrderItemStatus.PENDING,
                order_item_status_enum_1.OrderItemStatus.IN_PREPARATION,
                order_item_status_enum_1.OrderItemStatus.READY,
                order_item_status_enum_1.OrderItemStatus.DELIVERED,
                order_item_status_enum_1.OrderItemStatus.CANCELLED
            ],
            [user_role_enum_1.UserRole.WAITER]: [
                order_item_status_enum_1.OrderItemStatus.DELIVERED,
                order_item_status_enum_1.OrderItemStatus.CANCELLED
            ],
            [user_role_enum_1.UserRole.KITCHEN]: [
                order_item_status_enum_1.OrderItemStatus.IN_PREPARATION,
                order_item_status_enum_1.OrderItemStatus.READY,
                order_item_status_enum_1.OrderItemStatus.CANCELLED
            ]
        };
        const allowedStatuses = permissions[userRole] || [];
        if (!allowedStatuses.includes(newStatus)) {
            throw new exceptions_1.UnauthorizedStatusUpdateException(userRole, newStatus);
        }
    }
    async findByOrder(orderId) {
        return this.orderItemRepository.find({
            where: { orderId },
            relations: ['menuItem', 'statusUpdatedBy'],
            order: { createdAt: 'ASC' },
        });
    }
    async countByStatusForOrder(orderId) {
        const statistics = await this.orderItemRepository
            .createQueryBuilder('orderItem')
            .select('orderItem.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('orderItem.orderId = :orderId', { orderId })
            .groupBy('orderItem.status')
            .getRawMany();
        const result = {
            [order_item_status_enum_1.OrderItemStatus.PENDING]: 0,
            [order_item_status_enum_1.OrderItemStatus.IN_PREPARATION]: 0,
            [order_item_status_enum_1.OrderItemStatus.READY]: 0,
            [order_item_status_enum_1.OrderItemStatus.DELIVERED]: 0,
            [order_item_status_enum_1.OrderItemStatus.CANCELLED]: 0,
        };
        statistics.forEach(stat => {
            result[stat.status] = parseInt(stat.count);
        });
        return result;
    }
    async areAllItemsReadyForOrder(orderId) {
        const items = await this.findByOrder(orderId);
        if (items.length === 0) {
            return false;
        }
        return items.every(item => item.status === order_item_status_enum_1.OrderItemStatus.DELIVERED ||
            item.status === order_item_status_enum_1.OrderItemStatus.CANCELLED);
    }
    async hasPendingItemsForOrder(orderId) {
        const count = await this.orderItemRepository.count({
            where: [
                { orderId, status: order_item_status_enum_1.OrderItemStatus.PENDING },
                { orderId, status: order_item_status_enum_1.OrderItemStatus.IN_PREPARATION }
            ]
        });
        return count > 0;
    }
};
exports.OrderItemsService = OrderItemsService;
exports.OrderItemsService = OrderItemsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => orders_gateway_1.OrdersGateway))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        orders_gateway_1.OrdersGateway])
], OrderItemsService);
//# sourceMappingURL=order-items.service.js.map