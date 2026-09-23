import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  EncounterStatus,
  EncounterType,
  DiagnosisType,
  DiagnosisStatus,
  type BmiCategory,
} from '@hms/types';

export type EncounterDocument = Encounter & Document;

@Schema({ _id: false })
export class VitalsSubdocument {
  @Prop({ type: Number, required: false })
  bpSystolic?: number;

  @Prop({ type: Number, required: false })
  bpDiastolic?: number;

  @Prop({ type: Number, required: false })
  pulse?: number;

  @Prop({ type: Number, required: false })
  temperature?: number;

  @Prop({ type: Number, required: false })
  respiratoryRate?: number;

  @Prop({ type: Number, required: false })
  spO2?: number;

  @Prop({ type: Number, required: false })
  weight?: number; // kg

  @Prop({ type: Number, required: false })
  height?: number; // cm

  @Prop({ type: Number, required: false })
  bmi?: number;

  @Prop({
    type: String,
    enum: ['underweight', 'normal', 'overweight', 'obese'],
    required: false,
  })
  bmiCategory?: BmiCategory;
}

@Schema({ _id: false })
export class DiagnosisSubdocument {
  @Prop({ type: String, required: true })
  code!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({
    type: String,
    enum: Object.values(DiagnosisType),
    default: DiagnosisType.PRIMARY,
  })
  type!: DiagnosisType;

  @Prop({
    type: String,
    enum: Object.values(DiagnosisStatus),
    default: DiagnosisStatus.CONFIRMED,
  })
  status!: DiagnosisStatus;
}

@Schema({ _id: false })
export class InvestigationSubdocument {
  @Prop({ type: String, required: true })
  testName!: string;

  @Prop({ type: String, required: false })
  notes?: string;

  @Prop({ type: String, enum: ['routine', 'urgent'], default: 'routine' })
  urgency!: 'routine' | 'urgent';
}

@Schema({ timestamps: true, collection: 'encounters' })
export class Encounter {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: false, index: true })
  hospitalId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: false, index: true })
  appointmentId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(EncounterType),
    default: EncounterType.OPD,
    index: true,
  })
  encounterType!: EncounterType;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId!: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true, index: true })
  department?: string;

  @Prop({
    type: String,
    enum: Object.values(EncounterStatus),
    default: EncounterStatus.DRAFT,
    index: true,
  })
  status!: EncounterStatus;

  @Prop({ type: VitalsSubdocument, default: () => ({}) })
  vitals!: VitalsSubdocument;

  @Prop({ type: [String], default: [] })
  chiefComplaints!: string[];

  @Prop({ type: String, required: false })
  historyOfPresentIllness?: string;

  @Prop({ type: String, required: false })
  examinationNotes?: string;

  @Prop({ type: [DiagnosisSubdocument], default: [] })
  diagnoses!: DiagnosisSubdocument[];

  @Prop({ type: [InvestigationSubdocument], default: [] })
  investigations!: InvestigationSubdocument[];

  @Prop({ type: Date, required: false })
  startedAt?: Date;

  @Prop({ type: Date, required: false })
  endedAt?: Date;

  @Prop({ type: Date, required: false })
  finalizedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  finalizedBy?: Types.ObjectId;
}

export const EncounterSchema = SchemaFactory.createForClass(Encounter);

// Compound Unique Index: One encounter per appointment per tenant (sparse for walk-ins)
EncounterSchema.index({ tenantId: 1, appointmentId: 1 }, { unique: true, sparse: true });

// Performance Query Indexes
EncounterSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });
EncounterSchema.index({ tenantId: 1, doctorId: 1, createdAt: -1 });
EncounterSchema.index({ tenantId: 1, department: 1, createdAt: -1 });
EncounterSchema.index({ tenantId: 1, encounterType: 1, createdAt: -1 });
EncounterSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
