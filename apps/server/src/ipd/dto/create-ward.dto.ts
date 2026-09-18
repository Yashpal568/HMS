import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { WardType } from '@hms/types';

export class CreateWardDto {
  @IsNotEmpty({ message: 'name is required' })
  @IsString({ message: 'name must be a string' })
  name!: string;

  @IsNotEmpty({ message: 'code is required' })
  @IsString({ message: 'code must be a string' })
  code!: string;

  @IsNotEmpty({ message: 'type is required' })
  @IsEnum(WardType, { message: 'Invalid ward type' })
  type!: WardType;

  @IsOptional()
  @IsString({ message: 'floor must be a string' })
  floor?: string;
}
