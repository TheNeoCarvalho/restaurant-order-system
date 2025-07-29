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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    usersService;
    jwtService;
    configService;
    constructor(usersService, jwtService, configService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async validateUser(email, password) {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.isActive) {
            return null;
        }
        const isPasswordValid = await user.validatePassword(password);
        if (!isPasswordValid) {
            return null;
        }
        return user;
    }
    async login(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const tokens = await this.generateTokens(payload);
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }
    async register(userData) {
        const user = await this.usersService.create(userData);
        return this.login(user);
    }
    async logout(userId) {
        await this.usersService.deactivate(userId);
    }
    async generateTokens(payload) {
        const accessTokenSecret = this.configService.get('JWT_SECRET') || 'your-secret-key';
        const refreshTokenSecret = this.configService.get('JWT_REFRESH_SECRET') || 'your-refresh-secret-key';
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: accessTokenSecret,
                expiresIn: '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: refreshTokenSecret,
                expiresIn: '7d',
            }),
        ]);
        return {
            accessToken,
            refreshToken,
        };
    }
    async refreshTokens(refreshToken) {
        try {
            const refreshTokenSecret = this.configService.get('JWT_REFRESH_SECRET') || 'your-refresh-secret-key';
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: refreshTokenSecret,
            });
            const user = await this.usersService.findById(payload.sub);
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException('Usuário não encontrado ou inativo');
            }
            return this.login(user);
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Refresh token inválido');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map