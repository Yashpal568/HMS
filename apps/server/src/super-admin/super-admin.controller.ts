import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type {
  CreateTenantDto,
  UpdateTenantStatusDto,
  QuotaOverrideDto,
  CreatePlanDto,
  CreateBroadcastDto,
} from '@hms/types';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  // ==========================================================================
  // TENANTS
  // ==========================================================================

  @Get('tenants')
  @RequirePermissions('platform.tenants.read')
  async getAllTenants(@Query() query: { status?: string; tier?: string; search?: string }) {
    const data = await this.superAdminService.getAllTenants(query);
    return { success: true, data };
  }

  @Get('tenants/:id')
  @RequirePermissions('platform.tenants.read')
  async getTenantById(@Param('id') id: string) {
    const data = await this.superAdminService.getTenantById(id);
    return { success: true, data };
  }

  @Post('tenants')
  @RequirePermissions('platform.tenants.manage')
  async provisionTenant(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    const data = await this.superAdminService.provisionTenant(dto, user.email, ipAddress);
    return { success: true, data };
  }

  @Patch('tenants/:id/status')
  @RequirePermissions('platform.tenants.suspend')
  async updateTenantStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    const data = await this.superAdminService.updateTenantStatus(id, dto, user.email, ipAddress);
    return { success: true, data };
  }

  @Patch('tenants/:id/quotas')
  @RequirePermissions('platform.subscriptions.manage')
  async overrideQuotas(
    @Param('id') id: string,
    @Body() dto: QuotaOverrideDto,
    @CurrentUser() user: any,
    @Ip() ipAddress: string,
  ) {
    const data = await this.superAdminService.overrideQuotas(id, dto, user.email, ipAddress);
    return { success: true, data };
  }

  // ==========================================================================
  // PLANS
  // ==========================================================================

  @Get('plans')
  @RequirePermissions('platform.plans.manage')
  async getAllPlans() {
    const data = await this.superAdminService.getAllPlans();
    return { success: true, data };
  }

  @Get('plans/:id')
  @RequirePermissions('platform.plans.manage')
  async getPlanById(@Param('id') id: string) {
    const data = await this.superAdminService.getPlanById(id);
    return { success: true, data };
  }

  @Post('plans')
  @RequirePermissions('platform.plans.manage')
  async createPlan(@Body() dto: CreatePlanDto, @CurrentUser() user: any) {
    const data = await this.superAdminService.createPlan(dto, user.email);
    return { success: true, data };
  }

  @Patch('plans/:id')
  @RequirePermissions('platform.plans.manage')
  async updatePlan(
    @Param('id') id: string,
    @Body() update: Partial<CreatePlanDto>,
    @CurrentUser() user: any,
  ) {
    const data = await this.superAdminService.updatePlan(id, update, user.email);
    return { success: true, data };
  }

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  @Get('subscriptions')
  @RequirePermissions('platform.subscriptions.manage')
  async getAllSubscriptions() {
    const data = await this.superAdminService.getAllSubscriptions();
    return { success: true, data };
  }

  // ==========================================================================
  // TELEMETRY
  // ==========================================================================

  @Get('telemetry')
  @RequirePermissions('platform.telemetry.read')
  async getTelemetry() {
    const data = await this.superAdminService.getPlatformTelemetry();
    return { success: true, data };
  }

  // ==========================================================================
  // PLATFORM AUDIT LOGS
  // ==========================================================================

  @Get('audit')
  @RequirePermissions('platform.audit.read')
  async getAuditLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const data = await this.superAdminService.getPlatformAuditLogs(parsedLimit);
    return { success: true, data };
  }

  // ==========================================================================
  // BROADCASTS
  // ==========================================================================

  @Get('broadcasts')
  @RequirePermissions('platform.broadcast.manage')
  async getActiveBroadcasts() {
    const data = await this.superAdminService.getActiveBroadcasts();
    return { success: true, data };
  }

  @Post('broadcasts')
  @RequirePermissions('platform.broadcast.manage')
  async createBroadcast(@Body() dto: CreateBroadcastDto, @CurrentUser() user: any) {
    const data = await this.superAdminService.createBroadcast(dto, user.email);
    return { success: true, data };
  }

  @Patch('broadcasts/:id/dismiss')
  @RequirePermissions('platform.broadcast.manage')
  async dismissBroadcast(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.superAdminService.dismissBroadcast(id, user.email);
    return { success: true, data };
  }
}
