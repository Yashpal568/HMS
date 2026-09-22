import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TenantStatus, SubscriptionTier } from '@hms/types';

export type TenantDocument = Tenant & Document;

@Schema({ _id: false })
export class BillingContactSubschema {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: false, trim: true })
  phone?: string;
}

@Schema({ _id: false })
export class TenantQuotasSubschema {
  @Prop({ required: true, default: 10 })
  maxDoctors!: number;

  @Prop({ required: true, default: 25 })
  maxBeds!: number;

  @Prop({ required: true, default: 50 })
  maxStorageGb!: number;
}

@Schema({ _id: false })
export class TenantUsageSubschema {
  @Prop({ required: true, default: 0 })
  doctorsCount!: number;

  @Prop({ required: true, default: 0 })
  bedsCount!: number;

  @Prop({ required: true, default: 0 })
  storageGbUsed!: number;
}

@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  subdomain!: string;

  @Prop({ required: false, lowercase: true, trim: true, sparse: true, index: true })
  customDomain?: string;

  @Prop({ type: String, enum: Object.values(TenantStatus), default: TenantStatus.ACTIVE, index: true })
  status!: TenantStatus;

  @Prop({ type: String, enum: Object.values(SubscriptionTier), default: SubscriptionTier.STARTER_CLINIC, index: true })
  tier!: SubscriptionTier;

  @Prop({ type: Types.ObjectId, ref: 'Plan', required: false, index: true })
  planId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: false })
  subscriptionId?: Types.ObjectId;

  @Prop({ type: BillingContactSubschema, required: true })
  billingContact!: BillingContactSubschema;

  @Prop({ type: TenantQuotasSubschema, required: true, default: () => ({}) })
  quotas!: TenantQuotasSubschema;

  @Prop({ type: TenantUsageSubschema, required: true, default: () => ({}) })
  usage!: TenantUsageSubschema;

  @Prop({ type: Date, required: false })
  trialEndsAt?: Date;

  @Prop({ type: Date, required: false })
  suspendedAt?: Date;

  @Prop({ type: String, required: false, trim: true })
  suspensionReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
