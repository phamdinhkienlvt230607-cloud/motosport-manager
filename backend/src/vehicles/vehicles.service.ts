import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
  UpdateVehicleDto,
} from './vehicles.dto.js';

const VEHICLE_JOINS = `
  FROM public.vehicles v
  JOIN public.vehicle_brands b ON b.id = v.brand_id
  JOIN public.vehicle_categories c ON c.id = v.category_id
`;

const VEHICLE_COLUMNS = `
  v.id,
  v.code,
  v.name,
  v.brand_id,
  b.name AS brand_name,
  v.category_id,
  c.name AS category_name,
  v.displacement_cc,
  v.model_year,
  v.color,
  v.engine_number,
  v.vin,
  v.cost_price,
  v.sale_price,
  v.stock_quantity,
  v.image_url,
  v.is_active,
  v.created_at,
  v.updated_at
`;

interface VehicleRow {
  id: string;
  code: string;
  name: string;
  brand_id: string;
  brand_name: string;
  category_id: string;
  category_name: string;
  displacement_cc: number;
  model_year: number;
  color: string;
  engine_number: string | null;
  vin: string | null;
  cost_price: string;
  sale_price: string;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow {
  total: string | number;
}

export interface VehicleCatalogEntry {
  id: string;
  name: string;
}

export interface VehicleResponse {
  id: string;
  code: string;
  name: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  displacementCc: number;
  modelYear: number;
  color: string;
  engineNumber: string | null;
  vin: string | null;
  costPrice: string;
  salePrice: string;
  stockQuantity: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type WriteOperation = 'create' | 'update' | 'delete';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function postgresErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  const driverError = isRecord(error.driverError)
    ? error.driverError
    : error;
  return typeof driverError.code === 'string'
    ? driverError.code
    : undefined;
}

function toSafeCount(value: string | number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error('Database returned an invalid vehicle count.');
  }
  return parsed;
}

function toIsoDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Database returned an invalid vehicle timestamp.');
  }
  return date.toISOString();
}

function toVehicleResponse(row: VehicleRow): VehicleResponse {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    brandId: row.brand_id,
    brandName: row.brand_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    displacementCc: row.displacement_cc,
    modelYear: row.model_year,
    color: row.color,
    engineNumber: row.engine_number,
    vin: row.vin,
    costPrice: row.cost_price,
    salePrice: row.sale_price,
    stockQuantity: row.stock_quantity,
    imageUrl: row.image_url,
    isActive: row.is_active,
    createdAt: toIsoDateTime(row.created_at),
    updatedAt: toIsoDateTime(row.updated_at),
  };
}

@Injectable()
export class VehiclesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async listVehicles(query: ListVehiclesQueryDto): Promise<{
    data: VehicleResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    this.ensureDatabaseEnabled();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const searchPattern = query.search ? `%${query.search}%` : null;
    const offset = (page - 1) * limit;

    const countRows = await this.dataSource.query<CountRow[]>(
      `
        SELECT COUNT(*) AS total
        ${VEHICLE_JOINS}
        WHERE (
          $1::text IS NULL
          OR v.code ILIKE $1
          OR v.name ILIKE $1
          OR b.name ILIKE $1
          OR c.name ILIKE $1
        )
      `,
      [searchPattern],
    );
    const countRow = countRows[0];
    if (!countRow) {
      throw new Error('Vehicle count query returned no result.');
    }
    const total = toSafeCount(countRow.total);
    const rows = await this.dataSource.query<VehicleRow[]>(
      `
        SELECT ${VEHICLE_COLUMNS}
        ${VEHICLE_JOINS}
        WHERE (
          $1::text IS NULL
          OR v.code ILIKE $1
          OR v.name ILIKE $1
          OR b.name ILIKE $1
          OR c.name ILIKE $1
        )
        ORDER BY v.created_at DESC, v.id
        LIMIT $2 OFFSET $3
      `,
      [searchPattern, limit, offset],
    );

    return {
      data: rows.map(toVehicleResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async listVehicleCatalogs(): Promise<{
    brands: VehicleCatalogEntry[];
    categories: VehicleCatalogEntry[];
  }> {
    this.ensureDatabaseEnabled();
    const [brands, categories] = await Promise.all([
      this.dataSource.query<VehicleCatalogEntry[]>(
        'SELECT id, name FROM public.vehicle_brands ORDER BY name, id',
      ),
      this.dataSource.query<VehicleCatalogEntry[]>(
        'SELECT id, name FROM public.vehicle_categories ORDER BY name, id',
      ),
    ]);
    return { brands, categories };
  }

  async getVehicle(id: string): Promise<VehicleResponse> {
    this.ensureDatabaseEnabled();
    const rows = await this.dataSource.query<VehicleRow[]>(
      `
        SELECT ${VEHICLE_COLUMNS}
        ${VEHICLE_JOINS}
        WHERE v.id = $1
      `,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Vehicle not found.');
    return toVehicleResponse(rows[0]);
  }

  async createVehicle(input: CreateVehicleDto): Promise<VehicleResponse> {
    this.ensureDatabaseEnabled();
    try {
      if (input.imageUrl) {
        await this.assertImageUrlAvailable(input.imageUrl);
      }
      const rows = await this.dataSource.query<VehicleRow[]>(
        `
          WITH inserted AS (
            INSERT INTO public.vehicles (
              code,
              name,
              brand_id,
              category_id,
              displacement_cc,
              model_year,
              color,
              engine_number,
              vin,
              cost_price,
              sale_price,
              stock_quantity,
              image_url,
              is_active
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8, $9, $10, $11, $12, $13, $14
            )
            RETURNING *
          )
          SELECT ${VEHICLE_COLUMNS}
          FROM inserted v
          JOIN public.vehicle_brands b ON b.id = v.brand_id
          JOIN public.vehicle_categories c ON c.id = v.category_id
        `,
        [
          input.code,
          input.name,
          input.brandId,
          input.categoryId,
          input.displacementCc,
          input.modelYear,
          input.color,
          input.engineNumber ?? null,
          input.vin ?? null,
          input.costPrice,
          input.salePrice,
          input.stockQuantity ?? 0,
          input.imageUrl ?? null,
          input.isActive ?? true,
        ],
      );
      if (!rows[0]) throw new Error('Vehicle insert returned no row.');
      return toVehicleResponse(rows[0]);
    } catch (error) {
      this.handleWriteError(error, 'create');
    }
  }

  async updateVehicle(
    id: string,
    input: UpdateVehicleDto,
  ): Promise<VehicleResponse> {
    this.ensureDatabaseEnabled();
    const updateFields = [
      ['code', 'code'],
      ['name', 'name'],
      ['brandId', 'brand_id'],
      ['categoryId', 'category_id'],
      ['displacementCc', 'displacement_cc'],
      ['modelYear', 'model_year'],
      ['color', 'color'],
      ['engineNumber', 'engine_number'],
      ['vin', 'vin'],
      ['costPrice', 'cost_price'],
      ['salePrice', 'sale_price'],
      ['stockQuantity', 'stock_quantity'],
      ['imageUrl', 'image_url'],
      ['isActive', 'is_active'],
    ] as const;
    const parameters: Array<string | number | boolean | null> = [id];
    const assignments: string[] = [];

    for (const [property, column] of updateFields) {
      const value = input[property];
      if (value !== undefined) {
        parameters.push(value);
        assignments.push(`${column} = $${parameters.length}`);
      }
    }
    if (assignments.length === 0) {
      throw new BadRequestException('At least one vehicle field is required.');
    }

    try {
      if (input.imageUrl) {
        await this.assertImageUrlAvailable(input.imageUrl, id);
      }
      const rows = await this.dataSource.query<VehicleRow[]>(
        `
          WITH updated AS (
            UPDATE public.vehicles
            SET ${assignments.join(', ')}
            WHERE id = $1
            RETURNING *
          )
          SELECT ${VEHICLE_COLUMNS}
          FROM updated v
          JOIN public.vehicle_brands b ON b.id = v.brand_id
          JOIN public.vehicle_categories c ON c.id = v.category_id
        `,
        parameters,
      );
      if (!rows[0]) throw new NotFoundException('Vehicle not found.');
      return toVehicleResponse(rows[0]);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleWriteError(error, 'update');
    }
  }

  async deleteVehicle(id: string): Promise<void> {
    this.ensureDatabaseEnabled();
    try {
      const rows = await this.dataSource.query<Array<{ id: string }>>(
        'DELETE FROM public.vehicles WHERE id = $1 RETURNING id',
        [id],
      );
      if (!rows[0]) throw new NotFoundException('Vehicle not found.');
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleWriteError(error, 'delete');
    }
  }

  private ensureDatabaseEnabled(): void {
    if (!this.config.get<boolean>('DATABASE_ENABLED', false)) {
      throw new ServiceUnavailableException(
        'Vehicle management is unavailable while the database is disabled.',
      );
    }
  }

  private async assertImageUrlAvailable(
    imageUrl: string,
    excludeVehicleId?: string,
  ): Promise<void> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `
        SELECT id
        FROM public.vehicles
        WHERE btrim(image_url) = $1
          AND ($2::uuid IS NULL OR id <> $2::uuid)
        LIMIT 1
      `,
      [imageUrl.trim(), excludeVehicleId ?? null],
    );
    if (rows[0]) {
      throw new ConflictException(
        'This image URL is already assigned to another vehicle.',
      );
    }
  }

  private handleWriteError(error: unknown, operation: WriteOperation): never {
    const code = postgresErrorCode(error);
    if (code === '23505') {
      throw new ConflictException(
        'Vehicle code, engine number, VIN, or image URL already exists.',
      );
    }
    if (code === '23503') {
      if (operation === 'delete') {
        throw new ConflictException(
          'Vehicle cannot be deleted because it is referenced by existing records.',
        );
      }
      throw new BadRequestException(
        'The specified vehicle brand or category does not exist.',
      );
    }
    if (['23502', '23514', '22001'].includes(code ?? '')) {
      throw new BadRequestException(
        'Vehicle data violates a database constraint.',
      );
    }
    throw error;
  }
}
