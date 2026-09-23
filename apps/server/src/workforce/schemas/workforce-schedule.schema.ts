import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ShiftType } from '@hms/types';

export type WorkforceScheduleDocument = WorkforceSchedule & Document;

@Schema({ timestamps: true, collection: 'workforce_schedules' })
export class WorkforceSchedule {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: false, index: true })
  departmentId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ShiftType),
    default: ShiftType.MORNING,
  })
  shiftType!: ShiftType;

  @Prop({ type: String, required: true, trim: true }) // "08:00" or "22:00"
  startTime!: string;

  @Prop({ type: String, required: true, trim: true }) // "16:00" or "06:00"
  endTime!: string;

  @Prop({ type: Boolean, default: false })
  isOvernight!: boolean;

  @Prop({ type: [Number], default: [1, 2, 3, 4, 5] }) // 0=Sun, 1=Mon, ..., 6=Sat
  daysOfWeek!: number[];

  @Prop({ type: Date, required: true })
  effectiveFrom!: Date;

  @Prop({ type: Date, required: false })
  effectiveTo?: Date;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WorkforceScheduleSchema = SchemaFactory.createForClass(WorkforceSchedule);

WorkforceScheduleSchema.index({ tenantId: 1, employeeId: 1, isActive: 1 });
WorkforceScheduleSchema.index({ tenantId: 1, departmentId: 1 });
