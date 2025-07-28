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
exports.CreateMenuItemDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateMenuItemDto {
    name;
    description;
    price;
    category;
    isAvailable = true;
    preparationTime;
}
exports.CreateMenuItemDto = CreateMenuItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nome do item do cardápio',
        example: 'Pizza Margherita',
        maxLength: 100,
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nome do item é obrigatório' }),
    (0, class_validator_1.IsString)({ message: 'Nome deve ser uma string' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Nome deve ter no máximo 100 caracteres' }),
    __metadata("design:type", String)
], CreateMenuItemDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Descrição detalhada do item',
        example: 'Pizza tradicional com molho de tomate, mussarela e manjericão',
        maxLength: 500,
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Descrição é obrigatória' }),
    (0, class_validator_1.IsString)({ message: 'Descrição deve ser uma string' }),
    (0, class_validator_1.MaxLength)(500, { message: 'Descrição deve ter no máximo 500 caracteres' }),
    __metadata("design:type", String)
], CreateMenuItemDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Preço do item em reais',
        example: 29.99,
        minimum: 0.01,
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Preço é obrigatório' }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: 'Preço deve ser um número com no máximo 2 casas decimais' }),
    (0, class_validator_1.Min)(0.01, { message: 'Preço deve ser maior que zero' }),
    __metadata("design:type", Number)
], CreateMenuItemDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Categoria do item',
        example: 'Pizzas',
        maxLength: 50,
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Categoria é obrigatória' }),
    (0, class_validator_1.IsString)({ message: 'Categoria deve ser uma string' }),
    (0, class_validator_1.MaxLength)(50, { message: 'Categoria deve ter no máximo 50 caracteres' }),
    __metadata("design:type", String)
], CreateMenuItemDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Se o item está disponível para pedidos',
        example: true,
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: 'Disponibilidade deve ser um valor booleano' }),
    __metadata("design:type", Boolean)
], CreateMenuItemDto.prototype, "isAvailable", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Tempo de preparo em minutos',
        example: 15,
        minimum: 1,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'Tempo de preparo deve ser um número' }),
    (0, class_validator_1.Min)(1, { message: 'Tempo de preparo deve ser maior que 0' }),
    __metadata("design:type", Number)
], CreateMenuItemDto.prototype, "preparationTime", void 0);
//# sourceMappingURL=create-menu-item.dto.js.map