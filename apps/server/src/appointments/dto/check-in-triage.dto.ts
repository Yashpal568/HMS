import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QueuePriority } from '@hms/types';

export class TriageVitalsDto {
  @IsOptional()
  @IsNumber()
  bpSystolic?: number;

  @IsOptional()
  @IsNumber()
  bpDiastolic?: number;

  @IsOptional()
  @IsNumber()
  pulse?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  respiratoryRate?: number;

  @IsOptional()
  @IsNumber()
  spO2?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  bmi?: number;

  @IsOptional()
  @IsString()
  bmiCategory?: string;
}

export class CheckInTriageDto {
  @IsOptional()
  @IsEnum(QueuePriority)
  priority?: QueuePriority;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  triageNotes?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TriageVitalsDto)
  vitals?: TriageVitalsDto;
}
