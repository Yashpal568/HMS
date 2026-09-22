import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformBroadcastDocument = PlatformBroadcast & Document;

@Schema({ timestamps: true, collection: 'platform_broadcasts' })
export class PlatformBroadcast {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  message!: string;

  @Prop({ type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'INFO', index: true })
  severity!: 'INFO' | 'WARNING' | 'CRITICAL';

  @Prop({ type: String, enum: ['ALL', 'HOSPITAL_ADMINS', 'CLINICIANS'], default: 'ALL' })
  targetAudience!: 'ALL' | 'HOSPITAL_ADMINS' | 'CLINICIANS';

  @Prop({ type: Boolean, default: true, index: true })
  active!: boolean;

  @Prop({ type: Date, required: false })
  expiresAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PlatformBroadcastSchema = SchemaFactory.createForClass(PlatformBroadcast);
