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
const swagger_1 = require("@nestjs/swagger");
const tables_service_1 = require("./tables.service");
const dto_1 = require("./dto");
const table_entity_1 = require("./entities/table.entity");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const user_entity_1 = require("../users/entities/user.entity");
let TablesController = class TablesController {
    tablesService;
    constructor(tablesService) {
        this.tablesService = tablesService;
    }
    async create(createTableDto, user) {
        return await this.tablesService.create(createTableDto);
    }
    async findAll(user) {
        return await this.tablesService.findAll();
    }
    async findAvailable(user) {
        return await this.tablesService.findAvailable();
    }
    async findOccupied(user) {
        return await this.tablesService.findOccupied();
    }
    async getTablesSummary(user) {
        return await this.tablesService.getTablesSummary();
    }
    async getTablesOverview(query, user) {
        return await this.tablesService.getTablesOverview(query);
    }
    async findOne(id, user) {
        return await this.tablesService.findOne(id);
    }
    async checkAvailability(id, user) {
        const available = await this.tablesService.checkAvailability(id);
        return { available };
    }
    async update(id, updateTableDto, user) {
        return await this.tablesService.update(id, updateTableDto);
    }
    async updateStatus(id, updateStatusDto, user) {
        return await this.tablesService.updateStatus(id, updateStatusDto);
    }
    async remove(id, user) {
        await this.tablesService.remove(id);
    }
};
exports.TablesController = TablesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Criar nova mesa (apenas Admin)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Mesa criada com sucesso', type: table_entity_1.Table }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Mesa com esse número já existe' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateTableDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todas as mesas' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de mesas', type: [table_entity_1.Table] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('available'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Listar mesas disponíveis' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de mesas disponíveis', type: [table_entity_1.Table] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "findAvailable", null);
__decorate([
    (0, common_1.Get)('occupied'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Listar mesas ocupadas' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de mesas ocupadas', type: [table_entity_1.Table] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "findOccupied", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resumo do status das mesas' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Resumo das mesas por status' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "getTablesSummary", null);
__decorate([
    (0, common_1.Get)('overview'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Visão geral de todas as mesas com informações de pedidos' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista detalhada de mesas com status de pedidos', type: [dto_1.TableOverviewDto] }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: ['available', 'occupied', 'reserved', 'cleaning'], required: false }),
    (0, swagger_1.ApiQuery)({ name: 'hasPendingOrders', type: Boolean, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', enum: ['number', 'status', 'orderDuration', 'pendingItems'], required: false }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', enum: ['ASC', 'DESC'], required: false }),
    (0, swagger_1.ApiQuery)({ name: 'includeOrderDetails', type: Boolean, required: false }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.TablesOverviewQueryDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "getTablesOverview", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar mesa por ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Detalhes da mesa', type: table_entity_1.Table }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Mesa não encontrada' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/availability'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verificar disponibilidade da mesa' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status de disponibilidade' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "checkAvailability", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar mesa (apenas Admin)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Mesa atualizada com sucesso', type: table_entity_1.Table }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Mesa não encontrada' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Mesa com esse número já existe' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dto_1.UpdateTableDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.WAITER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar status da mesa (Admin e Garçom)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status atualizado com sucesso', type: table_entity_1.Table }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Mesa não encontrada' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dto_1.UpdateTableStatusDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Remover mesa (apenas Admin)' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Mesa removida com sucesso' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Mesa não encontrada' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Não é possível remover mesa ocupada' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "remove", null);
exports.TablesController = TablesController = __decorate([
    (0, swagger_1.ApiTags)('tables'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('tables'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [tables_service_1.TablesService])
], TablesController);
//# sourceMappingURL=tables.controller.js.map