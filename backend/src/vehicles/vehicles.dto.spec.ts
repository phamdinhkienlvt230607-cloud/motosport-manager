import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
} from './vehicles.dto.js';

describe('Vehicles DTOs', () => {
  it('accepts schema-valid vehicle input and normalizes prices', async () => {
    const input = plainToInstance(CreateVehicleDto, {
      code: ' MOTO-001 ',
      name: ' Road Bike ',
      brandId: 'cf44a794-7ed4-4f07-9c2a-a804d4b264af',
      categoryId: '0235c8cb-873a-4ff5-bd12-14c3af8f5de4',
      displacementCc: 150,
      modelYear: 2026,
      color: ' Black ',
      costPrice: 1000,
      salePrice: '1200.00',
      imageUrl: 'https://cdn.example.test/moto-001.webp',
    });

    await expect(validate(input)).resolves.toHaveLength(0);
    expect(input).toMatchObject({
      code: 'MOTO-001',
      name: 'Road Bike',
      color: 'Black',
      costPrice: '1000',
      imageUrl: 'https://cdn.example.test/moto-001.webp',
    });
  });

  it('transforms and validates list pagination parameters', async () => {
    const query = plainToInstance(ListVehiclesQueryDto, {
      page: '2',
      limit: '25',
      search: '  moto  ',
    });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ page: 2, limit: 25, search: 'moto' });
  });

  it.each([
    { page: '0' },
    { page: '1.5' },
    { limit: '101' },
    { search: 'x'.repeat(181) },
  ])('rejects invalid list parameters: %o', async (input) => {
    const query = plainToInstance(ListVehiclesQueryDto, input);
    expect(await validate(query)).not.toHaveLength(0);
  });

  it('rejects invalid references, dimensions, and numeric prices', async () => {
    const input = plainToInstance(CreateVehicleDto, {
      code: 'MOTO-001',
      name: 'Road Bike',
      brandId: 'not-a-uuid',
      categoryId: 'not-a-uuid',
      displacementCc: 0,
      modelYear: 1800,
      color: 'Black',
      costPrice: '-1',
      salePrice: '1.234',
    });

    expect(await validate(input)).not.toHaveLength(0);
  });

  it('rejects required text that becomes empty after trimming', async () => {
    const input = plainToInstance(CreateVehicleDto, {
      code: ' ',
      name: 'Road Bike',
      brandId: 'cf44a794-7ed4-4f07-9c2a-a804d4b264af',
      categoryId: '0235c8cb-873a-4ff5-bd12-14c3af8f5de4',
      displacementCc: 150,
      modelYear: 2026,
      color: 'Black',
      costPrice: '1000.00',
      salePrice: '1200.00',
    });

    expect(await validate(input)).toContainEqual(
      expect.objectContaining({ property: 'code' }),
    );
  });

  it('rejects image URLs that are not HTTP or HTTPS URLs', async () => {
    const input = plainToInstance(CreateVehicleDto, {
      code: 'MOTO-001',
      name: 'Road Bike',
      brandId: 'cf44a794-7ed4-4f07-9c2a-a804d4b264af',
      categoryId: '0235c8cb-873a-4ff5-bd12-14c3af8f5de4',
      displacementCc: 150,
      modelYear: 2026,
      color: 'Black',
      costPrice: '1000.00',
      salePrice: '1200.00',
      imageUrl: 'javascript:alert(1)',
    });

    expect(await validate(input)).toContainEqual(
      expect.objectContaining({ property: 'imageUrl' }),
    );
  });
});
