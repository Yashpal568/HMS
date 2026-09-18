import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PharmacyService } from './pharmacy.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DispenseDto } from './dto/dispense.dto.js';
import { CreateMedicineDto } from './dto/create-medicine.dto.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { ReturnMedicineDto } from './dto/return-medicine.dto.js';
import {
  PrescriptionsQueryDto,
  BatchesQueryDto,
  MedicinesQueryDto,
} from './dto/pharmacy-query.dto.js';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  hospitalId?: string;
  permissions: string[];
}

@Controller('pharmacy')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  /**
   * Pharmacy operational dashboard metrics
   */
  @Get('dashboard')
  @RequirePermissions('pharmacy.read')
  async getDashboardMetrics(@CurrentUser() user: RequestUser) {
    const data = await this.pharmacyService.getDashboardMetrics(user.tenantId);
    return { success: true, data };
  }

  /**
   * Incoming electronic prescriptions queue
   */
  @Get('prescriptions')
  @RequirePermissions('pharmacy.read')
  async getPrescriptionsQueue(
    @CurrentUser() user: RequestUser,
    @Query() query: PrescriptionsQueryDto,
  ) {
    const data = await this.pharmacyService.getPrescriptionsQueue(user.tenantId, query);
    return { success: true, data };
  }

  /**
   * Single prescription detail with FEFO batch selection for dispensing
   */
  @Get('prescriptions/:id')
  @RequirePermissions('pharmacy.read')
  async getPrescriptionForDispensing(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const data = await this.pharmacyService.getPrescriptionForDispensing(user.tenantId, id);
    return { success: true, data };
  }

  /**
   * Execute atomic batch stock deduction & dispensing
   */
  @Post('dispense')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('pharmacy.dispense')
  async dispense(
    @CurrentUser() user: RequestUser,
    @Body() dto: DispenseDto,
  ) {
    const data = await this.pharmacyService.dispense(user.tenantId, user.userId, dto);
    return { success: true, data };
  }

  /**
   * Drug master catalog list/search
   */
  @Get('medicines')
  @RequirePermissions('pharmacy.read')
  async getMedicines(
    @CurrentUser() user: RequestUser,
    @Query() query: MedicinesQueryDto,
  ) {
    const data = await this.pharmacyService.getMedicines(user.tenantId, query);
    return { success: true, data };
  }

  /**
   * Add new medicine master
   */
  @Post('medicines')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('pharmacy.manage')
  async createMedicine(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMedicineDto,
  ) {
    const data = await this.pharmacyService.createMedicine(user.tenantId, user.userId, dto);
    return { success: true, data };
  }

  /**
   * List batch inventory
   */
  @Get('batches')
  @RequirePermissions('pharmacy.read')
  async getBatches(
    @CurrentUser() user: RequestUser,
    @Query() query: BatchesQueryDto,
  ) {
    const data = await this.pharmacyService.getBatches(user.tenantId, query);
    return { success: true, data };
  }

  /**
   * Receive and record new batch stock
   */
  @Post('batches')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('pharmacy.manage')
  async createBatch(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBatchDto,
  ) {
    const data = await this.pharmacyService.createBatch(user.tenantId, user.userId, dto);
    return { success: true, data };
  }

  /**
   * Near-expiry and low-stock alerts
   */
  @Get('batches/alerts')
  @RequirePermissions('pharmacy.read')
  async getAlerts(@CurrentUser() user: RequestUser) {
    const data = await this.pharmacyService.getAlerts(user.tenantId);
    return { success: true, data };
  }

  /**
   * Process patient medication returns
   */
  @Post('returns')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('pharmacy.dispense')
  async returnMedicine(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReturnMedicineDto,
  ) {
    const data = await this.pharmacyService.returnMedicine(user.tenantId, user.userId, dto);
    return { success: true, data };
  }

  /**
   * Dispensing history
   */
  @Get('history')
  @RequirePermissions('pharmacy.read')
  async getHistory(
    @CurrentUser() user: RequestUser,
    @Query('prescriptionId') prescriptionId?: string,
    @Query('patientId') patientId?: string,
  ) {
    const data = await this.pharmacyService.getDispensingHistory(user.tenantId, {
      prescriptionId,
      patientId,
    });
    return { success: true, data };
  }
}
