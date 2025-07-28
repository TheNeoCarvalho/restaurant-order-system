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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderItem = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const order_item_status_enum_1 = require("../../common/enums/order-item-status.enum");
const order_entity_1 = require("../../orders/entities/order.entity");
const menu_item_entity_1 = require("../../menu/entities/menu-item.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let OrderItem = class OrderItem {
    id;
    order;
    orderId;
    menuItem;
    menuItemId;
    quantity;
    unitPrice;
    specialInstructions;
    status;
    statusUpdatedBy;
    statusUpdatedById;
    createdAt;
    updatedAt;
    getSubtotal() {
        return this.quantity * this.unitPrice;
    }
    canBeCancelled() {
        return this.status === order_item_status_enum_1.OrderItemStatus.PENDING ||
            this.status === order_item_status_enum_1.OrderItemStatus.IN_PREPARATION;
    }
    canUpdateStatus(newStatus) {
        const statusFlow = {
            [order_item_status_enum_1.OrderItemStatus.PENDING]: [order_item_status_enum_1.OrderItemStatus.IN_PREPARATION, order_item_status_enum_1.OrderItemStatus.CANCELLED],
            [order_item_status_enum_1.OrderItemStatus.IN_PREPARATION]: [order_item_status_enum_1.OrderItemStatus.READY, order_item_status_enum_1.OrderItemStatus.CANCELLED],
            [order_item_status_enum_1.OrderItemStatus.READY]: [order_item_status_enum_1.OrderItemStatus.DELIVERED],
            [order_item_status_enum_1.OrderItemStatus.DELIVERED]: [],
            [order_item_status_enum_1.OrderItemStatus.CANCELLED]: [],
        };
        return statusFlow[this.status]?.includes(newStatus) || false;
    }
};
exports.OrderItem = OrderItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OrderItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => order_entity_1.Order, order => order.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'order_id' }),
    __metadata("design:type", order_entity_1.Order)
], OrderItem.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_id' }),
    __metadata("design:type", String)
], OrderItem.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => menu_item_entity_1.MenuItem, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'menu_item_id' }),
    __metadata("design:type", menu_item_entity_1.MenuItem)
], OrderItem.prototype, "menuItem", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'menu_item_id' }),
    __metadata("design:type", String)
], OrderItem.prototype, "menuItemId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Quantidade é obrigatória' }),
    (0, class_validator_1.IsNumber)({}, { message: 'Quantidade deve ser um número' }),
    (0, class_validator_1.Min)(1, { message: 'Quantidade deve ser maior que 0' }),
    __metadata("design:type", Number)
], OrderItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', {
        precision: 10,
        scale: 2,
        name: 'unit_price'
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Preço unitário é obrigatório' }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: 'Preço unitário deve ser um número com no máximo 2 casas decimais' }),
    (0, class_validator_1.Min)(0.01, { message: 'Preço unitário deve ser maior que zero' }),
    __metadata("design:type", Number)
], OrderItem.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true, name: 'special_instructions' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Instruções especiais devem ser uma string' }),
    (0, class_validator_1.MaxLength)(500, { message: 'Instruções especiais devem ter no máximo 500 caracteres' }),
    __metadata("design:type", String)
], OrderItem.prototype, "specialInstructions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: order_item_status_enum_1.OrderItemStatus,
        default: order_item_status_enum_1.OrderItemStatus.PENDING,
    }),
    __metadata("design:type", String)
], OrderItem.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'status_updated_by' }),
    __metadata("design:type", user_entity_1.User)
], OrderItem.prototype, "statusUpdatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'status_updated_by' }),
    __metadata("design:type", String)
], OrderItem.prototype, "statusUpdatedById", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], OrderItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], OrderItem.prototype, "updatedAt", void 0);
exports.OrderItem = OrderItem = __decorate([
    (0, typeorm_1.Entity)('order_items')
], OrderItem);
//# sourceMappingURL=order-item.entity.js.map