import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventoryLocationDocument = InventoryLocation & Document;

@Schema({ timestamps: true, collection: 'inventory_locations' })
export class InventoryLocation {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ type: String, default: 'WAREHOUSE', trim: true })
  type!: string; // WAREHOUSE, PHARMACY, WARD, EMERGENCY

  @Prop({ type: Boolean, default: false })
  isDefault!: boolean;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InventoryLocationSchema =
  SchemaFactory.createForClass(InventoryLocation);

InventoryLocationSchema.index({ tenantId: 1, code: 1 }, { unique: true });
