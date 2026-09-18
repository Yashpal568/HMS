import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DispensingRecordDocument = DispensingRecord & Document;

@Schema({ _id: false })
export class DispensedItemSubdocument {
  @Prop({ type: Types.ObjectId, ref: 'Medicine', required: true })
  medicineId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  medicineName!: string;

  @Prop({ type: Types.ObjectId, ref: 'MedicineBatch', required: true })
  batchId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  batchNumber!: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: String, required: false, trim: true })
  dosageForm?: string;

  @Prop({ type: String, required: false, trim: true })
  strength?: string;

  @Prop({ type: String, required: false, trim: true })
  instructions?: string;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  unitSalePrice!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  totalPrice!: number;
}

export const DispensedItemSubdocumentSchema = SchemaFactory.createForClass(DispensedItemSubdocument);

@Schema({ timestamps: true, collection: 'dispensing_records' })
export class DispensingRecord {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  dispenseNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Prescription', required: true, index: true })
  prescriptionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  pharmacistId!: Types.ObjectId;

  @Prop({ type: [DispensedItemSubdocumentSchema], default: [] })
  items!: DispensedItemSubdocument[];

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  totalAmount!: number;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;

  @Prop({ type: Date, default: Date.now })
  dispensedAt!: Date;
}

export const DispensingRecordSchema = SchemaFactory.createForClass(DispensingRecord);

DispensingRecordSchema.index({ tenantId: 1, dispenseNumber: 1 }, { unique: true });
DispensingRecordSchema.index({ tenantId: 1, prescriptionId: 1 });
DispensingRecordSchema.index({ tenantId: 1, patientId: 1, dispensedAt: -1 });
