import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { QueueEntryStatus, QueuePriority } from '@hms/types';

export type QueueEntryDocument = QueueEntry & Document;

@Schema({ timestamps: true, collection: 'queue_entries' })
export class QueueEntry {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Queue', required: true, index: true })
  queueId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: false, index: true })
  appointmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Encounter', required: false, index: true })
  encounterId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, index: true })
  department!: string;

  @Prop({ type: String, required: true, index: true }) // YYYY-MM-DD
  date!: string;

  @Prop({ type: Number, required: true })
  tokenNumber!: number;

  @Prop({ type: String, required: true, trim: true }) // e.g. "A-021"
  formattedToken!: string;

  @Prop({
    type: String,
    enum: Object.values(QueuePriority),
    default: QueuePriority.NORMAL,
    index: true,
  })
  priority!: QueuePriority;

  @Prop({ type: Number, default: 0, index: true }) // 0 = Normal, 10 = Urgent, 50 = Emergency
  priorityWeight!: number;

  @Prop({
    type: String,
    enum: Object.values(QueueEntryStatus),
    default: QueueEntryStatus.WAITING,
    index: true,
  })
  status!: QueueEntryStatus;

  @Prop({ type: String, required: false, trim: true })
  chiefComplaint?: string;

  @Prop({ type: String, required: false, trim: true })
  triageNotes?: string;

  @Prop({ type: Date, default: Date.now })
  checkedInAt!: Date;

  @Prop({ type: Date, required: false })
  calledAt?: Date;

  @Prop({ type: Date, required: false })
  consultationStartedAt?: Date;

  @Prop({ type: Date, required: false })
  completedAt?: Date;

  @Prop({ type: Date, required: false })
  skippedAt?: Date;

  @Prop({ type: Date, required: false })
  cancelledAt?: Date;

  @Prop({ type: String, required: false, trim: true })
  cancelledReason?: string;

  @Prop({ type: Number, required: false })
  estimatedWaitMinutes?: number;
}

export const QueueEntrySchema = SchemaFactory.createForClass(QueueEntry);

// Compound Indexes for Concurrency-Safe Atomic Dequeue & Fast Dashboards
QueueEntrySchema.index(
  { tenantId: 1, doctorId: 1, date: 1, status: 1, priorityWeight: -1, tokenNumber: 1 },
  { name: 'idx_queue_call_next' },
);
QueueEntrySchema.index(
  { tenantId: 1, queueId: 1, status: 1, tokenNumber: 1 },
  { name: 'idx_queue_status_token' },
);
QueueEntrySchema.index(
  { tenantId: 1, department: 1, date: 1, status: 1 },
  { name: 'idx_queue_dept_status' },
);
QueueEntrySchema.index(
  { tenantId: 1, patientId: 1, date: 1 },
  { name: 'idx_queue_patient_date' },
);
QueueEntrySchema.index(
  { tenantId: 1, appointmentId: 1 },
  { unique: true, sparse: true, name: 'idx_queue_appointment' },
);
