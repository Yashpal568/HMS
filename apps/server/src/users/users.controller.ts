import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { InviteStaffDto, ListStaffQueryDto } from './dto/invite-staff.dto.js';
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
  firstName?: string;
  lastName?: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @Roles('HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @RequirePermissions('users.create')
  async inviteStaff(
    @CurrentUser() user: RequestUser,
    @Body() dto: InviteStaffDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Authenticated session lacks a valid hospital tenant context.');
    }

    const adminName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email;

    const result = await this.usersService.inviteStaff(
      tenantId,
      dto,
      {
        userId: user.userId,
        email: user.email,
        name: adminName,
      },
    );

    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  @Get()
  @Roles('HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @RequirePermissions('users.read')
  async listStaff(
    @CurrentUser() user: RequestUser,
    @Query() query: ListStaffQueryDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Authenticated session lacks a valid hospital tenant context.');
    }

    const result = await this.usersService.findStaffByHospital(tenantId, query);

    return {
      success: true,
      data: result.staff,
      meta: {
        total: result.total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 50,
      },
    };
  }

  @Patch(':id/status')
  @Roles('HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @RequirePermissions('users.update')
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { status: any },
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }

    const updated = await this.usersService.updateUserStatus(tenantId, id, body.status);
    return {
      success: true,
      data: {
        id: updated._id.toString(),
        status: updated.status,
      },
      message: `User status updated to ${body.status}.`,
    };
  }

  @Patch(':id/access')
  @Roles('HOSPITAL_ADMIN', 'SUPER_ADMIN')
  @RequirePermissions('users.update')
  async updateAccess(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { role?: string; permissions?: string[]; department?: string; employeeId?: string },
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) {
      throw new BadRequestException('Session lacks hospital tenant context.');
    }

    const updated = await this.usersService.updateUserAccess(tenantId, id, body);
    return {
      success: true,
      data: {
        id: updated._id.toString(),
        role: updated.role,
        permissions: updated.permissions,
        department: updated.department,
        employeeId: updated.employeeId?.toString(),
      },
      message: 'User access configuration updated successfully.',
    };
  }
}
