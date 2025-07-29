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
exports.CreateOrderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_order_item_dto_1 = require("./create-order-item.dto");
class CreateOrderDto {
    tableId;
    items;
}
exports.CreateOrderDto = CreateOrderDto;
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'ID da mesa deve ser um número' }),
    (0, swagger_1.ApiProperty)({
        description: 'ID da mesa para a qual a comanda será criada',
        example: 1,
        type: Number
    }),
    __metadata("design:type", Number)
], CreateOrderDto.prototype, "tableId", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: 'Itens devem ser um array' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_order_item_dto_1.CreateOrderItemDto),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiProperty)({
        description: 'Lista de itens iniciais da comanda (opcional)',
        type: [create_order_item_dto_1.CreateOrderItemDto],
        required: false
    }),
    __metadata("design:type", Array)
], CreateOrderDto.prototype, "items", void 0);
//# sourceMappingURL=create-order.dto.js.map