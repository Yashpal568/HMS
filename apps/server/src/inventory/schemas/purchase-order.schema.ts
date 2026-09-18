import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PurchaseOrderStatus } from '@hms/types';

export type PurchaseOrderDocument = PurchaseOrder & Document;

@Schema({ _id: false })
export class PurchaseOrderItemSchemaClass {
  @Prop({ type: Types.ObjectId, ref: 'InventoryItem', required: true })
  itemId!: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  itemCode?: string;

  @Prop({ type: String, required: false, trim: true })
  itemName?: string;

  @Prop({ type: String, required: false, trim: true })
  uom?: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantityOrdered!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  quantityReceived!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice!: number;

  @Prop({ type: Number, required: true, min: 0 })
  lineTotal!: number;
}

const PurchaseOrderItemMongooseSchema = SchemaFactory.createForClass(PurchaseOrderItemSchemaClass);

@Schema({ timestamps: true, collection: 'purchase_orders' })
export class PurchaseOrder {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  poNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true, index: true })
  supplierId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(PurchaseOrderStatus),
    default: PurchaseOrderStatus.SUBMITTED,
    required: true,
  })
  status!: PurchaseOrderStatus;

  @Prop({ type: [PurchaseOrderItemMongooseSchema], default: [] })
  items!: PurchaseOrderItemSchemaClass[];

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  totalAmount!: number;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdById?: Types.ObjectId;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);

PurchaseOrderSchema.index({ tenantId: 1, poNumber: 1 }, { unique: true });
PurchaseOrderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ tenantId: 1, supplierId: 1 });
