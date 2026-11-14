import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function optionalText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
}

function moneyString(value: unknown): unknown {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === 'string' ? value.trim() : value;
}

function parseIntegerQuery(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return Number.NaN;
  }
  return Number(value);
}

function trimSearch(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim() || undefined;
}

export class CreateVehicleDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(1, 40)
  code!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(1, 180)
  name!: string;

  @IsUUID('all')
  brandId!: string;

  @IsUUID('all')
  categoryId!: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  displacementCc!: number;

  @IsInt()
  @Min(1900)
  @Max(2200)
  modelYear!: number;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(1, 60)
  color!: string;

  @IsOptional()
  @Transform(({ value }) => optionalText(value))
  @IsString()
  @MaxLength(100)
  engineNumber?: string | null;

  @IsOptional()
  @Transform(({ value }) => optionalText(value))
  @IsString()
  @MaxLength(100)
  vin?: string | null;

  @Transform(({ value }) => moneyString(value))
  @IsString()
  @Matches(/^\d{1,12}(?:\.\d{1,2})?$/)
  costPrice!: string;

  @Transform(({ value }) => moneyString(value))
  @IsString()
  @Matches(/^\d{1,12}(?:\.\d{1,2})?$/)
  salePrice!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  stockQuantity?: number;

  @IsOptional()
  @Transform(({ value }) => optionalText(value))
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVehicleDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(1, 40)
  code?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(1, 180)
  name?: string;

  @IsOptional()
  @IsUUID('all')
  brandId?: string;

  @IsOptional()
  @IsUUID('all')
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  displacementCc?: number;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  modelYear?: number;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(1, 60)
  color?: string;

  @IsOptional()
  @Transform(({ value }) => optionalText(value))
  @IsString()
  @MaxLength(100)
  engineNumber?: string | null;

  @IsOptional()
  @Transform(({ value }) => optionalText(value))
  @IsString()
  @MaxLength(100)
  vin?: string | null;

  @IsOptional()
  @Transform(({ value }) => moneyString(value))
  @IsString()
  @Matches(/^\d{1,12}(?:\.\d{1,2})?$/)
  costPrice?: string;

  @IsOptional()
  @Transform(({ value }) => moneyString(value))
  @IsString()
  @Matches(/^\d{1,12}(?:\.\d{1,2})?$/)
  salePrice?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  stockQuantity?: number;

  @IsOptional()
  @Transform(({ value }) => optionalText(value))
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListVehiclesQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseIntegerQuery(value))
  @IsInt()
  @Min(1)
  @Max(1000000)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseIntegerQuery(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => trimSearch(value))
  @IsString()
  @MaxLength(180)
  search?: string;
}
