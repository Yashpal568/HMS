import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ServiceCategory } from '@hms/types';

export type HospitalServiceDocument = HospitalService & Document;

@Schema({ timestamps: true, collection: 'services' })
export class HospitalService {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({
    type: String,
    enum: Object.values(ServiceCategory),
    default: ServiceCategory.CONSULTATION,
    required: true,
  })
  category!: ServiceCategory;

  @Prop({ type: Number, required: true, min: 0 })
  standardRate!: number;

  @Prop({ type: Number, required: true, default: 0, min: 0, max: 100 })
  taxRatePercent!: number;

  @Prop({ type: String, required: false, trim: true, default: 'General' })
  department?: string;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const HospitalServiceSchema = SchemaFactory.createForClass(HospitalService);

HospitalServiceSchema.index({ tenantId: 1, code: 1 }, { unique: true });
HospitalServiceSchema.index({ tenantId: 1, category: 1 });
HospitalServiceSchema.index({ tenantId: 1, isActive: 1 });
