import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { DashboardService } from './dashboard.service.js';
import type { DashboardSummary } from './interfaces/dashboard.interface.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId?: string;
  };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
    const summary = await this.dashboardService.getDashboardSummary();
    return {
      success: true,
      data: summary,
    };
  }
}
