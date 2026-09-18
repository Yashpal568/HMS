import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  LabOrderPriority,
  LabOrderStatus,
  LabResultFlag,
} from '@hms/types';

export type LabOrderDocument = LabOrder & Document;

@Schema({ _id: false })
export class LabResultItem {
  @Prop({ type: Types.ObjectId, ref: 'LabTest', required: true })
  testId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  parameterName!: string;

  @Prop({ type: String, required: true, trim: true })
  value!: string;

  @Prop({ type: Number, required: false })
  numericValue?: number;

  @Prop({ type: String, required: false, default: '', trim: true })
  unit?: string;

  @Prop({
    type: String,
    enum: Object.values(LabResultFlag),
    default: LabResultFlag.NORMAL,
  })
  flag!: LabResultFlag;

  @Prop({ type: String, required: false, trim: true })
  referenceRange?: string;

  @Prop({ type: String, required: false, trim: true })
  criticalRange?: string;
}

export const LabResultItemSchema = SchemaFactory.createForClass(LabResultItem);

@Schema({ timestamps: true, collection: 'lab_orders' })
export class LabOrder {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  orderNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: false })
  appointmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Admission', required: false })
  admissionId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'LabTest' }], required: true })
  testIds!: Types.ObjectId[];

  @Prop({
    type: String,
    enum: Object.values(LabOrderPriority),
    default: LabOrderPriority.ROUTINE,
    required: true,
  })
  priority!: LabOrderPriority;

  @Prop({
    type: String,
    enum: Object.values(LabOrderStatus),
    default: LabOrderStatus.ORDERED,
    required: true,
  })
  status!: LabOrderStatus;

  @Prop({ type: String, required: false, trim: true, uppercase: true })
  accessionNumber?: string;

  @Prop({ type: Date, required: false })
  sampleCollectedAt?: Date;

  @Prop({ type: String, required: false, trim: true })
  containerType?: string;

  @Prop({ type: String, required: false, trim: true })
  phlebotomistNotes?: string;

  @Prop({ type: [LabResultItemSchema], default: [] })
  results!: LabResultItem[];

  @Prop({ type: String, required: false, trim: true })
  technicianNotes?: string;

  @Prop({ type: String, required: false, trim: true })
  pathologistRemarks?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  verifiedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  verifiedAt?: Date;
}

export const LabOrderSchema = SchemaFactory.createForClass(LabOrder);

LabOrderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });
LabOrderSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });
LabOrderSchema.index({ tenantId: 1, status: 1, priority: 1, createdAt: -1 });
LabOrderSchema.index({ tenantId: 1, accessionNumber: 1 }, { sparse: true });
