import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: String, required: false, index: true })
  hospitalId?: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  action!: string;

  @Prop({ required: true, index: true })
  resource!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  details!: Record<string, unknown>;

  @Prop({ type: String, default: 'unknown' })
  ipAddress!: string;

  @Prop({ type: String, default: 'unknown' })
  userAgent!: string;

  @Prop({ type: Date, default: Date.now, index: -1 })
  timestamp!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ hospitalId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
