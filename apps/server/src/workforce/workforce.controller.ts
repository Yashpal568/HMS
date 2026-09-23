import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WorkforceService } from './workforce.service.js';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  LinkUserDto,
  CreateScheduleDto,
  CheckInDto,
  CheckOutDto,
  AttendanceCorrectionRequestDto,
  ReviewCorrectionDto,
  CreateLeaveRequestDto,
  ReviewLeaveRequestDto,
  EmployeeQueryDto,
} from './dto/workforce.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { LeaveStatus } from '@hms/types';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  hospitalId?: string;
}

@Controller('workforce')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class WorkforceController {
  constructor(private readonly workforceService: WorkforceService) {}

  // --------------------------------------------------------------------------
  // Employees
  // --------------------------------------------------------------------------

  @Get('employees')
  @Roles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getEmployees(
    @CurrentUser() user: RequestUser,
    @Query() query: EmployeeQueryDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const result = await this.workforceService.getEmployees(tenantId, query);
    return { success: true, data: result.employees, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } };
  }

  @Get('employees/:id')
  @Roles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE')
  async getEmployeeById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const employee = await this.workforceService.getEmployeeById(tenantId, id);
    return { success: true, data: employee };
  }

  @Post('employees')
  @Roles('HOSPITAL_ADMIN')
  @RequirePermissions('users.create')
  async createEmployee(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateEmployeeDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const created = await this.workforceService.createEmployee(tenantId, dto);
    return { success: true, data: created, message: 'Employee profile created successfully.' };
  }

  @Patch('employees/:id')
  @Roles('HOSPITAL_ADMIN')
  @RequirePermissions('users.update')
  async updateEmployee(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const updated = await this.workforceService.updateEmployee(tenantId, id, dto);
    return { success: true, data: updated, message: 'Employee updated successfully.' };
  }

  @Post('employees/:id/link-user')
  @Roles('HOSPITAL_ADMIN')
  @RequirePermissions('users.update')
  async linkUser(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: LinkUserDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const result = await this.workforceService.linkUser(tenantId, id, dto.userId);
    return { success: true, message: result.message };
  }

  // --------------------------------------------------------------------------
  // Workforce Scheduling
  // --------------------------------------------------------------------------

  @Get('schedules')
  @Roles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getSchedules(
    @CurrentUser() user: RequestUser,
    @Query('employeeId') employeeId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const schedules = await this.workforceService.getSchedules(tenantId, employeeId, departmentId);
    return { success: true, data: schedules };
  }

  @Post('schedules')
  @Roles('HOSPITAL_ADMIN')
  async createSchedule(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateScheduleDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const schedule = await this.workforceService.createSchedule(tenantId, dto);
    return { success: true, data: schedule, message: 'Schedule created successfully.' };
  }

  // --------------------------------------------------------------------------
  // Attendance & Corrections
  // --------------------------------------------------------------------------

  @Get('attendance')
  @Roles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getAttendance(
    @CurrentUser() user: RequestUser,
    @Query('date') dateQuery?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const date = dateQuery || new Date().toISOString().split('T')[0];
    const result = await this.workforceService.getAttendanceRecords(tenantId, date, departmentId);
    return { success: true, data: result };
  }

  @Post('attendance/check-in')
  async checkIn(
    @CurrentUser() user: RequestUser,
    @Body() dto: CheckInDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const record = await this.workforceService.checkIn(tenantId, dto);
    return { success: true, data: record, message: 'Check-in recorded.' };
  }

  @Post('attendance/check-out')
  async checkOut(
    @CurrentUser() user: RequestUser,
    @Body() dto: CheckOutDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const record = await this.workforceService.checkOut(tenantId, dto);
    return { success: true, data: record, message: 'Check-out recorded.' };
  }

  @Post('attendance/:id/correction')
  async requestCorrection(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AttendanceCorrectionRequestDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const updated = await this.workforceService.requestCorrection(tenantId, id, user.userId, dto);
    return { success: true, data: updated, message: 'Correction request submitted.' };
  }

  @Post('attendance/:id/review-correction')
  @Roles('HOSPITAL_ADMIN')
  async reviewCorrection(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewCorrectionDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const updated = await this.workforceService.reviewCorrection(tenantId, id, user.userId, dto);
    return { success: true, data: updated, message: `Correction request ${dto.action.toLowerCase()}d.` };
  }

  // --------------------------------------------------------------------------
  // Leave Management
  // --------------------------------------------------------------------------

  @Get('leave')
  @Roles('HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getLeaveRequests(
    @CurrentUser() user: RequestUser,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: LeaveStatus,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const leaves = await this.workforceService.getLeaveRequests(tenantId, employeeId, status);
    return { success: true, data: leaves };
  }

  @Post('leave')
  async createLeaveRequest(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const leave = await this.workforceService.createLeaveRequest(tenantId, dto);
    return { success: true, data: leave, message: 'Leave request submitted successfully.' };
  }

  @Post('leave/:id/review')
  @Roles('HOSPITAL_ADMIN')
  async reviewLeaveRequest(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveRequestDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const leave = await this.workforceService.reviewLeaveRequest(tenantId, id, user.userId, dto);
    return { success: true, data: leave, message: `Leave request ${dto.action.toLowerCase()}d.` };
  }
}
