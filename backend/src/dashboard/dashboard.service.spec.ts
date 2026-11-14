import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardQueryDto } from './dashboard-query.dto.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  let service: DashboardService;
  let query: ReturnType<typeof vi.fn>;
  let databaseEnabled: boolean;

  beforeEach(() => {
    query = vi.fn();
    databaseEnabled = true;
    const dataSource = { query } as unknown as DataSource;
    const config = {
      get: (key: string, defaultValue: unknown) =>
        key === 'DATABASE_ENABLED' ? databaseEnabled : defaultValue,
    } as ConfigService;
    service = new DashboardService(dataSource, config);
  });

  it('returns zero totals and empty lists for an empty database', async () => {
    query
      .mockResolvedValueOnce([{
        vehicle_model_count: '0',
        units_in_stock: '0',
        low_stock_model_count: '0',
        units_sold: '0',
        revenue_this_month: '0.00',
        customer_count: '0',
      }])
      .mockResolvedValueOnce(
        Array.from({ length: 12 }, (_, index) => ({
          month: `2026-${String(index + 1).padStart(2, '0')}`,
          revenue: '0.00',
        })),
      )
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getDashboard({
      year: 2026,
      lowStockThreshold: 2,
    } satisfies DashboardQueryDto);

    expect(result.summary).toEqual({
      vehicleModelCount: 0,
      unitsInStock: 0,
      lowStockModelCount: 0,
      unitsSold: 0,
      revenueThisMonth: '0.00',
      customerCount: 0,
    });
    expect(result.monthlyRevenue).toHaveLength(12);
    expect(result.monthlyRevenue.every((month) => month.revenue === '0.00')).toBe(true);
    expect(result.lowStockVehicles).toEqual([]);
    expect(result.bestSellers).toEqual([]);
    expect(result.latestSales).toEqual([]);
    expect(result.latestPurchases).toEqual([]);
  });

  it('preserves PostgreSQL numeric amounts without converting to floating point', async () => {
    query
      .mockResolvedValueOnce([{
        vehicle_model_count: '0',
        units_in_stock: '0',
        low_stock_model_count: '0',
        units_sold: '0',
        revenue_this_month: '123456789012.34',
        customer_count: '0',
      }])
      .mockResolvedValueOnce([{ month: '2026-01', revenue: '9876543210.12' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getDashboard({
      year: 2026,
      lowStockThreshold: 2,
    });

    expect(result.summary.revenueThisMonth).toBe('123456789012.34');
    expect(result.monthlyRevenue).toEqual([
      { month: '2026-01', revenue: '9876543210.12' },
    ]);
  });

  it('uses parameterized values for the threshold, year, and limits', async () => {
    query
      .mockResolvedValueOnce([{
        vehicle_model_count: '0',
        units_in_stock: '0',
        low_stock_model_count: '0',
        units_sold: '0',
        revenue_this_month: '0',
        customer_count: '0',
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.getDashboard({ year: 2026, lowStockThreshold: 2 });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('stock_quantity <= $1'),
      [2],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('si.paid_at AT TIME ZONE'),
      [2026],
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('LIMIT $2'),
      [2, 4],
    );
    expect(query).toHaveBeenNthCalledWith(4, expect.any(String), [4]);
    expect(query.mock.calls[3][0]).toContain('HAVING SUM(');
    expect(query.mock.calls[3][0]).toContain(') > 0');
    expect(query).toHaveBeenNthCalledWith(5, expect.any(String), [4]);
    expect(query).toHaveBeenNthCalledWith(6, expect.any(String), [3]);
  });

  it('does not select or return customer names in latest sales', async () => {
    query
      .mockResolvedValueOnce([{
        vehicle_model_count: '0',
        units_in_stock: '0',
        low_stock_model_count: '0',
        units_sold: '0',
        revenue_this_month: '0',
        customer_count: '0',
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        invoice_id: 'invoice-id',
        invoice_number: 'INV-001',
        issued_at: new Date('2026-01-01T00:00:00.000Z'),
        status: 'paid',
        total: '1200.00',
      }])
      .mockResolvedValueOnce([]);

    const result = await service.getDashboard({
      year: 2026,
      lowStockThreshold: 2,
    });

    expect(result.latestSales).toEqual([{
      invoiceId: 'invoice-id',
      invoiceNumber: 'INV-001',
      issuedAt: '2026-01-01T00:00:00.000Z',
      status: 'paid',
      total: '1200.00',
    }]);
    expect(query.mock.calls[4][0]).not.toContain('customer');
  });

  it('reports disabled database separately from empty dashboard data', async () => {
    databaseEnabled = false;

    await expect(
      service.getDashboard({ year: 2026, lowStockThreshold: 2 }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query).not.toHaveBeenCalled();
  });

  it('propagates database failures instead of returning empty results', async () => {
    const databaseError = new Error('database connection failure');
    query.mockRejectedValueOnce(databaseError);

    await expect(
      service.getDashboard({ year: 2026, lowStockThreshold: 2 }),
    ).rejects.toBe(databaseError);
  });
});
