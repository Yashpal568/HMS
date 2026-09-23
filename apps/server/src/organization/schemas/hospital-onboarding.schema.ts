import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OnboardingStep } from '@hms/types';

export type HospitalOnboardingDocument = HospitalOnboarding & Document;

@Schema({ timestamps: true, collection: 'hospital_onboardings' })
export class HospitalOnboarding {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(OnboardingStep),
    default: OnboardingStep.PROFILE,
  })
  currentStep!: OnboardingStep;

  @Prop({
    type: [String],
    default: [],
  })
  completedSteps!: OnboardingStep[];

  @Prop({ type: Boolean, default: false })
  isCompleted!: boolean;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  completionPercentage!: number;

  @Prop({ type: Object, default: {} })
  stepData!: Record<string, unknown>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const HospitalOnboardingSchema = SchemaFactory.createForClass(HospitalOnboarding);
