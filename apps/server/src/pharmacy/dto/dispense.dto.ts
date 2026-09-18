import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DispenseItemDto {
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class DispenseDto {
  @IsString()
  @IsNotEmpty()
  prescriptionId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one medicine item must be selected for dispensing' })
  @ValidateNested({ each: true })
  @Type(() => DispenseItemDto)
  items!: DispenseItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
