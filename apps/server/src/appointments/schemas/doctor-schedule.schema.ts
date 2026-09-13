import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DoctorScheduleDocument = DoctorSchedule & Document;

@Schema({ timestamps: true, collection: 'doctor_schedules' })
export class DoctorSchedule {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  department!: string;

  @Prop({ required: true, type: Number, min: 0, max: 6 })
  dayOfWeek!: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday

  @Prop({ required: true, trim: true })
  startTime!: string; // e.g. "09:00"

  @Prop({ required: true, trim: true })
  endTime!: string; // e.g. "13:00"

  @Prop({ required: true, type: Number, default: 15, min: 5, max: 120 })
  slotDurationMinutes!: number;

  @Prop({ required: true, type: Number, default: 30, min: 1, max: 200 })
  maxPatients!: number;

  @Prop({ required: true, type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;
}

export const DoctorScheduleSchema = SchemaFactory.createForClass(DoctorSchedule);

// Compound unique index per doctor per day within tenant
DoctorScheduleSchema.index(
  { tenantId: 1, doctorId: 1, dayOfWeek: 1 },
  { unique: true },
);
DoctorScheduleSchema.index({ tenantId: 1, department: 1, isActive: 1 });
