import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InvoiceStatus, InvoiceItemType } from '@hms/types';

export type InvoiceDocument = Invoice & Document;

@Schema({ _id: false })
export class InvoiceLineItemSubdocument {
  @Prop({ type: Types.ObjectId, ref: 'HospitalService', required: false })
  serviceId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(InvoiceItemType),
    default: InvoiceItemType.CONSULTATION,
    required: true,
  })
  itemType!: InvoiceItemType;

  @Prop({ type: String, required: true, trim: true })
  description!: string;

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  discountAmount!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  taxAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  netAmount!: number;

  @Prop({ type: String, required: false, trim: true })
  referenceId?: string;
}

export const InvoiceLineItemSubdocumentSchema = SchemaFactory.createForClass(InvoiceLineItemSubdocument);

@Schema({ timestamps: true, collection: 'invoices' })
export class Invoice {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  invoiceNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Admission', required: false })
  admissionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Encounter', required: false })
  encounterId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: false })
  appointmentId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(InvoiceStatus),
    default: InvoiceStatus.ISSUED,
    required: true,
    index: true,
  })
  status!: InvoiceStatus;

  @Prop({ type: [InvoiceLineItemSubdocumentSchema], default: [] })
  items!: InvoiceLineItemSubdocument[];

  @Prop({ type: Number, required: true, min: 0 })
  subtotal!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  totalDiscount!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  totalTax!: number;

  @Prop({ type: Number, required: true, min: 0 })
  grandTotal!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  paidAmount!: number;

  @Prop({ type: Number, required: true, min: 0 })
  balanceDue!: number;

  @Prop({ type: Date, required: false })
  dueDate?: Date;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });
InvoiceSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
InvoiceSchema.index({ tenantId: 1, createdAt: -1 });
