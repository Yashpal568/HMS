import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BedStatus } from '@hms/types';

export type BedDocument = Bed & Document;

@Schema({ timestamps: true, collection: 'beds' })
export class Bed {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  bedNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Ward', required: true, index: true })
  wardId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(BedStatus),
    default: BedStatus.AVAILABLE,
    required: true,
  })
  status!: BedStatus;

  @Prop({ type: Types.ObjectId, ref: 'Admission', required: false, default: null })
  currentAdmissionId?: Types.ObjectId | null;
}

export const BedSchema = SchemaFactory.createForClass(Bed);

BedSchema.index({ tenantId: 1, wardId: 1, bedNumber: 1 }, { unique: true });
BedSchema.index({ tenantId: 1, wardId: 1, status: 1 });
BedSchema.index({ tenantId: 1, status: 1 });
