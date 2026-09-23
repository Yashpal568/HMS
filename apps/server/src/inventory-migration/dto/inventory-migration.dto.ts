import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsNumber,
} from 'class-validator';

export class UploadInventoryCsvDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsNumber()
  fileSizeBytes!: number;

  @IsString()
  @IsNotEmpty()
  csvContent!: string;
}

export class SaveMappingDto {
  @IsObject()
  @IsNotEmpty()
  mapping!: Record<string, string>;
}

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  type?: string;
}
