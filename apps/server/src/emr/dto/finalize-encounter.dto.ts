import { IsOptional, IsString } from 'class-validator';
import { UpdateEncounterDto } from './update-encounter.dto.js';

export class FinalizeEncounterDto extends UpdateEncounterDto {
  @IsOptional()
  @IsString()
  doctorNotes?: string;
}
