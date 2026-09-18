import { IsNotEmpty, IsMongoId, IsString, IsEnum, IsOptional } from 'class-validator';
import { AdmissionSource } from '@hms/types';

export class CreateAdmissionDto {
  @IsNotEmpty({ message: 'patientId is required' })
  @IsMongoId({ message: 'patientId must be a valid MongoDB ObjectId' })
  patientId!: string;

  @IsNotEmpty({ message: 'attendingDoctorId is required' })
  @IsMongoId({ message: 'attendingDoctorId must be a valid MongoDB ObjectId' })
  attendingDoctorId!: string;

  @IsNotEmpty({ message: 'bedId is required' })
  @IsMongoId({ message: 'bedId must be a valid MongoDB ObjectId' })
  bedId!: string;

  @IsNotEmpty({ message: 'admittingDiagnosis is required' })
  @IsString({ message: 'admittingDiagnosis must be a string' })
  admittingDiagnosis!: string;

  @IsOptional()
  @IsEnum(AdmissionSource, { message: 'Invalid admissionSource' })
  admissionSource?: AdmissionSource;
}
