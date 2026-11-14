import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { REQUIRED_PERMISSIONS_KEY } from '../auth/auth.decorators.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';

describe('VehiclesController', () => {
  const vehiclesService = {
    listVehicles: vi.fn(),
    listVehicleCatalogs: vi.fn(),
    getVehicle: vi.fn(),
    createVehicle: vi.fn(),
    updateVehicle: vi.fn(),
    deleteVehicle: vi.fn(),
  };
  const controller = new VehiclesController(
    vehiclesService as unknown as VehiclesService,
  );

  it('requires the existing vehicles:manage permission', () => {
    expect(
      new Reflector().get(
        REQUIRED_PERMISSIONS_KEY,
        VehiclesController,
      ),
    ).toEqual(['vehicles:manage']);
  });

  it('delegates list, detail, create, update, and delete requests', async () => {
    const query = { page: 1, limit: 10 };
    const body = { code: 'MOTO-001' };
    const id = '60d5d4ce-4442-4c9f-b55d-f55ec3d4c325';

    await controller.list(query);
    await controller.listCatalogs();
    await controller.get(id);
    await controller.create(body);
    await controller.update(id, body);
    await controller.delete(id);

    expect(vehiclesService.listVehicles).toHaveBeenCalledWith(query);
    expect(vehiclesService.listVehicleCatalogs).toHaveBeenCalledOnce();
    expect(vehiclesService.getVehicle).toHaveBeenCalledWith(id);
    expect(vehiclesService.createVehicle).toHaveBeenCalledWith(body);
    expect(vehiclesService.updateVehicle).toHaveBeenCalledWith(id, body);
    expect(vehiclesService.deleteVehicle).toHaveBeenCalledWith(id);
  });
});
