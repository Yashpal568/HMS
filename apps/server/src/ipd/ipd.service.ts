import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Admission, type AdmissionDocument } from './schemas/admission.schema.js';
import { Bed, type BedDocument } from './schemas/bed.schema.js';
import { Ward, type WardDocument } from './schemas/ward.schema.js';
import { BedAllocation, type BedAllocationDocument } from './schemas/bed-allocation.schema.js';
import { Patient, type PatientDocument } from '../patients/schemas/patient.schema.js';
import { User, type UserDocument } from '../users/schemas/user.schema.js';
import { AuditService } from '../audit/audit.service.js';
import {
  BedStatus,
  AdmissionStatus,
  AdmissionSource,
  UserRole,
} from '@hms/types';
import type { CreateAdmissionDto } from './dto/create-admission.dto.js';
import type { TransferBedDto } from './dto/transfer-bed.dto.js';
import type { DischargeDto } from './dto/discharge.dto.js';

@Injectable()
export class IpdService {
  private readonly logger = new Logger(IpdService.name);

  constructor(
    @InjectModel(Admission.name)
    private readonly admissionModel: Model<AdmissionDocument>,
    @InjectModel(Bed.name)
    private readonly bedModel: Model<BedDocument>,
    @InjectModel(Ward.name)
    private readonly wardModel: Model<WardDocument>,
    @InjectModel(BedAllocation.name)
    private readonly bedAllocationModel: Model<BedAllocationDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly auditService: AuditService,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ObjectId format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  /**
   * Sequential admission number generator: ADM-YYYY-NNNNNN
   */
  private async generateAdmissionNumber(tenantId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.admissionModel.countDocuments({
      tenantId,
      admissionNumber: new RegExp(`^ADM-${year}-`),
    });
    const seq = String(count + 1).padStart(5, '0');
    return `ADM-${year}-${seq}`;
  }

  /**
   * Admit patient & atomically reserve bed
   */
  async admitPatient(
    tenantId: string,
    authorizerUserId: string,
    dto: CreateAdmissionDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const pId = this.toObjectId(dto.patientId);
    const docId = this.toObjectId(dto.attendingDoctorId);
    const bId = this.toObjectId(dto.bedId);

    // 1. Verify patient exists in tenant
    const patient = await this.patientModel.findOne({ _id: pId, tenantId: tId });
    if (!patient) {
      throw new NotFoundException('Patient record not found in this hospital tenant.');
    }

    // 2. Verify patient does not already have an active admission
    const activeAdmission = await this.admissionModel.findOne({
      tenantId: tId,
      patientId: pId,
      status: AdmissionStatus.ADMITTED,
    });
    if (activeAdmission) {
      throw new ConflictException(
        `Patient ${patient.uhid} is already admitted under admission ${activeAdmission.admissionNumber}.`,
      );
    }

    // 3. Verify attending doctor exists in tenant
    const doctor = await this.userModel.findOne({
      _id: docId,
      $or: [{ hospitalId: tId }, { tenantId: tId }, { role: UserRole.DOCTOR }],
    });
    if (!doctor) {
      throw new NotFoundException('Attending doctor not found in this hospital tenant.');
    }

    // 4. Concurrency-Safe Atomic Bed Reservation
    const claimedBed = await this.bedModel.findOneAndUpdate(
      { _id: bId, tenantId: tId, status: BedStatus.AVAILABLE },
      { $set: { status: BedStatus.OCCUPIED } },
      { returnDocument: 'after' },
    );

    if (!claimedBed) {
      throw new ConflictException(
        'Selected bed is not available for admission (may be occupied, under cleaning, or maintenance).',
      );
    }

    // 5. Generate unique sequential admission number
    const admissionNumber = await this.generateAdmissionNumber(tId);

    // 6. Create Admission record
    const admission = await this.admissionModel.create({
      tenantId: tId,
      admissionNumber,
      patientId: pId,
      attendingDoctorId: docId,
      admittedBedId: bId,
      admissionDate: new Date(),
      admittingDiagnosis: dto.admittingDiagnosis.trim(),
      admissionSource: dto.admissionSource || AdmissionSource.OPD_REFERRAL,
      status: AdmissionStatus.ADMITTED,
    });

    // 7. Associate admission ID on the claimed bed
    await this.bedModel.updateOne(
      { _id: bId },
      { $set: { currentAdmissionId: admission._id } },
    );

    // 8. Create initial Bed Allocation record
    await this.bedAllocationModel.create({
      tenantId: tId,
      admissionId: admission._id,
      patientId: pId,
      bedId: bId,
      allocatedAt: new Date(),
    });

    // 9. Structured Audit Trail
    await this.auditService.record({
      userId: authorizerUserId,
      action: 'IPD_ADMISSION',
      resource: 'admissions',
      details: {
        admissionNumber,
        patientId: dto.patientId,
        uhid: patient.uhid,
        bedId: dto.bedId,
        bedNumber: claimedBed.bedNumber,
        attendingDoctorId: dto.attendingDoctorId,
        diagnosis: dto.admittingDiagnosis,
      },
    });

    return this.getAdmissionById(tenantId, String(admission._id));
  }

  /**
   * Internal Bed Transfer workflow
   */
  async transferBed(
    tenantId: string,
    authorizerUserId: string,
    admissionId: string,
    dto: TransferBedDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const aId = this.toObjectId(admissionId);
    const destBedId = this.toObjectId(dto.destinationBedId);

    // 1. Verify active admission
    const admission = await this.admissionModel.findOne({
      _id: aId,
      tenantId: tId,
      status: AdmissionStatus.ADMITTED,
    });

    if (!admission) {
      throw new NotFoundException('Active inpatient admission not found.');
    }

    const originBedId = admission.admittedBedId;
    if (String(originBedId) === String(destBedId)) {
      throw new BadRequestException('Patient is already occupying this bed.');
    }

    // 2. Concurrency-Safe Atomic Claim of Destination Bed
    const claimedDestBed = await this.bedModel.findOneAndUpdate(
      { _id: destBedId, tenantId: tId, status: BedStatus.AVAILABLE },
      { $set: { status: BedStatus.OCCUPIED, currentAdmissionId: aId } },
      { returnDocument: 'after' },
    );

    if (!claimedDestBed) {
      throw new ConflictException(
        'Destination bed is no longer available (may be occupied or undergoing maintenance).',
      );
    }

    // 3. Release origin bed into CLEANING status
    const originBed = await this.bedModel.findOneAndUpdate(
      { _id: originBedId, tenantId: tId },
      { $set: { status: BedStatus.CLEANING, currentAdmissionId: null } },
      { returnDocument: 'after' },
    );

    // 4. Close previous bed allocation record
    await this.bedAllocationModel.updateOne(
      { admissionId: aId, bedId: originBedId, releasedAt: null },
      { $set: { releasedAt: new Date(), transferReason: dto.reason.trim() } },
    );

    // 5. Create new bed allocation record
    await this.bedAllocationModel.create({
      tenantId: tId,
      admissionId: aId,
      patientId: admission.patientId,
      bedId: destBedId,
      allocatedAt: new Date(),
    });

    // 6. Update admission's current bed pointer
    admission.admittedBedId = destBedId;
    await admission.save();

    // 7. Audit log
    await this.auditService.record({
      userId: authorizerUserId,
      action: 'BED_TRANSFER',
      resource: 'admissions',
      details: {
        admissionNumber: admission.admissionNumber,
        patientId: String(admission.patientId),
        fromBedId: String(originBedId),
        fromBedNumber: originBed?.bedNumber,
        toBedId: dto.destinationBedId,
        toBedNumber: claimedDestBed.bedNumber,
        reason: dto.reason,
      },
    });

    return this.getAdmissionById(tenantId, String(admission._id));
  }

  /**
   * Inpatient Discharge & Bed Release
   */
  async dischargePatient(
    tenantId: string,
    authorizerUserId: string,
    admissionId: string,
    dto: DischargeDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const aId = this.toObjectId(admissionId);

    // 1. Verify active admission
    const admission = await this.admissionModel.findOne({
      _id: aId,
      tenantId: tId,
      status: AdmissionStatus.ADMITTED,
    });

    if (!admission) {
      throw new NotFoundException('Active inpatient admission not found or already discharged.');
    }

    const dischargedBedId = admission.admittedBedId;

    // 2. Update admission status to discharged
    admission.status = AdmissionStatus.DISCHARGED;
    admission.dischargeDate = new Date();
    admission.dischargeCondition = dto.dischargeCondition;
    admission.dischargeSummary = dto.dischargeSummary.trim();
    if (dto.followUpInstructions) {
      admission.followUpInstructions = dto.followUpInstructions.trim();
    }
    await admission.save();

    // 3. Release bed into CLEANING status for housekeeping
    const freedBed = await this.bedModel.findOneAndUpdate(
      { _id: dischargedBedId, tenantId: tId },
      { $set: { status: BedStatus.CLEANING, currentAdmissionId: null } },
      { returnDocument: 'after' },
    );

    // 4. Close active bed allocation
    await this.bedAllocationModel.updateOne(
      { admissionId: aId, releasedAt: null },
      { $set: { releasedAt: new Date() } },
    );

    // 5. Audit log
    await this.auditService.record({
      userId: authorizerUserId,
      action: 'IPD_DISCHARGE',
      resource: 'admissions',
      details: {
        admissionNumber: admission.admissionNumber,
        patientId: String(admission.patientId),
        freedBedId: String(dischargedBedId),
        freedBedNumber: freedBed?.bedNumber,
        dischargeCondition: dto.dischargeCondition,
      },
    });

    return this.getAdmissionById(tenantId, String(admission._id));
  }

  /**
   * List inpatient admissions with optional status and patient filters
   */
  async getAdmissions(
    tenantId: string,
    patientId?: string,
    status?: string,
    limit = 50,
  ): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    const filter: any = { tenantId: tId };

    if (patientId) {
      filter.patientId = this.toObjectId(patientId);
    }
    if (status) {
      filter.status = status;
    }

    const admissions = await this.admissionModel
      .find(filter)
      .sort({ admissionDate: -1 })
      .limit(limit)
      .populate('patientId', 'uhid name contacts gender bloodGroup dateOfBirth')
      .populate('attendingDoctorId', 'name firstName lastName specialization')
      .populate({
        path: 'admittedBedId',
        select: 'bedNumber wardId status',
        populate: { path: 'wardId', select: 'name code type floor' },
      })
      .lean()
      .exec();

    return admissions.map((adm: any) => this.formatAdmission(adm));
  }

  /**
   * Get single admission by ID with bed allocation transfer history
   */
  async getAdmissionById(tenantId: string, admissionId: string): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const aId = this.toObjectId(admissionId);

    const admission = await this.admissionModel
      .findOne({ _id: aId, tenantId: tId })
      .populate('patientId', 'uhid name contacts gender bloodGroup dateOfBirth allergies')
      .populate('attendingDoctorId', 'name firstName lastName specialization email phone')
      .populate({
        path: 'admittedBedId',
        select: 'bedNumber wardId status',
        populate: { path: 'wardId', select: 'name code type floor' },
      })
      .lean()
      .exec();

    if (!admission) {
      throw new NotFoundException('Inpatient admission record not found.');
    }

    // Fetch chronological bed allocations history
    const allocations = await this.bedAllocationModel
      .find({ admissionId: aId, tenantId: tId })
      .sort({ allocatedAt: 1 })
      .populate({
        path: 'bedId',
        select: 'bedNumber wardId',
        populate: { path: 'wardId', select: 'name code type' },
      })
      .lean()
      .exec();

    const formatted = this.formatAdmission(admission);
    formatted.allocations = allocations.map((al: any) => ({
      id: String(al._id),
      allocatedAt: al.allocatedAt,
      releasedAt: al.releasedAt,
      transferReason: al.transferReason,
      bed: al.bedId
        ? {
            id: String(al.bedId._id),
            bedNumber: al.bedId.bedNumber,
            ward: al.bedId.wardId
              ? {
                  id: String(al.bedId.wardId._id),
                  name: al.bedId.wardId.name,
                  code: al.bedId.wardId.code,
                }
              : undefined,
          }
        : undefined,
    }));

    return formatted;
  }

  private formatAdmission(adm: any): any {
    const patientData = adm.patientId;
    const doctorData = adm.attendingDoctorId;
    const bedData = adm.admittedBedId;

    return {
      id: String(adm._id),
      _id: String(adm._id),
      tenantId: String(adm.tenantId),
      admissionNumber: adm.admissionNumber,
      patientId: String(patientData?._id || adm.patientId),
      attendingDoctorId: String(doctorData?._id || adm.attendingDoctorId),
      admittedBedId: String(bedData?._id || adm.admittedBedId),
      admissionDate: adm.admissionDate,
      admittingDiagnosis: adm.admittingDiagnosis,
      admissionSource: adm.admissionSource,
      status: adm.status,
      dischargeDate: adm.dischargeDate,
      dischargeCondition: adm.dischargeCondition,
      dischargeSummary: adm.dischargeSummary,
      followUpInstructions: adm.followUpInstructions,
      createdAt: adm.createdAt,
      updatedAt: adm.updatedAt,
      patient: patientData
        ? {
            id: String(patientData._id),
            uhid: patientData.uhid,
            name: patientData.name,
            gender: patientData.gender,
            bloodGroup: patientData.bloodGroup,
            dateOfBirth: patientData.dateOfBirth,
            phone: patientData.contacts?.phone,
            allergies: patientData.allergies || [],
          }
        : undefined,
      doctor: doctorData
        ? {
            id: String(doctorData._id),
            name: doctorData.name || `${doctorData.firstName || ''} ${doctorData.lastName || ''}`.trim(),
            specialization: doctorData.specialization,
          }
        : undefined,
      bed: bedData
        ? {
            id: String(bedData._id),
            bedNumber: bedData.bedNumber,
            status: bedData.status,
            ward: bedData.wardId
              ? {
                  id: String(bedData.wardId._id),
                  name: bedData.wardId.name,
                  code: bedData.wardId.code,
                  type: bedData.wardId.type,
                  floor: bedData.wardId.floor,
                }
              : undefined,
          }
        : undefined,
    };
  }
}
