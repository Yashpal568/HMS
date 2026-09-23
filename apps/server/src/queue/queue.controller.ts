import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { QueueService } from './queue.service.js';
import {
  CheckInQueueDto,
  CallNextPatientDto,
  SkipQueueEntryDto,
  QueryQueueDto,
} from './dto/queue.dto.js';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

@Controller('queue')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * Check in patient to live OPD queue (allocates sequential token)
   */
  @Post('check-in')
  @RequirePermissions('appointments.create')
  async checkInPatient(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CheckInQueueDto,
  ) {
    const entry = await this.queueService.checkInPatient(req.user.tenantId, dto);
    return {
      success: true,
      data: entry,
      message: `Patient successfully checked in with token ${entry.formattedToken}`,
    };
  }

  /**
   * Clinician calls next waiting patient (concurrency-safe atomic dequeue)
   */
  @Post('call-next')
  @RequirePermissions('clinical.encounters.write')
  async callNextPatient(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CallNextPatientDto,
  ) {
    const entry = await this.queueService.callNextPatient(
      req.user.tenantId,
      req.user.id,
      dto,
    );
    return {
      success: true,
      data: entry,
      message: entry
        ? `Called patient with token ${entry.formattedToken}`
        : 'No patients waiting in queue',
    };
  }

  /**
   * Transition entry to IN_CONSULTATION
   */
  @Patch('entries/:id/start')
  @RequirePermissions('clinical.encounters.write')
  async startConsultation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const entry = await this.queueService.startConsultation(
      req.user.tenantId,
      id,
      req.user.id,
    );
    return {
      success: true,
      data: entry,
      message: `Consultation started for token ${entry.formattedToken}`,
    };
  }

  /**
   * Transition entry to COMPLETED
   */
  @Patch('entries/:id/complete')
  @RequirePermissions('clinical.encounters.write')
  async completeConsultation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const entry = await this.queueService.completeConsultation(
      req.user.tenantId,
      id,
      req.user.id,
    );
    return {
      success: true,
      data: entry,
      message: `Consultation completed for token ${entry.formattedToken}`,
    };
  }

  /**
   * Skip patient (absent when called)
   */
  @Patch('entries/:id/skip')
  @RequirePermissions('clinical.encounters.write')
  async skipPatient(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: SkipQueueEntryDto,
  ) {
    const entry = await this.queueService.skipPatient(
      req.user.tenantId,
      id,
      req.user.id,
      dto,
    );
    return {
      success: true,
      data: entry,
      message: `Token ${entry.formattedToken} marked as SKIPPED`,
    };
  }

  /**
   * Query doctor's active queue
   */
  @Get('doctor')
  @RequirePermissions('clinical.encounters.read')
  async getDoctorQueue(
    @Req() req: AuthenticatedRequest,
    @Query() query: QueryQueueDto,
  ) {
    const doctorId = query.doctorId || req.user.id;
    const result = await this.queueService.getDoctorQueue(
      req.user.tenantId,
      doctorId,
      query,
    );
    return {
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        summary: result.summary,
      },
    };
  }

  /**
   * Query department queue telemetry
   */
  @Get('department/:department')
  @RequirePermissions('appointments.read')
  async getDepartmentQueue(
    @Req() req: AuthenticatedRequest,
    @Param('department') department: string,
    @Query('date') date?: string,
  ) {
    const result = await this.queueService.getDepartmentQueue(
      req.user.tenantId,
      department,
      date,
    );
    return {
      success: true,
      data: result,
    };
  }
}
