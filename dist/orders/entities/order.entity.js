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
exports.Order = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const order_status_enum_1 = require("../../common/enums/order-status.enum");
const table_entity_1 = require("../../tables/entities/table.entity");
const user_entity_1 = require("../../users/entities/user.entity");
const order_item_entity_1 = require("../../order-items/entities/order-item.entity");
let Order = class Order {
    id;
    table;
    tableId;
    waiter;
    waiterId;
    items;
    status;
    totalAmount;
    createdAt;
    updatedAt;
    closedAt;
    calculateTotal() {
        if (!this.items || this.items.length === 0) {
            return 0;
        }
        return this.items.reduce((total, item) => {
            return total + (item.quantity * item.unitPrice);
        }, 0);
    }
    updateTotal() {
        this.totalAmount = this.calculateTotal();
    }
};
exports.Order = Order;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Order.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => table_entity_1.Table, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'table_id' }),
    __metadata("design:type", table_entity_1.Table)
], Order.prototype, "table", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'table_id' }),
    __metadata("design:type", Number)
], Order.prototype, "tableId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'waiter_id' }),
    __metadata("design:type", user_entity_1.User)
], Order.prototype, "waiter", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'waiter_id' }),
    __metadata("design:type", String)
], Order.prototype, "waiterId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => order_item_entity_1.OrderItem, orderItem => orderItem.order, {
        cascade: true,
        eager: true
    }),
    __metadata("design:type", Array)
], Order.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: order_status_enum_1.OrderStatus,
        default: order_status_enum_1.OrderStatus.OPEN,
    }),
    __metadata("design:type", String)
], Order.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', {
        precision: 10,
        scale: 2,
        default: 0,
        name: 'total_amount'
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: 'Valor total deve ser um número com no máximo 2 casas decimais' }),
    (0, class_validator_1.Min)(0, { message: 'Valor total deve ser maior ou igual a zero' }),
    __metadata("design:type", Number)
], Order.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Order.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Order.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'closed_at' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], Order.prototype, "closedAt", void 0);
exports.Order = Order = __decorate([
    (0, typeorm_1.Entity)('orders')
], Order);
//# sourceMappingURL=order.entity.js.map