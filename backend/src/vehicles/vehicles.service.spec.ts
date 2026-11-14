import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
  UpdateVehicleDto,
} from './vehicles.dto.js';
import { VehiclesService } from './vehicles.service.js';

const vehicleRow = {
  id: '60d5d4ce-4442-4c9f-b55d-f55ec3d4c325',
  code: 'MOTO-001',
  name: 'Road Bike',
  brand_id: 'cf44a794-7ed4-4f07-9c2a-a804d4b264af',
  brand_name: 'Brand',
  category_id: '0235c8cb-873a-4ff5-bd12-14c3af8f5de4',
  category_name: 'Sport',
  displacement_cc: 150,
  model_year: 2026,
  color: 'Black',
  engine_number: null,
  vin: null,
  cost_price: '1000.00',
  sale_price: '1200.00',
  stock_quantity: 3,
  image_url: null,
  is_active: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

describe('VehiclesService', () => {
  let service: VehiclesService;
  let query: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    query = vi.fn();
    const dataSource = { query } as unknown as DataSource;
    const config = {
      get: (key: string, defaultValue: unknown) =>
        key === 'DATABASE_ENABLED' ? true : defaultValue,
    } as ConfigService;
    service = new VehiclesService(dataSource, config);
  });

  it('lists vehicles with parameterized search and pagination', async () => {
    query
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([vehicleRow]);

    const result = await service.listVehicles({
      page: 2,
      limit: 10,
      search: 'MOTO',
    } satisfies ListVehiclesQueryDto);

    expect(result.data[0]).toMatchObject({
      id: vehicleRow.id,
      code: 'MOTO-001',
      brandName: 'Brand',
      categoryName: 'Sport',
      costPrice: '1000.00',
      salePrice: '1200.00',
    });
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('v.name ILIKE $1'),
      ['%MOTO%'],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LIMIT $2 OFFSET $3'),
      ['%MOTO%', 10, 10],
    );
  });

  it('returns vehicle brands and categories from the database', async () => {
    query
      .mockResolvedValueOnce([{ id: vehicleRow.brand_id, name: 'Brand' }])
      .mockResolvedValueOnce([{ id: vehicleRow.category_id, name: 'Sport' }]);

    await expect(service.listVehicleCatalogs()).resolves.toEqual({
      brands: [{ id: vehicleRow.brand_id, name: 'Brand' }],
      categories: [{ id: vehicleRow.category_id, name: 'Sport' }],
    });
  });

  it('returns 404 when a vehicle does not exist', async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      service.getVehicle('60d5d4ce-4442-4c9f-b55d-f55ec3d4c325'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the image URL attached to the vehicle record', async () => {
    query.mockResolvedValueOnce([{
      ...vehicleRow,
      image_url: 'https://cdn.example.test/moto-001.webp',
    }]);

    await expect(
      service.getVehicle(vehicleRow.id),
    ).resolves.toMatchObject({
      id: vehicleRow.id,
      imageUrl: 'https://cdn.example.test/moto-001.webp',
    });
  });

  it('creates a vehicle with parameterized schema fields', async () => {
    query.mockResolvedValueOnce([vehicleRow]);

    const input = {
      code: 'MOTO-001',
      name: 'Road Bike',
      brandId: vehicleRow.brand_id,
      categoryId: vehicleRow.category_id,
      displacementCc: 150,
      modelYear: 2026,
      color: 'Black',
      costPrice: '1000.00',
      salePrice: '1200.00',
    } satisfies CreateVehicleDto;

    await expect(service.createVehicle(input)).resolves.toMatchObject({
      id: vehicleRow.id,
      code: 'MOTO-001',
    });
    expect(query.mock.calls[0][0]).toContain('INSERT INTO public.vehicles');
    expect(query.mock.calls[0][0]).not.toContain('MOTO-001');
    expect(query.mock.calls[0][1]).toEqual([
      'MOTO-001',
      'Road Bike',
      vehicleRow.brand_id,
      vehicleRow.category_id,
      150,
      2026,
      'Black',
      null,
      null,
      '1000.00',
      '1200.00',
      0,
      null,
      true,
    ]);
  });

  it('saves an image URL on the created vehicle record', async () => {
    const imageUrl = 'https://cdn.example.test/moto-001.webp';
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...vehicleRow, image_url: imageUrl }]);

    await expect(
      service.createVehicle({
        code: 'MOTO-002',
        name: 'Road Bike',
        brandId: vehicleRow.brand_id,
        categoryId: vehicleRow.category_id,
        displacementCc: 150,
        modelYear: 2026,
        color: 'Black',
        costPrice: '1000.00',
        salePrice: '1200.00',
        imageUrl,
      }),
    ).resolves.toMatchObject({ imageUrl });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][1]).toEqual([imageUrl, null]);
    expect(query.mock.calls[1][1]).toContain(imageUrl);
  });

  it('rejects an empty patch without querying the database', async () => {
    await expect(
      service.updateVehicle(
        vehicleRow.id,
        {} satisfies UpdateVehicleDto,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('updates only supplied fields using bound parameters', async () => {
    query.mockResolvedValueOnce([{
      ...vehicleRow,
      name: 'Updated Road Bike',
    }]);

    await expect(
      service.updateVehicle(vehicleRow.id, {
        name: 'Updated Road Bike',
      } satisfies UpdateVehicleDto),
    ).resolves.toMatchObject({ name: 'Updated Road Bike' });
    expect(query.mock.calls[0][0]).toContain('name = $2');
    expect(query.mock.calls[0][0]).not.toContain('Updated Road Bike');
    expect(query.mock.calls[0][1]).toEqual([
      vehicleRow.id,
      'Updated Road Bike',
    ]);
  });

  it('updates the image URL for the same vehicle ID', async () => {
    const imageUrl = 'https://cdn.example.test/updated-moto.webp';
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...vehicleRow, image_url: imageUrl }]);

    await expect(
      service.updateVehicle(vehicleRow.id, {
        imageUrl,
      } satisfies UpdateVehicleDto),
    ).resolves.toMatchObject({
      id: vehicleRow.id,
      imageUrl,
    });
    expect(query.mock.calls[0][1]).toEqual([imageUrl, vehicleRow.id]);
    expect(query.mock.calls[1][0]).toContain('image_url = $2');
    expect(query.mock.calls[1][1]).toEqual([vehicleRow.id, imageUrl]);
  });

  it('rejects reusing an image URL assigned to another vehicle', async () => {
    query.mockResolvedValueOnce([{ id: 'another-vehicle-id' }]);

    await expect(
      service.updateVehicle(vehicleRow.id, {
        imageUrl: 'https://images.example.test/road-bike.webp',
      } satisfies UpdateVehicleDto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual([
      'https://images.example.test/road-bike.webp',
      vehicleRow.id,
    ]);
  });

  it('returns 404 when deleting a vehicle that does not exist', async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      service.deleteVehicle(vehicleRow.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps duplicate unique values to conflict', async () => {
    query.mockRejectedValueOnce({
      driverError: { code: '23505' },
    });

    await expect(
      service.createVehicle({
        code: 'MOTO-001',
        name: 'Road Bike',
        brandId: vehicleRow.brand_id,
        categoryId: vehicleRow.category_id,
        displacementCc: 150,
        modelYear: 2026,
        color: 'Black',
        costPrice: '1000.00',
        salePrice: '1200.00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps referenced vehicle deletion to conflict', async () => {
    query.mockRejectedValueOnce({
      driverError: { code: '23503' },
    });

    await expect(
      service.deleteVehicle(vehicleRow.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
