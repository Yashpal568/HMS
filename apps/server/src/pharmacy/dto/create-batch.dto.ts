import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @IsString()
  @IsNotEmpty()
  batchNumber!: string;

  @IsDateString()
  @IsNotEmpty()
  expiryDate!: string;

  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @IsNumber()
  @Min(1)
  initialQuantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCostPrice?: number;

  @IsNumber()
  @Min(0)
  unitSalePrice!: number;
}
