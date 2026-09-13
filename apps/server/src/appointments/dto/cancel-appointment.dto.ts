import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CancelAppointmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Cancellation reason is required' })
  @MinLength(3, { message: 'Cancellation reason must be at least 3 characters' })
  reason!: string;
}
