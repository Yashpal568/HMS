import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { AppointmentsService } from './appointments.service.js';
import { BookAppointmentDto } from './dto/book-appointment.dto.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';
import { DoctorScheduleDto } from './dto/doctor-schedule.dto.js';
import { AppointmentQueryDto } from './dto/appointment-query.dto.js';
import { CheckInTriageDto } from './dto/check-in-triage.dto.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: Record<string, any>;
  message?: string;
}

@Controller('appointments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * Helper to derive tenantId from cryptographically verified user context
   */
  private getTenantId(user: any): string {
    return user.hospitalId || user.tenantId || '6aa3f64974f6740b10b10001';
  }

  /**
   * List available clinicians/doctors
   */
  @Get('doctors')
  @RequirePermissions('appointments.read')
  async getDoctors(@CurrentUser() user: any): Promise<ApiResponse<any>> {
    const tenantId = this.getTenantId(user);
    const doctors = await this.appointmentsService.getDoctors(tenantId);
    return { success: true, data: doctors };
  }

  /**
   * List doctor schedule rosters
   */
  @Get('schedules')
  @RequirePermissions('appointments.read')
  async getDoctorSchedules(
    @CurrentUser() user: any,
    @Query('doctorId') doctorId?: string,
  ): Promise<ApiResponse<any>> {
    const tenantId = this.getTenantId(user);
    const schedules = await this.appointmentsService.getDoctorSchedules(tenantId, doctorId);
    return { success: true, data: schedules };
  }

  /**
   * Configure/Update doctor schedule roster
   */
  @Post('schedules')
  @RequirePermissions('hospital.manage')
  @HttpCode(HttpStatus.OK)
  async upsertDoctorSchedule(
    @CurrentUser() user: any,
    @Body() dto: DoctorScheduleDto,
  ): Promise<ApiResponse<any>> {
    const tenantId = this.getTenantId(user);
    const schedule = await this.appointmentsService.upsertDoctorSchedule(
      tenantId,
      user.id,
      dto,
    );
    return {
      success: true,
      data: schedule,
      message: 'Doctor schedule roster updated successfully',
    };
  }

  /**
   * Query available slots for a doctor on a specific date
   */
  @Get('slots')
  @RequirePermissions('appointments.read')
  async getAvailableSlots(
    @CurrentUser() user: any,
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ): Promise<ApiResponse<any>> {
    const tenantId = this.getTenantId(user);
    const result = await this.appointmentsService.getAvailableSlots(tenantId, doctorId, date);
    return { success: true, data: result };
  }

  /**
   * Book a new outpatient appointment
   */
  @Post()
  @RequirePermissions('appointments.create')
  @HttpCode(HttpStatus.CREATED)
  async bookAppointment(
    @CurrentUser() user: any,
    @Body() dto: BookAppointmentDto,
  ): Promise<ApiResponse<any>> {
    const tenantId = this.getTenantId(user);
    const appointment = await this.appointmentsService.bookAppointment(tenantId, user.id, dto);
    return {
      success: true,
      data: appointment,
      message: `Appointment booked successfully. Token #${appointment.tokenNumber} issued.`,
    };
  }

  /**
   * Search and filter OPD queue appointments
   */
  @Get()
  @RequirePermissions('appointments.read')
  async findAppointments(
    @CurrentUser() user: any,
    @Query() query: AppointmentQueryDto,
  ): Promise<ApiResponse<any>> {
    const tenantId = this.getTenantId(user);
    const result = await this.appointmentsService.findAppointments(tenantId, query);
    return {
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 50,
        summary: result.summary,
      },
    };
  }

  /**
   * Retrieve single appointment by ID
   */
  @Get(':id')
  @RequirePermissions('appointments.read')
  async getAppointmentById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<ApiResponse<any>> {
    const tenantId = this.getTenantId(user);
    const appointment = await this.appointmentsService.getAppointmentById(tenantId, id);
    return { success: true, data: appointment };
  }

  /**
   * Reception Check-In Action with optional clinical triage
   */
  @Post(':id/check-in')
  @RequirePermissions('appointments.update')
  @HttpCode(HttpStatus.OK)
  async checkInAppointment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto?: CheckInTriageDto,
  ): Promise<ApiResponse<any>> {
    const tenantId = this.getTenantId(user);
    const appointment = await this.appointmentsService.checkInAppointment(
      tenantId,
      user.id,
      id,
      dto,
    );
    return {
      success: true,
      data: appointment,
      message: `Patient checked in. Token #${appointment.tokenNumber} is active in queue.`,
    };
  }

  /**
   * Cancel appointment with reason
   */
  @Post(':id/cancel')
  @RequirePermissions('appointments.update')
  @HttpCode(HttpStatus.OK)
  async cancelAppointment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<ApiResponse<any>> {
    const tenantId = this.getTenantId(user);
    const appointment = await this.appointmentsService.cancelAppointment(
      tenantId,
      user.id,
      id,
      dto.reason,
    );
    return {
      success: true,
      data: appointment,
      message: 'Appointment cancelled successfully',
    };
  }
}
