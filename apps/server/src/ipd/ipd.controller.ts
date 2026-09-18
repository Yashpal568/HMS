import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IpdService } from './ipd.service.js';
import { BedService } from './bed.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '@hms/types';
import { CreateAdmissionDto } from './dto/create-admission.dto.js';
import { TransferBedDto } from './dto/transfer-bed.dto.js';
import { DischargeDto } from './dto/discharge.dto.js';
import { UpdateBedStatusDto } from './dto/update-bed-status.dto.js';
import { CreateWardDto } from './dto/create-ward.dto.js';
import { CreateBedDto } from './dto/create-bed.dto.js';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  hospitalId?: string;
  permissions: string[];
}

@Controller('ipd')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class IpdController {
  constructor(
    private readonly ipdService: IpdService,
    private readonly bedService: BedService,
  ) {}

  /**
   * Admit patient into IPD & reserve bed
   */
  @Post('admissions')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @RequirePermissions('ipd.manage')
  async admitPatient(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAdmissionDto,
  ) {
    const data = await this.ipdService.admitPatient(
      user.tenantId,
      user.userId,
      dto,
    );
    return {
      success: true,
      data,
      message: 'Patient admitted successfully into Inpatient Department.',
    };
  }

  /**
   * List inpatient admissions
   */
  @Get('admissions')
  @RequirePermissions('ipd.read')
  async getAdmissions(
    @CurrentUser() user: RequestUser,
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.ipdService.getAdmissions(
      user.tenantId,
      patientId,
      status,
      limit ? parseInt(limit, 10) : 50,
    );
    return {
      success: true,
      data,
      total: data.length,
    };
  }

  /**
   * Get single admission file with bed transfer history
   */
  @Get('admissions/:id')
  @RequirePermissions('ipd.read')
  async getAdmissionById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const data = await this.ipdService.getAdmissionById(user.tenantId, id);
    return {
      success: true,
      data,
    };
  }

  /**
   * Internal bed transfer
   */
  @Post('admissions/:id/transfer')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
  )
  @RequirePermissions('ipd.manage')
  async transferBed(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: TransferBedDto,
  ) {
    const data = await this.ipdService.transferBed(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
    return {
      success: true,
      data,
      message: 'Patient transferred to destination bed successfully.',
    };
  }

  /**
   * Authorize inpatient discharge
   */
  @Post('admissions/:id/discharge')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.DOCTOR)
  @RequirePermissions('ipd.manage')
  async dischargePatient(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: DischargeDto,
  ) {
    const data = await this.ipdService.dischargePatient(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
    return {
      success: true,
      data,
      message: 'Inpatient discharge authorized and bed released for housekeeping.',
    };
  }

  /**
   * Real-time Ward & Bed matrix
   */
  @Get('beds')
  @RequirePermissions('ipd.read')
  async listBeds(
    @CurrentUser() user: RequestUser,
    @Query('wardId') wardId?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.bedService.listBeds(user.tenantId, wardId, status);
    return {
      success: true,
      data,
      total: data.length,
    };
  }

  /**
   * Update bed status (housekeeping mark clean / maintenance)
   */
  @Patch('beds/:id/status')
  @RequirePermissions('ipd.manage')
  async updateBedStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateBedStatusDto,
  ) {
    const data = await this.bedService.updateBedStatus(
      user.tenantId,
      id,
      dto.status,
    );
    return {
      success: true,
      data,
      message: `Bed status updated to ${dto.status}.`,
    };
  }

  /**
   * Inpatient census metrics and ward occupancy statistics
   */
  @Get('census')
  @RequirePermissions('ipd.read')
  async getCensusSummary(@CurrentUser() user: RequestUser) {
    const data = await this.bedService.getCensusSummary(user.tenantId);
    return {
      success: true,
      data,
    };
  }

  /**
   * List wards
   */
  @Get('wards')
  @RequirePermissions('ipd.read')
  async listWards(@CurrentUser() user: RequestUser) {
    const data = await this.bedService.listWards(user.tenantId);
    return {
      success: true,
      data,
      total: data.length,
    };
  }

  /**
   * Create new ward
   */
  @Post('wards')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)
  @RequirePermissions('ipd.manage')
  async createWard(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWardDto,
  ) {
    const data = await this.bedService.createWard(user.tenantId, dto);
    return {
      success: true,
      data,
      message: 'Ward created successfully.',
    };
  }

  /**
   * Add bed to ward
   */
  @Post('beds')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)
  @RequirePermissions('ipd.manage')
  async createBed(@CurrentUser() user: RequestUser, @Body() dto: CreateBedDto) {
    const data = await this.bedService.createBed(user.tenantId, dto);
    return {
      success: true,
      data,
      message: 'Bed created successfully.',
    };
  }
}
