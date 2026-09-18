import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StockAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @IsString()
  @IsIn(['loss', 'gain'])
  type!: 'loss' | 'gain';

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
