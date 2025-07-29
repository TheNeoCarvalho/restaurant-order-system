import { LoggerService } from '@nestjs/common';
export declare class ProductionLogger implements LoggerService {
    private logLevels;
    private logDir;
    constructor();
    log(message: any, context?: string): void;
    error(message: any, trace?: string, context?: string): void;
    warn(message: any, context?: string): void;
    debug(message: any, context?: string): void;
    verbose(message: any, context?: string): void;
    private writeLog;
    private getLogFileName;
}
export declare function createLogger(): LoggerService | undefined;
