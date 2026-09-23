import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { OrganizationService } from './organization.service.js';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateTeamDto,
  UpdateTeamDto,
  AdvanceOnboardingDto,
} from './dto/organization.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  hospitalId?: string;
}

@Controller('organization')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get('departments')
  @Roles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getDepartments(@CurrentUser() user: RequestUser) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }
    const departments = await this.orgService.getDepartments(tenantId);
    return { success: true, data: departments };
  }

  @Get('departments/:id')
  @Roles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE')
  async getDepartmentById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }
    const department = await this.orgService.getDepartmentById(tenantId, id);
    return { success: true, data: department };
  }

  @Post('departments')
  @Roles('HOSPITAL_ADMIN')
  @RequirePermissions('departments.manage')
  async createDepartment(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateDepartmentDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }
    const department = await this.orgService.createDepartment(tenantId, dto);
    return { success: true, data: department, message: 'Department created successfully.' };
  }

  @Patch('departments/:id')
  @Roles('HOSPITAL_ADMIN')
  @RequirePermissions('departments.manage')
  async updateDepartment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }
    const updated = await this.orgService.updateDepartment(tenantId, id, dto);
    return { success: true, data: updated, message: 'Department updated successfully.' };
  }

  @Get('teams')
  @Roles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getTeams(
    @CurrentUser() user: RequestUser,
    @Query('departmentId') departmentId?: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }
    const teams = await this.orgService.getTeams(tenantId, departmentId);
    return { success: true, data: teams };
  }

  @Post('teams')
  @Roles('HOSPITAL_ADMIN')
  @RequirePermissions('teams.manage')
  async createTeam(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTeamDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }
    const team = await this.orgService.createTeam(tenantId, dto);
    return { success: true, data: team, message: 'Team created successfully.' };
  }

  @Patch('teams/:id')
  @Roles('HOSPITAL_ADMIN')
  @RequirePermissions('teams.manage')
  async updateTeam(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }
    const updated = await this.orgService.updateTeam(tenantId, id, dto);
    return { success: true, data: updated, message: 'Team updated successfully.' };
  }

  @Get('onboarding')
  @Roles('HOSPITAL_ADMIN')
  async getOnboardingState(@CurrentUser() user: RequestUser) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }
    const state = await this.orgService.getOnboardingState(tenantId);
    return { success: true, data: state };
  }

  @Post('onboarding/advance')
  @Roles('HOSPITAL_ADMIN')
  async advanceOnboarding(
    @CurrentUser() user: RequestUser,
    @Body() dto: AdvanceOnboardingDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }
    const updated = await this.orgService.advanceOnboarding(tenantId, user.userId, dto);
    return { success: true, data: updated, message: 'Onboarding step recorded.' };
  }
}
