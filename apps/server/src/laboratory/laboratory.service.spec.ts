import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LaboratoryService } from './laboratory.service.js';
import { Types } from 'mongoose';
import {
  LabOrderPriority,
  LabOrderStatus,
  LabResultFlag,
} from '@hms/types';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LaboratoryService', () => {
  let service: LaboratoryService;
  let mockLabTestModel: any;
  let mockLabOrderModel: any;
  let mockPatientModel: any;
  let mockUserModel: any;
  let mockAuditService: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const patientId = new Types.ObjectId().toString();
  const doctorId = new Types.ObjectId().toString();
  const testId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockLabTestModel = {
      countDocuments: vi.fn(),
      insertMany: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
    };

    mockLabOrderModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
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

    service = new LaboratoryService(
      mockLabTestModel,
      mockLabOrderModel,
      mockPatientModel,
      mockUserModel,
      mockAuditService,
    );
  });

  describe('computeFlag', () => {
    const refMin = 13.0;
    const refMax = 17.0;
    const critLow = 7.0;
    const critHigh = 20.0;

    it('should classify values within normal range as NORMAL', () => {
      const res = service.computeFlag('14.5', refMin, refMax, critLow, critHigh);
      expect(res.flag).toBe(LabResultFlag.NORMAL);
      expect(res.numericValue).toBe(14.5);
    });

    it('should classify values below refMin but above critLow as LOW', () => {
      const res = service.computeFlag('11.0', refMin, refMax, critLow, critHigh);
      expect(res.flag).toBe(LabResultFlag.LOW);
      expect(res.numericValue).toBe(11.0);
    });

    it('should classify values above refMax but below critHigh as HIGH', () => {
      const res = service.computeFlag('18.5', refMin, refMax, critLow, critHigh);
      expect(res.flag).toBe(LabResultFlag.HIGH);
      expect(res.numericValue).toBe(18.5);
    });

    it('should trigger CRITICAL for values below criticalLow', () => {
      const res = service.computeFlag('5.5', refMin, refMax, critLow, critHigh);
      expect(res.flag).toBe(LabResultFlag.CRITICAL);
      expect(res.numericValue).toBe(5.5);
    });

    it('should trigger CRITICAL for values above criticalHigh', () => {
      const res = service.computeFlag('22.0', refMin, refMax, critLow, critHigh);
      expect(res.flag).toBe(LabResultFlag.CRITICAL);
      expect(res.numericValue).toBe(22.0);
    });

    it('should handle non-numeric qualitative values gracefully as NORMAL', () => {
      const res = service.computeFlag('Negative');
      expect(res.flag).toBe(LabResultFlag.NORMAL);
      expect(res.numericValue).toBeUndefined();
    });
  });

  describe('ensureTestCatalogSeeded', () => {
    it('should seed standard catalog when count is 0', async () => {
      mockLabTestModel.countDocuments.mockResolvedValue(0);
      mockLabTestModel.updateOne = vi.fn().mockResolvedValue({ upsertedCount: 1 });

      await service.ensureTestCatalogSeeded(tenantId);
      expect(mockLabTestModel.updateOne).toHaveBeenCalledTimes(4);
    });

    it('should not seed when catalog already has tests', async () => {
      mockLabTestModel.countDocuments.mockResolvedValue(5);
      mockLabTestModel.updateOne = vi.fn();

      await service.ensureTestCatalogSeeded(tenantId);
      expect(mockLabTestModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('createOrder', () => {
    it('should reject order requisition if patient does not exist in tenant', async () => {
      mockLabTestModel.countDocuments.mockResolvedValue(1);
      mockPatientModel.findOne.mockResolvedValue(null);

      await expect(
        service.createOrder(tenantId, userId, {
          patientId,
          doctorId,
          testIds: [testId],
          priority: LabOrderPriority.ROUTINE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject order requisition if doctor does not exist in tenant', async () => {
      mockLabTestModel.countDocuments.mockResolvedValue(1);
      mockPatientModel.findOne.mockResolvedValue({ _id: patientId, uhid: 'UHID-001' });
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(
        service.createOrder(tenantId, userId, {
          patientId,
          doctorId,
          testIds: [testId],
          priority: LabOrderPriority.ROUTINE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create order and return populated record', async () => {
      mockLabTestModel.countDocuments.mockResolvedValue(1);
      mockPatientModel.findOne.mockResolvedValue({ _id: patientId, uhid: 'UHID-001' });
      mockUserModel.findOne.mockResolvedValue({ _id: doctorId, name: 'Dr. Test' });
      mockLabTestModel.find.mockResolvedValue([{ _id: testId, code: 'CBC' }]);
      mockLabOrderModel.countDocuments.mockResolvedValue(0);

      const createdOrder = {
        _id: new Types.ObjectId(),
        orderNumber: 'LAB-2026-00001',
        patientId,
        doctorId,
        testIds: [testId],
        status: LabOrderStatus.ORDERED,
        priority: LabOrderPriority.ROUTINE,
      };

      mockLabOrderModel.create.mockResolvedValue(createdOrder);

      // Mock getOrderById chain
      mockLabOrderModel.findOne.mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(createdOrder),
      });

      const order = await service.createOrder(tenantId, userId, {
        patientId,
        doctorId,
        testIds: [testId],
        priority: LabOrderPriority.ROUTINE,
      });

      expect(order).toBeDefined();
      expect(order.orderNumber).toBe('LAB-2026-00001');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          hospitalId: tenantId,
          userId,
          action: 'LAB_ORDER_CREATE',
        }),
      );
    });
  });

  describe('collectSample', () => {
    it('should assign accession barcode and advance status to sample_collected', async () => {
      const orderDoc = {
        _id: new Types.ObjectId(),
        orderNumber: 'LAB-2026-00001',
        status: LabOrderStatus.ORDERED,
        save: vi.fn().mockResolvedValue(true),
      };

      mockLabOrderModel.findOne.mockResolvedValue(orderDoc);
      mockLabOrderModel.countDocuments.mockResolvedValue(0); // For generateAccessionNumber

      // Mock getOrderById chain
      mockLabOrderModel.findOne.mockReturnValueOnce(orderDoc).mockReturnValueOnce({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          ...orderDoc,
          accessionNumber: 'ACC-2026-00001',
          status: LabOrderStatus.SAMPLE_COLLECTED,
        }),
      });

      await service.collectSample(tenantId, userId, orderDoc._id.toString(), {
        containerType: 'EDTA Vacutainer (Lavender)',
        phlebotomistNotes: 'Sample collected from left arm vein',
      });

      expect(orderDoc.save).toHaveBeenCalled();
      expect(orderDoc.status).toBe(LabOrderStatus.SAMPLE_COLLECTED);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          hospitalId: tenantId,
          userId,
          action: 'SAMPLE_COLLECT',
        }),
      );
    });
  });

  describe('enterResults & verification lock', () => {
    it('should enter results, calculate flags, and advance status to result_entered', async () => {
      const orderDoc: any = {
        _id: new Types.ObjectId(),
        orderNumber: 'LAB-2026-00001',
        testIds: [testId],
        status: LabOrderStatus.SAMPLE_COLLECTED,
        results: [],
        save: vi.fn().mockResolvedValue(true),
      };

      mockLabOrderModel.findOne.mockResolvedValue(orderDoc);
      mockLabTestModel.find.mockResolvedValue([
        {
          _id: new Types.ObjectId(testId),
          code: 'CBC',
          parameters: [
            {
              name: 'Hemoglobin',
              unit: 'g/dL',
              referenceMin: 13.0,
              referenceMax: 17.0,
              criticalLow: 7.0,
              criticalHigh: 20.0,
            },
          ],
        },
      ]);

      mockLabOrderModel.findOne.mockReturnValueOnce(orderDoc).mockReturnValueOnce({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          ...orderDoc,
          status: LabOrderStatus.RESULT_ENTERED,
        }),
      });

      await service.enterResults(tenantId, userId, orderDoc._id.toString(), {
        results: [
          {
            testId,
            parameterName: 'Hemoglobin',
            value: '11.5',
          },
        ],
        technicianNotes: 'No hemolysis observed',
      });

      expect(orderDoc.save).toHaveBeenCalled();
      expect(orderDoc.status).toBe(LabOrderStatus.RESULT_ENTERED);
      expect(orderDoc.results.length).toBe(1);
      expect(orderDoc.results[0].flag).toBe(LabResultFlag.LOW);
    });

    it('should reject result mutation if order is already verified (Immutability Lock)', async () => {
      const verifiedOrder = {
        _id: new Types.ObjectId(),
        orderNumber: 'LAB-2026-00001',
        status: LabOrderStatus.VERIFIED,
      };

      mockLabOrderModel.findOne.mockResolvedValue(verifiedOrder);

      await expect(
        service.enterResults(tenantId, userId, verifiedOrder._id.toString(), {
          results: [{ testId, parameterName: 'Hemoglobin', value: '14.0' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow pathologist to verify order and lock report', async () => {
      const orderDoc: any = {
        _id: new Types.ObjectId(),
        orderNumber: 'LAB-2026-00001',
        status: LabOrderStatus.RESULT_ENTERED,
        results: [{ testId, parameterName: 'Hemoglobin', value: '14.0' }],
        save: vi.fn().mockResolvedValue(true),
      };

      mockLabOrderModel.findOne.mockResolvedValue(orderDoc);

      mockLabOrderModel.findOne.mockReturnValueOnce(orderDoc).mockReturnValueOnce({
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue({
          ...orderDoc,
          status: LabOrderStatus.VERIFIED,
        }),
      });

      await service.verifyOrder(tenantId, userId, orderDoc._id.toString(), {
        pathologistRemarks: 'Results reviewed and clinically correlated.',
      });

      expect(orderDoc.save).toHaveBeenCalled();
      expect(orderDoc.status).toBe(LabOrderStatus.VERIFIED);
      expect(orderDoc.pathologistRemarks).toBe('Results reviewed and clinically correlated.');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          hospitalId: tenantId,
          userId,
          action: 'LAB_RESULT_VERIFY',
        }),
      );
    });
  });
});
