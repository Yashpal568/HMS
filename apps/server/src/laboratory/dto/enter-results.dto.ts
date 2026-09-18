import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResultParamInput {
  @IsString()
  @IsNotEmpty()
  testId!: string;

  @IsString()
  @IsNotEmpty()
  parameterName!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class EnterLabResultsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one result parameter must be entered' })
  @ValidateNested({ each: true })
  @Type(() => ResultParamInput)
  results!: ResultParamInput[];

  @IsOptional()
  @IsString()
  technicianNotes?: string;
}
