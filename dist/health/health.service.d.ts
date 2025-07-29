import { DataSource } from 'typeorm';
export declare class HealthService {
    private readonly dataSource;
    private readonly startTime;
    constructor(dataSource: DataSource);
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
    readinessCheck(): Promise<{
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
    livenessCheck(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
    }>;
}
