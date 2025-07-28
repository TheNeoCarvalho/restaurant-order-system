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
exports.Table = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const table_status_enum_1 = require("../../common/enums/table-status.enum");
let Table = class Table {
    id;
    number;
    capacity;
    status;
    createdAt;
    updatedAt;
};
exports.Table = Table;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Table.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Número da mesa é obrigatório' }),
    (0, class_validator_1.IsNumber)({}, { message: 'Número da mesa deve ser um número' }),
    (0, class_validator_1.Min)(1, { message: 'Número da mesa deve ser maior que 0' }),
    __metadata("design:type", Number)
], Table.prototype, "number", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 4 }),
    (0, class_validator_1.IsNumber)({}, { message: 'Capacidade deve ser um número' }),
    (0, class_validator_1.Min)(1, { message: 'Capacidade deve ser maior que 0' }),
    __metadata("design:type", Number)
], Table.prototype, "capacity", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: table_status_enum_1.TableStatus,
        default: table_status_enum_1.TableStatus.AVAILABLE,
    }),
    __metadata("design:type", String)
], Table.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Table.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Table.prototype, "updatedAt", void 0);
exports.Table = Table = __decorate([
    (0, typeorm_1.Entity)('tables')
], Table);
//# sourceMappingURL=table.entity.js.map