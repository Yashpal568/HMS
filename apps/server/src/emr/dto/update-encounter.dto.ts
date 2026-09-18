import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiagnosisType, DiagnosisStatus } from '@hms/types';

export class VitalsDto {
  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(260)
  bpSystolic?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(160)
  bpDiastolic?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(220)
  pulse?: number;

  @IsOptional()
  @IsNumber()
  @Min(80)
  @Max(115)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  respiratoryRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(100)
  spO2?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(400)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(260)
  height?: number;
}

export class DiagnosisDto {
  @IsString()
  code!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(DiagnosisType)
  type?: DiagnosisType;

  @IsOptional()
  @IsEnum(DiagnosisStatus)
  status?: DiagnosisStatus;
}

export class InvestigationDto {
  @IsString()
  testName!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['routine', 'urgent'])
  urgency?: 'routine' | 'urgent';
}

export class PrescriptionItemDto {
  @IsString()
  medicineName!: string;

  @IsString()
  dosageForm!: string;

  @IsString()
  strength!: string;

  @IsString()
  frequency!: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsNumber()
  @Min(1)
  durationDays!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class UpdateEncounterDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalsDto)
  vitals?: VitalsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chiefComplaints?: string[];

  @IsOptional()
  @IsString()
  historyOfPresentIllness?: string;

  @IsOptional()
  @IsString()
  examinationNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosisDto)
  diagnoses?: DiagnosisDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvestigationDto)
  investigations?: InvestigationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  prescriptionItems?: PrescriptionItemDto[];

  @IsOptional()
  @IsString()
  prescriptionNotes?: string;
}
