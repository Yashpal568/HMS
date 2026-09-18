import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PrescriptionStatus } from '@hms/types';

export type PrescriptionDocument = Prescription & Document;

@Schema({ _id: false })
export class PrescriptionItemSubdocument {
  @Prop({ type: String, required: true })
  medicineName!: string;

  @Prop({ type: String, required: true })
  dosageForm!: string; // 'tablet' | 'capsule' | 'syrup' | 'injection' | etc.

  @Prop({ type: String, required: true })
  strength!: string; // '500mg', '10ml', etc.

  @Prop({ type: String, required: true })
  frequency!: string; // '1-0-1', 'OD', 'BD', 'TID', 'PRN', 'SOS'

  @Prop({ type: String, default: 'oral' })
  route!: string; // 'oral', 'topical', 'intravenous', etc.

  @Prop({ type: Number, required: true, min: 1 })
  durationDays!: number;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: String, default: 'After meals' })
  instructions!: string;
}

@Schema({ timestamps: true, collection: 'prescriptions' })
export class Prescription {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Encounter', required: true, index: true })
  encounterId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(PrescriptionStatus),
    default: PrescriptionStatus.ACTIVE,
    index: true,
  })
  status!: PrescriptionStatus;

  @Prop({ type: [PrescriptionItemSubdocument], default: [] })
  items!: PrescriptionItemSubdocument[];

  @Prop({ type: String, required: false })
  notes?: string;
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);

// Compound Indexes for fast retrieval and tenant isolation
PrescriptionSchema.index({ tenantId: 1, encounterId: 1 });
PrescriptionSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });
PrescriptionSchema.index({ tenantId: 1, doctorId: 1, createdAt: -1 });
PrescriptionSchema.index({ tenantId: 1, status: 1 });
