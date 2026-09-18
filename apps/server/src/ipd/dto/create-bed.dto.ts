import { IsNotEmpty, IsString, IsMongoId, IsEnum, IsOptional } from 'class-validator';
import { BedStatus } from '@hms/types';

export class CreateBedDto {
  @IsNotEmpty({ message: 'bedNumber is required' })
  @IsString({ message: 'bedNumber must be a string' })
  bedNumber!: string;

  @IsNotEmpty({ message: 'wardId is required' })
  @IsMongoId({ message: 'wardId must be a valid MongoDB ObjectId' })
  wardId!: string;

  @IsOptional()
  @IsEnum(BedStatus, { message: 'Invalid bed status' })
  status?: BedStatus;
}
