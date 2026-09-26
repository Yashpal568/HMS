import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppointmentStatus, AppointmentType, QueuePriority } from '@hms/types';

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true, collection: 'appointments' })
export class Appointment {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false })
  hospitalId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  department!: string;

  @Prop({ required: true, type: Number })
  tokenNumber!: number;

  @Prop({ required: true, type: Date, index: true })
  scheduledAt!: Date;

  @Prop({ required: true, trim: true })
  timeSlot!: string;

  @Prop({
    type: String,
    enum: Object.values(AppointmentType),
    default: AppointmentType.NEW,
  })
  type!: AppointmentType;

  @Prop({
    type: String,
    enum: Object.values(AppointmentStatus),
    default: AppointmentStatus.SCHEDULED,
    index: true,
  })
  status!: AppointmentStatus;

  @Prop({
    type: String,
    enum: Object.values(QueuePriority),
    default: QueuePriority.NORMAL,
    index: true,
  })
  triagePriority?: QueuePriority;

  @Prop({ type: Object, required: false })
  triageVitals?: Record<string, any>;

  @Prop({ required: false, trim: true })
  triageNotes?: string;

  @Prop({ required: false, trim: true })
  chiefComplaint?: string;

  @Prop({ required: false, type: Date })
  checkedInAt?: Date;

  @Prop({ required: false, trim: true })
  cancelledReason?: string;

  @Prop({ required: false, type: Date })
  cancelledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  cancelledBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Compound multi-tenant indexes
AppointmentSchema.index({ tenantId: 1, doctorId: 1, scheduledAt: 1, timeSlot: 1 });
AppointmentSchema.index({ tenantId: 1, doctorId: 1, scheduledAt: 1, tokenNumber: 1 });
AppointmentSchema.index({ tenantId: 1, patientId: 1, scheduledAt: -1 });
AppointmentSchema.index({ tenantId: 1, status: 1, scheduledAt: 1 });
AppointmentSchema.index({ tenantId: 1, department: 1, scheduledAt: 1 });
