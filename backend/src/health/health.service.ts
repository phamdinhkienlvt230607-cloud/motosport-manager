import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getReadiness(): Promise<{
    status: 'ready';
    database: 'connected';
  }> {
    if (!this.config.get<boolean>('DATABASE_ENABLED', false)) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'disabled',
      });
    }

    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      const errorName =
        error instanceof Error ? error.name : 'UnknownDatabaseError';
      this.logger.error(`Readiness SELECT failed (${errorName}).`);
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'unavailable',
      });
    }

    return {
      status: 'ready',
      database: 'connected',
    };
  }
}
