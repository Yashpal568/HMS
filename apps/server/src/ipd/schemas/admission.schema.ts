import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AdmissionStatus, AdmissionSource, DischargeCondition } from '@hms/types';

export type AdmissionDocument = Admission & Document;

@Schema({ timestamps: true, collection: 'admissions' })
export class Admission {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, uppercase: true })
  admissionNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  attendingDoctorId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Bed', required: true, index: true })
  admittedBedId!: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  admissionDate!: Date;

  @Prop({ type: String, required: true, trim: true })
  admittingDiagnosis!: string;

  @Prop({
    type: String,
    enum: Object.values(AdmissionSource),
    default: AdmissionSource.OPD_REFERRAL,
    required: true,
  })
  admissionSource!: AdmissionSource;

  @Prop({
    type: String,
    enum: Object.values(AdmissionStatus),
    default: AdmissionStatus.ADMITTED,
    required: true,
  })
  status!: AdmissionStatus;

  @Prop({ type: Date, required: false })
  dischargeDate?: Date;

  @Prop({
    type: String,
    enum: Object.values(DischargeCondition),
    required: false,
  })
  dischargeCondition?: DischargeCondition;

  @Prop({ type: String, required: false, trim: true })
  dischargeSummary?: string;

  @Prop({ type: String, required: false, trim: true })
  followUpInstructions?: string;
}

export const AdmissionSchema = SchemaFactory.createForClass(Admission);

AdmissionSchema.index({ tenantId: 1, admissionNumber: 1 }, { unique: true });
AdmissionSchema.index({ tenantId: 1, patientId: 1, status: 1 });
AdmissionSchema.index({ tenantId: 1, status: 1, admissionDate: -1 });
