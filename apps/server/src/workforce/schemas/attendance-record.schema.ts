import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AttendanceStatus,
  AttendanceMethod,
  AttendanceCorrectionStatus,
} from '@hms/types';

export type AttendanceRecordDocument = AttendanceRecord & Document;

@Schema({ _id: false })
export class AttendanceCorrectionSubdoc {
  @Prop({ type: Date, required: false })
  originalCheckIn?: Date;

  @Prop({ type: Date, required: false })
  originalCheckOut?: Date;

  @Prop({ type: Date, required: false })
  correctedCheckIn?: Date;

  @Prop({ type: Date, required: false })
  correctedCheckOut?: Date;

  @Prop({ type: String, required: true, trim: true })
  reason!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requestedBy!: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  requestedAt!: Date;

  @Prop({
    type: String,
    enum: Object.values(AttendanceCorrectionStatus),
    default: AttendanceCorrectionStatus.PENDING,
  })
  status!: AttendanceCorrectionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  reviewedAt?: Date;

  @Prop({ type: String, required: false, trim: true })
  reviewNote?: string;
}

const AttendanceCorrectionSubdocSchema =
  SchemaFactory.createForClass(AttendanceCorrectionSubdoc);

@Schema({ timestamps: true, collection: 'attendance_records' })
export class AttendanceRecord {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, index: true }) // YYYY-MM-DD
  date!: string;

  @Prop({ type: Types.ObjectId, ref: 'WorkforceSchedule', required: false })
  shiftId?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  checkInTime?: Date;

  @Prop({ type: Date, required: false })
  checkOutTime?: Date;

  @Prop({
    type: String,
    enum: Object.values(AttendanceStatus),
    default: AttendanceStatus.ABSENT,
    index: true,
  })
  status!: AttendanceStatus;

  @Prop({ type: Number, default: 0, min: 0 })
  lateMinutes!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  earlyLeaveMinutes!: number;

  @Prop({
    type: String,
    enum: Object.values(AttendanceMethod),
    default: AttendanceMethod.WEB,
  })
  method!: AttendanceMethod;

  @Prop({ type: String, required: false, trim: true })
  notes?: string;

  @Prop({ type: AttendanceCorrectionSubdocSchema, required: false })
  correction?: AttendanceCorrectionSubdoc;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AttendanceRecordSchema =
  SchemaFactory.createForClass(AttendanceRecord);

AttendanceRecordSchema.index(
  { tenantId: 1, employeeId: 1, date: 1 },
  { unique: true },
);
AttendanceRecordSchema.index({ tenantId: 1, date: 1, status: 1 });
AttendanceRecordSchema.index({ tenantId: 1, 'correction.status': 1 });
