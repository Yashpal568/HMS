import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
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

  @Post()
  @RequirePermissions('roles.manage')
  async createRole(@Body() body: { name: string; description: string; permissions: string[] }) {
    const role = await this.rolesService.createRole(body);
    return {
      success: true,
      data: role,
      message: 'Role created successfully.',
    };
  }

  @Patch(':name')
  @RequirePermissions('roles.manage')
  async updateRole(
    @Param('name') name: string,
    @Body() body: { description?: string; permissions?: string[] },
  ) {
    const role = await this.rolesService.updateRole(name, body);
    return {
      success: true,
      data: role,
      message: 'Role updated successfully.',
    };
  }

  @Delete(':name')
  @RequirePermissions('roles.manage')
  async deleteRole(@Param('name') name: string) {
    const result = await this.rolesService.deleteRole(name);
    return {
      success: true,
      message: result.message,
    };
  }
}

