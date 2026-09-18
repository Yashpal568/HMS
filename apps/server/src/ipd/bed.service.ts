import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ward, type WardDocument } from './schemas/ward.schema.js';
import { Bed, type BedDocument } from './schemas/bed.schema.js';
import {
  BedStatus,
  WardType,
  type IpdCensusSummary,
  type WardCensusItem,
} from '@hms/types';
import type { CreateWardDto } from './dto/create-ward.dto.js';
import type { CreateBedDto } from './dto/create-bed.dto.js';

@Injectable()
export class BedService {
  private readonly logger = new Logger(BedService.name);

  constructor(
    @InjectModel(Ward.name)
    private readonly wardModel: Model<WardDocument>,
    @InjectModel(Bed.name)
    private readonly bedModel: Model<BedDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ObjectId format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  /**
   * Seeds default hospital wards & beds for a tenant if none exist.
   */
  async seedDefaultWardsAndBeds(tenantId: string): Promise<void> {
    const tId = this.toObjectId(tenantId);
    const existingCount = await this.wardModel.countDocuments({ tenantId: tId });
    if (existingCount > 0) return;

    this.logger.log(`Seeding default inpatient wards & beds for tenant: ${tenantId}`);

    const defaultWards = [
      {
        name: 'Intensive Care Unit (ICU)',
        code: 'ICU',
        type: WardType.ICU,
        floor: '3rd Floor',
        totalBeds: 4,
        isActive: true,
        beds: ['ICU-01', 'ICU-02', 'ICU-03', 'ICU-04'],
      },
      {
        name: 'General Medicine Ward',
        code: 'GW-MED',
        type: WardType.GENERAL,
        floor: '2nd Floor',
        totalBeds: 6,
        isActive: true,
        beds: ['GW-01', 'GW-02', 'GW-03', 'GW-04', 'GW-05', 'GW-06'],
      },
      {
        name: 'Private Deluxe Wing',
        code: 'PW-DLX',
        type: WardType.PRIVATE,
        floor: '4th Floor',
        totalBeds: 3,
        isActive: true,
        beds: ['PVT-101', 'PVT-102', 'PVT-103'],
      },
    ];

    for (const w of defaultWards) {
      const ward = await this.wardModel.create({
        tenantId: tId,
        name: w.name,
        code: w.code,
        type: w.type,
        floor: w.floor,
        totalBeds: w.totalBeds,
        isActive: w.isActive,
      });

      for (const bNum of w.beds) {
        await this.bedModel.create({
          tenantId: tId,
          wardId: ward._id,
          bedNumber: bNum,
          status: BedStatus.AVAILABLE,
          currentAdmissionId: null,
        });
      }
    }
  }

  /**
   * List active wards for a tenant
   */
  async listWards(tenantId: string): Promise<WardDocument[]> {
    await this.seedDefaultWardsAndBeds(tenantId);
    return this.wardModel
      .find({ tenantId: this.toObjectId(tenantId), isActive: true })
      .sort({ code: 1 })
      .exec();
  }

  /**
   * Create a new ward
   */
  async createWard(tenantId: string, dto: CreateWardDto): Promise<WardDocument> {
    const tId = this.toObjectId(tenantId);
    const existing = await this.wardModel.findOne({
      tenantId: tId,
      code: dto.code.toUpperCase(),
    });

    if (existing) {
      throw new ConflictException(`Ward with code ${dto.code.toUpperCase()} already exists.`);
    }

    return this.wardModel.create({
      tenantId: tId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      type: dto.type,
      floor: dto.floor,
      totalBeds: 0,
      isActive: true,
    });
  }

  /**
   * List beds with optional ward and status filter
   */
  async listBeds(
    tenantId: string,
    wardId?: string,
    status?: string,
  ): Promise<any[]> {
    await this.seedDefaultWardsAndBeds(tenantId);
    const tId = this.toObjectId(tenantId);

    const filter: any = { tenantId: tId };
    if (wardId) {
      filter.wardId = this.toObjectId(wardId);
    }
    if (status) {
      filter.status = status;
    }

    const beds = await this.bedModel
      .find(filter)
      .populate('wardId', 'name code type floor')
      .populate({
        path: 'currentAdmissionId',
        select: 'admissionNumber patientId attendingDoctorId admissionDate admittingDiagnosis status',
        populate: [
          { path: 'patientId', select: 'uhid name contacts gender bloodGroup dateOfBirth' },
          { path: 'attendingDoctorId', select: 'name firstName lastName specialization' },
        ],
      })
      .sort({ bedNumber: 1 })
      .lean()
      .exec();

    return beds.map((b: any) => ({
      id: String(b._id),
      _id: String(b._id),
      tenantId: String(b.tenantId),
      bedNumber: b.bedNumber,
      wardId: String(b.wardId?._id || b.wardId),
      status: b.status,
      currentAdmissionId: b.currentAdmissionId?._id ? String(b.currentAdmissionId._id) : null,
      ward: b.wardId
        ? {
            id: String(b.wardId._id),
            name: b.wardId.name,
            code: b.wardId.code,
            type: b.wardId.type,
            floor: b.wardId.floor,
          }
        : undefined,
      currentAdmission: b.currentAdmissionId
        ? {
            id: String(b.currentAdmissionId._id),
            admissionNumber: b.currentAdmissionId.admissionNumber,
            admissionDate: b.currentAdmissionId.admissionDate,
            admittingDiagnosis: b.currentAdmissionId.admittingDiagnosis,
            status: b.currentAdmissionId.status,
            patient: b.currentAdmissionId.patientId,
            doctor: b.currentAdmissionId.attendingDoctorId,
          }
        : undefined,
    }));
  }

  /**
   * Create a new bed in a ward
   */
  async createBed(tenantId: string, dto: CreateBedDto): Promise<BedDocument> {
    const tId = this.toObjectId(tenantId);
    const wId = this.toObjectId(dto.wardId);

    const ward = await this.wardModel.findOne({ _id: wId, tenantId: tId });
    if (!ward) {
      throw new NotFoundException('Ward not found in this hospital tenant.');
    }

    const existingBed = await this.bedModel.findOne({
      tenantId: tId,
      wardId: wId,
      bedNumber: dto.bedNumber.toUpperCase(),
    });

    if (existingBed) {
      throw new ConflictException(`Bed ${dto.bedNumber.toUpperCase()} already exists in ward ${ward.code}.`);
    }

    const bed = await this.bedModel.create({
      tenantId: tId,
      wardId: wId,
      bedNumber: dto.bedNumber.toUpperCase(),
      status: dto.status || BedStatus.AVAILABLE,
      currentAdmissionId: null,
    });

    await this.wardModel.updateOne({ _id: wId }, { $inc: { totalBeds: 1 } });
    return bed;
  }

  /**
   * Update bed status (e.g. housekeeping sign-off: cleaning -> available)
   */
  async updateBedStatus(
    tenantId: string,
    bedId: string,
    newStatus: BedStatus,
  ): Promise<BedDocument> {
    const tId = this.toObjectId(tenantId);
    const bId = this.toObjectId(bedId);

    const bed = await this.bedModel.findOne({ _id: bId, tenantId: tId });
    if (!bed) {
      throw new NotFoundException('Bed not found in this hospital tenant.');
    }

    if (bed.status === BedStatus.OCCUPIED && newStatus === BedStatus.AVAILABLE && bed.currentAdmissionId) {
      throw new BadRequestException('Cannot mark occupied bed as available while an admission is active. Discharge or transfer patient first.');
    }

    bed.status = newStatus;
    if (newStatus === BedStatus.AVAILABLE) {
      bed.currentAdmissionId = null;
    }

    await bed.save();
    return bed;
  }

  /**
   * Compute comprehensive IPD census statistics & ward occupancy breakdown
   */
  async getCensusSummary(tenantId: string): Promise<IpdCensusSummary> {
    await this.seedDefaultWardsAndBeds(tenantId);
    const tId = this.toObjectId(tenantId);

    const wards = await this.wardModel.find({ tenantId: tId, isActive: true }).lean();
    const beds = await this.bedModel.find({ tenantId: tId }).lean();

    const totalBeds = beds.length;
    const occupiedBeds = beds.filter((b) => b.status === BedStatus.OCCUPIED).length;
    const availableBeds = beds.filter((b) => b.status === BedStatus.AVAILABLE).length;
    const cleaningBeds = beds.filter((b) => b.status === BedStatus.CLEANING).length;
    const maintenanceBeds = beds.filter((b) => b.status === BedStatus.MAINTENANCE).length;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0;

    const wardBreakdown: WardCensusItem[] = wards.map((w: any) => {
      const wardBeds = beds.filter((b) => String(b.wardId) === String(w._id));
      const wTotal = wardBeds.length;
      const wOccupied = wardBeds.filter((b) => b.status === BedStatus.OCCUPIED).length;
      const wAvailable = wardBeds.filter((b) => b.status === BedStatus.AVAILABLE).length;
      const wCleaning = wardBeds.filter((b) => b.status === BedStatus.CLEANING).length;
      const wMaintenance = wardBeds.filter((b) => b.status === BedStatus.MAINTENANCE).length;
      const wRate = wTotal > 0 ? Math.round((wOccupied / wTotal) * 1000) / 10 : 0;

      return {
        wardId: String(w._id),
        wardName: w.name,
        wardCode: w.code,
        wardType: w.type,
        floor: w.floor,
        totalBeds: wTotal,
        occupiedBeds: wOccupied,
        availableBeds: wAvailable,
        cleaningBeds: wCleaning,
        maintenanceBeds: wMaintenance,
        occupancyRate: wRate,
      };
    });

    return {
      totalBeds,
      occupiedBeds,
      availableBeds,
      cleaningBeds,
      maintenanceBeds,
      occupancyRate,
      wardBreakdown,
    };
  }
}
