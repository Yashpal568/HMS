import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { QueueEntryStatus, QueuePriority, QueueSession } from '@hms/types';

export class CheckInQueueDto {
  @IsMongoId()
  @IsNotEmpty()
  patientId!: string;

  @IsMongoId()
  @IsNotEmpty()
  doctorId!: string;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsMongoId()
  @IsOptional()
  appointmentId?: string;

  @IsEnum(QueuePriority)
  @IsOptional()
  priority?: QueuePriority;

  @IsString()
  @IsOptional()
  chiefComplaint?: string;

  @IsString()
  @IsOptional()
  triageNotes?: string;

  @IsString()
  @IsOptional()
  date?: string; // YYYY-MM-DD

  @IsEnum(QueueSession)
  @IsOptional()
  session?: QueueSession;
}

export class CallNextPatientDto {
  @IsString()
  @IsOptional()
  date?: string; // YYYY-MM-DD

  @IsEnum(QueueSession)
  @IsOptional()
  session?: QueueSession;
}

export class SkipQueueEntryDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class QueryQueueDto {
  @IsString()
  @IsOptional()
  date?: string;

  @IsMongoId()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsEnum(QueueEntryStatus)
  @IsOptional()
  status?: QueueEntryStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
