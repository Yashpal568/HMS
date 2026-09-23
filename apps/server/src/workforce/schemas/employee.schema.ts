import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StaffType, EmploymentStatus, ResourceScope } from '@hms/types';

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true, collection: 'employees' })
export class Employee {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  employeeId!: string;

  @Prop({ type: String, required: true, trim: true })
  firstName!: string;

  @Prop({ type: String, required: true, trim: true })
  lastName!: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, required: false, trim: true })
  phone?: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: false, index: true })
  departmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team', required: false, index: true })
  teamId?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  designation!: string;

  @Prop({
    type: String,
    enum: Object.values(StaffType),
    required: true,
    index: true,
  })
  staffType!: StaffType;

  @Prop({
    type: String,
    enum: Object.values(EmploymentStatus),
    default: EmploymentStatus.ACTIVE,
    index: true,
  })
  employmentStatus!: EmploymentStatus;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: false })
  managerId?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  joiningDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  userId?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  assignedRoles!: string[];

  @Prop({ type: [String], default: [] })
  assignedWorkspaces!: string[];

  @Prop({
    type: String,
    enum: Object.values(ResourceScope),
    default: ResourceScope.HOSPITAL_WIDE,
  })
  accessScope!: ResourceScope;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

EmployeeSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
EmployeeSchema.index({ tenantId: 1, email: 1 });
EmployeeSchema.index({ tenantId: 1, departmentId: 1 });
EmployeeSchema.index({ tenantId: 1, employmentStatus: 1 });
EmployeeSchema.index({ tenantId: 1, userId: 1 });
