import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BedAllocationDocument = BedAllocation & Document;

@Schema({ timestamps: true, collection: 'bed_allocations' })
export class BedAllocation {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Admission', required: true, index: true })
  admissionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Bed', required: true, index: true })
  bedId!: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  allocatedAt!: Date;

  @Prop({ type: Date, required: false, default: null })
  releasedAt?: Date | null;

  @Prop({ type: String, required: false, trim: true })
  transferReason?: string;
}

export const BedAllocationSchema = SchemaFactory.createForClass(BedAllocation);

BedAllocationSchema.index({ tenantId: 1, admissionId: 1, allocatedAt: -1 });
BedAllocationSchema.index({ tenantId: 1, bedId: 1, releasedAt: 1 });
