import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PermissionDocument = Permission & Document;

@Schema({ timestamps: true, collection: 'permissions' })
export class Permission {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: true, trim: true, index: true })
  module!: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
