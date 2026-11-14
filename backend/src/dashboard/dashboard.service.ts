import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DashboardQueryDto } from './dashboard-query.dto.js';

const BUSINESS_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const LOW_STOCK_LIMIT = 4;
const BEST_SELLER_LIMIT = 4;
const RECENT_SALES_LIMIT = 4;
const RECENT_PURCHASES_LIMIT = 3;

interface DashboardSummaryRow {
  vehicle_model_count: string | number;
  units_in_stock: string | number;
  low_stock_model_count: string | number;
  units_sold: string | number;
  revenue_this_month: string;
  customer_count: string | number;
}

interface MonthlyRevenueRow {
  month: string;
  revenue: string;
}

interface LowStockVehicleRow {
  id: string;
  code: string;
  name: string;
  image_url: string | null;
  stock_quantity: string | number;
}

interface BestSellerRow extends LowStockVehicleRow {
  category: string;
  units_sold: string | number;
}

interface RecentSaleRow {
  invoice_id: string;
  invoice_number: string;
  issued_at: Date | string;
  status: string;
  total: string;
}

interface PurchaseItem {
  vehicleName: string;
  quantity: number;
}

interface RecentPurchaseRow {
  receipt_id: string;
  receipt_number: string;
  supplier_name: string;
  received_at: Date | string;
  status: 'confirmed';
  total: string;
  items: PurchaseItem[];
}

export interface DashboardResponse {
  year: number;
  summary: {
    vehicleModelCount: number;
    unitsInStock: number;
    lowStockModelCount: number;
    unitsSold: number;
    revenueThisMonth: string;
    customerCount: number;
  };
  monthlyRevenue: Array<{ month: string; revenue: string }>;
  lowStockVehicles: Array<{
    id: string;
    code: string;
    name: string;
    imageUrl: string | null;
    stockQuantity: number;
  }>;
  bestSellers: Array<{
    vehicleId: string;
    code: string;
    name: string;
    imageUrl: string | null;
    category: string;
    unitsSold: number;
    stockQuantity: number;
  }>;
  latestSales: Array<{
    invoiceId: string;
    invoiceNumber: string;
    issuedAt: string;
    status: string;
    total: string;
  }>;
  latestPurchases: Array<{
    receiptId: string;
    receiptNumber: string;
    supplierName: string;
    receivedAt: string;
    status: 'confirmed';
    total: string;
    items: PurchaseItem[];
  }>;
}

function toSafeCount(value: string | number, field: string): number {
  const parsed =
    typeof value === 'number'
      ? value
      : /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Database returned an invalid ${field} count.`);
  }
  return parsed;
}

function toMoneyString(value: string, field: string): string {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
    throw new Error(`Database returned an invalid ${field} amount.`);
  }
  return value;
}

function toIsoDateTime(value: Date | string, field: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Database returned an invalid ${field} timestamp.`);
  }
  return date.toISOString();
}

function currentBusinessYear(): number {
  return Number(
    new Intl.DateTimeFormat('en', {
      timeZone: BUSINESS_TIME_ZONE,
      year: 'numeric',
    }).format(new Date()),
  );
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async getDashboard(query: DashboardQueryDto): Promise<DashboardResponse> {
    if (!this.config.get<boolean>('DATABASE_ENABLED', false)) {
      throw new ServiceUnavailableException(
        'Dashboard is unavailable while the database is disabled.',
      );
    }

    const year = query.year ?? currentBusinessYear();
    const lowStockThreshold = query.lowStockThreshold ?? 2;

    const summaryRows = await this.dataSource.query<DashboardSummaryRow[]>(
      `
        WITH current_month AS (
          SELECT date_trunc(
            'month',
            now() AT TIME ZONE '${BUSINESS_TIME_ZONE}'
          ) AS starts_at
        )
        SELECT
          (SELECT COUNT(*) FROM public.vehicles) AS vehicle_model_count,
          COALESCE(
            (SELECT SUM(stock_quantity) FROM public.vehicles),
            0
          ) AS units_in_stock,
          (
            SELECT COUNT(*)
            FROM public.vehicles
            WHERE stock_quantity <= $1
          ) AS low_stock_model_count,
          COALESCE(
            (
              SELECT SUM(sid.quantity)
              FROM public.sales_invoice_details sid
              JOIN public.sales_invoices si
                ON si.id = sid.sales_invoice_id
              WHERE si.status = 'paid'
            ),
            0
          ) AS units_sold,
          (
            SELECT COUNT(*) FROM public.customers
          ) AS customer_count,
          COALESCE(
            (
              SELECT SUM(si.total)
              FROM public.sales_invoices si
              CROSS JOIN current_month cm
              WHERE si.status = 'paid'
                AND (si.paid_at AT TIME ZONE '${BUSINESS_TIME_ZONE}')
                    >= cm.starts_at
                AND (si.paid_at AT TIME ZONE '${BUSINESS_TIME_ZONE}')
                    < cm.starts_at + interval '1 month'
            ),
            0::numeric
          ) AS revenue_this_month
      `,
      [lowStockThreshold],
    );
    const summary = summaryRows[0];
    if (!summary) {
      throw new Error('Dashboard summary query returned no result.');
    }

    const monthlyRevenueRows = await this.dataSource.query<
      MonthlyRevenueRow[]
    >(
      `
        WITH months AS (
          SELECT generate_series(
            make_date($1::int, 1, 1)::timestamp,
            make_date($1::int, 12, 1)::timestamp,
            interval '1 month'
          ) AS month_start
        )
        SELECT
          to_char(m.month_start, 'YYYY-MM') AS month,
          COALESCE(SUM(si.total), 0::numeric) AS revenue
        FROM months m
        LEFT JOIN public.sales_invoices si
          ON si.status = 'paid'
          AND (si.paid_at AT TIME ZONE '${BUSINESS_TIME_ZONE}')
              >= m.month_start
          AND (si.paid_at AT TIME ZONE '${BUSINESS_TIME_ZONE}')
              < m.month_start + interval '1 month'
        GROUP BY m.month_start
        ORDER BY m.month_start
      `,
      [year],
    );

    const lowStockRows = await this.dataSource.query<LowStockVehicleRow[]>(
      `
        SELECT
          id,
          code,
          name,
          image_url,
          stock_quantity
        FROM public.vehicles
        WHERE stock_quantity <= $1
        ORDER BY stock_quantity ASC, name
        LIMIT $2
      `,
      [lowStockThreshold, LOW_STOCK_LIMIT],
    );

    const bestSellerRows = await this.dataSource.query<BestSellerRow[]>(
      `
        SELECT
          v.id,
          v.code,
          v.name,
          v.image_url,
          vc.name AS category,
          COALESCE(
            SUM(
              CASE
                WHEN si.id IS NOT NULL THEN sid.quantity
                ELSE 0
              END
            ),
            0
          ) AS units_sold,
          v.stock_quantity
        FROM public.vehicles v
        JOIN public.vehicle_categories vc
          ON vc.id = v.category_id
        LEFT JOIN public.sales_invoice_details sid
          ON sid.vehicle_id = v.id
        LEFT JOIN public.sales_invoices si
          ON si.id = sid.sales_invoice_id
          AND si.status = 'paid'
        GROUP BY v.id, v.code, v.name, v.image_url, vc.name, v.stock_quantity
        HAVING SUM(
          CASE
            WHEN si.id IS NOT NULL THEN sid.quantity
            ELSE 0
          END
        ) > 0
        ORDER BY units_sold DESC, v.name
        LIMIT $1
      `,
      [BEST_SELLER_LIMIT],
    );

    const latestSalesRows = await this.dataSource.query<RecentSaleRow[]>(
      `
        SELECT
          si.id AS invoice_id,
          si.invoice_number,
          si.issued_at,
          si.status::text AS status,
          si.total
        FROM public.sales_invoices si
        ORDER BY si.issued_at DESC
        LIMIT $1
      `,
      [RECENT_SALES_LIMIT],
    );

    const latestPurchaseRows = await this.dataSource.query<
      RecentPurchaseRow[]
    >(
      `
        SELECT
          ir.id AS receipt_id,
          ir.receipt_number,
          s.name AS supplier_name,
          ir.received_at,
          ir.status::text AS status,
          ir.total,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'vehicleName', v.name,
                'quantity', ird.quantity
              )
              ORDER BY ird.id
            ) FILTER (WHERE ird.id IS NOT NULL),
            '[]'::jsonb
          ) AS items
        FROM public.import_receipts ir
        JOIN public.suppliers s
          ON s.id = ir.supplier_id
        LEFT JOIN public.import_receipt_details ird
          ON ird.import_receipt_id = ir.id
        LEFT JOIN public.vehicles v
          ON v.id = ird.vehicle_id
        WHERE ir.status = 'confirmed'
        GROUP BY
          ir.id,
          ir.receipt_number,
          s.name,
          ir.received_at,
          ir.status,
          ir.total
        ORDER BY ir.received_at DESC
        LIMIT $1
      `,
      [RECENT_PURCHASES_LIMIT],
    );

    return {
      year,
      summary: {
        vehicleModelCount: toSafeCount(
          summary.vehicle_model_count,
          'vehicle model',
        ),
        unitsInStock: toSafeCount(summary.units_in_stock, 'stock'),
        lowStockModelCount: toSafeCount(
          summary.low_stock_model_count,
          'low stock model',
        ),
        unitsSold: toSafeCount(summary.units_sold, 'sold vehicle'),
        revenueThisMonth: toMoneyString(
          summary.revenue_this_month,
          'monthly revenue',
        ),
        customerCount: toSafeCount(summary.customer_count, 'customer'),
      },
      monthlyRevenue: monthlyRevenueRows.map((row) => ({
        month: row.month,
        revenue: toMoneyString(row.revenue, 'monthly revenue'),
      })),
      lowStockVehicles: lowStockRows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        imageUrl: row.image_url,
        stockQuantity: toSafeCount(row.stock_quantity, 'vehicle stock'),
      })),
      bestSellers: bestSellerRows.map((row) => ({
        vehicleId: row.id,
        code: row.code,
        name: row.name,
        imageUrl: row.image_url,
        category: row.category,
        unitsSold: toSafeCount(row.units_sold, 'sold vehicle'),
        stockQuantity: toSafeCount(row.stock_quantity, 'vehicle stock'),
      })),
      latestSales: latestSalesRows.map((row) => ({
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        issuedAt: toIsoDateTime(row.issued_at, 'invoice'),
        status: row.status,
        total: toMoneyString(row.total, 'invoice total'),
      })),
      latestPurchases: latestPurchaseRows.map((row) => ({
        receiptId: row.receipt_id,
        receiptNumber: row.receipt_number,
        supplierName: row.supplier_name,
        receivedAt: toIsoDateTime(row.received_at, 'import receipt'),
        status: row.status,
        total: toMoneyString(row.total, 'import receipt total'),
        items: row.items,
      })),
    };
  }
}
