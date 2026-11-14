import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

function parseIntegerQuery(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return Number.NaN;
  }
  return Number(value);
}

export class DashboardQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseIntegerQuery(value))
  @IsInt()
  @Min(1)
  @Max(9999)
  year?: number;

  @IsOptional()
  @Transform(({ value }) => parseIntegerQuery(value))
  @IsInt()
  @Min(0)
  @Max(2147483647)
  lowStockThreshold?: number;
}
