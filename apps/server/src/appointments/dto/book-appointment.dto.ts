import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { AppointmentType } from '@hms/types';

export class BookAppointmentDto {
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'scheduledAt must be in YYYY-MM-DD format',
  })
  scheduledAt!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/, {
    message: 'timeSlot must be in HH:MM - HH:MM format (e.g. "09:00 - 09:15")',
  })
  timeSlot!: string;

  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;
}
