import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LabTestCategory } from '@hms/types';

export class LabTestParamDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsOptional()
  @IsNumber()
  referenceMin?: number;

  @IsOptional()
  @IsNumber()
  referenceMax?: number;

  @IsOptional()
  @IsNumber()
  criticalLow?: number;

  @IsOptional()
  @IsNumber()
  criticalHigh?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  textOptions?: string[];
}

export class CreateLabTestDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(LabTestCategory)
  category!: LabTestCategory;

  @IsString()
  @IsNotEmpty()
  specimenType!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabTestParamDto)
  parameters!: LabTestParamDto[];

  @IsNumber()
  tariffPrice!: number;
}
