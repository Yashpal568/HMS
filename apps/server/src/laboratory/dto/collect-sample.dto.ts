import { IsString, IsOptional } from 'class-validator';

export class CollectSampleDto {
  @IsOptional()
  @IsString()
  containerType?: string;

  @IsOptional()
  @IsString()
  phlebotomistNotes?: string;
}
