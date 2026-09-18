import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true, collection: 'suppliers' })
export class Supplier {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: false, trim: true })
  contactPerson?: string;

  @Prop({ type: String, required: true, trim: true })
  phone!: string;

  @Prop({ type: String, required: false, trim: true })
  email?: string;

  @Prop({ type: String, required: false, trim: true })
  taxId?: string;

  @Prop({ type: String, required: false, trim: true })
  address?: string;

  @Prop({ type: String, required: false, trim: true, default: 'Net 30' })
  paymentTerms?: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

SupplierSchema.index({ tenantId: 1, name: 1 });
