"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionLogger = void 0;
exports.createLogger = createLogger;
const fs = require("fs");
const path = require("path");
class ProductionLogger {
    logLevels = ['error', 'warn', 'log'];
    logDir = path.join(process.cwd(), 'logs');
    constructor() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        const logLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
        switch (logLevel) {
            case 'error':
                this.logLevels = ['error'];
                break;
            case 'warn':
                this.logLevels = ['error', 'warn'];
                break;
            case 'info':
            case 'log':
                this.logLevels = ['error', 'warn', 'log'];
                break;
            case 'debug':
                this.logLevels = ['error', 'warn', 'log', 'debug'];
                break;
            case 'verbose':
                this.logLevels = ['error', 'warn', 'log', 'debug', 'verbose'];
                break;
        }
    }
    log(message, context) {
        if (this.logLevels.includes('log')) {
            this.writeLog('INFO', message, context);
        }
    }
    error(message, trace, context) {
        if (this.logLevels.includes('error')) {
            this.writeLog('ERROR', message, context, trace);
        }
    }
    warn(message, context) {
        if (this.logLevels.includes('warn')) {
            this.writeLog('WARN', message, context);
        }
    }
    debug(message, context) {
        if (this.logLevels.includes('debug')) {
            this.writeLog('DEBUG', message, context);
        }
    }
    verbose(message, context) {
        if (this.logLevels.includes('verbose')) {
            this.writeLog('VERBOSE', message, context);
        }
    }
    writeLog(level, message, context, trace) {
        const timestamp = new Date().toISOString();
        const contextStr = context ? `[${context}] ` : '';
        const messageStr = typeof message === 'object' ? JSON.stringify(message) : message;
        const traceStr = trace ? `\n${trace}` : '';
        const logEntry = {
            timestamp,
            level,
            context,
            message: messageStr,
            trace,
            pid: process.pid,
            environment: process.env.NODE_ENV
        };
        if (process.env.NODE_ENV !== 'production') {
            console.log(`${timestamp} [${level}] ${contextStr}${messageStr}${traceStr}`);
        }
        const logFileName = this.getLogFileName(level);
        const logFilePath = path.join(this.logDir, logFileName);
        try {
            fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n');
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    getLogFileName(level) {
        const date = new Date().toISOString().split('T')[0];
        switch (level) {
            case 'ERROR':
                return `error-${date}.log`;
            case 'WARN':
                return `warn-${date}.log`;
            default:
                return `app-${date}.log`;
        }
    }
}
exports.ProductionLogger = ProductionLogger;
function createLogger() {
    if (process.env.NODE_ENV === 'production') {
        return new ProductionLogger();
    }
    return undefined;
}
//# sourceMappingURL=logger.config.js.map