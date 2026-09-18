import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DosageForm, DrugSchedule } from '@hms/types';

export type MedicineDocument = Medicine & Document;

@Schema({ timestamps: true, collection: 'medicines' })
export class Medicine {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  brandName!: string;

  @Prop({ type: String, required: true, trim: true })
  genericName!: string;

  @Prop({
    type: String,
    enum: Object.values(DosageForm),
    required: true,
  })
  dosageForm!: DosageForm;

  @Prop({ type: String, required: true, trim: true })
  strength!: string;

  @Prop({ type: String, required: true, trim: true })
  category!: string;

  @Prop({
    type: String,
    enum: Object.values(DrugSchedule),
    default: DrugSchedule.PRESCRIPTION,
    required: true,
  })
  schedule!: DrugSchedule;

  @Prop({ type: String, required: false, trim: true })
  storageConditions?: string;

  @Prop({ type: Number, required: true, default: 50, min: 0 })
  minStockLevel!: number;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const MedicineSchema = SchemaFactory.createForClass(Medicine);

MedicineSchema.index({ tenantId: 1, genericName: 1, brandName: 1 });
MedicineSchema.index({ tenantId: 1, brandName: 1 });
MedicineSchema.index({ tenantId: 1, category: 1 });
