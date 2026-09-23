import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { InventoryMigrationService } from './inventory-migration.service.js';
import {
  UploadInventoryCsvDto,
  SaveMappingDto,
  CreateLocationDto,
} from './dto/inventory-migration.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  hospitalId?: string;
}

@Controller('inventory-migration')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryMigrationController {
  constructor(private readonly migrationService: InventoryMigrationService) {}

  @Get('locations')
  @Roles('HOSPITAL_ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER')
  async getLocations(@CurrentUser() user: RequestUser) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const locations = await this.migrationService.getLocations(tenantId);
    return { success: true, data: locations };
  }

  @Post('locations')
  @Roles('HOSPITAL_ADMIN', 'INVENTORY_MANAGER')
  async createLocation(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateLocationDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const location = await this.migrationService.createLocation(tenantId, dto);
    return { success: true, data: location, message: 'Location created successfully.' };
  }

  @Get('imports')
  @Roles('HOSPITAL_ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER')
  async getImports(@CurrentUser() user: RequestUser) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const imports = await this.migrationService.getImports(tenantId);
    return { success: true, data: imports };
  }

  @Get('imports/:id')
  @Roles('HOSPITAL_ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER')
  async getImportById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const job = await this.migrationService.getImportById(tenantId, id);
    return { success: true, data: job };
  }

  @Post('upload')
  @Roles('HOSPITAL_ADMIN', 'INVENTORY_MANAGER', 'PHARMACIST')
  async uploadCsv(
    @CurrentUser() user: RequestUser,
    @Body() dto: UploadInventoryCsvDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const job = await this.migrationService.uploadCsv(tenantId, user.userId, dto);
    return { success: true, data: job, message: 'CSV uploaded and columns analyzed.' };
  }

  @Post('imports/:id/map')
  @Roles('HOSPITAL_ADMIN', 'INVENTORY_MANAGER', 'PHARMACIST')
  async saveMapping(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SaveMappingDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const job = await this.migrationService.saveMappingAndValidate(tenantId, id, dto);
    return { success: true, data: job, message: 'Mapping saved and data validated.' };
  }

  @Post('imports/:id/approve')
  @Roles('HOSPITAL_ADMIN')
  async approveImport(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const job = await this.migrationService.approveAndExecuteImport(tenantId, id, user.userId);
    return { success: true, data: job, message: 'Bulk migration executed successfully.' };
  }
}
