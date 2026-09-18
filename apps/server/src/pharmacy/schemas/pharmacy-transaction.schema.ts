import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PharmacyTransactionType } from '@hms/types';

export type PharmacyTransactionDocument = PharmacyTransaction & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'pharmacy_transactions' })
export class PharmacyTransaction {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MedicineBatch', required: true, index: true })
  batchId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Medicine', required: true, index: true })
  medicineId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(PharmacyTransactionType),
    required: true,
  })
  type!: PharmacyTransactionType;

  @Prop({ type: Number, required: true })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  balanceAfter!: number;

  @Prop({ type: String, required: false, trim: true })
  referenceId?: string;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  performedBy?: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt!: Date;
}

export const PharmacyTransactionSchema = SchemaFactory.createForClass(PharmacyTransaction);

PharmacyTransactionSchema.index({ tenantId: 1, batchId: 1, createdAt: -1 });
PharmacyTransactionSchema.index({ tenantId: 1, medicineId: 1, createdAt: -1 });
PharmacyTransactionSchema.index({ tenantId: 1, type: 1 });
