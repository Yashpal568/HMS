import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { DischargeCondition } from '@hms/types';

export class DischargeDto {
  @IsNotEmpty({ message: 'dischargeSummary is required' })
  @IsString({ message: 'dischargeSummary must be a string' })
  dischargeSummary!: string;

  @IsNotEmpty({ message: 'dischargeCondition is required' })
  @IsEnum(DischargeCondition, { message: 'Invalid dischargeCondition' })
  dischargeCondition!: DischargeCondition;

  @IsOptional()
  @IsString({ message: 'followUpInstructions must be a string' })
  followUpInstructions?: string;
}
