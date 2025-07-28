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
exports.UpdateOrderItemStatusDto = void 0;
const class_validator_1 = require("class-validator");
const order_item_status_enum_1 = require("../../common/enums/order-item-status.enum");
class UpdateOrderItemStatusDto {
    status;
    updatedBy;
}
exports.UpdateOrderItemStatusDto = UpdateOrderItemStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(order_item_status_enum_1.OrderItemStatus, {
        message: 'Status deve ser um valor válido: pending, in_preparation, ready, delivered, cancelled'
    }),
    __metadata("design:type", String)
], UpdateOrderItemStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'ID do usuário deve ser um UUID válido' }),
    __metadata("design:type", String)
], UpdateOrderItemStatusDto.prototype, "updatedBy", void 0);
//# sourceMappingURL=update-order-item-status.dto.js.map