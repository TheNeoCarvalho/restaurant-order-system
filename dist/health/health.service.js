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
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let HealthService = class HealthService {
    dataSource;
    startTime = Date.now();
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async check() {
        const timestamp = new Date().toISOString();
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const version = process.env.npm_package_version || '1.0.0';
        const environment = process.env.NODE_ENV || 'development';
        try {
            const dbStart = Date.now();
            await this.dataSource.query('SELECT 1');
            const dbResponseTime = Date.now() - dbStart;
            const memoryUsage = process.memoryUsage();
            const memoryInfo = {
                used: memoryUsage.heapUsed,
                total: memoryUsage.heapTotal,
                percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
            };
            return {
                status: 'ok',
                timestamp,
                uptime,
                version,
                environment,
                database: {
                    status: 'connected',
                    responseTime: dbResponseTime
                },
                memory: memoryInfo,
                pid: process.pid,
                nodeVersion: process.version
            };
        }
        catch (error) {
            return {
                status: 'error',
                timestamp,
                uptime,
                version,
                environment,
                database: {
                    status: 'disconnected',
                    error: error.message
                },
                error: 'Health check failed'
            };
        }
    }
    async readinessCheck() {
        try {
            await this.dataSource.query('SELECT 1');
            const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'JWT_SECRET'];
            const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
            if (missingVars.length > 0) {
                throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
            }
            return {
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'ok',
                    environment: 'ok'
                }
            };
        }
        catch (error) {
            return {
                status: 'not ready',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }
    async livenessCheck() {
        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000)
        };
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], HealthService);
//# sourceMappingURL=health.service.js.map