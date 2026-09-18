import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PatientsService } from './patients.service.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientQueryDto } from './dto/patient-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

interface AuthenticatedUserContext {
  id: string;
  email: string;
  role: string;
  hospitalId?: string;
  tenantId?: string;
  permissions: string[];
}

@Controller('patients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @RequirePermissions('patients.create')
  async create(
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    const tenantId = this.resolveTenantId(user);
    const hospitalId = user.hospitalId && Types.ObjectId.isValid(user.hospitalId)
      ? new Types.ObjectId(user.hospitalId)
      : undefined;

    const patient = await this.patientsService.create(dto, tenantId, user.id, hospitalId);
    return {
      success: true,
      data: patient,
    };
  }

  @Get('check-duplicate')
  @RequirePermissions('patients.create')
  async checkDuplicate(
    @Query('phone') phone: string,
    @Query('dateOfBirth') dateOfBirth: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    const tenantId = this.resolveTenantId(user);
    const result = await this.patientsService.checkDuplicate(phone || '', dateOfBirth || '', tenantId);
    return {
      success: true,
      data: result,
    };
  }

  @Get()
  @RequirePermissions('patients.read')
  async findAll(
    @Query() query: PatientQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    const tenantId = this.resolveTenantId(user);
    const { data, meta } = await this.patientsService.findAll(query, tenantId);
    return {
      success: true,
      data,
      meta,
    };
  }

  @Get(':id')
  @RequirePermissions('patients.read')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    const tenantId = this.resolveTenantId(user);
    const patient = await this.patientsService.findById(id, tenantId, user.id);
    return {
      success: true,
      data: patient,
    };
  }

  @Patch(':id')
  @RequirePermissions('patients.update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    const tenantId = this.resolveTenantId(user);
    const patient = await this.patientsService.update(id, dto, tenantId, user.id);
    return {
      success: true,
      data: patient,
    };
  }

  private resolveTenantId(user: AuthenticatedUserContext): Types.ObjectId {
    const rawId = user.tenantId || user.hospitalId;
    if (rawId && Types.ObjectId.isValid(rawId)) {
      return new Types.ObjectId(rawId);
    }
    // Default tenant anchor for single-site development / platform super admin
    return new Types.ObjectId('6aa3f64974f6740b10b10001');
  }
}
