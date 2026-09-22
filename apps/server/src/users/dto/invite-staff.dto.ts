import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { StaffRole } from '@hms/types';

export class InviteStaffDto {
  @IsNotEmpty({ message: 'First name is required.' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @IsNotEmpty({ message: 'Last name is required.' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName!: string;

  @IsNotEmpty({ message: 'A valid email address is required.' })
  @IsEmail({}, { message: 'Invalid email address format.' })
  email!: string;

  @IsNotEmpty({ message: 'Staff role is required.' })
  @IsEnum(StaffRole, { message: 'Role must be a valid hospital staff role.' })
  role!: StaffRole;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

export class ListStaffQueryDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
