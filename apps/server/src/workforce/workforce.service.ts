import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema.js';
import {
  WorkforceSchedule,
  WorkforceScheduleDocument,
} from './schemas/workforce-schedule.schema.js';
import {
  AttendanceRecord,
  AttendanceRecordDocument,
} from './schemas/attendance-record.schema.js';
import {
  LeaveRequest,
  LeaveRequestDocument,
} from './schemas/leave-request.schema.js';
import { User, UserDocument, UserStatus } from '../users/schemas/user.schema.js';
import bcrypt from 'bcryptjs';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  CreateScheduleDto,
  CheckInDto,
  CheckOutDto,
  AttendanceCorrectionRequestDto,
  ReviewCorrectionDto,
  CreateLeaveRequestDto,
  ReviewLeaveRequestDto,
  EmployeeQueryDto,
} from './dto/workforce.dto.js';
import {
  AttendanceStatus,
  AttendanceCorrectionStatus,
  LeaveStatus,
  EmploymentStatus,
} from '@hms/types';

@Injectable()
export class WorkforceService {
  private readonly logger = new Logger(WorkforceService.name);

  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(WorkforceSchedule.name)
    private readonly scheduleModel: Model<WorkforceScheduleDocument>,
    @InjectModel(AttendanceRecord.name)
    private readonly attendanceModel: Model<AttendanceRecordDocument>,
    @InjectModel(LeaveRequest.name)
    private readonly leaveModel: Model<LeaveRequestDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ==========================================================================
  // 1. Employee Management
  // ==========================================================================

  async getEmployees(tenantId: string, query: EmployeeQueryDto) {
    const tId = new Types.ObjectId(tenantId);
    const filter: Record<string, unknown> = { tenantId: tId };

    if (query.departmentId) {
      filter.departmentId = new Types.ObjectId(query.departmentId);
    }
    if (query.staffType) {
      filter.staffType = query.staffType;
    }
    if (query.status) {
      filter.employmentStatus = query.status;
    }
    if (query.search) {
      const s = query.search.trim();
      filter.$or = [
        { firstName: { $regex: s, $options: 'i' } },
        { lastName: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { employeeId: { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      this.employeeModel
        .find(filter)
        .populate('departmentId', 'name code')
        .populate('teamId', 'name code')
        .populate('userId', 'email role status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.employeeModel.countDocuments(filter).exec(),
    ]);

    return {
      employees,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getEmployeeById(tenantId: string, id: string) {
    const employee = await this.employeeModel
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) })
      .populate('departmentId', 'name code')
      .populate('teamId', 'name code')
      .populate('managerId', 'firstName lastName employeeId')
      .populate('userId', 'email role status mustChangePassword lastLoginAt')
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }
    return employee;
  }

  async createEmployee(tenantId: string, dto: CreateEmployeeDto) {
    const tId = new Types.ObjectId(tenantId);
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check duplicate email within tenant
    const existing = await this.employeeModel
      .findOne({ tenantId: tId, email: normalizedEmail })
      .exec();
    if (existing) {
      throw new ConflictException(`Employee with email '${normalizedEmail}' already exists in this hospital.`);
    }

    // Generate sequential Employee ID: EMP-YYYY-NNNNNN
    const year = new Date().getFullYear();
    const count = await this.employeeModel.countDocuments({ tenantId: tId }).exec();
    const seq = String(count + 1).padStart(4, '0');
    const employeeId = `EMP-${year}-${seq}`;

    const created = new this.employeeModel({
      tenantId: tId,
      employeeId,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: normalizedEmail,
      phone: dto.phone?.trim(),
      departmentId: dto.departmentId ? new Types.ObjectId(dto.departmentId) : undefined,
      teamId: dto.teamId ? new Types.ObjectId(dto.teamId) : undefined,
      designation: dto.designation.trim(),
      staffType: dto.staffType,
      employmentStatus: EmploymentStatus.ACTIVE,
      managerId: dto.managerId ? new Types.ObjectId(dto.managerId) : undefined,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
      assignedRoles: dto.assignedRoles || (dto.role ? [dto.role] : [dto.staffType]),
      assignedWorkspaces: dto.assignedWorkspaces || (dto.role ? [dto.role] : [dto.staffType]),
      accessScope: dto.accessScope || 'HOSPITAL_WIDE',
    });

    const saved = await created.save();

    if (dto.createUser) {
      try {
        const userRole = (dto.role || dto.staffType).toUpperCase();
        const tempPassword = 'TempPassword@2026';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(tempPassword, salt);

        const newUser = await this.userModel.create({
          email: normalizedEmail,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          role: userRole,
          permissions: [],
          status: UserStatus.ACTIVE,
          hospitalId: tId,
          employeeId: saved._id,
          phone: dto.phone?.trim(),
          mustChangePassword: true,
        });

        saved.userId = (newUser as any)._id;
        await saved.save();
      } catch (err) {
        this.logger.warn(`Could not auto-create user for employee ${saved.employeeId}: ${(err as Error).message}`);
      }
    }

    return saved;
  }

  async updateEmployee(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    const updatePayload: Record<string, unknown> = {};
    if (dto.firstName) updatePayload.firstName = dto.firstName.trim();
    if (dto.lastName) updatePayload.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) updatePayload.phone = dto.phone.trim();
    if (dto.departmentId) updatePayload.departmentId = new Types.ObjectId(dto.departmentId);
    if (dto.teamId) updatePayload.teamId = new Types.ObjectId(dto.teamId);
    if (dto.designation) updatePayload.designation = dto.designation.trim();
    if (dto.staffType) updatePayload.staffType = dto.staffType;
    if (dto.employmentStatus) updatePayload.employmentStatus = dto.employmentStatus;
    if (dto.managerId) updatePayload.managerId = new Types.ObjectId(dto.managerId);
    if (dto.assignedRoles) updatePayload.assignedRoles = dto.assignedRoles;
    if (dto.assignedWorkspaces) updatePayload.assignedWorkspaces = dto.assignedWorkspaces;
    if (dto.accessScope) updatePayload.accessScope = dto.accessScope;

    const updated = await this.employeeModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
        { $set: updatePayload },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Employee not found.');
    }
    return updated;
  }

  async linkUser(tenantId: string, employeeId: string, userId: string) {
    const tId = new Types.ObjectId(tenantId);
    const empId = new Types.ObjectId(employeeId);
    const uId = new Types.ObjectId(userId);

    const [employee, user] = await Promise.all([
      this.employeeModel.findOne({ _id: empId, tenantId: tId }).exec(),
      this.userModel.findOne({ _id: uId, hospitalId: tId }).exec(),
    ]);

    if (!employee) throw new NotFoundException('Employee not found.');
    if (!user) throw new NotFoundException('User account not found.');

    employee.userId = uId;
    await employee.save();

    // Link back on user document
    await this.userModel.updateOne(
      { _id: uId },
      { $set: { employeeId: empId, department: employee.designation } },
    );

    return { success: true, message: 'User successfully linked to employee.' };
  }

  // ==========================================================================
  // 2. Workforce Scheduling & Shift Templates
  // ==========================================================================

  async getSchedules(tenantId: string, employeeId?: string, departmentId?: string) {
    const filter: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    };
    if (employeeId) {
      filter.employeeId = new Types.ObjectId(employeeId);
    }
    if (departmentId) {
      filter.departmentId = new Types.ObjectId(departmentId);
    }

    return this.scheduleModel
      .find(filter)
      .populate('employeeId', 'firstName lastName employeeId designation')
      .populate('departmentId', 'name code')
      .sort({ startTime: 1 })
      .exec();
  }

  async createSchedule(tenantId: string, dto: CreateScheduleDto) {
    const tId = new Types.ObjectId(tenantId);
    const empId = new Types.ObjectId(dto.employeeId);

    const employee = await this.employeeModel.findOne({ _id: empId, tenantId: tId }).exec();
    if (!employee) throw new NotFoundException('Employee not found.');

    // Check overnight shift condition: e.g. 22:00 -> 06:00
    const startHour = parseInt(dto.startTime.split(':')[0], 10);
    const endHour = parseInt(dto.endTime.split(':')[0], 10);
    const isOvernight = startHour > endHour;

    const schedule = new this.scheduleModel({
      tenantId: tId,
      employeeId: empId,
      departmentId: dto.departmentId
        ? new Types.ObjectId(dto.departmentId)
        : employee.departmentId,
      shiftType: dto.shiftType,
      startTime: dto.startTime.trim(),
      endTime: dto.endTime.trim(),
      isOvernight,
      daysOfWeek: dto.daysOfWeek || [1, 2, 3, 4, 5],
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      isActive: true,
    });

    return schedule.save();
  }

  // ==========================================================================
  // 3. Attendance & Corrections
  // ==========================================================================

  async getAttendanceRecords(tenantId: string, date: string, departmentId?: string) {
    const tId = new Types.ObjectId(tenantId);
    const query: Record<string, any> = { tenantId: tId, date };

    if (departmentId) {
      const deptEmployees = await this.employeeModel
        .find({ tenantId: tId, departmentId: new Types.ObjectId(departmentId) }, { _id: 1 })
        .exec();
      query.employeeId = { $in: deptEmployees.map((e) => e._id) };
    }

    const records = await this.attendanceModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeId designation departmentId')
      .sort({ 'employeeId.firstName': 1 })
      .exec();

    // Summary calculations
    let presentCount = 0;
    let lateCount = 0;
    let onLeaveCount = 0;
    let absentCount = 0;

    for (const r of records) {
      if (r.status === AttendanceStatus.PRESENT) presentCount++;
      else if (r.status === AttendanceStatus.LATE) {
        presentCount++;
        lateCount++;
      } else if (r.status === AttendanceStatus.ON_LEAVE) onLeaveCount++;
      else if (r.status === AttendanceStatus.ABSENT) absentCount++;
    }

    const totalActiveEmployees = await this.employeeModel
      .countDocuments({ tenantId: tId, employmentStatus: EmploymentStatus.ACTIVE })
      .exec();

    return {
      date,
      summary: {
        totalEmployees: totalActiveEmployees,
        present: presentCount,
        late: lateCount,
        onLeave: onLeaveCount,
        absent: Math.max(0, totalActiveEmployees - presentCount - onLeaveCount),
      },
      records,
    };
  }

  async checkIn(tenantId: string, dto: CheckInDto) {
    const tId = new Types.ObjectId(tenantId);
    const empId = new Types.ObjectId(dto.employeeId);
    const today = new Date().toISOString().split('T')[0];

    const employee = await this.employeeModel.findOne({ _id: empId, tenantId: tId }).exec();
    if (!employee) throw new NotFoundException('Employee not found.');

    let record = await this.attendanceModel
      .findOne({ tenantId: tId, employeeId: empId, date: today })
      .exec();

    const now = new Date();

    // Check active schedule for late detection
    const schedule = await this.scheduleModel
      .findOne({ tenantId: tId, employeeId: empId, isActive: true })
      .exec();

    let status = AttendanceStatus.PRESENT;
    let lateMinutes = 0;

    if (schedule && schedule.startTime) {
      const [schedHour, schedMin] = schedule.startTime.split(':').map(Number);
      const schedTime = new Date();
      schedTime.setHours(schedHour, schedMin, 0, 0);

      // Late threshold: > 15 minutes after shift start
      const diffMs = now.getTime() - schedTime.getTime();
      if (diffMs > 15 * 60 * 1000) {
        status = AttendanceStatus.LATE;
        lateMinutes = Math.round(diffMs / (60 * 1000));
      }
    }

    if (!record) {
      record = new this.attendanceModel({
        tenantId: tId,
        employeeId: empId,
        date: today,
        shiftId: schedule?._id,
        checkInTime: now,
        status,
        lateMinutes,
        method: dto.method || 'WEB',
        notes: dto.notes,
      });
    } else {
      record.checkInTime = now;
      record.status = status;
      record.lateMinutes = lateMinutes;
      if (dto.notes) record.notes = dto.notes;
    }

    return record.save();
  }

  async checkOut(tenantId: string, dto: CheckOutDto) {
    const tId = new Types.ObjectId(tenantId);
    const empId = new Types.ObjectId(dto.employeeId);
    const today = new Date().toISOString().split('T')[0];

    const record = await this.attendanceModel
      .findOne({ tenantId: tId, employeeId: empId, date: today })
      .exec();

    if (!record || !record.checkInTime) {
      throw new BadRequestException('No check-in record found for today. Please check in first.');
    }

    const now = new Date();
    record.checkOutTime = now;

    // Check early leave if schedule exists
    if (record.shiftId) {
      const schedule = await this.scheduleModel.findById(record.shiftId).exec();
      if (schedule && schedule.endTime && !schedule.isOvernight) {
        const [endHour, endMin] = schedule.endTime.split(':').map(Number);
        const shiftEnd = new Date();
        shiftEnd.setHours(endHour, endMin, 0, 0);

        if (now < shiftEnd) {
          const earlyMs = shiftEnd.getTime() - now.getTime();
          record.earlyLeaveMinutes = Math.round(earlyMs / (60 * 1000));
          if (record.earlyLeaveMinutes > 30) {
            record.status = AttendanceStatus.EARLY_LEAVE;
          }
        }
      }
    }

    return record.save();
  }

  async requestCorrection(
    tenantId: string,
    attendanceId: string,
    userId: string,
    dto: AttendanceCorrectionRequestDto,
  ) {
    const record = await this.attendanceModel
      .findOne({ _id: new Types.ObjectId(attendanceId), tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!record) throw new NotFoundException('Attendance record not found.');

    record.correction = {
      originalCheckIn: record.checkInTime,
      originalCheckOut: record.checkOutTime,
      correctedCheckIn: dto.correctedCheckIn ? new Date(dto.correctedCheckIn) : undefined,
      correctedCheckOut: dto.correctedCheckOut ? new Date(dto.correctedCheckOut) : undefined,
      reason: dto.reason.trim(),
      requestedBy: new Types.ObjectId(userId),
      requestedAt: new Date(),
      status: AttendanceCorrectionStatus.PENDING,
    };

    return record.save();
  }

  async reviewCorrection(
    tenantId: string,
    attendanceId: string,
    reviewerId: string,
    dto: ReviewCorrectionDto,
  ) {
    const record = await this.attendanceModel
      .findOne({ _id: new Types.ObjectId(attendanceId), tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!record || !record.correction) {
      throw new NotFoundException('No pending correction found for this attendance record.');
    }

    record.correction.reviewedBy = new Types.ObjectId(reviewerId);
    record.correction.reviewedAt = new Date();
    record.correction.reviewNote = dto.reviewNote?.trim();

    if (dto.action === 'APPROVE') {
      record.correction.status = AttendanceCorrectionStatus.APPROVED;
      if (record.correction.correctedCheckIn) {
        record.checkInTime = record.correction.correctedCheckIn;
      }
      if (record.correction.correctedCheckOut) {
        record.checkOutTime = record.correction.correctedCheckOut;
      }
      record.status = AttendanceStatus.PRESENT;
    } else {
      record.correction.status = AttendanceCorrectionStatus.REJECTED;
    }

    return record.save();
  }

  // ==========================================================================
  // 4. Leave Management
  // ==========================================================================

  async getLeaveRequests(tenantId: string, employeeId?: string, status?: LeaveStatus) {
    const filter: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
    };
    if (employeeId) {
      filter.employeeId = new Types.ObjectId(employeeId);
    }
    if (status) {
      filter.status = status;
    }

    return this.leaveModel
      .find(filter)
      .populate('employeeId', 'firstName lastName employeeId designation departmentId')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async createLeaveRequest(tenantId: string, dto: CreateLeaveRequestDto) {
    const tId = new Types.ObjectId(tenantId);
    const empId = new Types.ObjectId(dto.employeeId);

    const employee = await this.employeeModel.findOne({ _id: empId, tenantId: tId }).exec();
    if (!employee) throw new NotFoundException('Employee not found.');

    const leave = new this.leaveModel({
      tenantId: tId,
      employeeId: empId,
      leaveType: dto.leaveType,
      startDate: dto.startDate.trim(),
      endDate: dto.endDate.trim(),
      totalDays: dto.totalDays,
      reason: dto.reason.trim(),
      status: LeaveStatus.PENDING,
    });

    return leave.save();
  }

  async reviewLeaveRequest(
    tenantId: string,
    requestId: string,
    reviewerId: string,
    dto: ReviewLeaveRequestDto,
  ) {
    const leave = await this.leaveModel
      .findOne({ _id: new Types.ObjectId(requestId), tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!leave) throw new NotFoundException('Leave request not found.');

    leave.reviewedBy = new Types.ObjectId(reviewerId);
    leave.reviewedAt = new Date();

    if (dto.action === 'APPROVE') {
      leave.status = LeaveStatus.APPROVED;

      // Integrate with Attendance: mark all days in range as ON_LEAVE
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const current = new Date(start);

      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        await this.attendanceModel.findOneAndUpdate(
          { tenantId: leave.tenantId, employeeId: leave.employeeId, date: dateStr },
          {
            $set: {
              status: AttendanceStatus.ON_LEAVE,
              notes: `Approved leave: ${leave.leaveType}`,
            },
          },
          { upsert: true, new: true },
        );
        current.setDate(current.getDate() + 1);
      }
    } else {
      leave.status = LeaveStatus.REJECTED;
      leave.rejectionReason = dto.rejectionReason?.trim();
    }

    return leave.save();
  }
}
