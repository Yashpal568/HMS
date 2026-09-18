import { IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateEncounterDto {
  @IsNotEmpty({ message: 'appointmentId is required' })
  @IsMongoId({ message: 'appointmentId must be a valid MongoDB ObjectId' })
  appointmentId!: string;
}
