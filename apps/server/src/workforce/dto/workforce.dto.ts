import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsMongoId,
  IsDateString,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import {
  StaffType,
  EmploymentStatus,
  ResourceScope,
  ShiftType,
  AttendanceMethod,
  LeaveType,
} from '@hms/types';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsMongoId()
  @IsOptional()
  departmentId?: string;

  @IsMongoId()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsNotEmpty()
  designation!: string;

  @IsEnum(StaffType)
  @IsNotEmpty()
  staffType!: StaffType;

  @IsMongoId()
  @IsOptional()
  managerId?: string;

  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @IsArray()
  @IsOptional()
  assignedRoles?: string[];

  @IsArray()
  @IsOptional()
  assignedWorkspaces?: string[];

  @IsEnum(ResourceScope)
  @IsOptional()
  accessScope?: ResourceScope;

  @IsBoolean()
  @IsOptional()
  createUser?: boolean;

  @IsString()
  @IsOptional()
  role?: string;
}

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsMongoId()
  @IsOptional()
  departmentId?: string;

  @IsMongoId()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsEnum(StaffType)
  @IsOptional()
  staffType?: StaffType;

  @IsEnum(EmploymentStatus)
  @IsOptional()
  employmentStatus?: EmploymentStatus;

  @IsMongoId()
  @IsOptional()
  managerId?: string;

  @IsArray()
  @IsOptional()
  assignedRoles?: string[];

  @IsArray()
  @IsOptional()
  assignedWorkspaces?: string[];

  @IsEnum(ResourceScope)
  @IsOptional()
  accessScope?: ResourceScope;
}

export class LinkUserDto {
  @IsMongoId()
  @IsNotEmpty()
  userId!: string;
}

export class CreateScheduleDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsMongoId()
  @IsOptional()
  departmentId?: string;

  @IsEnum(ShiftType)
  @IsNotEmpty()
  shiftType!: ShiftType;

  @IsString()
  @IsNotEmpty()
  startTime!: string; // HH:mm format, e.g. "22:00"

  @IsString()
  @IsNotEmpty()
  endTime!: string; // HH:mm format, e.g. "06:00"

  @IsArray()
  @IsNotEmpty()
  daysOfWeek!: number[]; // [1, 2, 3, 4, 5]

  @IsDateString()
  @IsNotEmpty()
  effectiveFrom!: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}

export class CheckInDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsEnum(AttendanceMethod)
  @IsOptional()
  method?: AttendanceMethod;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CheckOutDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsEnum(AttendanceMethod)
  @IsOptional()
  method?: AttendanceMethod;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AttendanceCorrectionRequestDto {
  @IsDateString()
  @IsOptional()
  correctedCheckIn?: string;

  @IsDateString()
  @IsOptional()
  correctedCheckOut?: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ReviewCorrectionDto {
  @IsString()
  @IsNotEmpty()
  action!: 'APPROVE' | 'REJECT';

  @IsString()
  @IsOptional()
  reviewNote?: string;
}

export class CreateLeaveRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeId!: string;

  @IsEnum(LeaveType)
  @IsNotEmpty()
  leaveType!: LeaveType;

  @IsString()
  @IsNotEmpty()
  startDate!: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  endDate!: string; // YYYY-MM-DD

  @IsNumber()
  @Min(0.5)
  totalDays!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ReviewLeaveRequestDto {
  @IsString()
  @IsNotEmpty()
  action!: 'APPROVE' | 'REJECT';

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class EmployeeQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsEnum(StaffType)
  @IsOptional()
  staffType?: StaffType;

  @IsEnum(EmploymentStatus)
  @IsOptional()
  status?: EmploymentStatus;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
