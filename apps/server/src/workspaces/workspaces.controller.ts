import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { ResourceScope } from '@hms/types';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  hospitalId?: string;
}

@Controller('workspaces')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('templates')
  getTemplates() {
    const templates = this.workspacesService.getTemplates();
    return { success: true, data: templates };
  }

  @Get('my-workspaces')
  async getMyWorkspaces(
    @CurrentUser() user: RequestUser,
    @Query('active') active?: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }

    const context = await this.workspacesService.resolveUserWorkspaces(tenantId, user.userId, active);
    return { success: true, data: context };
  }

  @Post('switch')
  async switchWorkspace(
    @CurrentUser() user: RequestUser,
    @Body() body: { workspaceCode: string },
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }

    if (!body?.workspaceCode) {
      throw new BadRequestException('workspaceCode is required.');
    }

    const result = await this.workspacesService.switchActiveWorkspace(
      tenantId,
      user.userId,
      body.workspaceCode,
    );

    return {
      success: true,
      data: result,
      message: `Active workspace switched to ${result.activeWorkspace.name}.`,
    };
  }

  @Get('assignments')
  @RequirePermissions('users.read')
  async getAssignments(@CurrentUser() user: RequestUser) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }

    const assignments = await this.workspacesService.getAllWorkspaceAssignments(tenantId);
    return { success: true, data: assignments };
  }

  @Post('assign')
  @RequirePermissions('users.update')
  async assignWorkspace(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      employeeId: string;
      role?: string;
      departmentId?: string;
      teamId?: string;
      workspaces: string[];
      accessScope?: ResourceScope;
    },
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }

    if (!body?.employeeId || !body?.workspaces) {
      throw new BadRequestException('employeeId and workspaces are required.');
    }

    const result = await this.workspacesService.assignWorkspace(tenantId, body);
    return result;
  }
}
