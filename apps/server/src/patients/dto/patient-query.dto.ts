import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PatientStatus } from '@hms/types';

export class PatientQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(PatientStatus)
  @IsOptional()
  status?: PatientStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @IsOptional()
  today?: string;
}
