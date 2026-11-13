import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { HealthController } from './../src/health/health.controller.js';
import { HealthService } from './../src/health/health.service.js';

describe('GET /api/health', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, defaultValue: unknown) => defaultValue,
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: { query: vi.fn() },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('returns the backend health status without a database connection', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('reports readiness as unavailable when the database is disabled', () => {
    return request(app.getHttpServer())
      .get('/api/health/ready')
      .expect(503)
      .expect({
        status: 'not_ready',
        database: 'disabled',
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
