import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  let service: HealthService;
  let query: ReturnType<typeof vi.fn>;
  let moduleFixture: TestingModule;

  beforeEach(async () => {
    query = vi.fn();
    moduleFixture = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue: unknown) =>
              key === 'DATABASE_ENABLED' ? true : defaultValue,
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: { query },
        },
      ],
    }).compile();

    service = moduleFixture.get(HealthService);
  });

  afterEach(async () => {
    await moduleFixture.close();
  });

  it('runs SELECT 1 and reports ready when the query succeeds', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);

    await expect(service.getReadiness()).resolves.toEqual({
      status: 'ready',
      database: 'connected',
    });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns a sanitized unavailable response when the query fails', async () => {
    query.mockRejectedValue(new Error('database connection detail'));

    const readiness = service.getReadiness();
    await expect(readiness).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(readiness).rejects.toMatchObject({
      response: {
        status: 'not_ready',
        database: 'unavailable',
      },
    });
  });
});
