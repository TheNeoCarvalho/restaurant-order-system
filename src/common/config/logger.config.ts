import { LoggerService, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export class ProductionLogger implements LoggerService {
  private logLevels: LogLevel[] = ['error', 'warn', 'log'];
  private logDir = path.join(process.cwd(), 'logs');

  constructor() {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Set log levels based on environment
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

  log(message: any, context?: string) {
    if (this.logLevels.includes('log')) {
      this.writeLog('INFO', message, context);
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (this.logLevels.includes('error')) {
      this.writeLog('ERROR', message, context, trace);
    }
  }

  warn(message: any, context?: string) {
    if (this.logLevels.includes('warn')) {
      this.writeLog('WARN', message, context);
    }
  }

  debug(message: any, context?: string) {
    if (this.logLevels.includes('debug')) {
      this.writeLog('DEBUG', message, context);
    }
  }

  verbose(message: any, context?: string) {
    if (this.logLevels.includes('verbose')) {
      this.writeLog('VERBOSE', message, context);
    }
  }

  private writeLog(level: string, message: any, context?: string, trace?: string) {
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

    // Console output for development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${timestamp} [${level}] ${contextStr}${messageStr}${traceStr}`);
    }

    // File output for production
    const logFileName = this.getLogFileName(level);
    const logFilePath = path.join(this.logDir, logFileName);
    
    try {
      fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private getLogFileName(level: string): string {
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

export function createLogger(): LoggerService | undefined {
  if (process.env.NODE_ENV === 'production') {
    return new ProductionLogger();
  }
  
  // Use default NestJS logger for development
  return undefined;
}