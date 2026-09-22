import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SubscriptionTier, SubscriptionStatus } from '@hms/types';

export type SubscriptionDocument = Subscription & Document;

@Schema({ _id: false })
export class LimitsOverrideSubschema {
  @Prop({ required: false })
  maxDoctors?: number;

  @Prop({ required: false })
  maxBeds?: number;

  @Prop({ required: false })
  maxStorageGb?: number;

  @Prop({ type: Date, required: false })
  expiresAt?: Date;

  @Prop({ type: String, required: false, trim: true })
  reason?: string;
}

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: true, index: true })
  planId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(SubscriptionTier), required: true })
  tier!: SubscriptionTier;

  @Prop({ type: String, enum: Object.values(SubscriptionStatus), default: SubscriptionStatus.ACTIVE, index: true })
  status!: SubscriptionStatus;

  @Prop({ type: Date, required: true })
  currentPeriodStart!: Date;

  @Prop({ type: Date, required: true })
  currentPeriodEnd!: Date;

  @Prop({ type: LimitsOverrideSubschema, required: false })
  limitsOverride?: LimitsOverrideSubschema;

  @Prop({ type: String, enum: ['MONTHLY', 'ANNUAL'], default: 'MONTHLY' })
  billingCycle!: 'MONTHLY' | 'ANNUAL';

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, default: 'INR', uppercase: true, trim: true })
  currency!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
