import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsMongoId,
} from 'class-validator';
import { OnboardingStep } from '@hms/types';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsOptional()
  headEmployeeId?: string;

  @IsString()
  @IsOptional()
  type?: string;
}

export class UpdateDepartmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsOptional()
  headEmployeeId?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateTeamDto {
  @IsMongoId()
  @IsNotEmpty()
  departmentId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsOptional()
  teamLeadEmployeeId?: string;
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsOptional()
  teamLeadEmployeeId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AdvanceOnboardingDto {
  @IsEnum(OnboardingStep)
  @IsNotEmpty()
  completedStep!: OnboardingStep;

  @IsEnum(OnboardingStep)
  @IsOptional()
  nextStep?: OnboardingStep;

  @IsOptional()
  stepData?: Record<string, unknown>;
}
