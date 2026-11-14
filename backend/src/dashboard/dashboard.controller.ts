import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../auth/auth.decorators.js';
import { DashboardQueryDto } from './dashboard-query.dto.js';
import {
  DashboardResponse,
  DashboardService,
} from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @RequirePermissions('dashboard:view')
  getDashboard(
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardResponse> {
    return this.dashboardService.getDashboard(query);
  }
}
