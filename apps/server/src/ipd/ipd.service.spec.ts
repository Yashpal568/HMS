import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IpdService } from './ipd.service.js';
import { BedService } from './bed.service.js';
import {
  BedStatus,
  WardType,
  AdmissionStatus,
  AdmissionSource,
  DischargeCondition,
} from '@hms/types';
import { Types } from 'mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('IpdService & BedService', () => {
  let ipdService: IpdService;
  let bedService: BedService;

  const mockAdmissionModel: any = vi.fn();
  const mockBedModel: any = vi.fn();
  const mockWardModel: any = vi.fn();
  const mockBedAllocationModel: any = vi.fn();
  const mockPatientModel: any = {
    findOne: vi.fn(),
  };
  const mockUserModel: any = {
    findOne: vi.fn(),
  };
  const mockAuditService: any = {
    record: vi.fn().mockResolvedValue(undefined),
  };

  const tenantId = new Types.ObjectId().toString();
  const patientId = new Types.ObjectId().toString();
  const doctorId = new Types.ObjectId().toString();
  const bedId = new Types.ObjectId().toString();
  const destBedId = new Types.ObjectId().toString();
  const admissionId = new Types.ObjectId().toString();
  const wardId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdmissionModel.findOne = vi.fn();
    mockAdmissionModel.find = vi.fn();
    mockAdmissionModel.create = vi.fn();
    mockAdmissionModel.countDocuments = vi.fn();

    mockBedModel.findOne = vi.fn();
    mockBedModel.find = vi.fn();
    mockBedModel.findOneAndUpdate = vi.fn();
    mockBedModel.updateOne = vi.fn();
    mockBedModel.create = vi.fn();
    mockBedModel.countDocuments = vi.fn();

    mockWardModel.findOne = vi.fn();
    mockWardModel.find = vi.fn();
    mockWardModel.create = vi.fn();
    mockWardModel.updateOne = vi.fn();
    mockWardModel.countDocuments = vi.fn();

    mockBedAllocationModel.create = vi.fn();
    mockBedAllocationModel.updateOne = vi.fn();
    mockBedAllocationModel.find = vi.fn();

    ipdService = new IpdService(
      mockAdmissionModel,
      mockBedModel,
      mockWardModel,
      mockBedAllocationModel,
      mockPatientModel,
      mockUserModel,
      mockAuditService,
    );

    bedService = new BedService(mockWardModel, mockBedModel);
  });

  const mockQuery = (data: any) => ({
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue(data),
    }),
  });

  describe('BedService - Ward & Bed Hierarchy', () => {
    it('should seed default wards and beds when none exist', async () => {
      mockWardModel.countDocuments.mockResolvedValue(0);
      mockWardModel.create.mockImplementation((dto: any) => ({
        _id: new Types.ObjectId(),
        ...dto,
      }));
      mockBedModel.create.mockResolvedValue({ _id: new Types.ObjectId() });

      await bedService.seedDefaultWardsAndBeds(tenantId);

      expect(mockWardModel.create).toHaveBeenCalledTimes(3); // ICU, General, Private
      expect(mockBedModel.create).toHaveBeenCalled();
    });

    it('should calculate accurate census summary metrics', async () => {
      mockWardModel.countDocuments.mockResolvedValue(1);
      mockWardModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: new Types.ObjectId(wardId), name: 'ICU', code: 'ICU', type: WardType.ICU },
        ]),
      });

      mockBedModel.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: new Types.ObjectId(), wardId: new Types.ObjectId(wardId), status: BedStatus.OCCUPIED },
          { _id: new Types.ObjectId(), wardId: new Types.ObjectId(wardId), status: BedStatus.AVAILABLE },
          { _id: new Types.ObjectId(), wardId: new Types.ObjectId(wardId), status: BedStatus.CLEANING },
          { _id: new Types.ObjectId(), wardId: new Types.ObjectId(wardId), status: BedStatus.MAINTENANCE },
        ]),
      });

      const summary = await bedService.getCensusSummary(tenantId);
      expect(summary.totalBeds).toBe(4);
      expect(summary.occupiedBeds).toBe(1);
      expect(summary.availableBeds).toBe(1);
      expect(summary.cleaningBeds).toBe(1);
      expect(summary.maintenanceBeds).toBe(1);
      expect(summary.occupancyRate).toBe(25);
      expect(summary.wardBreakdown.length).toBe(1);
    });

    it('should allow housekeeping to update cleaning bed to available', async () => {
      const mockBed = {
        _id: new Types.ObjectId(bedId),
        status: BedStatus.CLEANING,
        currentAdmissionId: null,
        save: vi.fn().mockResolvedValue(true),
      };
      mockBedModel.findOne.mockResolvedValue(mockBed);

      await bedService.updateBedStatus(tenantId, bedId, BedStatus.AVAILABLE);

      expect(mockBed.status).toBe(BedStatus.AVAILABLE);
      expect(mockBed.save).toHaveBeenCalled();
    });

    it('should reject making occupied bed available while admission is active', async () => {
      const mockBed = {
        _id: new Types.ObjectId(bedId),
        status: BedStatus.OCCUPIED,
        currentAdmissionId: new Types.ObjectId(),
        save: vi.fn(),
      };
      mockBedModel.findOne.mockResolvedValue(mockBed);

      await expect(
        bedService.updateBedStatus(tenantId, bedId, BedStatus.AVAILABLE),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('IpdService - Inpatient Admissions', () => {
    it('should successfully admit a patient and reserve bed atomically', async () => {
      mockPatientModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(patientId), uhid: 'UHID-001' });
      mockAdmissionModel.findOne.mockResolvedValueOnce(null); // no existing active admission
      mockUserModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(doctorId), name: 'Dr. Smith' });

      // Atomic reservation returns claimed bed
      const claimedBed = {
        _id: new Types.ObjectId(bedId),
        bedNumber: 'ICU-01',
        status: BedStatus.OCCUPIED,
      };
      mockBedModel.findOneAndUpdate.mockResolvedValue(claimedBed);
      mockAdmissionModel.countDocuments.mockResolvedValue(0);

      const createdAdmission = {
        _id: new Types.ObjectId(admissionId),
        admissionNumber: 'ADM-2026-00001',
        patientId: new Types.ObjectId(patientId),
        attendingDoctorId: new Types.ObjectId(doctorId),
        admittedBedId: new Types.ObjectId(bedId),
        status: AdmissionStatus.ADMITTED,
      };
      mockAdmissionModel.create.mockResolvedValue(createdAdmission);
      mockBedModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockBedAllocationModel.create.mockResolvedValue({});

      // Mock getAdmissionById response
      mockAdmissionModel.findOne.mockReturnValueOnce(
        mockQuery({
          _id: new Types.ObjectId(admissionId),
          admissionNumber: 'ADM-2026-00001',
          patientId: { _id: new Types.ObjectId(patientId), uhid: 'UHID-001' },
          attendingDoctorId: { _id: new Types.ObjectId(doctorId), name: 'Dr. Smith' },
          admittedBedId: { _id: new Types.ObjectId(bedId), bedNumber: 'ICU-01' },
          status: AdmissionStatus.ADMITTED,
        }),
      );
      mockBedAllocationModel.find.mockReturnValue(mockQuery([]));

      const res = await ipdService.admitPatient(tenantId, doctorId, {
        patientId,
        attendingDoctorId: doctorId,
        bedId,
        admittingDiagnosis: 'Acute Severe Asthma',
        admissionSource: AdmissionSource.EMERGENCY,
      });

      expect(res.admissionNumber).toBe('ADM-2026-00001');
      expect(mockBedModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: expect.anything(), tenantId: expect.anything(), status: BedStatus.AVAILABLE },
        { $set: { status: BedStatus.OCCUPIED } },
        { returnDocument: 'after' },
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'IPD_ADMISSION' }),
      );
    });

    it('should reject admission if patient is already actively admitted', async () => {
      mockPatientModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(patientId), uhid: 'UHID-001' });
      mockAdmissionModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
        admissionNumber: 'ADM-2026-00001',
        status: AdmissionStatus.ADMITTED,
      });

      await expect(
        ipdService.admitPatient(tenantId, doctorId, {
          patientId,
          attendingDoctorId: doctorId,
          bedId,
          admittingDiagnosis: 'Fever',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject admission if selected bed is unavailable', async () => {
      mockPatientModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(patientId), uhid: 'UHID-001' });
      mockAdmissionModel.findOne.mockResolvedValue(null);
      mockUserModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(doctorId) });

      // Bed is not available
      mockBedModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        ipdService.admitPatient(tenantId, doctorId, {
          patientId,
          attendingDoctorId: doctorId,
          bedId,
          admittingDiagnosis: 'Fever',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('IpdService - Internal Bed Transfer', () => {
    it('should transfer patient, free origin bed to cleaning, and claim destination bed', async () => {
      const activeAdmission = {
        _id: new Types.ObjectId(admissionId),
        admissionNumber: 'ADM-2026-00001',
        patientId: new Types.ObjectId(patientId),
        admittedBedId: new Types.ObjectId(bedId),
        status: AdmissionStatus.ADMITTED,
        save: vi.fn().mockResolvedValue(true),
      };
      mockAdmissionModel.findOne.mockResolvedValueOnce(activeAdmission);

      mockBedModel.findOneAndUpdate
        .mockResolvedValueOnce({ _id: new Types.ObjectId(destBedId), bedNumber: 'GW-02', status: BedStatus.OCCUPIED })
        .mockResolvedValueOnce({ _id: new Types.ObjectId(bedId), bedNumber: 'ICU-01', status: BedStatus.CLEANING });

      mockBedAllocationModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
      mockBedAllocationModel.create.mockResolvedValue({});

      // Mock getAdmissionById
      mockAdmissionModel.findOne.mockReturnValueOnce(
        mockQuery({
          _id: new Types.ObjectId(admissionId),
          admissionNumber: 'ADM-2026-00001',
          admittedBedId: { _id: new Types.ObjectId(destBedId), bedNumber: 'GW-02' },
          status: AdmissionStatus.ADMITTED,
        }),
      );
      mockBedAllocationModel.find.mockReturnValue(mockQuery([]));

      await ipdService.transferBed(tenantId, doctorId, admissionId, {
        destinationBedId: destBedId,
        reason: 'Patient stabilized, step-down to general ward',
      });

      expect(activeAdmission.admittedBedId.toString()).toBe(destBedId);
      expect(activeAdmission.save).toHaveBeenCalled();
      expect(mockBedModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: expect.anything(), tenantId: expect.anything() },
        { $set: { status: BedStatus.CLEANING, currentAdmissionId: null } },
        { returnDocument: 'after' },
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'BED_TRANSFER' }),
      );
    });

    it('should reject transfer to the exact same bed', async () => {
      const activeAdmission = {
        _id: new Types.ObjectId(admissionId),
        admittedBedId: new Types.ObjectId(bedId),
        status: AdmissionStatus.ADMITTED,
      };
      mockAdmissionModel.findOne.mockResolvedValue(activeAdmission);

      await expect(
        ipdService.transferBed(tenantId, doctorId, admissionId, {
          destinationBedId: bedId, // same bed
          reason: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('IpdService - Inpatient Discharge', () => {
    it('should finalize discharge, seal admission, and release bed to cleaning', async () => {
      const activeAdmission = {
        _id: new Types.ObjectId(admissionId),
        admissionNumber: 'ADM-2026-00001',
        patientId: new Types.ObjectId(patientId),
        admittedBedId: new Types.ObjectId(bedId),
        status: AdmissionStatus.ADMITTED,
        dischargeDate: null,
        dischargeCondition: null,
        dischargeSummary: null,
        followUpInstructions: null,
        save: vi.fn().mockResolvedValue(true),
      };
      mockAdmissionModel.findOne.mockResolvedValueOnce(activeAdmission);
      mockBedModel.findOneAndUpdate.mockResolvedValue({ _id: new Types.ObjectId(bedId), bedNumber: 'ICU-01', status: BedStatus.CLEANING });
      mockBedAllocationModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      mockAdmissionModel.findOne.mockReturnValueOnce(
        mockQuery({
          _id: new Types.ObjectId(admissionId),
          admissionNumber: 'ADM-2026-00001',
          status: AdmissionStatus.DISCHARGED,
          dischargeCondition: DischargeCondition.IMPROVED,
        }),
      );
      mockBedAllocationModel.find.mockReturnValue(mockQuery([]));

      await ipdService.dischargePatient(tenantId, doctorId, admissionId, {
        dischargeSummary: 'Patient responded well to IV bronchodilators, vitals stable.',
        dischargeCondition: DischargeCondition.IMPROVED,
        followUpInstructions: 'Review in OPD in 7 days with chest X-ray.',
      });

      expect(activeAdmission.status).toBe(AdmissionStatus.DISCHARGED);
      expect(activeAdmission.dischargeCondition).toBe(DischargeCondition.IMPROVED);
      expect(activeAdmission.save).toHaveBeenCalled();
      expect(mockBedModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: expect.anything(), tenantId: expect.anything() },
        { $set: { status: BedStatus.CLEANING, currentAdmissionId: null } },
        { returnDocument: 'after' },
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'IPD_DISCHARGE' }),
      );
    });
  });
});
