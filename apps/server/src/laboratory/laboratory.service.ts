import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LabOrderPriority,
  LabOrderStatus,
  LabResultFlag,
  LabTestCategory,
} from '@hms/types';
import { LabTest, LabTestDocument } from './schemas/lab-test.schema.js';
import { LabOrder, LabOrderDocument } from './schemas/lab-order.schema.js';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateLabOrderDto } from './dto/create-lab-order.dto.js';
import { CollectSampleDto } from './dto/collect-sample.dto.js';
import { EnterLabResultsDto } from './dto/enter-results.dto.js';
import { VerifyLabOrderDto } from './dto/verify-order.dto.js';
import { CreateLabTestDto } from './dto/create-lab-test.dto.js';

export const DEFAULT_LAB_TESTS = [
  {
    code: 'CBC',
    name: 'Complete Blood Count (CBC)',
    category: LabTestCategory.HEMATOLOGY,
    specimenType: 'Venous Blood (EDTA Vacutainer)',
    tariffPrice: 350,
    parameters: [
      {
        name: 'Hemoglobin',
        unit: 'g/dL',
        referenceMin: 13.0,
        referenceMax: 17.0,
        criticalLow: 7.0,
        criticalHigh: 20.0,
      },
      {
        name: 'Total Leukocyte Count (WBC)',
        unit: '/uL',
        referenceMin: 4000,
        referenceMax: 11000,
        criticalLow: 2000,
        criticalHigh: 30000,
      },
      {
        name: 'RBC Count',
        unit: 'mil/uL',
        referenceMin: 4.5,
        referenceMax: 5.9,
        criticalLow: 2.5,
        criticalHigh: 7.0,
      },
      {
        name: 'Platelet Count',
        unit: '/uL',
        referenceMin: 150000,
        referenceMax: 450000,
        criticalLow: 50000,
        criticalHigh: 1000000,
      },
      {
        name: 'Hematocrit (PCV)',
        unit: '%',
        referenceMin: 40,
        referenceMax: 50,
        criticalLow: 20,
        criticalHigh: 60,
      },
    ],
  },
  {
    code: 'LIPID',
    name: 'Lipid Profile',
    category: LabTestCategory.BIOCHEMISTRY,
    specimenType: 'Serum (Clot Activator / SST)',
    tariffPrice: 650,
    parameters: [
      {
        name: 'Total Cholesterol',
        unit: 'mg/dL',
        referenceMin: 125,
        referenceMax: 200,
        criticalLow: 80,
        criticalHigh: 350,
      },
      {
        name: 'HDL Cholesterol',
        unit: 'mg/dL',
        referenceMin: 40,
        referenceMax: 60,
        criticalLow: 20,
        criticalHigh: 100,
      },
      {
        name: 'LDL Cholesterol',
        unit: 'mg/dL',
        referenceMin: 0,
        referenceMax: 100,
        criticalLow: 0,
        criticalHigh: 190,
      },
      {
        name: 'Triglycerides',
        unit: 'mg/dL',
        referenceMin: 50,
        referenceMax: 150,
        criticalLow: 30,
        criticalHigh: 500,
      },
    ],
  },
  {
    code: 'LFT',
    name: 'Liver Function Test (LFT)',
    category: LabTestCategory.BIOCHEMISTRY,
    specimenType: 'Serum (Clot Activator / SST)',
    tariffPrice: 750,
    parameters: [
      {
        name: 'Bilirubin Total',
        unit: 'mg/dL',
        referenceMin: 0.2,
        referenceMax: 1.2,
        criticalLow: 0.1,
        criticalHigh: 15.0,
      },
      {
        name: 'Bilirubin Direct',
        unit: 'mg/dL',
        referenceMin: 0.0,
        referenceMax: 0.3,
        criticalLow: 0.0,
        criticalHigh: 5.0,
      },
      {
        name: 'SGOT / AST',
        unit: 'U/L',
        referenceMin: 5,
        referenceMax: 40,
        criticalLow: 0,
        criticalHigh: 500,
      },
      {
        name: 'SGPT / ALT',
        unit: 'U/L',
        referenceMin: 7,
        referenceMax: 56,
        criticalLow: 0,
        criticalHigh: 500,
      },
      {
        name: 'Alkaline Phosphatase (ALP)',
        unit: 'U/L',
        referenceMin: 44,
        referenceMax: 147,
        criticalLow: 20,
        criticalHigh: 800,
      },
    ],
  },
  {
    code: 'RFT',
    name: 'Renal Function Test (RFT / KFT)',
    category: LabTestCategory.BIOCHEMISTRY,
    specimenType: 'Serum (Clot Activator / SST)',
    tariffPrice: 600,
    parameters: [
      {
        name: 'Blood Urea Nitrogen (BUN)',
        unit: 'mg/dL',
        referenceMin: 7,
        referenceMax: 20,
        criticalLow: 3,
        criticalHigh: 100,
      },
      {
        name: 'Serum Creatinine',
        unit: 'mg/dL',
        referenceMin: 0.7,
        referenceMax: 1.3,
        criticalLow: 0.3,
        criticalHigh: 6.0,
      },
      {
        name: 'Uric Acid',
        unit: 'mg/dL',
        referenceMin: 3.5,
        referenceMax: 7.2,
        criticalLow: 1.5,
        criticalHigh: 12.0,
      },
      {
        name: 'Serum Sodium (Na+)',
        unit: 'mEq/L',
        referenceMin: 135,
        referenceMax: 145,
        criticalLow: 120,
        criticalHigh: 160,
      },
      {
        name: 'Serum Potassium (K+)',
        unit: 'mEq/L',
        referenceMin: 3.5,
        referenceMax: 5.1,
        criticalLow: 2.8,
        criticalHigh: 6.5,
      },
    ],
  },
];

@Injectable()
export class LaboratoryService {
  private readonly logger = new Logger(LaboratoryService.name);

  constructor(
    @InjectModel(LabTest.name)
    private readonly labTestModel: Model<LabTestDocument>,
    @InjectModel(LabOrder.name)
    private readonly labOrderModel: Model<LabOrderDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly auditService: AuditService,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid identifier format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  /**
   * Seed default clinical tests for tenant if catalog is empty
   */
  async ensureTestCatalogSeeded(tenantId: string): Promise<void> {
    const tId = this.toObjectId(tenantId);
    const count = await this.labTestModel.countDocuments({ tenantId: tId });
    if (count === 0) {
      try {
        for (const t of DEFAULT_LAB_TESTS) {
          await this.labTestModel.updateOne(
            { tenantId: tId, code: t.code },
            { $setOnInsert: { ...t, tenantId: tId, isActive: true } },
            { upsert: true },
          );
        }
        this.logger.log(`Seeded standard diagnostic tests for tenant ${tenantId}.`);
      } catch (err) {
        this.logger.warn(`Notice during test catalog seed: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Sequential order number generator: LAB-YYYY-NNNNN
   */
  private async generateOrderNumber(tenantId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.labOrderModel.countDocuments({
      tenantId,
      orderNumber: new RegExp(`^LAB-${year}-`),
    });
    const seq = String(count + 1).padStart(5, '0');
    return `LAB-${year}-${seq}`;
  }

  /**
   * Sequential accession number generator: ACC-YYYY-NNNNN
   */
  private async generateAccessionNumber(tenantId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.labOrderModel.countDocuments({
      tenantId,
      accessionNumber: new RegExp(`^ACC-${year}-`),
    });
    const seq = String(count + 1).padStart(5, '0');
    return `ACC-${year}-${seq}`;
  }

  /**
   * Automated abnormal flag computation based on normal & critical reference thresholds
   */
  computeFlag(
    valueStr: string,
    refMin?: number,
    refMax?: number,
    critLow?: number,
    critHigh?: number,
  ): { flag: LabResultFlag; numericValue?: number } {
    const num = parseFloat(valueStr.trim());
    if (isNaN(num)) {
      return { flag: LabResultFlag.NORMAL };
    }

    if (critLow !== undefined && num < critLow) {
      return { flag: LabResultFlag.CRITICAL, numericValue: num };
    }
    if (critHigh !== undefined && num > critHigh) {
      return { flag: LabResultFlag.CRITICAL, numericValue: num };
    }
    if (refMin !== undefined && num < refMin) {
      return { flag: LabResultFlag.LOW, numericValue: num };
    }
    if (refMax !== undefined && num > refMax) {
      return { flag: LabResultFlag.HIGH, numericValue: num };
    }

    return { flag: LabResultFlag.NORMAL, numericValue: num };
  }

  /**
   * Retrieve test catalog
   */
  async getTestCatalog(tenantId: string, category?: string): Promise<any[]> {
    await this.ensureTestCatalogSeeded(tenantId);
    const tId = this.toObjectId(tenantId);
    const query: Record<string, any> = { tenantId: tId, isActive: true };
    if (category) {
      query.category = category;
    }
    return this.labTestModel.find(query).sort({ category: 1, name: 1 }).exec();
  }

  /**
   * Create custom lab test in catalog
   */
  async createTest(tenantId: string, authorizerUserId: string, dto: CreateLabTestDto): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const existing = await this.labTestModel.findOne({
      tenantId: tId,
      code: dto.code.trim().toUpperCase(),
    });
    if (existing) {
      throw new BadRequestException(`Test with code ${dto.code} already exists.`);
    }

    const test = await this.labTestModel.create({
      tenantId: tId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      category: dto.category,
      specimenType: dto.specimenType.trim(),
      parameters: dto.parameters,
      tariffPrice: dto.tariffPrice,
      isActive: true,
    });

    return test;
  }

  /**
   * Create new electronic lab order requisition
   */
  async createOrder(
    tenantId: string,
    authorizerUserId: string,
    dto: CreateLabOrderDto,
  ): Promise<any> {
    await this.ensureTestCatalogSeeded(tenantId);
    const tId = this.toObjectId(tenantId);
    const pId = this.toObjectId(dto.patientId);
    const docId = this.toObjectId(dto.doctorId);

    // 1. Verify patient exists in tenant
    const patient = await this.patientModel.findOne({ _id: pId, tenantId: tId });
    if (!patient) {
      throw new NotFoundException('Patient record not found in this hospital tenant.');
    }

    // 2. Verify doctor exists in tenant
    const doctor = await this.userModel.findOne({
      _id: docId,
      $or: [{ hospitalId: tId }, { tenantId: tId }, { role: 'DOCTOR' }, { role: 'SUPER_ADMIN' }],
    });
    if (!doctor) {
      throw new NotFoundException('Ordering doctor not found in this hospital tenant.');
    }

    // 3. Verify tests exist in tenant
    const testObjectIds = dto.testIds.map((id) => this.toObjectId(id));
    const tests = await this.labTestModel.find({
      _id: { $in: testObjectIds },
      tenantId: tId,
      isActive: true,
    });

    if (tests.length === 0) {
      throw new BadRequestException('At least one valid active diagnostic test must be specified.');
    }

    // 4. Generate sequential order number
    const orderNumber = await this.generateOrderNumber(tId);

    // 5. Create order in 'ordered' state
    const order = await this.labOrderModel.create({
      tenantId: tId,
      orderNumber,
      patientId: pId,
      doctorId: docId,
      appointmentId: dto.appointmentId ? this.toObjectId(dto.appointmentId) : undefined,
      admissionId: dto.admissionId ? this.toObjectId(dto.admissionId) : undefined,
      testIds: testObjectIds,
      priority: dto.priority || LabOrderPriority.ROUTINE,
      status: LabOrderStatus.ORDERED,
      results: [],
      technicianNotes: dto.clinicalNotes,
    });

    // 6. Audit record
    await this.auditService.record({
      hospitalId: tenantId,
      userId: authorizerUserId,
      action: 'LAB_ORDER_CREATE',
      resource: `lab_orders/${order._id}`,
      details: {
        orderNumber,
        patientUhid: patient.uhid,
        testCodes: tests.map((t) => t.code),
        priority: order.priority,
      },
    });

    return this.getOrderById(tenantId, order._id.toString());
  }

  /**
   * Phlebotomy specimen collection: assigns accession barcode & advances to 'sample_collected'
   */
  async collectSample(
    tenantId: string,
    phlebotomistUserId: string,
    orderId: string,
    dto: CollectSampleDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const oId = this.toObjectId(orderId);

    const order = await this.labOrderModel.findOne({ _id: oId, tenantId: tId });
    if (!order) {
      throw new NotFoundException('Laboratory order not found in this tenant.');
    }

    if (order.status === LabOrderStatus.VERIFIED) {
      throw new BadRequestException('Cannot collect sample for an already verified laboratory report.');
    }

    if (order.status === LabOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot collect sample for a cancelled laboratory requisition.');
    }

    // Generate accession number if not already assigned
    const accessionNumber = order.accessionNumber || (await this.generateAccessionNumber(tId));

    order.accessionNumber = accessionNumber;
    order.sampleCollectedAt = new Date();
    order.containerType = dto.containerType || order.containerType;
    order.phlebotomistNotes = dto.phlebotomistNotes || order.phlebotomistNotes;
    order.status = LabOrderStatus.SAMPLE_COLLECTED;

    await order.save();

    // Audit record
    await this.auditService.record({
      hospitalId: tenantId,
      userId: phlebotomistUserId,
      action: 'SAMPLE_COLLECT',
      resource: `lab_orders/${order._id}`,
      details: {
        orderNumber: order.orderNumber,
        accessionNumber,
        containerType: order.containerType,
      },
    });

    return this.getOrderById(tenantId, order._id.toString());
  }

  /**
   * Bench result entry with automated reference range comparison and abnormal flagging
   */
  async enterResults(
    tenantId: string,
    technicianUserId: string,
    orderId: string,
    dto: EnterLabResultsDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const oId = this.toObjectId(orderId);

    const order = await this.labOrderModel.findOne({ _id: oId, tenantId: tId });
    if (!order) {
      throw new NotFoundException('Laboratory order not found in this tenant.');
    }

    if (order.status === LabOrderStatus.VERIFIED) {
      throw new BadRequestException(
        'Lab order report is verified and sealed. Mutations are strictly prohibited.',
      );
    }

    if (order.status === LabOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot enter results for a cancelled laboratory requisition.');
    }

    // Retrieve full tests definitions for reference intervals
    const rawTests = await this.labTestModel.find({
      _id: { $in: order.testIds },
      tenantId: tId,
    });
    const tests = Array.isArray(rawTests)
      ? rawTests.map((t: any) => (t.toObject ? t.toObject() : t))
      : [];

    // Build parameter lookup map: key = `${testId.toString()}_${parameterName.toLowerCase()}`
    const paramMap = new Map<string, any>();
    for (const test of tests) {
      for (const param of (test.parameters as any[]) || []) {
        paramMap.set(`${test._id.toString()}_${param.name.toLowerCase()}`, {
          ...param,
          testCode: test.code,
        });
      }
    }

    const processedResults: any[] = [];
    let hasCritical = false;

    for (const item of dto.results) {
      const key = `${item.testId}_${item.parameterName.toLowerCase()}`;
      const paramDef = paramMap.get(key);

      let unit = '';
      let refRangeStr = '';
      let critRangeStr = '';
      let flag = LabResultFlag.NORMAL;
      let numericValue: number | undefined;

      if (paramDef) {
        unit = paramDef.unit;
        const computed = this.computeFlag(
          item.value,
          paramDef.referenceMin,
          paramDef.referenceMax,
          paramDef.criticalLow,
          paramDef.criticalHigh,
        );
        flag = computed.flag;
        numericValue = computed.numericValue;

        if (paramDef.referenceMin !== undefined && paramDef.referenceMax !== undefined) {
          refRangeStr = `${paramDef.referenceMin} - ${paramDef.referenceMax} ${unit}`;
        }
        if (paramDef.criticalLow !== undefined && paramDef.criticalHigh !== undefined) {
          critRangeStr = `< ${paramDef.criticalLow} or > ${paramDef.criticalHigh} ${unit}`;
        }
      } else {
        // Fallback for non-catalog parameters
        const computed = this.computeFlag(item.value);
        flag = computed.flag;
        numericValue = computed.numericValue;
      }

      if (flag === LabResultFlag.CRITICAL) {
        hasCritical = true;
      }

      processedResults.push({
        testId: this.toObjectId(item.testId),
        parameterName: item.parameterName,
        value: item.value.trim(),
        numericValue,
        unit,
        flag,
        referenceRange: refRangeStr,
        criticalRange: critRangeStr,
      });
    }

    order.results = processedResults;
    if (dto.technicianNotes) {
      order.technicianNotes = dto.technicianNotes;
    }
    order.status = LabOrderStatus.RESULT_ENTERED;

    await order.save();

    // Audit record
    await this.auditService.record({
      hospitalId: tenantId,
      userId: technicianUserId,
      action: 'LAB_RESULT_ENTER',
      resource: `lab_orders/${order._id}`,
      details: {
        orderNumber: order.orderNumber,
        resultCount: processedResults.length,
        hasCritical,
      },
    });

    return this.getOrderById(tenantId, order._id.toString());
  }

  /**
   * Pathologist two-tier review, clinical commentary & immutable digital sign-off
   */
  async verifyOrder(
    tenantId: string,
    pathologistUserId: string,
    orderId: string,
    dto: VerifyLabOrderDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const oId = this.toObjectId(orderId);
    const pathId = this.toObjectId(pathologistUserId);

    const order = await this.labOrderModel.findOne({ _id: oId, tenantId: tId });
    if (!order) {
      throw new NotFoundException('Laboratory order not found in this tenant.');
    }

    if (order.status === LabOrderStatus.VERIFIED) {
      throw new BadRequestException('Lab order report is already verified and locked.');
    }

    if (!order.results || order.results.length === 0) {
      throw new BadRequestException(
        'Cannot verify laboratory order without entered test results.',
      );
    }

    order.pathologistRemarks = dto.pathologistRemarks || order.pathologistRemarks;
    order.verifiedBy = pathId;
    order.verifiedAt = new Date();
    order.status = LabOrderStatus.VERIFIED;

    await order.save();

    // Audit record
    await this.auditService.record({
      hospitalId: tenantId,
      userId: pathologistUserId,
      action: 'LAB_RESULT_VERIFY',
      resource: `lab_orders/${order._id}`,
      details: {
        orderNumber: order.orderNumber,
        verifiedAt: order.verifiedAt,
        hasRemarks: Boolean(order.pathologistRemarks),
      },
    });

    return this.getOrderById(tenantId, order._id.toString());
  }

  /**
   * List laboratory orders with filters
   */
  async getOrders(
    tenantId: string,
    query: {
      status?: string;
      priority?: string;
      patientId?: string;
      doctorId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<any[]> {
    await this.ensureTestCatalogSeeded(tenantId);
    const tId = this.toObjectId(tenantId);
    const filter: Record<string, any> = { tenantId: tId };

    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    if (query.priority && query.priority !== 'all') {
      filter.priority = query.priority;
    }

    if (query.patientId) {
      filter.patientId = this.toObjectId(query.patientId);
    }

    if (query.doctorId) {
      filter.doctorId = this.toObjectId(query.doctorId);
    }

    if (query.search) {
      const s = query.search.trim();
      filter.$or = [
        { orderNumber: new RegExp(s, 'i') },
        { accessionNumber: new RegExp(s, 'i') },
      ];
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    return this.labOrderModel
      .find(filter)
      .populate('patientId', 'name uhid gender dateOfBirth phone bloodGroup allergies')
      .populate('doctorId', 'name email role profile department')
      .populate('testIds', 'code name category specimenType parameters tariffPrice')
      .populate('verifiedBy', 'name email role profile')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get single order by ID
   */
  async getOrderById(tenantId: string, orderId: string): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const oId = this.toObjectId(orderId);

    const order = await this.labOrderModel
      .findOne({ _id: oId, tenantId: tId })
      .populate('patientId', 'name uhid gender dateOfBirth phone bloodGroup allergies contacts emergencyContact')
      .populate('doctorId', 'name email role profile department')
      .populate('testIds', 'code name category specimenType parameters tariffPrice')
      .populate('verifiedBy', 'name email role profile')
      .exec();

    if (!order) {
      throw new NotFoundException('Laboratory order not found in this tenant.');
    }

    return order;
  }

  /**
   * Get laboratory operational dashboard metrics
   */
  async getDashboardMetrics(tenantId: string): Promise<any> {
    await this.ensureTestCatalogSeeded(tenantId);
    const tId = this.toObjectId(tenantId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingCollection,
      inProcess,
      awaitingVerification,
      completedToday,
      criticalOrdersToday,
    ] = await Promise.all([
      this.labOrderModel.countDocuments({ tenantId: tId }),
      this.labOrderModel.countDocuments({ tenantId: tId, status: LabOrderStatus.ORDERED }),
      this.labOrderModel.countDocuments({
        tenantId: tId,
        status: { $in: [LabOrderStatus.SAMPLE_COLLECTED, LabOrderStatus.IN_PROCESS] },
      }),
      this.labOrderModel.countDocuments({
        tenantId: tId,
        status: LabOrderStatus.RESULT_ENTERED,
      }),
      this.labOrderModel.countDocuments({
        tenantId: tId,
        status: LabOrderStatus.VERIFIED,
        verifiedAt: { $gte: todayStart },
      }),
      this.labOrderModel.countDocuments({
        tenantId: tId,
        createdAt: { $gte: todayStart },
        'results.flag': LabResultFlag.CRITICAL,
      }),
    ]);

    return {
      totalOrders,
      pendingCollection,
      inProcess,
      awaitingVerification,
      completedToday,
      criticalCountToday: criticalOrdersToday,
    };
  }
}
