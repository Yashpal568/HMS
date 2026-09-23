import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true, collection: 'teams' })
export class Team {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true, index: true })
  departmentId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ type: String, required: false, trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: false })
  teamLeadEmployeeId?: Types.ObjectId;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TeamSchema = SchemaFactory.createForClass(Team);

TeamSchema.index({ tenantId: 1, departmentId: 1, code: 1 }, { unique: true });
TeamSchema.index({ tenantId: 1, isActive: 1 });
