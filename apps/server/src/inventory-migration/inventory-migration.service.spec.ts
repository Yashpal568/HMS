import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { InventoryMigrationService } from './inventory-migration.service.js';
import { ImportStage, StockMovementType } from '@hms/types';

describe('InventoryMigrationService', () => {
  let service: InventoryMigrationService;
  let mockImportJobModel: any;
  let mockLocationModel: any;
  let mockMedicineModel: any;
  let mockBatchModel: any;
  let mockMovementModel: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockImportJobModel = {
      find: vi.fn(),
      findOne: vi.fn(),
    };
    mockLocationModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      insertMany: vi.fn(),
    };
    mockMedicineModel = {
      findOne: vi.fn(),
    };
    mockBatchModel = {
      findOne: vi.fn(),
    };
    mockMovementModel = vi.fn();

    service = new InventoryMigrationService(
      mockImportJobModel as any,
      mockLocationModel as any,
      mockMedicineModel as any,
      mockBatchModel as any,
      mockMovementModel as any,
    );
  });

  describe('uploadCsv', () => {
    it('should parse headers and detect columns for mapping', async () => {
      const csv = `Brand Name,Generic Name,Batch,Expiry Date,Quantity\nParacetamol 500mg,Paracetamol,BATCH-A,2028-12-31,1000`;

      let capturedDoc: any;
      (service as any).importJobModel = vi.fn().mockImplementation(function (dto: any) {
        capturedDoc = {
          ...dto,
          save: vi.fn().mockResolvedValue(dto),
        };
        return capturedDoc;
      });

      await service.uploadCsv(tenantId, userId, {
        fileName: 'hospital_medicines_export.csv',
        fileSizeBytes: 120,
        csvContent: csv,
      });

      expect(capturedDoc.detectedColumns).toContain('Brand Name');
      expect(capturedDoc.detectedColumns).toContain('Generic Name');
      expect(capturedDoc.stage).toBe(ImportStage.MAPPING);
      expect(capturedDoc.columnMapping.brandName).toBe('Brand Name');
    });
  });

  describe('saveMappingAndValidate', () => {
    it('should catch invalid rows and set status to READY_FOR_APPROVAL if at least 1 row is valid', async () => {
      const csv = `Brand Name,Generic Name,Batch,Expiry Date,Quantity\nParacetamol,Paracetamol,B1,2028-12-31,500\n,MissingGeneric,B2,invalid-date,-10`;

      const mockJob = {
        _id: new Types.ObjectId(),
        rawCsvData: csv,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockImportJobModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockJob),
      });

      const result = await service.saveMappingAndValidate(tenantId, mockJob._id.toString(), {
        mapping: {
          brandName: 'Brand Name',
          genericName: 'Generic Name',
          batchNumber: 'Batch',
          expiryDate: 'Expiry Date',
          quantity: 'Quantity',
        },
      });

      expect(result.validRowsCount).toBe(1);
      expect(result.invalidRowsCount).toBeGreaterThan(0);
      expect(result.stage).toBe(ImportStage.READY_FOR_APPROVAL);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('approveAndExecuteImport', () => {
    it('should execute import, upserting medicine master and creating stock movement ledger', async () => {
      const csv = `brand,generic,batch,expiry,qty\nAmoxicillin,Amoxicillin,AMX-001,2027-06-30,200`;

      const mockJob = {
        _id: new Types.ObjectId(),
        fileName: 'amox.csv',
        stage: ImportStage.READY_FOR_APPROVAL,
        rawCsvData: csv,
        columnMapping: {
          brandName: 'brand',
          genericName: 'generic',
          batchNumber: 'batch',
          expiryDate: 'expiry',
          quantity: 'qty',
        },
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockImportJobModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockJob),
      });

      mockMedicineModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const mockMedInstance = {
        _id: new Types.ObjectId(),
        save: vi.fn().mockResolvedValue({}),
      };
      (service as any).medicineModel = vi.fn().mockImplementation(function (this: any, dto: any) {
        Object.assign(this, dto);
        this._id = mockMedInstance._id;
        this.save = mockMedInstance.save;
        return this;
      });
      (service as any).medicineModel.findOne = mockMedicineModel.findOne;

      mockBatchModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });
      const mockBatchInstance = {
        _id: new Types.ObjectId(),
        currentQuantity: 200,
        save: vi.fn().mockResolvedValue({}),
      };
      (service as any).batchModel = vi.fn().mockImplementation(function (dto: any) {
        return {
          ...dto,
          _id: mockBatchInstance._id,
          currentQuantity: 200,
          save: mockBatchInstance.save,
        };
      });
      (service as any).batchModel.findOne = mockBatchModel.findOne;

      let movementCreated: any;
      (service as any).movementModel = vi.fn().mockImplementation(function (dto: any) {
        movementCreated = {
          ...dto,
          save: vi.fn().mockResolvedValue(dto),
        };
        return movementCreated;
      });

      const result = await service.approveAndExecuteImport(tenantId, mockJob._id.toString(), userId);

      expect(result.importedRowsCount).toBe(1);
      expect(result.stage).toBe(ImportStage.COMPLETED);
      expect(movementCreated.type).toBe(StockMovementType.OPENING_BALANCE);
      expect(movementCreated.quantity).toBe(200);
    });
  });
});
