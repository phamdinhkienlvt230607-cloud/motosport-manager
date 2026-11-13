import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/auth.decorators.js';
import { HealthService } from './health.service.js';

@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  getReadiness(): Promise<{ status: 'ready'; database: 'connected' }> {
    return this.healthService.getReadiness();
  }
}
