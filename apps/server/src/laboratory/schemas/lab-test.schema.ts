import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { LabTestCategory } from '@hms/types';

export type LabTestDocument = LabTest & Document;

@Schema({ _id: false })
export class LabTestParameter {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true })
  unit!: string;

  @Prop({ type: Number, required: false })
  referenceMin?: number;

  @Prop({ type: Number, required: false })
  referenceMax?: number;

  @Prop({ type: Number, required: false })
  criticalLow?: number;

  @Prop({ type: Number, required: false })
  criticalHigh?: number;

  @Prop({ type: [String], required: false, default: [] })
  textOptions?: string[];
}

export const LabTestParameterSchema = SchemaFactory.createForClass(LabTestParameter);

@Schema({ timestamps: true, collection: 'lab_tests' })
export class LabTest {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: Object.values(LabTestCategory),
    required: true,
  })
  category!: LabTestCategory;

  @Prop({ type: String, required: true, trim: true })
  specimenType!: string;

  @Prop({ type: [LabTestParameterSchema], default: [] })
  parameters!: LabTestParameter[];

  @Prop({ type: Number, required: true, default: 0 })
  tariffPrice!: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;
}

export const LabTestSchema = SchemaFactory.createForClass(LabTest);

LabTestSchema.index({ tenantId: 1, code: 1 }, { unique: true });
LabTestSchema.index({ tenantId: 1, category: 1 });
LabTestSchema.index({ tenantId: 1, isActive: 1 });
