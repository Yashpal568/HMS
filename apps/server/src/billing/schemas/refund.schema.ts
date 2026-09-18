import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RefundStatus } from '@hms/types';

export type RefundDocument = Refund & Document;

@Schema({ timestamps: true, collection: 'refunds' })
export class Refund {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  refundNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true, index: true })
  invoiceId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payment', required: false })
  paymentId?: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0.01 })
  amount!: number;

  @Prop({ type: String, required: true, trim: true })
  reason!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requestedBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  approvedBy?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(RefundStatus),
    default: RefundStatus.REQUESTED,
    required: true,
    index: true,
  })
  status!: RefundStatus;

  @Prop({ type: Date, required: false })
  approvedAt?: Date;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);

RefundSchema.index({ tenantId: 1, refundNumber: 1 }, { unique: true });
RefundSchema.index({ tenantId: 1, invoiceId: 1 });
RefundSchema.index({ tenantId: 1, status: 1 });
RefundSchema.index({ tenantId: 1, createdAt: -1 });
