import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../users/schemas/user.schema.js';

export class RegisterDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email!: string;

  @IsNotEmpty({ message: 'Password cannot be empty.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;

  @IsNotEmpty({ message: 'First name cannot be empty.' })
  @IsString()
  firstName!: string;

  @IsNotEmpty({ message: 'Last name cannot be empty.' })
  @IsString()
  lastName!: string;

  @IsEnum(UserRole, { message: 'Invalid hospital role specified.' })
  role!: UserRole;

  @IsOptional()
  @IsString()
  hospitalId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
