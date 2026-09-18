import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmrService } from './emr.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '@hms/types';
import { CreateEncounterDto } from './dto/create-encounter.dto.js';
import { UpdateEncounterDto } from './dto/update-encounter.dto.js';
import { FinalizeEncounterDto } from './dto/finalize-encounter.dto.js';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  hospitalId?: string;
  permissions: string[];
}

@Controller('emr')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class EmrController {
  constructor(private readonly emrService: EmrService) {}

  /**
   * Start or resume consultation encounter for an appointment
   */
  @Post('encounters')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  @RequirePermissions('emr.create')
  async startEncounter(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateEncounterDto,
  ) {
    const result = await this.emrService.startOrGetEncounter(
      user.tenantId,
      user.userId,
      dto.appointmentId,
    );
    return {
      success: true,
      data: result.encounter,
      warnings: result.warnings,
      message: 'Consultation encounter active',
    };
  }

  /**
   * Get encounter by encounter ID
   */
  @Get('encounters/:id')
  @RequirePermissions('emr.read')
  async getEncounter(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const encounter = await this.emrService.getEncounterById(user.tenantId, id);
    return {
      success: true,
      data: encounter,
    };
  }

  /**
   * Get encounter by appointment ID
   */
  @Get('encounters/appointment/:appointmentId')
  @RequirePermissions('emr.read')
  async getEncounterByAppointment(
    @CurrentUser() user: RequestUser,
    @Param('appointmentId') appointmentId: string,
  ) {
    const encounter = await this.emrService.getEncounterByAppointment(
      user.tenantId,
      appointmentId,
    );
    return {
      success: true,
      data: encounter,
    };
  }

  /**
   * Save draft consultation notes, vitals, diagnoses, and prescriptions
   */
  @Patch('encounters/:id')
  @Roles(UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  @RequirePermissions('emr.update')
  async updateEncounter(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateEncounterDto,
  ) {
    const result = await this.emrService.updateEncounter(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
    return {
      success: true,
      data: result,
      message: 'Consultation draft saved successfully',
    };
  }

  /**
   * Finalize, seal, and complete consultation encounter
   */
  @Post('encounters/:id/finalize')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)
  @RequirePermissions('emr.update')
  async finalizeEncounter(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto?: FinalizeEncounterDto,
  ) {
    const result = await this.emrService.finalizeEncounter(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
    return {
      success: true,
      data: result,
      message: 'Consultation finalized and sealed successfully',
    };
  }

  /**
   * Get longitudinal encounter history for a patient
   */
  @Get('patients/:patientId/history')
  @RequirePermissions('emr.read')
  async getPatientHistory(
    @CurrentUser() user: RequestUser,
    @Param('patientId') patientId: string,
  ) {
    const encounters = await this.emrService.getPatientHistory(
      user.tenantId,
      patientId,
    );
    return {
      success: true,
      data: encounters,
    };
  }

  /**
   * Get all prescriptions for a patient
   */
  @Get('prescriptions/patient/:patientId')
  @RequirePermissions('prescriptions.read')
  async getPrescriptionsByPatient(
    @CurrentUser() user: RequestUser,
    @Param('patientId') patientId: string,
  ) {
    const prescriptions = await this.emrService.getPrescriptionsByPatient(
      user.tenantId,
      patientId,
    );
    return {
      success: true,
      data: prescriptions,
    };
  }

  /**
   * Get prescription for a specific encounter
   */
  @Get('prescriptions/encounter/:encounterId')
  @RequirePermissions('prescriptions.read')
  async getPrescriptionByEncounter(
    @CurrentUser() user: RequestUser,
    @Param('encounterId') encounterId: string,
  ) {
    const prescription = await this.emrService.getPrescriptionByEncounter(
      user.tenantId,
      encounterId,
    );
    return {
      success: true,
      data: prescription,
    };
  }
}
