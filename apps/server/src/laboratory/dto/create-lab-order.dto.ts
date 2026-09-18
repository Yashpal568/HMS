import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { LabOrderPriority } from '@hms/types';

export class CreateLabOrderDto {
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one test must be selected for the requisition' })
  @IsString({ each: true })
  testIds!: string[];

  @IsOptional()
  @IsEnum(LabOrderPriority)
  priority?: LabOrderPriority;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  admissionId?: string;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;
}
