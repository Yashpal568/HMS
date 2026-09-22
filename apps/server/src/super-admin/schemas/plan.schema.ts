import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { SubscriptionTier } from '@hms/types';
import { TenantQuotasSubschema } from './tenant.schema.js';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true, collection: 'plans' })
export class Plan {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, enum: Object.values(SubscriptionTier), required: true, index: true })
  tier!: SubscriptionTier;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({ required: true, min: 0 })
  priceMonthly!: number;

  @Prop({ required: true, min: 0 })
  priceAnnual!: number;

  @Prop({ required: true, default: 'INR', uppercase: true, trim: true })
  currency!: string;

  @Prop({ type: TenantQuotasSubschema, required: true })
  limits!: TenantQuotasSubschema;

  @Prop({ type: [String], default: [] })
  includedModules!: string[];

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
