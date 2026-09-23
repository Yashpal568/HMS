import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ImportStage } from '@hms/types';

export type InventoryImportJobDocument = InventoryImportJob & Document;

@Schema({ timestamps: true, collection: 'inventory_import_jobs' })
export class InventoryImportJob {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  fileName!: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes!: number;

  @Prop({
    type: String,
    enum: Object.values(ImportStage),
    default: ImportStage.UPLOADED,
    index: true,
  })
  stage!: ImportStage;

  @Prop({ type: [String], default: [] })
  detectedColumns!: string[];

  @Prop({ type: Object, required: false })
  columnMapping?: Record<string, string>;

  @Prop({ type: Number, default: 0 })
  totalRows!: number;

  @Prop({ type: Number, default: 0 })
  validRowsCount!: number;

  @Prop({ type: Number, default: 0 })
  invalidRowsCount!: number;

  @Prop({ type: Number, default: 0 })
  importedRowsCount!: number;

  @Prop({ type: [Object], default: [] })
  previewRows!: Record<string, string>[];

  @Prop({ type: [Object], default: [] })
  validationErrors!: Array<{
    rowNumber: number;
    field: string;
    message: string;
    rawValue?: string;
  }>;

  @Prop({ type: String, required: false })
  rawCsvData?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date, required: false })
  approvedAt?: Date;

  @Prop({ type: Date, required: false })
  completedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InventoryImportJobSchema =
  SchemaFactory.createForClass(InventoryImportJob);

InventoryImportJobSchema.index({ tenantId: 1, createdAt: -1 });
InventoryImportJobSchema.index({ tenantId: 1, stage: 1 });
