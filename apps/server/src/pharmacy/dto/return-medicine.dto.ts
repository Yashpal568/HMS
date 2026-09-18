import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';

export class ReturnMedicineDto {
  @IsString()
  @IsNotEmpty()
  dispenseId!: string;

  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
