import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TaskPriority, TaskStatus } from '@hms/types';

export type HospitalTaskDocument = HospitalTask & Document;

@Schema({ _id: true, timestamps: { createdAt: true, updatedAt: false } })
export class TaskCommentSubdoc {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  authorName!: string;

  @Prop({ type: String, required: true, trim: true })
  content!: string;

  createdAt?: Date;
}

const TaskCommentSubdocSchema = SchemaFactory.createForClass(TaskCommentSubdoc);

@Schema({ timestamps: true, collection: 'hospital_tasks' })
export class HospitalTask {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  creatorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: false, index: true })
  assigneeId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: false, index: true })
  departmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: false })
  teamId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.NORMAL,
  })
  priority!: TaskPriority;

  @Prop({
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.PENDING,
    index: true,
  })
  status!: TaskStatus;

  @Prop({ type: Date, required: false })
  dueDate?: Date;

  @Prop({ type: String, default: 'GENERAL' })
  contextType?: string; // PATIENT, ENCOUNTER, WARD, GENERAL

  @Prop({ type: String, required: false })
  contextId?: string;

  @Prop({ type: String, required: false, trim: true })
  contextTitle?: string;

  @Prop({ type: [TaskCommentSubdocSchema], default: [] })
  comments!: TaskCommentSubdoc[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const HospitalTaskSchema = SchemaFactory.createForClass(HospitalTask);

HospitalTaskSchema.index({ tenantId: 1, assigneeId: 1, status: 1 });
HospitalTaskSchema.index({ tenantId: 1, departmentId: 1, status: 1 });
HospitalTaskSchema.index({ tenantId: 1, createdAt: -1 });
