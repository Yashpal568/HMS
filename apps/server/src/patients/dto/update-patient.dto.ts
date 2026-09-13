import {
  IsOptional,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PatientGender,
  BloodGroup,
  MaritalStatus,
  PatientStatus,
} from '@hms/types';
import {
  PatientNameDto,
  PatientContactsDto,
  EmergencyContactDto,
  PatientAllergyDto,
} from './create-patient.dto.js';

export class UpdatePatientDto {
  @ValidateNested()
  @Type(() => PatientNameDto)
  @IsOptional()
  name?: PatientNameDto;

  @IsDateString({}, { message: 'A valid date of birth (YYYY-MM-DD) is required.' })
  @IsOptional()
  dateOfBirth?: string;

  @IsEnum(PatientGender, { message: 'Gender must be male, female, or other.' })
  @IsOptional()
  gender?: PatientGender;

  @IsEnum(BloodGroup, { message: 'Invalid blood group.' })
  @IsOptional()
  bloodGroup?: BloodGroup;

  @IsEnum(MaritalStatus, { message: 'Invalid marital status.' })
  @IsOptional()
  maritalStatus?: MaritalStatus;

  @ValidateNested()
  @Type(() => PatientContactsDto)
  @IsOptional()
  contacts?: PatientContactsDto;

  @ValidateNested()
  @Type(() => EmergencyContactDto)
  @IsOptional()
  emergencyContact?: EmergencyContactDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientAllergyDto)
  @IsOptional()
  allergies?: PatientAllergyDto[];

  @IsEnum(PatientStatus, { message: 'Invalid patient status.' })
  @IsOptional()
  status?: PatientStatus;
}
