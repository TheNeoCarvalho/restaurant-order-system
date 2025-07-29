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
exports.CreateOrderItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const validators_1 = require("../../common/validators");
class CreateOrderItemDto {
    menuItemId;
    quantity;
    specialInstructions;
}
exports.CreateOrderItemDto = CreateOrderItemDto;
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'ID do item do menu deve ser um UUID válido' }),
    (0, swagger_1.ApiProperty)({
        description: 'ID do item do cardápio',
        example: 'uuid-string',
        format: 'uuid'
    }),
    __metadata("design:type", String)
], CreateOrderItemDto.prototype, "menuItemId", void 0);
__decorate([
    (0, validators_1.IsValidQuantity)(),
    (0, swagger_1.ApiProperty)({
        description: 'Quantidade do item',
        example: 2,
        minimum: 1,
        type: Number
    }),
    __metadata("design:type", Number)
], CreateOrderItemDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Instruções especiais devem ser uma string' }),
    (0, class_validator_1.MaxLength)(500, { message: 'Instruções especiais devem ter no máximo 500 caracteres' }),
    (0, swagger_1.ApiProperty)({
        description: 'Instruções especiais para o preparo do item',
        example: 'Sem cebola, ponto da carne mal passado',
        required: false,
        maxLength: 500
    }),
    __metadata("design:type", String)
], CreateOrderItemDto.prototype, "specialInstructions", void 0);
//# sourceMappingURL=create-order-item.dto.js.map