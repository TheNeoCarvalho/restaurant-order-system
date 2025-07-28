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
exports.MenuController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const menu_service_1 = require("./menu.service");
const dto_1 = require("./dto");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const entities_1 = require("../users/entities");
const public_decorator_1 = require("../auth/decorators/public.decorator");
let MenuController = class MenuController {
    menuService;
    constructor(menuService) {
        this.menuService = menuService;
    }
    async create(createMenuItemDto) {
        const menuItem = await this.menuService.create(createMenuItemDto);
        return new dto_1.MenuItemResponseDto(menuItem);
    }
    async findAll(available, category) {
        let menuItems;
        if (available === 'true') {
            menuItems = await this.menuService.findAvailable();
        }
        else if (category) {
            menuItems = await this.menuService.findByCategory(category);
        }
        else {
            menuItems = await this.menuService.findAll();
        }
        return menuItems.map((item) => new dto_1.MenuItemResponseDto(item));
    }
    async getCategories() {
        return await this.menuService.getCategories();
    }
    async findOne(id) {
        const menuItem = await this.menuService.findOne(id);
        return new dto_1.MenuItemResponseDto(menuItem);
    }
    async getPriceHistory(id) {
        return await this.menuService.getPriceHistory(id);
    }
    async update(id, updateMenuItemDto, user) {
        const menuItem = await this.menuService.update(id, updateMenuItemDto, user.id);
        return new dto_1.MenuItemResponseDto(menuItem);
    }
    async toggleAvailability(id, user) {
        const menuItem = await this.menuService.toggleAvailability(id, user.id);
        return new dto_1.MenuItemResponseDto(menuItem);
    }
    async remove(id) {
        await this.menuService.remove(id);
    }
};
exports.MenuController = MenuController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Criar novo item do cardápio (apenas ADMIN)' }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Item criado com sucesso',
        type: dto_1.MenuItemResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Dados inválidos ou item já existe',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Acesso negado - apenas administradores',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateMenuItemDto]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todos os itens do cardápio' }),
    (0, swagger_1.ApiQuery)({
        name: 'available',
        required: false,
        description: 'Filtrar apenas itens disponíveis',
        type: Boolean,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'category',
        required: false,
        description: 'Filtrar por categoria',
        type: String,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de itens do cardápio',
        type: [dto_1.MenuItemResponseDto],
    }),
    __param(0, (0, common_1.Query)('available')),
    __param(1, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todas as categorias disponíveis' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Lista de categorias',
        type: [String],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar item específico do cardápio' }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID do item do cardápio',
        type: String,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Item encontrado',
        type: dto_1.MenuItemResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Item não encontrado',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/price-history'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Buscar histórico de preços (apenas ADMIN)' }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID do item do cardápio',
        type: String,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Histórico de preços',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Acesso negado - apenas administradores',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Item não encontrado',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "getPriceHistory", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Atualizar item do cardápio (apenas ADMIN)' }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID do item do cardápio',
        type: String,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Item atualizado com sucesso',
        type: dto_1.MenuItemResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Dados inválidos',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Acesso negado - apenas administradores',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Item não encontrado',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateMenuItemDto,
        entities_1.User]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/toggle-availability'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Alternar disponibilidade do item (apenas ADMIN)' }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID do item do cardápio',
        type: String,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Disponibilidade alterada com sucesso',
        type: dto_1.MenuItemResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Acesso negado - apenas administradores',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Item não encontrado',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, entities_1.User]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "toggleAvailability", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Remover item do cardápio (apenas ADMIN)' }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'ID do item do cardápio',
        type: String,
    }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Item removido com sucesso',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Acesso negado - apenas administradores',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Item não encontrado',
    }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "remove", null);
exports.MenuController = MenuController = __decorate([
    (0, swagger_1.ApiTags)('Menu'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('menu'),
    __metadata("design:paramtypes", [menu_service_1.MenuService])
], MenuController);
//# sourceMappingURL=menu.controller.js.map