import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { DosageForm, DrugSchedule } from '@hms/types';

export class CreateMedicineDto {
  @IsString()
  @IsNotEmpty()
  brandName!: string;

  @IsString()
  @IsNotEmpty()
  genericName!: string;

  @IsEnum(DosageForm)
  dosageForm!: DosageForm;

  @IsString()
  @IsNotEmpty()
  strength!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsOptional()
  @IsEnum(DrugSchedule)
  schedule?: DrugSchedule;

  @IsOptional()
  @IsString()
  storageConditions?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;
}
