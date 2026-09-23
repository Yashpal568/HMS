import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { HospitalNotificationType } from '@hms/types';

export type HospitalNotificationDocument = HospitalNotification & Document;

@Schema({ timestamps: true, collection: 'hospital_notifications' })
export class HospitalNotification {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  recipientId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: String, required: true, trim: true })
  message!: string;

  @Prop({
    type: String,
    enum: Object.values(HospitalNotificationType),
    default: HospitalNotificationType.GENERAL,
    index: true,
  })
  type!: HospitalNotificationType;

  @Prop({ type: Boolean, default: false, index: true })
  isRead!: boolean;

  @Prop({ type: String, required: false, trim: true })
  actionUrl?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const HospitalNotificationSchema =
  SchemaFactory.createForClass(HospitalNotification);

HospitalNotificationSchema.index({ tenantId: 1, recipientId: 1, isRead: 1 });
HospitalNotificationSchema.index({ tenantId: 1, createdAt: -1 });
