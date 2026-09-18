import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StockMovementType } from '@hms/types';

export type StockMovementDocument = StockMovement & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'stock_movements' })
export class StockMovement {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'InventoryItem', required: true, index: true })
  itemId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(StockMovementType),
    required: true,
    index: true,
  })
  type!: StockMovementType;

  @Prop({ type: String, required: false, trim: true })
  fromLocation?: string;

  @Prop({ type: String, required: false, trim: true })
  toLocation?: string;

  @Prop({ type: Number, required: true })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  balanceAfter!: number;

  @Prop({ type: String, required: false, trim: true })
  reason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  performedBy?: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  referenceId?: string;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);

StockMovementSchema.index({ tenantId: 1, itemId: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, createdAt: -1 });
