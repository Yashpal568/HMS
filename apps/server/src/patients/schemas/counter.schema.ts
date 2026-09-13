import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CounterDocument = Counter & Document;

@Schema({ timestamps: true, collection: 'counters' })
export class Counter {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Number, required: true })
  year!: number;

  @Prop({ type: Number, default: 0 })
  seq!: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);

// Ensure atomic unique constraint per tenant and calendar year
CounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });
