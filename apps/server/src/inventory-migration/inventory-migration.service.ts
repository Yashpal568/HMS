import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  InventoryImportJob,
  InventoryImportJobDocument,
} from './schemas/inventory-import-job.schema.js';
import {
  InventoryLocation,
  InventoryLocationDocument,
} from './schemas/inventory-location.schema.js';
import { Medicine, MedicineDocument } from '../pharmacy/schemas/medicine.schema.js';
import {
  MedicineBatch,
  MedicineBatchDocument,
} from '../pharmacy/schemas/medicine-batch.schema.js';
import {
  StockMovement,
  StockMovementDocument,
} from '../inventory/schemas/stock-movement.schema.js';
import {
  UploadInventoryCsvDto,
  SaveMappingDto,
  CreateLocationDto,
} from './dto/inventory-migration.dto.js';
import { ImportStage, StockMovementType, DosageForm, DrugSchedule } from '@hms/types';

export const DEFAULT_LOCATIONS = [
  { name: 'Central Medical Store', code: 'LOC-CENTRAL', type: 'WAREHOUSE', isDefault: true },
  { name: 'Main Hospital Pharmacy', code: 'LOC-PHARM-MAIN', type: 'PHARMACY', isDefault: false },
  { name: 'OPD Dispensary', code: 'LOC-OPD-DISP', type: 'PHARMACY', isDefault: false },
  { name: 'Emergency Drug Store', code: 'LOC-EMERGENCY', type: 'EMERGENCY', isDefault: false },
];

function parseCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined ? values[j] : '';
    }
    rows.push(row);
  }

  return { headers, rows };
}

@Injectable()
export class InventoryMigrationService {
  private readonly logger = new Logger(InventoryMigrationService.name);

  constructor(
    @InjectModel(InventoryImportJob.name)
    private readonly importJobModel: Model<InventoryImportJobDocument>,
    @InjectModel(InventoryLocation.name)
    private readonly locationModel: Model<InventoryLocationDocument>,
    @InjectModel(Medicine.name)
    private readonly medicineModel: Model<MedicineDocument>,
    @InjectModel(MedicineBatch.name)
    private readonly batchModel: Model<MedicineBatchDocument>,
    @InjectModel(StockMovement.name)
    private readonly movementModel: Model<StockMovementDocument>,
  ) {}

  // ==========================================================================
  // Locations
  // ==========================================================================

  async getLocations(tenantId: string) {
    const tId = new Types.ObjectId(tenantId);
    let locations = await this.locationModel.find({ tenantId: tId }).exec();

    if (locations.length === 0) {
      await this.locationModel.insertMany(
        DEFAULT_LOCATIONS.map((loc) => ({
          ...loc,
          tenantId: tId,
          isActive: true,
        })),
      );
      locations = await this.locationModel.find({ tenantId: tId }).exec();
    }
    return locations;
  }

  async createLocation(tenantId: string, dto: CreateLocationDto) {
    const tId = new Types.ObjectId(tenantId);
    const existing = await this.locationModel
      .findOne({ tenantId: tId, code: dto.code.trim().toUpperCase() })
      .exec();

    if (existing) {
      throw new BadRequestException(`Location code '${dto.code}' already exists.`);
    }

    const created = new this.locationModel({
      tenantId: tId,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      type: dto.type || 'WAREHOUSE',
      isDefault: false,
      isActive: true,
    });
    return created.save();
  }

  // ==========================================================================
  // Bulk Import Pipeline
  // ==========================================================================

  async getImports(tenantId: string) {
    return this.importJobModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .select('-rawCsvData')
      .exec();
  }

  async getImportById(tenantId: string, id: string) {
    const job = await this.importJobModel
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!job) throw new NotFoundException('Import job not found.');
    return job;
  }

  async uploadCsv(tenantId: string, userId: string, dto: UploadInventoryCsvDto) {
    const { headers, rows } = parseCsv(dto.csvContent);

    if (headers.length === 0 || rows.length === 0) {
      throw new BadRequestException('Uploaded CSV file contains no valid header or data rows.');
    }

    // Auto-detect matching column names
    const suggestedMapping: Record<string, string> = {};
    for (const h of headers) {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('generic')) {
        suggestedMapping.genericName = h;
      } else if (lower.includes('brand') || lower.includes('product') || lower.includes('medicine') || lower.includes('name')) {
        suggestedMapping.brandName = h;
      }
      if (lower.includes('dosage') || lower.includes('form') || lower.includes('type')) suggestedMapping.dosageForm = h;
      if (lower.includes('strength') || lower.includes('dose') || lower.includes('mg')) suggestedMapping.strength = h;
      if (lower.includes('category')) suggestedMapping.category = h;
      if (lower.includes('batch')) suggestedMapping.batchNumber = h;
      if (lower.includes('expiry') || lower.includes('exp')) suggestedMapping.expiryDate = h;
      if (lower.includes('qty') || lower.includes('quantity') || lower.includes('stock')) suggestedMapping.quantity = h;
      if (lower.includes('cost') || lower.includes('purchaseprice')) suggestedMapping.unitCostPrice = h;
      if (lower.includes('price') || lower.includes('mrp') || lower.includes('saleprice')) suggestedMapping.unitSalePrice = h;
    }

    const previewRows = rows.slice(0, 5);

    const job = new this.importJobModel({
      tenantId: new Types.ObjectId(tenantId),
      fileName: dto.fileName.trim(),
      fileSizeBytes: dto.fileSizeBytes,
      stage: ImportStage.MAPPING,
      detectedColumns: headers,
      columnMapping: suggestedMapping,
      totalRows: rows.length,
      validRowsCount: 0,
      invalidRowsCount: 0,
      importedRowsCount: 0,
      previewRows,
      validationErrors: [],
      rawCsvData: dto.csvContent,
      uploadedBy: new Types.ObjectId(userId),
    });

    return job.save();
  }

  async saveMappingAndValidate(tenantId: string, importId: string, dto: SaveMappingDto) {
    const job = await this.importJobModel
      .findOne({ _id: new Types.ObjectId(importId), tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!job) throw new NotFoundException('Import job not found.');
    if (!job.rawCsvData) throw new BadRequestException('Import job raw data is missing.');

    job.columnMapping = dto.mapping;
    job.stage = ImportStage.VALIDATING;

    const { rows } = parseCsv(job.rawCsvData);
    const mapping = dto.mapping;

    const errors: Array<{
      rowNumber: number;
      field: string;
      message: string;
      rawValue?: string;
    }> = [];

    const seenBatches = new Set<string>();
    let validCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      let rowValid = true;

      const brandName = mapping.brandName ? r[mapping.brandName]?.trim() : '';
      const genericName = mapping.genericName ? r[mapping.genericName]?.trim() : '';
      const batchNumber = mapping.batchNumber ? r[mapping.batchNumber]?.trim().toUpperCase() : '';
      const expiryDate = mapping.expiryDate ? r[mapping.expiryDate]?.trim() : '';
      const quantityStr = mapping.quantity ? r[mapping.quantity]?.trim() : '';

      if (!brandName) {
        errors.push({ rowNumber: rowNum, field: 'brandName', message: 'Brand name is required.', rawValue: brandName });
        rowValid = false;
      }
      if (!genericName) {
        errors.push({ rowNumber: rowNum, field: 'genericName', message: 'Generic name is required.', rawValue: genericName });
        rowValid = false;
      }
      if (!batchNumber) {
        errors.push({ rowNumber: rowNum, field: 'batchNumber', message: 'Batch number is required.', rawValue: batchNumber });
        rowValid = false;
      } else {
        const batchKey = `${brandName.toLowerCase()}::${batchNumber}`;
        if (seenBatches.has(batchKey)) {
          errors.push({ rowNumber: rowNum, field: 'batchNumber', message: `Duplicate batch '${batchNumber}' for this medicine in file.`, rawValue: batchNumber });
          rowValid = false;
        } else {
          seenBatches.add(batchKey);
        }
      }

      if (!expiryDate || isNaN(Date.parse(expiryDate))) {
        errors.push({ rowNumber: rowNum, field: 'expiryDate', message: 'Valid expiry date required (YYYY-MM-DD).', rawValue: expiryDate });
        rowValid = false;
      }

      const qty = parseInt(quantityStr, 10);
      if (isNaN(qty) || qty < 0) {
        errors.push({ rowNumber: rowNum, field: 'quantity', message: 'Valid non-negative quantity required.', rawValue: quantityStr });
        rowValid = false;
      }

      if (rowValid) validCount++;
    }

    job.validRowsCount = validCount;
    job.invalidRowsCount = errors.length;
    job.validationErrors = errors.slice(0, 100); // Store first 100 errors for preview

    if (validCount > 0) {
      job.stage = ImportStage.READY_FOR_APPROVAL;
    } else {
      job.stage = ImportStage.FAILED;
    }

    return job.save();
  }

  async approveAndExecuteImport(tenantId: string, importId: string, userId: string) {
    const tId = new Types.ObjectId(tenantId);
    const uId = new Types.ObjectId(userId);

    const job = await this.importJobModel
      .findOne({ _id: new Types.ObjectId(importId), tenantId: tId })
      .exec();

    if (!job) throw new NotFoundException('Import job not found.');
    if (job.stage !== ImportStage.READY_FOR_APPROVAL) {
      throw new BadRequestException(`Cannot execute import in stage '${job.stage}'. Must be READY_FOR_APPROVAL.`);
    }

    job.approvedBy = uId;
    job.approvedAt = new Date();
    job.stage = ImportStage.IMPORTING;
    await job.save();

    const { rows } = parseCsv(job.rawCsvData || '');
    const mapping = job.columnMapping || {};

    let importedCount = 0;

    // Asynchronous processing loop in safe chunks
    for (const r of rows) {
      const brandName = mapping.brandName ? r[mapping.brandName]?.trim() : '';
      const genericName = mapping.genericName ? r[mapping.genericName]?.trim() : '';
      const dosageFormStr = mapping.dosageForm ? r[mapping.dosageForm]?.trim().toUpperCase() : 'TABLET';
      const strength = mapping.strength ? r[mapping.strength]?.trim() : '500mg';
      const category = mapping.category ? r[mapping.category]?.trim() : 'General';
      const batchNumber = mapping.batchNumber ? r[mapping.batchNumber]?.trim().toUpperCase() : '';
      const expiryDateStr = mapping.expiryDate ? r[mapping.expiryDate]?.trim() : '';
      const qtyStr = mapping.quantity ? r[mapping.quantity]?.trim() : '0';
      const costStr = mapping.unitCostPrice ? r[mapping.unitCostPrice]?.trim() : '0';
      const saleStr = mapping.unitSalePrice ? r[mapping.unitSalePrice]?.trim() : '10';

      if (!brandName || !genericName || !batchNumber || !expiryDateStr) {
        continue;
      }

      const qty = parseInt(qtyStr, 10) || 0;
      const costPrice = parseFloat(costStr) || 0;
      const salePrice = parseFloat(saleStr) || 10;
      const expiryDate = new Date(expiryDateStr);

      // Validate dosage form
      const dosageForm = Object.values(DosageForm).includes(dosageFormStr as DosageForm)
        ? (dosageFormStr as DosageForm)
        : DosageForm.TABLET;

      // 1. Upsert Medicine Master
      let medicine = await this.medicineModel
        .findOne({ tenantId: tId, brandName, genericName })
        .exec();

      if (!medicine) {
        medicine = new this.medicineModel({
          tenantId: tId,
          brandName,
          genericName,
          dosageForm,
          strength,
          category,
          schedule: DrugSchedule.PRESCRIPTION,
          minStockLevel: 50,
          isActive: true,
        });
        await medicine.save();
      }

      // 2. Upsert Medicine Batch
      let batch = await this.batchModel
        .findOne({ tenantId: tId, medicineId: medicine._id, batchNumber })
        .exec();

      if (!batch) {
        batch = new this.batchModel({
          tenantId: tId,
          medicineId: medicine._id,
          batchNumber,
          expiryDate,
          initialQuantity: qty,
          currentQuantity: qty,
          unitCostPrice: costPrice,
          unitSalePrice: salePrice,
          isActive: true,
        });
        await batch.save();
      } else {
        batch.currentQuantity += qty;
        await batch.save();
      }

      // 3. Record Opening Balance Stock Movement Ledger
      if (qty > 0) {
        const movement = new this.movementModel({
          tenantId: tId,
          itemId: medicine._id,
          type: StockMovementType.OPENING_BALANCE,
          quantity: qty,
          balanceAfter: batch.currentQuantity,
          reason: `Bulk Inventory Migration: ${job.fileName} (Batch: ${batch.batchNumber})`,
          performedBy: uId,
        });
        await movement.save();
      }

      importedCount++;
    }

    job.importedRowsCount = importedCount;
    job.completedAt = new Date();
    job.stage =
      job.invalidRowsCount > 0
        ? ImportStage.COMPLETED_WITH_ERRORS
        : ImportStage.COMPLETED;

    return job.save();
  }
}
