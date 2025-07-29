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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("./orders.service");
const order_items_service_1 = require("../order-items/order-items.service");
const dto_1 = require("./dto");
const dto_2 = require("../order-items/dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const order_item_status_enum_1 = require("../common/enums/order-item-status.enum");
let OrdersController = class OrdersController {
    ordersService;
    orderItemsService;
    constructor(ordersService, orderItemsService) {
        this.ordersService = ordersService;
        this.orderItemsService = orderItemsService;
    }
    async create(createOrderDto, req) {
        return this.ordersService.create(createOrderDto, req.user.sub);
    }
    async findAll() {
        return this.ordersService.findAll();
    }
    async findOne(id) {
        return this.ordersService.findOne(id);
    }
    async findByTable(tableId) {
        return this.ordersService.findByTable(tableId);
    }
    async findActiveOrderByTable(tableId) {
        return this.ordersService.findActiveOrderByTable(tableId);
    }
    async update(id, updateOrderDto) {
        return this.ordersService.update(id, updateOrderDto);
    }
    async addItem(id, addItemDto) {
        return this.ordersService.addItemToOrder(id, addItemDto);
    }
    async removeItem(id, itemId) {
        return this.ordersService.removeItemFromOrder(id, itemId);
    }
    async updateItemQuantity(id, itemId, quantity) {
        return this.ordersService.updateItemQuantity(id, itemId, quantity);
    }
    async closeOrder(id, req) {
        const logger = new common_1.Logger('OrdersController');
        const userRole = req.user.role;
        const userId = req.user.sub;
        if (userRole !== user_role_enum_1.UserRole.ADMIN && userRole !== user_role_enum_1.UserRole.WAITER) {
            logger.warn(`Tentativa de fechamento de comanda por usuário não autorizado: ${userId} (${userRole})`);
            throw new common_1.ForbiddenException('Usuário não tem permissão para fechar comandas');
        }
        try {
            const result = await this.ordersService.closeOrder(id);
            const auditInfo = {
                orderId: id,
                userId,
                userRole,
                tableNumber: result.order.table.number,
                finalAmount: result.summary.totals.finalTotal,
                timestamp: new Date().toISOString(),
            };
            logger.log(`Comanda fechada com sucesso: ${JSON.stringify(auditInfo)}`);
            return {
                message: 'Comanda fechada com sucesso',
                order: result.order,
                summary: result.summary,
                closedBy: {
                    userId,
                    role: userRole,
                    timestamp: auditInfo.timestamp,
                },
            };
        }
        catch (error) {
            logger.error(`Erro ao fechar comanda ${id}: ${error.message}`, error.stack);
            throw error;
        }
    }
    async cancelOrder(id) {
        return this.ordersService.cancelOrder(id);
    }
    async remove(id) {
        return this.ordersService.remove(id);
    }
    async findAllItems() {
        return this.orderItemsService.findAll();
    }
    async findItemsByStatus(status) {
        return this.orderItemsService.findByStatus(status);
    }
    async findPendingForKitchen() {
        return this.orderItemsService.findPendingForKitchen();
    }
    async findReadyForDelivery() {
        return this.orderItemsService.findReadyForDelivery();
    }
    async findOneItem(itemId) {
        return this.orderItemsService.findOne(itemId);
    }
    async updateItemStatus(itemId, updateStatusDto, req) {
        const dto = { ...updateStatusDto, updatedBy: req.user.sub };
        return this.orderItemsService.updateStatus(itemId, dto);
    }
    async startPreparation(itemId, req) {
        return this.orderItemsService.markAsInPreparation(itemId, req.user.sub);
    }
    async markReady(itemId, req) {
        return this.orderItemsService.markAsReady(itemId, req.user.sub);
    }
    async markDelivered(itemId, req) {
        return this.orderItemsService.markAsDelivered(itemId, req.user.sub);
    }
    async cancelItem(itemId, req) {
        return this.orderItemsService.cancelItem(itemId, req.user.sub);
    }
    async getStatusStatistics() {
        return this.orderItemsService.getStatusStatistics();
    }
    async findOrderItems(id) {
        return this.orderItemsService.findByOrder(id);
    }
    async countItemsByStatus(id) {
        return this.orderItemsService.countByStatusForOrder(id);
    }
    async areAllItemsReady(id) {
        const allReady = await this.orderItemsService.areAllItemsReadyForOrder(id);
        return { allReady };
    }
    async hasPendingItems(id) {
        const hasPending = await this.orderItemsService.hasPendingItemsForOrder(id);
        return { hasPending };
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateOrderDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('table/:tableId'),
    __param(0, (0, common_1.Param)('tableId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findByTable", null);
__decorate([
    (0, common_1.Get)('table/:tableId/active'),
    __param(0, (0, common_1.Param)('tableId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findActiveOrderByTable", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/items'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AddItemToOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "addItem", null);
__decorate([
    (0, common_1.Delete)(':id/items/:itemId'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "removeItem", null);
__decorate([
    (0, common_1.Patch)(':id/items/:itemId/quantity'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)('quantity', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateItemQuantity", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "closeOrder", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "cancelOrder", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('items/all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findAllItems", null);
__decorate([
    (0, common_1.Get)('items/status/:status'),
    __param(0, (0, common_1.Param)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findItemsByStatus", null);
__decorate([
    (0, common_1.Get)('items/kitchen/pending'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.KITCHEN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findPendingForKitchen", null);
__decorate([
    (0, common_1.Get)('items/ready'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findReadyForDelivery", null);
__decorate([
    (0, common_1.Get)('items/:itemId'),
    __param(0, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOneItem", null);
__decorate([
    (0, common_1.Patch)('items/:itemId/status'),
    __param(0, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_2.UpdateOrderItemStatusDto, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateItemStatus", null);
__decorate([
    (0, common_1.Post)('items/:itemId/start-preparation'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.KITCHEN),
    __param(0, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "startPreparation", null);
__decorate([
    (0, common_1.Post)('items/:itemId/mark-ready'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.KITCHEN),
    __param(0, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "markReady", null);
__decorate([
    (0, common_1.Post)('items/:itemId/mark-delivered'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    __param(0, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "markDelivered", null);
__decorate([
    (0, common_1.Post)('items/:itemId/cancel'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER, user_role_enum_1.UserRole.KITCHEN),
    __param(0, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "cancelItem", null);
__decorate([
    (0, common_1.Get)('items/statistics/status'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getStatusStatistics", null);
__decorate([
    (0, common_1.Get)(':id/items'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOrderItems", null);
__decorate([
    (0, common_1.Get)(':id/items/count-by-status'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "countItemsByStatus", null);
__decorate([
    (0, common_1.Get)(':id/items/all-ready'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "areAllItemsReady", null);
__decorate([
    (0, common_1.Get)(':id/items/has-pending'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "hasPendingItems", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [orders_service_1.OrdersService,
        order_items_service_1.OrderItemsService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map