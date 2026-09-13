import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class DoctorScheduleDto {
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek!: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:MM 24-hour format (e.g. "09:00")',
  })
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be in HH:MM 24-hour format (e.g. "13:00")',
  })
  endTime!: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  slotDurationMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  maxPatients?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
