import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ 
    summary: 'Health check endpoint',
    description: 'Verifica o status da aplicação e suas dependências'
  })
  @ApiResponse({
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
  })
  @ApiResponse({
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
  })
  async check() {
    return this.healthService.check();
  }

  @Get('ready')
  @Public()
  @ApiOperation({ 
    summary: 'Readiness check',
    description: 'Verifica se a aplicação está pronta para receber tráfego'
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação está pronta'
  })
  @ApiResponse({
    status: 503,
    description: 'Aplicação não está pronta'
  })
  async ready() {
    return this.healthService.readinessCheck();
  }

  @Get('live')
  @Public()
  @ApiOperation({ 
    summary: 'Liveness check',
    description: 'Verifica se a aplicação está viva (para Kubernetes)'
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação está viva'
  })
  async live() {
    return this.healthService.livenessCheck();
  }
}