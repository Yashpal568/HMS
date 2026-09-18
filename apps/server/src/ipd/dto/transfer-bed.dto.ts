import { IsNotEmpty, IsMongoId, IsString } from 'class-validator';

export class TransferBedDto {
  @IsNotEmpty({ message: 'destinationBedId is required' })
  @IsMongoId({ message: 'destinationBedId must be a valid MongoDB ObjectId' })
  destinationBedId!: string;

  @IsNotEmpty({ message: 'reason is required' })
  @IsString({ message: 'reason must be a string' })
  reason!: string;
}
