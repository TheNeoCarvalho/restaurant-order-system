import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    check(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
        version: string;
        environment: string;
        database: {
            status: string;
            responseTime: number;
            error?: undefined;
        };
        memory: {
            used: number;
            total: number;
            percentage: number;
        };
        pid: number;
        nodeVersion: string;
        error?: undefined;
    } | {
        status: string;
        timestamp: string;
        uptime: number;
        version: string;
        environment: string;
        database: {
            status: string;
            error: any;
            responseTime?: undefined;
        };
        error: string;
        memory?: undefined;
        pid?: undefined;
        nodeVersion?: undefined;
    }>;
    ready(): Promise<{
        status: string;
        timestamp: string;
        checks: {
            database: string;
            environment: string;
        };
        error?: undefined;
    } | {
        status: string;
        timestamp: string;
        error: any;
        checks?: undefined;
    }>;
    live(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
    }>;
}
