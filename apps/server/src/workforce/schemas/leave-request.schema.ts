import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { LeaveType, LeaveStatus } from '@hms/types';

export type LeaveRequestDocument = LeaveRequest & Document;

@Schema({ timestamps: true, collection: 'leave_requests' })
export class LeaveRequest {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(LeaveType),
    required: true,
  })
  leaveType!: LeaveType;

  @Prop({ type: String, required: true, trim: true }) // YYYY-MM-DD
  startDate!: string;

  @Prop({ type: String, required: true, trim: true }) // YYYY-MM-DD
  endDate!: string;

  @Prop({ type: Number, required: true, min: 0.5 })
  totalDays!: number;

  @Prop({ type: String, required: true, trim: true })
  reason!: string;

  @Prop({
    type: String,
    enum: Object.values(LeaveStatus),
    default: LeaveStatus.PENDING,
    index: true,
  })
  status!: LeaveStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  reviewedAt?: Date;

  @Prop({ type: String, required: false, trim: true })
  rejectionReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);

LeaveRequestSchema.index({ tenantId: 1, employeeId: 1, status: 1 });
LeaveRequestSchema.index({ tenantId: 1, startDate: 1, endDate: 1 });
