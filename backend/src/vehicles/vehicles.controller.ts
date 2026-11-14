import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../auth/auth.decorators.js';
import {
  CreateVehicleDto,
  ListVehiclesQueryDto,
  UpdateVehicleDto,
} from './vehicles.dto.js';
import { VehiclesService } from './vehicles.service.js';

@Controller('vehicles')
@RequirePermissions('vehicles:manage')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  list(@Query() query: ListVehiclesQueryDto) {
    return this.vehiclesService.listVehicles(query);
  }

  @Get('catalogs')
  listCatalogs() {
    return this.vehiclesService.listVehicleCatalogs();
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: 'all' })) id: string) {
    return this.vehiclesService.getVehicle(id);
  }

  @Post()
  create(@Body() input: CreateVehicleDto) {
    return this.vehiclesService.createVehicle(input);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: 'all' })) id: string,
    @Body() input: UpdateVehicleDto,
  ) {
    return this.vehiclesService.updateVehicle(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id', new ParseUUIDPipe({ version: 'all' })) id: string,
  ): Promise<void> {
    return this.vehiclesService.deleteVehicle(id);
  }
}
