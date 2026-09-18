import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MedicineBatchDocument = MedicineBatch & Document;

@Schema({ timestamps: true, collection: 'medicine_batches' })
export class MedicineBatch {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Medicine', required: true, index: true })
  medicineId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  batchNumber!: string;

  @Prop({ type: Date, required: true, index: true })
  expiryDate!: Date;

  @Prop({ type: Date, required: false })
  manufactureDate?: Date;

  @Prop({ type: Number, required: true, min: 0 })
  initialQuantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  currentQuantity!: number;

  @Prop({ type: Number, required: false, default: 0, min: 0 })
  unitCostPrice?: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitSalePrice!: number;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const MedicineBatchSchema = SchemaFactory.createForClass(MedicineBatch);

MedicineBatchSchema.index({ tenantId: 1, medicineId: 1, batchNumber: 1 }, { unique: true });
MedicineBatchSchema.index({ tenantId: 1, medicineId: 1, expiryDate: 1 });
MedicineBatchSchema.index({ tenantId: 1, expiryDate: 1 });
MedicineBatchSchema.index({ tenantId: 1, currentQuantity: 1 });
