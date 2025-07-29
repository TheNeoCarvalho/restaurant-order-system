import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async check() {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const version = process.env.npm_package_version || '1.0.0';
    const environment = process.env.NODE_ENV || 'development';

    try {
      // Check database connection
      const dbStart = Date.now();
      await this.dataSource.query('SELECT 1');
      const dbResponseTime = Date.now() - dbStart;

      // Check memory usage
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
    } catch (error) {
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
      // Check if database is ready
      await this.dataSource.query('SELECT 1');
      
      // Check if all required environment variables are set
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
    } catch (error) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  async livenessCheck() {
    // Simple liveness check - if the service can respond, it's alive
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }
}