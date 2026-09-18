import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GoodsReceiptItemInputDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantityReceived!: number;

  @IsString()
  @IsNotEmpty()
  lotNumber!: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice?: number;
}

export class CreateGoodsReceiptDto {
  @IsString()
  @IsNotEmpty()
  poId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemInputDto)
  items!: GoodsReceiptItemInputDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
