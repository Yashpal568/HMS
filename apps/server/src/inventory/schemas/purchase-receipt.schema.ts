import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PurchaseReceiptDocument = PurchaseReceipt & Document;

@Schema({ _id: false })
export class PurchaseReceiptItemSchemaClass {
  @Prop({ type: Types.ObjectId, ref: 'InventoryItem', required: true })
  itemId!: Types.ObjectId;

  @Prop({ type: String, required: false, trim: true })
  itemCode?: string;

  @Prop({ type: String, required: false, trim: true })
  itemName?: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantityReceived!: number;

  @Prop({ type: String, required: true, trim: true })
  lotNumber!: string;

  @Prop({ type: Date, required: false })
  expiryDate?: Date;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  unitPrice!: number;
}

const PurchaseReceiptItemMongooseSchema = SchemaFactory.createForClass(PurchaseReceiptItemSchemaClass);

@Schema({ timestamps: true, collection: 'purchase_receipts' })
export class PurchaseReceipt {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  grnNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true })
  poId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true, index: true })
  supplierId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receivedBy!: Types.ObjectId;

  @Prop({ type: [PurchaseReceiptItemMongooseSchema], default: [] })
  items!: PurchaseReceiptItemSchemaClass[];

  @Prop({ type: String, required: false, trim: true })
  notes?: string;

  @Prop({ type: Date, default: Date.now })
  receivedDate!: Date;
}

export const PurchaseReceiptSchema = SchemaFactory.createForClass(PurchaseReceipt);

PurchaseReceiptSchema.index({ tenantId: 1, grnNumber: 1 }, { unique: true });
PurchaseReceiptSchema.index({ tenantId: 1, poId: 1 });
PurchaseReceiptSchema.index({ tenantId: 1, receivedDate: -1 });
