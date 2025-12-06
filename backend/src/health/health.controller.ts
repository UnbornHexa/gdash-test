import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    try {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Weather API',
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      };
    } catch (error: any) {
      return {
        status: 'error',
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
