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
exports.MenuItem = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
let MenuItem = class MenuItem {
    id;
    name;
    description;
    price;
    category;
    isAvailable;
    preparationTime;
    createdAt;
    updatedAt;
};
exports.MenuItem = MenuItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MenuItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nome do item é obrigatório' }),
    (0, class_validator_1.IsString)({ message: 'Nome deve ser uma string' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Nome deve ter no máximo 100 caracteres' }),
    __metadata("design:type", String)
], MenuItem.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    (0, class_validator_1.IsNotEmpty)({ message: 'Descrição é obrigatória' }),
    (0, class_validator_1.IsString)({ message: 'Descrição deve ser uma string' }),
    (0, class_validator_1.MaxLength)(500, { message: 'Descrição deve ter no máximo 500 caracteres' }),
    __metadata("design:type", String)
], MenuItem.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('decimal', { precision: 10, scale: 2 }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Preço é obrigatório' }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: 'Preço deve ser um número com no máximo 2 casas decimais' }),
    (0, class_validator_1.Min)(0.01, { message: 'Preço deve ser maior que zero' }),
    __metadata("design:type", Number)
], MenuItem.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Categoria é obrigatória' }),
    (0, class_validator_1.IsString)({ message: 'Categoria deve ser uma string' }),
    (0, class_validator_1.MaxLength)(50, { message: 'Categoria deve ter no máximo 50 caracteres' }),
    __metadata("design:type", String)
], MenuItem.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    (0, class_validator_1.IsBoolean)({ message: 'Disponibilidade deve ser um valor booleano' }),
    __metadata("design:type", Boolean)
], MenuItem.prototype, "isAvailable", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'Tempo de preparo deve ser um número' }),
    (0, class_validator_1.Min)(1, { message: 'Tempo de preparo deve ser maior que 0' }),
    __metadata("design:type", Number)
], MenuItem.prototype, "preparationTime", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], MenuItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], MenuItem.prototype, "updatedAt", void 0);
exports.MenuItem = MenuItem = __decorate([
    (0, typeorm_1.Entity)('menu_items')
], MenuItem);
//# sourceMappingURL=menu-item.entity.js.map