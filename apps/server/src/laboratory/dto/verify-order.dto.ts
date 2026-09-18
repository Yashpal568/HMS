import { IsString, IsOptional } from 'class-validator';

export class VerifyLabOrderDto {
  @IsOptional()
  @IsString()
  pathologistRemarks?: string;
}
