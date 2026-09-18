import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DosageForm,
  DrugSchedule,
  PharmacyTransactionType,
  PrescriptionStatus,
} from '@hms/types';
import { Medicine, MedicineDocument } from './schemas/medicine.schema.js';
import { MedicineBatch, MedicineBatchDocument } from './schemas/medicine-batch.schema.js';
import {
  DispensingRecord,
  DispensingRecordDocument,
} from './schemas/dispensing-record.schema.js';
import {
  PharmacyTransaction,
  PharmacyTransactionDocument,
} from './schemas/pharmacy-transaction.schema.js';
import { Prescription, PrescriptionDocument } from '../emr/schemas/prescription.schema.js';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { DispenseDto } from './dto/dispense.dto.js';
import { CreateMedicineDto } from './dto/create-medicine.dto.js';
import { CreateBatchDto } from './dto/create-batch.dto.js';
import { ReturnMedicineDto } from './dto/return-medicine.dto.js';
import {
  PrescriptionsQueryDto,
  BatchesQueryDto,
  MedicinesQueryDto,
} from './dto/pharmacy-query.dto.js';

export const DEFAULT_MEDICINES = [
  {
    brandName: 'Amoxil 500',
    genericName: 'Amoxicillin',
    dosageForm: DosageForm.CAPSULE,
    strength: '500 mg',
    category: 'Antibiotic',
    schedule: DrugSchedule.PRESCRIPTION,
    storageConditions: 'Store below 25°C in a dry place',
    minStockLevel: 50,
  },
  {
    brandName: 'Calpol 650',
    genericName: 'Paracetamol',
    dosageForm: DosageForm.TABLET,
    strength: '650 mg',
    category: 'Analgesic & Antipyretic',
    schedule: DrugSchedule.OTC,
    storageConditions: 'Store in cool and dry place',
    minStockLevel: 100,
  },
  {
    brandName: 'Azithral 500',
    genericName: 'Azithromycin',
    dosageForm: DosageForm.TABLET,
    strength: '500 mg',
    category: 'Antibiotic',
    schedule: DrugSchedule.SCHEDULE_H,
    storageConditions: 'Store below 30°C protected from moisture',
    minStockLevel: 30,
  },
  {
    brandName: 'Glycomet 500',
    genericName: 'Metformin Hydrochloride',
    dosageForm: DosageForm.TABLET,
    strength: '500 mg',
    category: 'Antidiabetic',
    schedule: DrugSchedule.PRESCRIPTION,
    storageConditions: 'Store below 25°C',
    minStockLevel: 60,
  },
  {
    brandName: 'Amlong 5',
    genericName: 'Amlodipine',
    dosageForm: DosageForm.TABLET,
    strength: '5 mg',
    category: 'Antihypertensive',
    schedule: DrugSchedule.PRESCRIPTION,
    storageConditions: 'Store below 25°C protected from light',
    minStockLevel: 50,
  },
  {
    brandName: 'Cetzine 10',
    genericName: 'Cetirizine Hydrochloride',
    dosageForm: DosageForm.TABLET,
    strength: '10 mg',
    category: 'Antihistamine',
    schedule: DrugSchedule.OTC,
    storageConditions: 'Store in a cool, dry place',
    minStockLevel: 40,
  },
  {
    brandName: 'Benadryl DR Syrup',
    genericName: 'Dextromethorphan HBr',
    dosageForm: DosageForm.SYRUP,
    strength: '15 mg / 5 ml',
    category: 'Respiratory & Cough',
    schedule: DrugSchedule.OTC,
    storageConditions: 'Store between 15°C and 30°C',
    minStockLevel: 25,
  },
  {
    brandName: 'Tramazac 50 Injection',
    genericName: 'Tramadol Hydrochloride',
    dosageForm: DosageForm.INJECTION,
    strength: '50 mg / ml',
    category: 'Analgesic & Narcotic',
    schedule: DrugSchedule.NARCOTIC,
    storageConditions: 'Store below 25°C. Do not freeze.',
    minStockLevel: 20,
  },
];

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);

  constructor(
    @InjectModel(Medicine.name)
    private readonly medicineModel: Model<MedicineDocument>,
    @InjectModel(MedicineBatch.name)
    private readonly batchModel: Model<MedicineBatchDocument>,
    @InjectModel(DispensingRecord.name)
    private readonly dispensingRecordModel: Model<DispensingRecordDocument>,
    @InjectModel(PharmacyTransaction.name)
    private readonly transactionModel: Model<PharmacyTransactionDocument>,
    @InjectModel(Prescription.name)
    private readonly prescriptionModel: Model<PrescriptionDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly auditService: AuditService,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    try {
      return new Types.ObjectId(id);
    } catch {
      throw new BadRequestException(`Invalid ObjectId format: "${id}"`);
    }
  }

  /**
   * Idempotent seed engine populating standard medicines & realistic batches
   */
  async ensureSeedCatalog(tenantId: string): Promise<void> {
    const tId = this.toObjectId(tenantId);
    const existingCount = await this.medicineModel.countDocuments({ tenantId: tId });

    if (existingCount === 0) {
      this.logger.log(`Seeding default formulary and batches for tenant: ${tenantId}`);
      try {
        const now = new Date();
        for (const med of DEFAULT_MEDICINES) {
          const createdMed = await this.medicineModel.create({
            tenantId: tId,
            brandName: med.brandName,
            genericName: med.genericName,
            dosageForm: med.dosageForm,
            strength: med.strength,
            category: med.category,
            schedule: med.schedule,
            storageConditions: med.storageConditions,
            minStockLevel: med.minStockLevel,
            isActive: true,
          });

          // Generate Batch 1: Expiring in ~6 months (FEFO First Pick)
          const expiry6m = new Date(now);
          expiry6m.setMonth(expiry6m.getMonth() + 6);
          const mfg6m = new Date(now);
          mfg6m.setMonth(mfg6m.getMonth() - 6);

          const batch1 = await this.batchModel.create({
            tenantId: tId,
            medicineId: createdMed._id,
            batchNumber: `B1-${createdMed.brandName.substring(0, 3).toUpperCase()}-26A`,
            expiryDate: expiry6m,
            manufactureDate: mfg6m,
            initialQuantity: 150,
            currentQuantity: 150,
            unitCostPrice: 35,
            unitSalePrice: 55,
            isActive: true,
          });

          await this.transactionModel.create({
            tenantId: tId,
            batchId: batch1._id,
            medicineId: createdMed._id,
            type: PharmacyTransactionType.PURCHASE_IN,
            quantity: 150,
            balanceAfter: 150,
            referenceId: 'INITIAL_STOCK_SEED',
            notes: 'System baseline stock receipt',
            createdAt: now,
          });

          // Generate Batch 2: Expiring in ~18 months (FEFO Later Pick)
          const expiry18m = new Date(now);
          expiry18m.setMonth(expiry18m.getMonth() + 18);
          const mfgNow = new Date(now);

          const batch2 = await this.batchModel.create({
            tenantId: tId,
            medicineId: createdMed._id,
            batchNumber: `B2-${createdMed.brandName.substring(0, 3).toUpperCase()}-26B`,
            expiryDate: expiry18m,
            manufactureDate: mfgNow,
            initialQuantity: 200,
            currentQuantity: 200,
            unitCostPrice: 38,
            unitSalePrice: 60,
            isActive: true,
          });

          await this.transactionModel.create({
            tenantId: tId,
            batchId: batch2._id,
            medicineId: createdMed._id,
            type: PharmacyTransactionType.PURCHASE_IN,
            quantity: 200,
            balanceAfter: 200,
            referenceId: 'INITIAL_STOCK_SEED',
            notes: 'System baseline stock receipt',
            createdAt: now,
          });

          // Generate Batch 3 for Paracetamol & Amoxicillin: Near-Expiry within 45 days (for alert queue verification)
          if (med.genericName === 'Paracetamol' || med.genericName === 'Amoxicillin') {
            const expiry45d = new Date(now);
            expiry45d.setDate(expiry45d.getDate() + 45);
            const mfgOld = new Date(now);
            mfgOld.setMonth(mfgOld.getMonth() - 22);

            const batch3 = await this.batchModel.create({
              tenantId: tId,
              medicineId: createdMed._id,
              batchNumber: `NE-${createdMed.brandName.substring(0, 3).toUpperCase()}-OLD`,
              expiryDate: expiry45d,
              manufactureDate: mfgOld,
              initialQuantity: 30,
              currentQuantity: 25,
              unitCostPrice: 20,
              unitSalePrice: 40,
              isActive: true,
            });

            await this.transactionModel.create({
              tenantId: tId,
              batchId: batch3._id,
              medicineId: createdMed._id,
              type: PharmacyTransactionType.PURCHASE_IN,
              quantity: 30,
              balanceAfter: 25,
              referenceId: 'INITIAL_STOCK_SEED',
              notes: 'Near-expiry stock test fixture',
              createdAt: now,
            });
          }
        }
        this.logger.log(`Seeded standard formulary and batches for tenant: ${tenantId}`);
      } catch (err) {
        this.logger.warn(`Notice during seed catalog: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Sequential dispense number generator: DSP-YYYY-NNNNN
   */
  private async generateDispenseNumber(tenantId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.dispensingRecordModel.countDocuments({
      tenantId,
      dispenseNumber: new RegExp(`^DSP-${year}-`),
    });
    const seq = String(count + 1).padStart(5, '0');
    return `DSP-${year}-${seq}`;
  }

  /**
   * Retrieve active and partially dispensed prescriptions awaiting pharmacy fulfillment
   */
  async getPrescriptionsQueue(tenantId: string, query: PrescriptionsQueryDto): Promise<any[]> {
    await this.ensureSeedCatalog(tenantId);
    const tId = this.toObjectId(tenantId);
    const filter: Record<string, any> = { tenantId: tId };

    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    } else {
      filter.status = {
        $in: [PrescriptionStatus.ACTIVE, PrescriptionStatus.PARTIALLY_DISPENSED],
      };
    }

    if (query.patientId) {
      filter.patientId = this.toObjectId(query.patientId);
    }

    if (query.doctorId) {
      filter.doctorId = this.toObjectId(query.doctorId);
    }

    const prescriptions = await this.prescriptionModel
      .find(filter)
      .populate('patientId', 'name uhid gender dateOfBirth phone bloodGroup allergies')
      .populate('doctorId', 'name email role department')
      .populate('encounterId', 'encounterNumber type createdAt vitals')
      .sort({ createdAt: -1 })
      .exec();

    return prescriptions;
  }

  /**
   * Retrieve prescription detail with matching medicines and available batches sorted by FEFO
   */
  async getPrescriptionForDispensing(tenantId: string, prescriptionId: string): Promise<any> {
    await this.ensureSeedCatalog(tenantId);
    const tId = this.toObjectId(tenantId);
    const pId = this.toObjectId(prescriptionId);

    const prescription = await this.prescriptionModel
      .findOne({ _id: pId, tenantId: tId })
      .populate('patientId', 'name uhid gender dateOfBirth phone bloodGroup allergies emergencyContact contacts')
      .populate('doctorId', 'name email role department')
      .populate('encounterId', 'encounterNumber type chiefComplaints diagnoses vitals createdAt')
      .exec();

    if (!prescription) {
      throw new NotFoundException('Prescription not found in this hospital tenant.');
    }

    // Previous dispensing records for this prescription
    const pastDispensing = await this.dispensingRecordModel
      .find({ prescriptionId: pId, tenantId: tId })
      .populate('pharmacistId', 'name email role')
      .sort({ dispensedAt: -1 })
      .exec();

    // Map each prescribed item to matching medicine and FEFO batches
    const now = new Date();
    const enrichedItems = await Promise.all(
      prescription.items.map(async (item) => {
        // Clean medicine name for fuzzy matching (strip dosage like '500mg' or '650mg')
        const searchBase = item.medicineName.replace(/\d+\s*(mg|ml|g)?/gi, '').trim();

        const matchedMedicine = await this.medicineModel.findOne({
          tenantId: tId,
          isActive: true,
          $or: [
            { brandName: new RegExp(searchBase, 'i') },
            { genericName: new RegExp(searchBase, 'i') },
          ],
        });

        let availableBatches: any[] = [];
        if (matchedMedicine) {
          // Sort by FEFO: expiryDate ASC
          const batches = await this.batchModel
            .find({
              tenantId: tId,
              medicineId: matchedMedicine._id,
              isActive: true,
              currentQuantity: { $gt: 0 },
            })
            .sort({ expiryDate: 1 })
            .lean();

          let recommendedChosen = false;
          availableBatches = batches.map((b) => {
            const diffDays = Math.ceil(
              (new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            const isExpired = diffDays <= 0;
            const isNearExpiry = diffDays > 0 && diffDays <= 60;

            let isFefoRecommended = false;
            if (!isExpired && !recommendedChosen && b.currentQuantity > 0) {
              isFefoRecommended = true;
              recommendedChosen = true;
            }

            return {
              ...b,
              daysToExpiry: diffDays,
              isExpired,
              isNearExpiry,
              isFefoRecommended,
            };
          });
        }

        // Calculate already dispensed quantity for this item
        let alreadyDispensedQty = 0;
        pastDispensing.forEach((record) => {
          record.items.forEach((dispensedItem) => {
            if (
              matchedMedicine &&
              dispensedItem.medicineId?.toString() === matchedMedicine._id.toString()
            ) {
              alreadyDispensedQty += dispensedItem.quantity;
            }
          });
        });

        const remainingQty = Math.max(0, item.quantity - alreadyDispensedQty);

        return {
          prescribedItem: item,
          matchedMedicine: matchedMedicine || null,
          availableBatches,
          alreadyDispensedQuantity: alreadyDispensedQty,
          remainingQuantity: remainingQty,
          isFulfilled: remainingQty === 0,
        };
      }),
    );

    return {
      prescription,
      enrichedItems,
      pastDispensing,
    };
  }

  /**
   * Execute atomic medication dispensing, batch deduction, transaction ledger, and prescription status transition
   */
  async dispense(
    tenantId: string,
    pharmacistUserId: string,
    dto: DispenseDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const pId = this.toObjectId(dto.prescriptionId);
    const pharmId = this.toObjectId(pharmacistUserId);

    // 1. Verify prescription exists and is active
    const prescription = await this.prescriptionModel.findOne({ _id: pId, tenantId: tId });
    if (!prescription) {
      throw new NotFoundException('Prescription not found in this hospital tenant.');
    }

    if (prescription.status === PrescriptionStatus.DISPENSED) {
      throw new BadRequestException('Prescription has already been fully dispensed.');
    }

    if (prescription.status === PrescriptionStatus.CANCELLED) {
      throw new BadRequestException('Cannot dispense medication for a cancelled prescription.');
    }

    // 2. Generate sequential dispense number
    const dispenseNumber = await this.generateDispenseNumber(tId);
    const now = new Date();

    const dispensedItems: any[] = [];
    let totalOrderAmount = 0;

    // 3. Atomically validate and deduct each batch
    for (const item of dto.items) {
      const bId = this.toObjectId(item.batchId);
      const mId = this.toObjectId(item.medicineId);

      // Verify batch exists in tenant
      const batch = await this.batchModel.findOne({ _id: bId, tenantId: tId });
      if (!batch) {
        throw new NotFoundException(`Batch ${item.batchId} not found.`);
      }

      // Check expiry date
      if (batch.expiryDate < now) {
        throw new BadRequestException(
          `Batch "${batch.batchNumber}" has expired (${batch.expiryDate.toISOString().split('T')[0]}) and cannot be dispensed.`,
        );
      }

      // Check current quantity
      if (batch.currentQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock in batch "${batch.batchNumber}". Requested: ${item.quantity}, Available: ${batch.currentQuantity}`,
        );
      }

      // Atomic stock deduction with safety guard
      const updatedBatch = await this.batchModel.findOneAndUpdate(
        {
          _id: bId,
          tenantId: tId,
          currentQuantity: { $gte: item.quantity },
        },
        {
          $inc: { currentQuantity: -item.quantity },
        },
        { new: true },
      );

      if (!updatedBatch) {
        throw new BadRequestException(
          `Concurrency stock conflict while deducting batch "${batch.batchNumber}". Please refresh and retry.`,
        );
      }

      // Fetch medicine metadata for label & record
      const medicine = await this.medicineModel.findOne({ _id: mId, tenantId: tId });
      const medicineName = medicine ? medicine.brandName : 'Unknown Medicine';
      const lineTotal = (batch.unitSalePrice || 0) * item.quantity;
      totalOrderAmount += lineTotal;

      dispensedItems.push({
        medicineId: mId,
        medicineName,
        batchId: bId,
        batchNumber: batch.batchNumber,
        quantity: item.quantity,
        dosageForm: medicine?.dosageForm,
        strength: medicine?.strength,
        instructions: item.instructions || 'As advised by doctor',
        unitSalePrice: batch.unitSalePrice || 0,
        totalPrice: lineTotal,
      });

      // Write immutable transaction ledger
      await this.transactionModel.create({
        tenantId: tId,
        batchId: bId,
        medicineId: mId,
        type: PharmacyTransactionType.DISPENSE_OUT,
        quantity: item.quantity,
        balanceAfter: updatedBatch.currentQuantity,
        referenceId: dispenseNumber,
        notes: `Dispensed for Prescription ${prescription._id}`,
        performedBy: pharmId,
        createdAt: now,
      });
    }

    // 4. Create Dispensing Record
    const record = await this.dispensingRecordModel.create({
      tenantId: tId,
      dispenseNumber,
      prescriptionId: prescription._id,
      patientId: prescription.patientId,
      pharmacistId: pharmId,
      items: dispensedItems,
      totalAmount: totalOrderAmount,
      notes: dto.notes,
      dispensedAt: now,
    });

    // 5. Update Prescription Status
    // Retrieve all dispensing records including this one to check total fulfilled quantities
    const allDispensing = await this.dispensingRecordModel.find({
      tenantId: tId,
      prescriptionId: prescription._id,
    });

    const totalPrescribedQuantity = prescription.items.reduce((sum, it) => sum + it.quantity, 0);
    let totalDispensedQuantity = 0;
    allDispensing.forEach((rec) => {
      rec.items.forEach((it) => {
        totalDispensedQuantity += it.quantity;
      });
    });

    if (totalDispensedQuantity >= totalPrescribedQuantity) {
      prescription.status = PrescriptionStatus.DISPENSED;
    } else {
      prescription.status = PrescriptionStatus.PARTIALLY_DISPENSED;
    }
    await prescription.save();

    // 6. Audit Record
    await this.auditService.record({
      hospitalId: tenantId,
      userId: pharmacistUserId,
      action: 'MEDICINE_DISPENSE',
      resource: `dispensing_records/${record._id}`,
      details: {
        dispenseNumber,
        prescriptionId: prescription._id.toString(),
        itemCount: dispensedItems.length,
        totalAmount: totalOrderAmount,
        newPrescriptionStatus: prescription.status,
      },
    });

    return this.getDispensingRecordById(tenantId, record._id.toString());
  }

  /**
   * Handle patient returns with batch restocking and transaction tracking
   */
  async returnMedicine(
    tenantId: string,
    pharmacistUserId: string,
    dto: ReturnMedicineDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const dId = this.toObjectId(dto.dispenseId);
    const bId = this.toObjectId(dto.batchId);
    const pharmId = this.toObjectId(pharmacistUserId);

    const record = await this.dispensingRecordModel.findOne({ _id: dId, tenantId: tId });
    if (!record) {
      throw new NotFoundException('Dispensing record not found in this hospital tenant.');
    }

    const batch = await this.batchModel.findOne({ _id: bId, tenantId: tId });
    if (!batch) {
      throw new NotFoundException('Medicine batch not found.');
    }

    // Restock batch
    const updatedBatch = await this.batchModel.findOneAndUpdate(
      { _id: bId, tenantId: tId },
      { $inc: { currentQuantity: dto.quantity } },
      { new: true },
    );

    // Record return transaction
    await this.transactionModel.create({
      tenantId: tId,
      batchId: bId,
      medicineId: batch.medicineId,
      type: PharmacyTransactionType.RETURN_IN,
      quantity: dto.quantity,
      balanceAfter: updatedBatch!.currentQuantity,
      referenceId: record.dispenseNumber,
      notes: `Patient Return: ${dto.reason}`,
      performedBy: pharmId,
      createdAt: new Date(),
    });

    // Audit event
    await this.auditService.record({
      hospitalId: tenantId,
      userId: pharmacistUserId,
      action: 'MEDICINE_RETURN',
      resource: `medicine_batches/${batch._id}`,
      details: {
        dispenseNumber: record.dispenseNumber,
        batchNumber: batch.batchNumber,
        returnedQuantity: dto.quantity,
        newBalance: updatedBatch!.currentQuantity,
        reason: dto.reason,
      },
    });

    return updatedBatch;
  }

  /**
   * Get single dispensing record populated with details
   */
  async getDispensingRecordById(tenantId: string, id: string): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const rId = this.toObjectId(id);

    const record = await this.dispensingRecordModel
      .findOne({ _id: rId, tenantId: tId })
      .populate('patientId', 'name uhid gender dateOfBirth phone bloodGroup allergies emergencyContact')
      .populate('pharmacistId', 'name email role department')
      .populate('prescriptionId')
      .exec();

    if (!record) {
      throw new NotFoundException('Dispensing record not found.');
    }

    return record;
  }

  /**
   * Search drug master catalog
   */
  async getMedicines(tenantId: string, query: MedicinesQueryDto): Promise<any[]> {
    await this.ensureSeedCatalog(tenantId);
    const tId = this.toObjectId(tenantId);
    const filter: Record<string, any> = { tenantId: tId, isActive: true };

    if (query.category) {
      filter.category = query.category;
    }

    if (query.schedule) {
      filter.schedule = query.schedule;
    }

    if (query.search) {
      const s = query.search.trim();
      filter.$or = [
        { brandName: new RegExp(s, 'i') },
        { genericName: new RegExp(s, 'i') },
        { category: new RegExp(s, 'i') },
      ];
    }

    const medicines = await this.medicineModel
      .find(filter)
      .sort({ brandName: 1 })
      .lean();

    // Enrich with batch counts and total stock
    const enriched = await Promise.all(
      medicines.map(async (m) => {
        const batches = await this.batchModel.find({
          tenantId: tId,
          medicineId: m._id,
          isActive: true,
        });

        const totalStock = batches.reduce((sum, b) => sum + b.currentQuantity, 0);
        return {
          ...m,
          activeBatchesCount: batches.length,
          totalStock,
          isLowStock: totalStock < m.minStockLevel,
        };
      }),
    );

    return enriched;
  }

  /**
   * Create new medicine in master catalog
   */
  async createMedicine(
    tenantId: string,
    authorizerUserId: string,
    dto: CreateMedicineDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);

    const existing = await this.medicineModel.findOne({
      tenantId: tId,
      brandName: dto.brandName.trim(),
      strength: dto.strength.trim(),
    });

    if (existing) {
      throw new BadRequestException(
        `Medicine "${dto.brandName} ${dto.strength}" already exists in the catalog.`,
      );
    }

    const medicine = await this.medicineModel.create({
      tenantId: tId,
      brandName: dto.brandName.trim(),
      genericName: dto.genericName.trim(),
      dosageForm: dto.dosageForm,
      strength: dto.strength.trim(),
      category: dto.category.trim(),
      schedule: dto.schedule || DrugSchedule.PRESCRIPTION,
      storageConditions: dto.storageConditions?.trim(),
      minStockLevel: dto.minStockLevel !== undefined ? dto.minStockLevel : 50,
      isActive: true,
    });

    await this.auditService.record({
      hospitalId: tenantId,
      userId: authorizerUserId,
      action: 'MEDICINE_CREATE',
      resource: `medicines/${medicine._id}`,
      details: {
        brandName: medicine.brandName,
        genericName: medicine.genericName,
        dosageForm: medicine.dosageForm,
      },
    });

    return medicine;
  }

  /**
   * Batch stock ledger with FEFO and near-expiry indicators
   */
  async getBatches(tenantId: string, query: BatchesQueryDto): Promise<any[]> {
    await this.ensureSeedCatalog(tenantId);
    const tId = this.toObjectId(tenantId);
    const filter: Record<string, any> = { tenantId: tId, isActive: true };

    if (query.medicineId) {
      filter.medicineId = this.toObjectId(query.medicineId);
    }

    const now = new Date();

    if (query.alert === 'expired') {
      filter.expiryDate = { $lt: now };
    } else if (query.alert === 'near_expiry') {
      const in60d = new Date(now);
      in60d.setDate(in60d.getDate() + 60);
      filter.expiryDate = { $gte: now, $lte: in60d };
    } else if (query.alert === 'low_stock') {
      filter.currentQuantity = { $lte: 20 };
    }

    if (query.search) {
      filter.batchNumber = new RegExp(query.search.trim(), 'i');
    }

    const batches = await this.batchModel
      .find(filter)
      .populate('medicineId', 'brandName genericName dosageForm strength category schedule minStockLevel')
      .sort({ expiryDate: 1 })
      .lean();

    return batches.map((b) => {
      const diffDays = Math.ceil(
        (new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        ...b,
        daysToExpiry: diffDays,
        isExpired: diffDays <= 0,
        isNearExpiry: diffDays > 0 && diffDays <= 60,
      };
    });
  }

  /**
   * Receive and record new batch stock
   */
  async createBatch(
    tenantId: string,
    authorizerUserId: string,
    dto: CreateBatchDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const mId = this.toObjectId(dto.medicineId);
    const authId = this.toObjectId(authorizerUserId);

    const medicine = await this.medicineModel.findOne({ _id: mId, tenantId: tId });
    if (!medicine) {
      throw new NotFoundException('Medicine not found in catalog.');
    }

    const existingBatch = await this.batchModel.findOne({
      tenantId: tId,
      medicineId: mId,
      batchNumber: dto.batchNumber.trim().toUpperCase(),
    });

    if (existingBatch) {
      throw new BadRequestException(
        `Batch "${dto.batchNumber}" already exists for ${medicine.brandName}.`,
      );
    }

    const batch = await this.batchModel.create({
      tenantId: tId,
      medicineId: mId,
      batchNumber: dto.batchNumber.trim().toUpperCase(),
      expiryDate: new Date(dto.expiryDate),
      manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : undefined,
      initialQuantity: dto.initialQuantity,
      currentQuantity: dto.initialQuantity,
      unitCostPrice: dto.unitCostPrice || 0,
      unitSalePrice: dto.unitSalePrice,
      isActive: true,
    });

    // Record purchase stock movement
    await this.transactionModel.create({
      tenantId: tId,
      batchId: batch._id,
      medicineId: mId,
      type: PharmacyTransactionType.PURCHASE_IN,
      quantity: dto.initialQuantity,
      balanceAfter: dto.initialQuantity,
      referenceId: 'BATCH_RECEIPT',
      notes: `Received new batch ${batch.batchNumber}`,
      performedBy: authId,
      createdAt: new Date(),
    });

    await this.auditService.record({
      hospitalId: tenantId,
      userId: authorizerUserId,
      action: 'BATCH_CREATE',
      resource: `medicine_batches/${batch._id}`,
      details: {
        medicineName: medicine.brandName,
        batchNumber: batch.batchNumber,
        initialQuantity: batch.initialQuantity,
        expiryDate: batch.expiryDate,
      },
    });

    return batch;
  }

  /**
   * Retrieve near-expiry and low-stock alert summary
   */
  async getAlerts(tenantId: string): Promise<any> {
    await this.ensureSeedCatalog(tenantId);
    const tId = this.toObjectId(tenantId);
    const now = new Date();
    const in60d = new Date(now);
    in60d.setDate(in60d.getDate() + 60);

    const [nearExpiry, expired, medicines] = await Promise.all([
      this.batchModel
        .find({
          tenantId: tId,
          isActive: true,
          expiryDate: { $gte: now, $lte: in60d },
          currentQuantity: { $gt: 0 },
        })
        .populate('medicineId', 'brandName genericName strength dosageForm')
        .sort({ expiryDate: 1 })
        .lean(),
      this.batchModel
        .find({
          tenantId: tId,
          isActive: true,
          expiryDate: { $lt: now },
        })
        .populate('medicineId', 'brandName genericName strength dosageForm')
        .sort({ expiryDate: 1 })
        .lean(),
      this.medicineModel.find({ tenantId: tId, isActive: true }).lean(),
    ]);

    // Check low stock
    const lowStockMedicines: any[] = [];
    for (const med of medicines) {
      const batches = await this.batchModel.find({
        tenantId: tId,
        medicineId: med._id,
        isActive: true,
      });
      const totalStock = batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      if (totalStock < med.minStockLevel) {
        lowStockMedicines.push({
          ...med,
          totalStock,
        });
      }
    }

    return {
      nearExpiry,
      expired,
      lowStock: lowStockMedicines,
    };
  }

  /**
   * Get operational dashboard metrics
   */
  async getDashboardMetrics(tenantId: string): Promise<any> {
    await this.ensureSeedCatalog(tenantId);
    const tId = this.toObjectId(tenantId);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const in60d = new Date(now);
    in60d.setDate(in60d.getDate() + 60);

    const [
      pendingPrescriptionsCount,
      dispensedTodayCount,
      nearExpiryBatchesCount,
      totalMedicinesCount,
      totalBatchesCount,
      allMeds,
    ] = await Promise.all([
      this.prescriptionModel.countDocuments({
        tenantId: tId,
        status: { $in: [PrescriptionStatus.ACTIVE, PrescriptionStatus.PARTIALLY_DISPENSED] },
      }),
      this.dispensingRecordModel.countDocuments({
        tenantId: tId,
        dispensedAt: { $gte: todayStart },
      }),
      this.batchModel.countDocuments({
        tenantId: tId,
        isActive: true,
        expiryDate: { $lte: in60d },
        currentQuantity: { $gt: 0 },
      }),
      this.medicineModel.countDocuments({ tenantId: tId, isActive: true }),
      this.batchModel.countDocuments({ tenantId: tId, isActive: true }),
      this.medicineModel.find({ tenantId: tId, isActive: true }).lean(),
    ]);

    // Count low stock
    let lowStockCount = 0;
    for (const med of allMeds) {
      const batches = await this.batchModel.find({
        tenantId: tId,
        medicineId: med._id,
        isActive: true,
      });
      const stock = batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      if (stock < med.minStockLevel) {
        lowStockCount++;
      }
    }

    return {
      pendingPrescriptionsCount,
      dispensedTodayCount,
      nearExpiryBatchesCount,
      lowStockMedicinesCount: lowStockCount,
      totalMedicinesCount,
      totalBatchesCount,
    };
  }

  /**
   * Retrieve dispensing history
   */
  async getDispensingHistory(
    tenantId: string,
    query: { prescriptionId?: string; patientId?: string; startDate?: string; endDate?: string },
  ): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    const filter: Record<string, any> = { tenantId: tId };

    if (query.prescriptionId) {
      filter.prescriptionId = this.toObjectId(query.prescriptionId);
    }
    if (query.patientId) {
      filter.patientId = this.toObjectId(query.patientId);
    }
    if (query.startDate || query.endDate) {
      filter.dispensedAt = {};
      if (query.startDate) filter.dispensedAt.$gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.dispensedAt.$lte = end;
      }
    }

    return this.dispensingRecordModel
      .find(filter)
      .populate('patientId', 'name uhid gender dateOfBirth phone bloodGroup allergies')
      .populate('pharmacistId', 'name email role department')
      .sort({ dispensedAt: -1 })
      .exec();
  }
}
