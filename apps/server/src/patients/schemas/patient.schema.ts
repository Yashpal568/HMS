import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  PatientGender,
  BloodGroup,
  MaritalStatus,
  PatientStatus,
  AllergyCategory,
  AllergySeverity,
} from '@hms/types';

export type PatientDocument = Patient & Document;

@Schema({ _id: false })
export class PatientNameSubdocument {
  @Prop({ required: true, trim: true })
  first!: string;

  @Prop({ required: false, trim: true })
  middle?: string;

  @Prop({ required: true, trim: true })
  last!: string;
}

@Schema({ _id: false })
export class PatientAddressSubdocument {
  @Prop({ required: true, trim: true })
  street!: string;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ required: true, trim: true })
  state!: string;

  @Prop({ required: true, trim: true })
  postalCode!: string;

  @Prop({ required: true, trim: true, default: 'India' })
  country!: string;
}

@Schema({ _id: false })
export class PatientContactsSubdocument {
  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ required: false, trim: true })
  alternatePhone?: string;

  @Prop({ required: false, trim: true, lowercase: true })
  email?: string;

  @Prop({ type: PatientAddressSubdocument, required: true })
  address!: PatientAddressSubdocument;
}

@Schema({ _id: false })
export class EmergencyContactSubdocument {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  relationship!: string;

  @Prop({ required: true, trim: true })
  phone!: string;
}

@Schema({ _id: false })
export class PatientAllergySubdocument {
  @Prop({ required: true, trim: true })
  allergen!: string;

  @Prop({ type: String, enum: AllergyCategory, default: AllergyCategory.OTHER })
  category!: AllergyCategory;

  @Prop({ type: String, enum: AllergySeverity, default: AllergySeverity.MODERATE })
  severity!: AllergySeverity;

  @Prop({ required: false, trim: true })
  notes?: string;
}

@Schema({ timestamps: true, collection: 'patients' })
export class Patient {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, index: true })
  hospitalId?: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  uhid!: string;

  @Prop({ type: PatientNameSubdocument, required: true })
  name!: PatientNameSubdocument;

  @Prop({ type: Date, required: true })
  dateOfBirth!: Date;

  @Prop({ type: String, enum: PatientGender, required: true })
  gender!: PatientGender;

  @Prop({ type: String, enum: BloodGroup, default: BloodGroup.UNKNOWN })
  bloodGroup!: BloodGroup;

  @Prop({ type: String, enum: MaritalStatus, default: MaritalStatus.SINGLE })
  maritalStatus!: MaritalStatus;

  @Prop({ type: PatientContactsSubdocument, required: true })
  contacts!: PatientContactsSubdocument;

  @Prop({ type: EmergencyContactSubdocument, required: true })
  emergencyContact!: EmergencyContactSubdocument;

  @Prop({ type: [PatientAllergySubdocument], default: [] })
  allergies!: PatientAllergySubdocument[];

  @Prop({ type: String, enum: PatientStatus, default: PatientStatus.ACTIVE, index: true })
  status!: PatientStatus;

  @Prop({ type: String, required: false })
  createdBy?: string;

  @Prop({ type: String, required: false })
  updatedBy?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

// Multi-tenant compound indexes
PatientSchema.index({ tenantId: 1, uhid: 1 }, { unique: true });
PatientSchema.index({ tenantId: 1, 'contacts.phone': 1, dateOfBirth: 1 });
PatientSchema.index({ tenantId: 1, 'name.last': 1, 'name.first': 1 });
PatientSchema.index({ tenantId: 1, createdAt: -1 });
