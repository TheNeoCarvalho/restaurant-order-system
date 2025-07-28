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
exports.MenuItemResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class MenuItemResponseDto {
    id;
    name;
    description;
    price;
    category;
    isAvailable;
    preparationTime;
    createdAt;
    updatedAt;
    constructor(menuItem) {
        this.id = menuItem.id;
        this.name = menuItem.name;
        this.description = menuItem.description;
        this.price = menuItem.price;
        this.category = menuItem.category;
        this.isAvailable = menuItem.isAvailable;
        this.preparationTime = menuItem.preparationTime;
        this.createdAt = menuItem.createdAt;
        this.updatedAt = menuItem.updatedAt;
    }
}
exports.MenuItemResponseDto = MenuItemResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID único do item',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    __metadata("design:type", String)
], MenuItemResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nome do item do cardápio',
        example: 'Pizza Margherita',
    }),
    __metadata("design:type", String)
], MenuItemResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Descrição detalhada do item',
        example: 'Pizza tradicional com molho de tomate, mussarela e manjericão',
    }),
    __metadata("design:type", String)
], MenuItemResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Preço do item em reais',
        example: 29.99,
    }),
    __metadata("design:type", Number)
], MenuItemResponseDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Categoria do item',
        example: 'Pizzas',
    }),
    __metadata("design:type", String)
], MenuItemResponseDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Se o item está disponível para pedidos',
        example: true,
    }),
    __metadata("design:type", Boolean)
], MenuItemResponseDto.prototype, "isAvailable", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tempo de preparo em minutos',
        example: 15,
        nullable: true,
    }),
    __metadata("design:type", Object)
], MenuItemResponseDto.prototype, "preparationTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Data de criação do item',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], MenuItemResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Data da última atualização',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], MenuItemResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=menu-item-response.dto.js.map