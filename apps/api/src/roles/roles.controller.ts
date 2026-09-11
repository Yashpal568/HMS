import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  async getRoles() {
    const roles = await this.rolesService.findAllRoles();
    return {
      success: true,
      data: roles,
    };
  }

  @Get('permissions')
  @RequirePermissions('roles.read')
  async getPermissions() {
    const permissions = await this.rolesService.findAllPermissions();
    return {
      success: true,
      data: permissions,
    };
  }
}
