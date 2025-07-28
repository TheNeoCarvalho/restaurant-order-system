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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TablesController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const user_entity_1 = require("../users/entities/user.entity");
let TablesController = class TablesController {
    async findAll(user) {
        return {
            message: 'Lista de todas as mesas',
            requestedBy: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
            tables: [
                { id: 1, number: 1, capacity: 4, status: 'available' },
                { id: 2, number: 2, capacity: 2, status: 'occupied' },
                { id: 3, number: 3, capacity: 6, status: 'reserved' },
            ],
        };
    }
    async create(createTableDto, user) {
        return {
            message: 'Mesa criada com sucesso',
            createdBy: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
            table: {
                id: 4,
                ...createTableDto,
                status: 'available',
            },
        };
    }
    async findOne(id, user) {
        return {
            message: `Detalhes da mesa ${id}`,
            requestedBy: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
            table: {
                id: parseInt(id),
                number: parseInt(id),
                capacity: 4,
                status: 'available',
            },
        };
    }
    async update(id, updateTableDto, user) {
        return {
            message: `Mesa ${id} atualizada com sucesso`,
            updatedBy: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
            table: {
                id: parseInt(id),
                ...updateTableDto,
            },
        };
    }
    async remove(id, user) {
        return {
            message: `Mesa ${id} removida com sucesso`,
            deletedBy: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
        };
    }
    async updateStatus(id, statusDto, user) {
        return {
            message: `Status da mesa ${id} atualizado para ${statusDto.status}`,
            updatedBy: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
            table: {
                id: parseInt(id),
                status: statusDto.status,
            },
        };
    }
    async getTablesWithOrders(user) {
        return {
            message: 'Mesas com pedidos pendentes para a cozinha',
            requestedBy: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
            tables: [
                {
                    id: 2,
                    number: 2,
                    status: 'occupied',
                    pendingOrders: [
                        { id: 1, item: 'Hambúrguer', status: 'pending' },
                        { id: 2, item: 'Batata Frita', status: 'in_preparation' },
                    ]
                },
            ],
        };
    }
};
exports.TablesController = TablesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "remove", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)('kitchen/with-orders'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.KITCHEN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "getTablesWithOrders", null);
exports.TablesController = TablesController = __decorate([
    (0, common_1.Controller)('tables')
], TablesController);
//# sourceMappingURL=tables.controller.js.map