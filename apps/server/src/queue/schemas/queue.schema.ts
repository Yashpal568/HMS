import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { QueueStatus, QueueSession } from '@hms/types';

export type QueueDocument = Queue & Document;

@Schema({ timestamps: true, collection: 'queues' })
export class Queue {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: false, index: true })
  hospitalId?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, index: true })
  department!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId!: Types.ObjectId;

  @Prop({ type: String, required: true, index: true }) // YYYY-MM-DD
  date!: string;

  @Prop({
    type: String,
    enum: Object.values(QueueSession),
    default: QueueSession.MORNING,
    required: true,
  })
  session!: QueueSession;

  @Prop({
    type: String,
    enum: Object.values(QueueStatus),
    default: QueueStatus.ACTIVE,
    index: true,
  })
  status!: QueueStatus;

  @Prop({ type: Number, required: false })
  currentServingToken?: number;

  @Prop({ type: Types.ObjectId, ref: 'QueueEntry', required: false })
  currentServingEntryId?: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  totalTokensIssued!: number;

  @Prop({ type: Number, default: 0 })
  totalCompleted!: number;

  @Prop({ type: Number, default: 0 })
  totalSkipped!: number;
}

export const QueueSchema = SchemaFactory.createForClass(Queue);

// Compound Indexes for Enterprise Scoping & Fast Lookup
QueueSchema.index({ tenantId: 1, doctorId: 1, date: 1, session: 1 }, { unique: true });
QueueSchema.index({ tenantId: 1, department: 1, date: 1, status: 1 });
QueueSchema.index({ tenantId: 1, date: 1, status: 1 });
