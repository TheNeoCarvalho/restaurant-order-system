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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const register_dto_1 = require("./dto/register.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const auth_response_dto_1 = require("./dto/auth-response.dto");
const public_decorator_1 = require("./decorators/public.decorator");
const roles_decorator_1 = require("./decorators/roles.decorator");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const user_entity_1 = require("../users/entities/user.entity");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async login(loginDto) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        return this.authService.login(user);
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async logout(user) {
        await this.authService.logout(user.id);
        return { message: 'Logout realizado com sucesso' };
    }
    async refresh(refreshDto) {
        return this.authService.refreshTokens(refreshDto.refreshToken);
    }
    async getProfile(user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
        };
    }
    async adminOnlyEndpoint(user) {
        return {
            message: 'Este endpoint é acessível apenas por administradores',
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
        };
    }
    async waiterKitchenEndpoint(user) {
        return {
            message: 'Este endpoint é acessível por garçons e cozinha',
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Fazer login no sistema',
        description: 'Autentica um usuário com email e senha, retornando tokens JWT'
    }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Login realizado com sucesso',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Credenciais inválidas',
        schema: {
            example: {
                statusCode: 401,
                message: 'Credenciais inválidas',
                error: 'Unauthorized'
            }
        }
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Registrar novo usuário',
        description: 'Cria uma nova conta de usuário no sistema'
    }),
    (0, swagger_1.ApiBody)({ type: register_dto_1.RegisterDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Usuário registrado com sucesso',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Dados inválidos ou email já existe',
        schema: {
            example: {
                statusCode: 400,
                message: ['Email deve ter um formato válido', 'Senha deve ter pelo menos 6 caracteres'],
                error: 'Bad Request'
            }
        }
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Fazer logout',
        description: 'Invalida o token de refresh do usuário atual'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Logout realizado com sucesso',
        schema: {
            example: {
                message: 'Logout realizado com sucesso'
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Token inválido ou expirado'
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Renovar tokens',
        description: 'Gera novos tokens JWT usando o refresh token'
    }),
    (0, swagger_1.ApiBody)({ type: refresh_token_dto_1.RefreshTokenDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Tokens renovados com sucesso',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Refresh token inválido ou expirado'
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Obter perfil do usuário',
        description: 'Retorna informações do usuário autenticado'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Perfil do usuário',
        schema: {
            example: {
                id: 'uuid-string',
                email: 'user@example.com',
                name: 'Nome do Usuário',
                role: 'admin',
                isActive: true
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Token inválido ou expirado'
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('admin-only'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Endpoint exclusivo para administradores',
        description: 'Endpoint de teste para verificar autorização de administradores'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Acesso autorizado para administrador',
        schema: {
            example: {
                message: 'Este endpoint é acessível apenas por administradores',
                user: {
                    id: 'uuid-string',
                    name: 'Admin User',
                    role: 'admin'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Token inválido ou expirado'
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Acesso negado - apenas administradores'
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminOnlyEndpoint", null);
__decorate([
    (0, common_1.Get)('waiter-kitchen'),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.WAITER, user_role_enum_1.UserRole.KITCHEN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Endpoint para garçons e cozinha',
        description: 'Endpoint de teste para verificar autorização de garçons e funcionários da cozinha'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Acesso autorizado para garçons e cozinha',
        schema: {
            example: {
                message: 'Este endpoint é acessível por garçons e cozinha',
                user: {
                    id: 'uuid-string',
                    name: 'Waiter User',
                    role: 'waiter'
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Token inválido ou expirado'
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Acesso negado - apenas garçons e cozinha'
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "waiterKitchenEndpoint", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map