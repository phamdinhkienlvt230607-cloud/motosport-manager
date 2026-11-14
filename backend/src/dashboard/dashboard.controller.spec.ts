import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { REQUIRED_PERMISSIONS_KEY } from '../auth/auth.decorators.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardQueryDto } from './dashboard-query.dto.js';

describe('DashboardController', () => {
  it('requires the existing dashboard:view permission', () => {
    const reflector = new Reflector();

    expect(
      reflector.get(
        REQUIRED_PERMISSIONS_KEY,
        DashboardController.prototype.getDashboard,
      ),
    ).toEqual(['dashboard:view']);
  });
});

describe('DashboardQueryDto', () => {
  it('accepts valid integer query parameters', async () => {
    const query = plainToInstance(DashboardQueryDto, {
      year: '2026',
      lowStockThreshold: '2',
    });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query.year).toBe(2026);
    expect(query.lowStockThreshold).toBe(2);
  });

  it.each([
    { year: '0' },
    { year: '10000' },
    { year: '20x6' },
    { year: '2026.5' },
    { lowStockThreshold: '-1' },
    { lowStockThreshold: '2.5' },
    { lowStockThreshold: '2147483648' },
    { lowStockThreshold: '2;DROP TABLE vehicles' },
  ])('rejects invalid query parameters: %o', async (input) => {
    const query = plainToInstance(DashboardQueryDto, input);
    const errors = await validate(query);

    expect(errors.length).toBeGreaterThan(0);
  });
});
