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
exports.CreateTableDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateTableDto {
    number;
    capacity;
}
exports.CreateTableDto = CreateTableDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Número da mesa',
        example: 1,
        minimum: 1,
    }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Número da mesa é obrigatório' }),
    (0, class_validator_1.IsNumber)({}, { message: 'Número da mesa deve ser um número' }),
    (0, class_validator_1.Min)(1, { message: 'Número da mesa deve ser maior que 0' }),
    __metadata("design:type", Number)
], CreateTableDto.prototype, "number", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Capacidade da mesa (número de pessoas)',
        example: 4,
        minimum: 1,
        default: 4,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'Capacidade deve ser um número' }),
    (0, class_validator_1.Min)(1, { message: 'Capacidade deve ser maior que 0' }),
    __metadata("design:type", Number)
], CreateTableDto.prototype, "capacity", void 0);
//# sourceMappingURL=create-table.dto.js.map