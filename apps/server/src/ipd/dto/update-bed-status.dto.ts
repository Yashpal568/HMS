import { IsNotEmpty, IsEnum } from 'class-validator';
import { BedStatus } from '@hms/types';

export class UpdateBedStatusDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsEnum(BedStatus, { message: 'Invalid bed status' })
  status!: BedStatus;
}
