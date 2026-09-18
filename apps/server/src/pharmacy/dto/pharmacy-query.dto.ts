import { IsOptional, IsString } from 'class-validator';

export class PrescriptionsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class BatchesQueryDto {
  @IsOptional()
  @IsString()
  medicineId?: string;

  @IsOptional()
  @IsString()
  alert?: 'near_expiry' | 'expired' | 'low_stock';

  @IsOptional()
  @IsString()
  search?: string;
}

export class MedicinesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  schedule?: string;
}
