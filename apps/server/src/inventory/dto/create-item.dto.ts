import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryCategory } from '@hms/types';

export class CreateItemDto {
  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(InventoryCategory)
  category!: InventoryCategory;

  @IsString()
  @IsNotEmpty()
  uom!: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorderLevel!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorderQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  initialStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitCost?: number;
}
