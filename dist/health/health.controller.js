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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const health_service_1 = require("./health.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
let HealthController = class HealthController {
    healthService;
    constructor(healthService) {
        this.healthService = healthService;
    }
    async check() {
        return this.healthService.check();
    }
    async ready() {
        return this.healthService.readinessCheck();
    }
    async live() {
        return this.healthService.livenessCheck();
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Health check endpoint',
        description: 'Verifica o status da aplicação e suas dependências'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Aplicação está saudável',
        schema: {
            example: {
                status: 'ok',
                timestamp: '2024-01-01T12:00:00.000Z',
                uptime: 3600,
                version: '1.0.0',
                environment: 'production',
                database: {
                    status: 'connected',
                    responseTime: 5
                },
                redis: {
                    status: 'connected',
                    responseTime: 2
                },
                memory: {
                    used: 134217728,
                    total: 268435456,
                    percentage: 50
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({
        status: 503,
        description: 'Aplicação não está saudável',
        schema: {
            example: {
                status: 'error',
                timestamp: '2024-01-01T12:00:00.000Z',
                uptime: 3600,
                version: '1.0.0',
                environment: 'production',
                database: {
                    status: 'disconnected',
                    error: 'Connection timeout'
                },
                redis: {
                    status: 'disconnected',
                    error: 'Connection refused'
                }
            }
        }
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
__decorate([
    (0, common_1.Get)('ready'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Readiness check',
        description: 'Verifica se a aplicação está pronta para receber tráfego'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Aplicação está pronta'
    }),
    (0, swagger_1.ApiResponse)({
        status: 503,
        description: 'Aplicação não está pronta'
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
__decorate([
    (0, common_1.Get)('live'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Liveness check',
        description: 'Verifica se a aplicação está viva (para Kubernetes)'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Aplicação está viva'
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "live", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('Health'),
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [health_service_1.HealthService])
], HealthController);
//# sourceMappingURL=health.controller.js.map