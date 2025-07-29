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
exports.User = void 0;
const typeorm_1 = require("typeorm");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const bcrypt = require("bcryptjs");
const user_role_enum_1 = require("../enums/user-role.enum");
let User = class User {
    id;
    email;
    password;
    name;
    role;
    isActive;
    createdAt;
    updatedAt;
    async hashPassword() {
        if (this.password) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
    }
    async validatePassword(password) {
        return bcrypt.compare(password, this.password);
    }
};
exports.User = User;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID único do usuário',
        example: 'uuid-string',
        format: 'uuid'
    }),
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Email do usuário (único)',
        example: 'user@example.com'
    }),
    (0, typeorm_1.Column)({ unique: true }),
    (0, class_validator_1.IsEmail)({}, { message: 'Email deve ter um formato válido' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Email é obrigatório' }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Senha do usuário (hash)',
        writeOnly: true
    }),
    (0, typeorm_1.Column)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Senha é obrigatória' }),
    (0, class_validator_1.MinLength)(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Nome completo do usuário',
        example: 'João Silva'
    }),
    (0, typeorm_1.Column)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nome é obrigatório' }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tipo de usuário no sistema',
        enum: user_role_enum_1.UserRole,
        example: user_role_enum_1.UserRole.WAITER
    }),
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: user_role_enum_1.UserRole,
        default: user_role_enum_1.UserRole.WAITER,
    }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Status de ativação do usuário',
        example: true
    }),
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Data de criação do usuário',
        example: '2024-01-01T12:00:00.000Z'
    }),
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Data da última atualização',
        example: '2024-01-01T12:00:00.000Z'
    }),
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], User.prototype, "hashPassword", null);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=user.entity.js.map