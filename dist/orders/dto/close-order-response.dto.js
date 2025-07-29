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
exports.OrderClosureAuditDto = exports.CloseOrderResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const order_entity_1 = require("../entities/order.entity");
class CloseOrderResponseDto {
    message;
    order;
    summary;
    closedBy;
}
exports.CloseOrderResponseDto = CloseOrderResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Mensagem de confirmação do fechamento',
        example: 'Comanda fechada com sucesso'
    }),
    __metadata("design:type", String)
], CloseOrderResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Dados da comanda fechada',
        type: order_entity_1.Order
    }),
    __metadata("design:type", order_entity_1.Order)
], CloseOrderResponseDto.prototype, "order", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Resumo detalhado da comanda com totais e impostos'
    }),
    __metadata("design:type", Object)
], CloseOrderResponseDto.prototype, "summary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Informações de quem fechou a comanda',
        example: {
            userId: 'uuid-string',
            role: 'waiter',
            timestamp: '2024-01-01T12:00:00.000Z'
        }
    }),
    __metadata("design:type", Object)
], CloseOrderResponseDto.prototype, "closedBy", void 0);
class OrderClosureAuditDto {
    userId;
    role;
    timestamp;
    orderId;
    tableNumber;
    finalAmount;
}
exports.OrderClosureAuditDto = OrderClosureAuditDto;
//# sourceMappingURL=close-order-response.dto.js.map