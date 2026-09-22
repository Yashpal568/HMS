import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReportQueryDto } from './dto/reports.dto.js';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  hospitalId?: string;
}

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('census')
  @RequirePermissions('reports.read')
  async getCensusReport(
    @CurrentUser() user: RequestUser,
    @Query() query: ReportQueryDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId || '';
    const report = await this.reportsService.getCensusReport(
      tenantId,
      query.startDate,
      query.endDate,
    );
    return {
      success: true,
      data: report,
    };
  }

  @Get('financial')
  @RequirePermissions('reports.financial.read')
  async getFinancialReport(
    @CurrentUser() user: RequestUser,
    @Query() query: ReportQueryDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId || '';
    const report = await this.reportsService.getFinancialReport(
      tenantId,
      query.startDate,
      query.endDate,
      query.department,
    );
    return {
      success: true,
      data: report,
    };
  }

  @Get('inventory')
  @RequirePermissions('reports.read')
  async getInventoryReport(
    @CurrentUser() user: RequestUser,
    @Query() query: ReportQueryDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId || '';
    const report = await this.reportsService.getInventoryPharmacyReport(
      tenantId,
      query.startDate,
      query.endDate,
    );
    return {
      success: true,
      data: report,
    };
  }

  @Get('export')
  @Throttle({ financial: { limit: 10, ttl: 60000 } })
  @RequirePermissions('reports.read')
  async exportReportCsv(
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
    @Query('type') type: 'census' | 'financial' | 'inventory' = 'census',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId || '';
    const csvContent = await this.reportsService.exportReportCsv(
      tenantId,
      type,
      startDate,
      endDate,
    );

    const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  }
}
