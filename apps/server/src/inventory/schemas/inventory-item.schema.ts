import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InventoryCategory } from '@hms/types';

export type InventoryItemDocument = InventoryItem & Document;

@Schema({ timestamps: true, collection: 'inventory_items' })
export class InventoryItem {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  itemCode!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: Object.values(InventoryCategory),
    required: true,
  })
  category!: InventoryCategory;

  @Prop({ type: String, required: true, trim: true })
  uom!: string;

  @Prop({ type: Number, required: true, default: 20, min: 0 })
  reorderLevel!: number;

  @Prop({ type: Number, required: false, default: 50, min: 0 })
  reorderQuantity?: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  stockOnHand!: number;

  @Prop({ type: Number, required: false, default: 0, min: 0 })
  unitCost?: number;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const InventoryItemSchema = SchemaFactory.createForClass(InventoryItem);

InventoryItemSchema.index({ tenantId: 1, itemCode: 1 }, { unique: true });
InventoryItemSchema.index({ tenantId: 1, category: 1, stockOnHand: 1 });
InventoryItemSchema.index({ tenantId: 1, name: 1 });
