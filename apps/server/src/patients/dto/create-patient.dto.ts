import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsEmail,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PatientGender,
  BloodGroup,
  MaritalStatus,
  AllergyCategory,
  AllergySeverity,
} from '@hms/types';

export class PatientNameDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  first!: string;

  @IsString()
  @IsOptional()
  middle?: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  last!: string;
}

export class PatientAddressDto {
  @IsString()
  @IsNotEmpty({ message: 'Street address is required.' })
  street!: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required.' })
  city!: string;

  @IsString()
  @IsNotEmpty({ message: 'State is required.' })
  state!: string;

  @IsString()
  @IsNotEmpty({ message: 'Postal code is required.' })
  postalCode!: string;

  @IsString()
  @IsOptional()
  country?: string;
}

export class PatientContactsDto {
  @IsString()
  @IsNotEmpty({ message: 'Primary phone number is required.' })
  phone!: string;

  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsOptional()
  email?: string;

  @ValidateNested()
  @Type(() => PatientAddressDto)
  @IsNotEmpty({ message: 'Patient address details are required.' })
  address!: PatientAddressDto;
}

export class EmergencyContactDto {
  @IsString()
  @IsNotEmpty({ message: 'Emergency contact person name is required.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Relationship with patient is required.' })
  relationship!: string;

  @IsString()
  @IsNotEmpty({ message: 'Emergency contact phone number is required.' })
  phone!: string;
}

export class PatientAllergyDto {
  @IsString()
  @IsNotEmpty({ message: 'Allergen name is required.' })
  allergen!: string;

  @IsEnum(AllergyCategory, { message: 'Invalid allergy category.' })
  category!: AllergyCategory;

  @IsEnum(AllergySeverity, { message: 'Invalid allergy severity.' })
  severity!: AllergySeverity;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePatientDto {
  @ValidateNested()
  @Type(() => PatientNameDto)
  @IsNotEmpty({ message: 'Patient name details are required.' })
  name!: PatientNameDto;

  @IsDateString({}, { message: 'A valid date of birth (YYYY-MM-DD) is required.' })
  @IsNotEmpty({ message: 'Date of birth is required.' })
  dateOfBirth!: string;

  @IsEnum(PatientGender, { message: 'Gender must be male, female, or other.' })
  @IsNotEmpty({ message: 'Biological sex/gender is required.' })
  gender!: PatientGender;

  @IsEnum(BloodGroup, { message: 'Invalid blood group.' })
  @IsOptional()
  bloodGroup?: BloodGroup;

  @IsEnum(MaritalStatus, { message: 'Invalid marital status.' })
  @IsOptional()
  maritalStatus?: MaritalStatus;

  @ValidateNested()
  @Type(() => PatientContactsDto)
  @IsNotEmpty({ message: 'Contact details are required.' })
  contacts!: PatientContactsDto;

  @ValidateNested()
  @Type(() => EmergencyContactDto)
  @IsNotEmpty({ message: 'Emergency contact details are required.' })
  emergencyContact!: EmergencyContactDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatientAllergyDto)
  @IsOptional()
  allergies?: PatientAllergyDto[];
}
