import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { WardType } from '@hms/types';

export type WardDocument = Ward & Document;

@Schema({ timestamps: true, collection: 'wards' })
export class Ward {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({
    type: String,
    enum: Object.values(WardType),
    default: WardType.GENERAL,
    required: true,
  })
  type!: WardType;

  @Prop({ type: String, required: false, trim: true })
  floor?: string;

  @Prop({ type: Number, default: 0, min: 0 })
  totalBeds!: number;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export const WardSchema = SchemaFactory.createForClass(Ward);

WardSchema.index({ tenantId: 1, code: 1 }, { unique: true });
WardSchema.index({ tenantId: 1, type: 1, isActive: 1 });
