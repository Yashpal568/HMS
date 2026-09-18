import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PharmacyService } from './pharmacy.service.js';
import { Types } from 'mongoose';
import {
  DosageForm,
  PharmacyTransactionType,
  PrescriptionStatus,
} from '@hms/types';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PharmacyService', () => {
  let service: PharmacyService;
  let mockMedicineModel: any;
  let mockBatchModel: any;
  let mockDispensingRecordModel: any;
  let mockTransactionModel: any;
  let mockPrescriptionModel: any;
  let mockPatientModel: any;
  let mockUserModel: any;
  let mockAuditService: any;

  const tenantId = new Types.ObjectId().toString();
  const pharmacistId = new Types.ObjectId().toString();
  const patientId = new Types.ObjectId().toString();
  const doctorId = new Types.ObjectId().toString();
  const prescriptionId = new Types.ObjectId().toString();
  const medicineId = new Types.ObjectId().toString();
  const batchId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockMedicineModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
    };

    mockBatchModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
    };

    mockDispensingRecordModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
    };

    mockTransactionModel = {
      create: vi.fn(),
      find: vi.fn(),
    };

    mockPrescriptionModel = {
      countDocuments: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
    };

    mockPatientModel = {
      findOne: vi.fn(),
    };

    mockUserModel = {
      findOne: vi.fn(),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    service = new PharmacyService(
      mockMedicineModel,
      mockBatchModel,
      mockDispensingRecordModel,
      mockTransactionModel,
      mockPrescriptionModel,
      mockPatientModel,
      mockUserModel,
      mockAuditService,
    );
  });

  describe('FEFO batch recommendation and prescription retrieval', () => {
    it('should recommend the earliest expiring batch that is not expired (FEFO)', async () => {
      const now = new Date();
      const expiry6m = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      const expiry18m = new Date(now.getTime() + 540 * 24 * 60 * 60 * 1000);

      const mockPrescription = {
        _id: new Types.ObjectId(prescriptionId),
        tenantId: new Types.ObjectId(tenantId),
        patientId: new Types.ObjectId(patientId),
        doctorId: new Types.ObjectId(doctorId),
        status: PrescriptionStatus.ACTIVE,
        items: [
          {
            medicineName: 'Amoxicillin 500mg',
            dosageForm: 'capsule',
            strength: '500 mg',
            quantity: 15,
            instructions: '1-0-1 after meals',
          },
        ],
      };

      const queryMock = {
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockPrescription),
      };
      mockPrescriptionModel.findOne.mockReturnValue(queryMock);

      const pastDispenseQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockDispensingRecordModel.find.mockReturnValue(pastDispenseQuery);

      const matchedMedicine = {
        _id: new Types.ObjectId(medicineId),
        brandName: 'Amoxil 500',
        genericName: 'Amoxicillin',
        dosageForm: DosageForm.CAPSULE,
        strength: '500 mg',
      };
      mockMedicineModel.findOne.mockResolvedValue(matchedMedicine);

      const batches = [
        {
          _id: new Types.ObjectId(batchId),
          batchNumber: 'B1-AMX-26A',
          expiryDate: expiry6m,
          currentQuantity: 100,
          unitSalePrice: 50,
        },
        {
          _id: new Types.ObjectId(),
          batchNumber: 'B2-AMX-26B',
          expiryDate: expiry18m,
          currentQuantity: 150,
          unitSalePrice: 55,
        },
      ];

      const batchQueryMock = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(batches),
      };
      mockBatchModel.find.mockReturnValue(batchQueryMock);
      mockMedicineModel.countDocuments.mockResolvedValue(8);

      const result = await service.getPrescriptionForDispensing(tenantId, prescriptionId);

      expect(result.enrichedItems.length).toBe(1);
      const item = result.enrichedItems[0];
      expect(item.availableBatches.length).toBe(2);
      expect(item.availableBatches[0].isFefoRecommended).toBe(true);
      expect(item.availableBatches[1].isFefoRecommended).toBe(false);
      expect(item.availableBatches[0].batchNumber).toBe('B1-AMX-26A');
    });
  });

  describe('dispense execution & atomic stock deduction', () => {
    it('should reject dispensing if prescription is not found', async () => {
      mockPrescriptionModel.findOne.mockResolvedValue(null);

      await expect(
        service.dispense(tenantId, pharmacistId, {
          prescriptionId,
          items: [{ medicineId, batchId, quantity: 10 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject dispensing if prescription is already fully dispensed', async () => {
      mockPrescriptionModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(prescriptionId),
        status: PrescriptionStatus.DISPENSED,
      });

      await expect(
        service.dispense(tenantId, pharmacistId, {
          prescriptionId,
          items: [{ medicineId, batchId, quantity: 10 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject dispensing if batch is expired', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      mockPrescriptionModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(prescriptionId),
        status: PrescriptionStatus.ACTIVE,
      });

      mockBatchModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(batchId),
        batchNumber: 'EXPIRED-BATCH',
        expiryDate: yesterday,
        currentQuantity: 50,
      });

      await expect(
        service.dispense(tenantId, pharmacistId, {
          prescriptionId,
          items: [{ medicineId, batchId, quantity: 5 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject dispensing if requested quantity exceeds current batch quantity', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      mockPrescriptionModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(prescriptionId),
        status: PrescriptionStatus.ACTIVE,
      });

      mockBatchModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(batchId),
        batchNumber: 'LOW-BATCH',
        expiryDate: tomorrow,
        currentQuantity: 5,
      });

      await expect(
        service.dispense(tenantId, pharmacistId, {
          prescriptionId,
          items: [{ medicineId, batchId, quantity: 20 }],
        }),
      ).rejects.toThrow(/Insufficient stock/);
    });

    it('should atomically deduct batch stock, create transaction, record dispense, and update status', async () => {
      const futureExpiry = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
      const prescriptionDoc = {
        _id: new Types.ObjectId(prescriptionId),
        patientId: new Types.ObjectId(patientId),
        status: PrescriptionStatus.ACTIVE,
        items: [{ quantity: 10 }],
        save: vi.fn().mockResolvedValue(undefined),
      };
      mockPrescriptionModel.findOne.mockResolvedValue(prescriptionDoc);

      const batchDoc = {
        _id: new Types.ObjectId(batchId),
        batchNumber: 'VALID-BATCH-1',
        expiryDate: futureExpiry,
        currentQuantity: 100,
        unitSalePrice: 50,
      };
      mockBatchModel.findOne.mockResolvedValue(batchDoc);

      const updatedBatchDoc = {
        _id: new Types.ObjectId(batchId),
        currentQuantity: 90,
      };
      mockBatchModel.findOneAndUpdate.mockResolvedValue(updatedBatchDoc);

      mockMedicineModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(medicineId),
        brandName: 'Calpol 650',
        dosageForm: DosageForm.TABLET,
        strength: '650 mg',
      });

      mockDispensingRecordModel.countDocuments.mockResolvedValue(0);

      const createdRecord = {
        _id: new Types.ObjectId(),
        dispenseNumber: 'DSP-2026-00001',
      };
      mockDispensingRecordModel.create.mockResolvedValue(createdRecord);

      // Previous dispensing returns full fulfillment
      mockDispensingRecordModel.find.mockResolvedValue([
        { items: [{ quantity: 10 }] },
      ]);

      const recordPopulateQuery = {
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(createdRecord),
      };
      mockDispensingRecordModel.findOne.mockReturnValue(recordPopulateQuery);

      const res = await service.dispense(tenantId, pharmacistId, {
        prescriptionId,
        items: [{ medicineId, batchId, quantity: 10, instructions: '1 tablet TDS' }],
      });

      expect(mockBatchModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.anything(),
          tenantId: expect.anything(),
          currentQuantity: { $gte: 10 },
        }),
        { $inc: { currentQuantity: -10 } },
        { new: true },
      );

      expect(mockTransactionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PharmacyTransactionType.DISPENSE_OUT,
          quantity: 10,
          balanceAfter: 90,
        }),
      );

      expect(prescriptionDoc.status).toBe(PrescriptionStatus.DISPENSED);
      expect(prescriptionDoc.save).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MEDICINE_DISPENSE',
        }),
      );
      expect(res).toBeDefined();
    });
  });

  describe('patient medication return & restocking', () => {
    it('should restock batch, record transaction and log audit', async () => {
      const recordDoc = {
        _id: new Types.ObjectId(),
        dispenseNumber: 'DSP-2026-00001',
      };
      mockDispensingRecordModel.findOne.mockResolvedValue(recordDoc);

      const batchDoc = {
        _id: new Types.ObjectId(batchId),
        batchNumber: 'AMX-BATCH-1',
        medicineId: new Types.ObjectId(medicineId),
        currentQuantity: 80,
      };
      mockBatchModel.findOne.mockResolvedValue(batchDoc);

      const updatedBatch = {
        _id: new Types.ObjectId(batchId),
        currentQuantity: 85,
      };
      mockBatchModel.findOneAndUpdate.mockResolvedValue(updatedBatch);

      const result = await service.returnMedicine(tenantId, pharmacistId, {
        dispenseId: recordDoc._id.toString(),
        batchId,
        quantity: 5,
        reason: 'Patient discharged early, unopened strip',
      });

      expect(mockBatchModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { $inc: { currentQuantity: 5 } },
        { new: true },
      );

      expect(mockTransactionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PharmacyTransactionType.RETURN_IN,
          quantity: 5,
          balanceAfter: 85,
        }),
      );

      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MEDICINE_RETURN',
        }),
      );

      expect(result.currentQuantity).toBe(85);
    });
  });
});
