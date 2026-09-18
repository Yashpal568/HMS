import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Connection } from 'mongoose';
import {
  HospitalService,
  HospitalServiceDocument,
} from './schemas/service.schema.js';
import {
  Invoice,
  InvoiceDocument,
  InvoiceLineItemSubdocument,
} from './schemas/invoice.schema.js';
import {
  Payment,
  PaymentDocument,
} from './schemas/payment.schema.js';
import {
  Refund,
  RefundDocument,
} from './schemas/refund.schema.js';
import {
  CreateTariffDto,
  CreateInvoiceDto,
  ProcessPaymentDto,
  CreateRefundDto,
  ApproveRefundDto,
} from './dto/billing.dto.js';
import {
  ServiceCategory,
  InvoiceStatus,
  InvoiceItemType,
  PaymentMethod,
  RefundStatus,
  BillingSummaryMetrics,
  UnbilledChargeItem,
} from '@hms/types';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectModel(HospitalService.name)
    private readonly serviceModel: Model<HospitalServiceDocument>,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Refund.name)
    private readonly refundModel: Model<RefundDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultData();
  }

  // ==========================================
  // IDEMPOTENT SEEDER
  // ==========================================
  private async seedDefaultData(): Promise<void> {
    const defaultTenantId = new Types.ObjectId('6aa3f64974f6740b10b10001');

    try {
      const existingTariffs = await this.serviceModel.countDocuments({
        tenantId: defaultTenantId,
      });

      if (existingTariffs === 0) {
        this.logger.log('Seeding standard hospital tariff charge master for demo tenant...');
        const standardTariffs: Partial<HospitalService>[] = [
          {
            tenantId: defaultTenantId,
            code: 'CONS-GEN',
            name: 'General OPD Consultation',
            category: ServiceCategory.CONSULTATION,
            standardRate: 300,
            taxRatePercent: 0,
            department: 'General Medicine',
            isActive: true,
          },
          {
            tenantId: defaultTenantId,
            code: 'CONS-SPEC',
            name: 'Specialist OPD Consultation',
            category: ServiceCategory.CONSULTATION,
            standardRate: 600,
            taxRatePercent: 0,
            department: 'Specialty Clinic',
            isActive: true,
          },
          {
            tenantId: defaultTenantId,
            code: 'CONS-EMRG',
            name: 'Emergency Triage & Consultation',
            category: ServiceCategory.CONSULTATION,
            standardRate: 850,
            taxRatePercent: 0,
            department: 'Emergency Room',
            isActive: true,
          },
          {
            tenantId: defaultTenantId,
            code: 'BED-GEN',
            name: 'General Ward Bed Charge (Daily)',
            category: ServiceCategory.BED_CHARGE,
            standardRate: 800,
            taxRatePercent: 0,
            department: 'Inpatient (IPD)',
            isActive: true,
          },
          {
            tenantId: defaultTenantId,
            code: 'BED-ICU',
            name: 'Intensive Care Unit (ICU) Bed Charge (Daily)',
            category: ServiceCategory.BED_CHARGE,
            standardRate: 3500,
            taxRatePercent: 0,
            department: 'ICU',
            isActive: true,
          },
          {
            tenantId: defaultTenantId,
            code: 'NURS-DAILY',
            name: 'Routine Inpatient Nursing Care (Daily)',
            category: ServiceCategory.NURSING,
            standardRate: 350,
            taxRatePercent: 0,
            department: 'Nursing',
            isActive: true,
          },
          {
            tenantId: defaultTenantId,
            code: 'PROC-SUT',
            name: 'Minor Wound Debridement & Suturing',
            category: ServiceCategory.PROCEDURE,
            standardRate: 450,
            taxRatePercent: 5,
            department: 'Surgery',
            isActive: true,
          },
          {
            tenantId: defaultTenantId,
            code: 'PROC-ECG',
            name: '12-Lead Electrocardiogram (ECG)',
            category: ServiceCategory.DIAGNOSTIC,
            standardRate: 300,
            taxRatePercent: 0,
            department: 'Cardiology',
            isActive: true,
          },
          {
            tenantId: defaultTenantId,
            code: 'LAB-CBC',
            name: 'Complete Blood Count (CBC)',
            category: ServiceCategory.DIAGNOSTIC,
            standardRate: 250,
            taxRatePercent: 0,
            department: 'Laboratory',
            isActive: true,
          },
          {
            tenantId: defaultTenantId,
            code: 'LAB-CMP',
            name: 'Comprehensive Metabolic Panel (CMP)',
            category: ServiceCategory.DIAGNOSTIC,
            standardRate: 750,
            taxRatePercent: 0,
            department: 'Laboratory',
            isActive: true,
          },
        ];

        await this.serviceModel.insertMany(standardTariffs);
        this.logger.log('Seeded 10 standard service tariffs successfully.');
      }

      // Seed baseline invoice and payment if none exist
      const existingInvoices = await this.invoiceModel.countDocuments({
        tenantId: defaultTenantId,
      });

      if (existingInvoices === 0) {
        const patientsCollection = this.connection.collection('patients');
        const demoPatient = await patientsCollection.findOne({ tenantId: defaultTenantId });

        if (demoPatient) {
          const invNumber = await this.generateInvoiceNumber(defaultTenantId);
          const rcpNumber = await this.generateReceiptNumber(defaultTenantId);

          const items: InvoiceLineItemSubdocument[] = [
            {
              itemType: InvoiceItemType.CONSULTATION,
              description: 'Specialist OPD Consultation - Dr. Aisha Patel',
              quantity: 1,
              unitPrice: 600,
              discountAmount: 0,
              taxAmount: 0,
              netAmount: 600,
            },
            {
              itemType: InvoiceItemType.DIAGNOSTIC,
              description: '12-Lead Electrocardiogram (ECG)',
              quantity: 1,
              unitPrice: 300,
              discountAmount: 0,
              taxAmount: 0,
              netAmount: 300,
            },
          ];

          const subtotal = 900;
          const grandTotal = 900;
          const paidAmount = 500;
          const balanceDue = 400;

          const seededInvoice = await this.invoiceModel.create({
            tenantId: defaultTenantId,
            invoiceNumber: invNumber,
            patientId: demoPatient._id,
            status: InvoiceStatus.PARTIALLY_PAID,
            items,
            subtotal,
            totalDiscount: 0,
            totalTax: 0,
            grandTotal,
            paidAmount,
            balanceDue,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            notes: 'Initial consultation and cardiac baseline screening.',
          });

          const usersCollection = this.connection.collection('users');
          const adminUser = await usersCollection.findOne({ tenantId: defaultTenantId });

          if (adminUser) {
            await this.paymentModel.create({
              tenantId: defaultTenantId,
              receiptNumber: rcpNumber,
              invoiceId: seededInvoice._id,
              patientId: demoPatient._id,
              cashierId: adminUser._id,
              amount: 500,
              method: PaymentMethod.UPI,
              transactionReference: 'UPI-9834217721',
              notes: 'Partial advance settlement via UPI',
              paidAt: new Date(),
            });
          }

          this.logger.log(`Seeded baseline invoice ${invNumber} and payment ${rcpNumber}.`);
        }
      }
    } catch (err: unknown) {
      this.logger.warn(`Error during billing seeder initialization: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ==========================================
  // SEQUENTIAL IDENTIFIER GENERATORS
  // ==========================================
  async generateInvoiceNumber(tenantId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.invoiceModel.countDocuments({ tenantId });
    const seq = String(count + 1).padStart(5, '0');
    return `INV-${year}-${seq}`;
  }

  async generateReceiptNumber(tenantId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.paymentModel.countDocuments({ tenantId });
    const seq = String(count + 1).padStart(5, '0');
    return `RCP-${year}-${seq}`;
  }

  async generateRefundNumber(tenantId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.refundModel.countDocuments({ tenantId });
    const seq = String(count + 1).padStart(5, '0');
    return `RFD-${year}-${seq}`;
  }

  // ==========================================
  // SERVICE TARIFF / CHARGE MASTER
  // ==========================================
  async listTariffs(
    tenantId: Types.ObjectId,
    category?: ServiceCategory,
  ): Promise<HospitalServiceDocument[]> {
    const query: Record<string, unknown> = { tenantId, isActive: true };
    if (category) {
      query.category = category;
    }
    return this.serviceModel.find(query).sort({ category: 1, name: 1 }).exec();
  }

  async createTariff(
    tenantId: Types.ObjectId,
    dto: CreateTariffDto,
    userId?: Types.ObjectId,
  ): Promise<HospitalServiceDocument> {
    let code = dto.code?.trim().toUpperCase();
    if (!code) {
      const count = await this.serviceModel.countDocuments({ tenantId });
      code = `SRV-${String(count + 1).padStart(3, '0')}`;
    }

    const existing = await this.serviceModel.findOne({ tenantId, code });
    if (existing) {
      throw new BadRequestException(`Service tariff with code ${code} already exists.`);
    }

    const service = await this.serviceModel.create({
      tenantId,
      code,
      name: dto.name.trim(),
      category: dto.category,
      standardRate: Math.round(dto.standardRate * 100) / 100,
      taxRatePercent: dto.taxRatePercent ?? 0,
      department: dto.department?.trim() || 'General',
      isActive: dto.isActive ?? true,
    });

    if (userId) {
      await this.auditService.record({
        userId: userId.toString(),
        action: 'TARIFF_CREATE',
        resource: 'HospitalService',
        details: { code: service.code, name: service.name, rate: service.standardRate },
      });
    }

    return service;
  }

  // ==========================================
  // INVOICE ENGINE
  // ==========================================
  async createInvoice(
    tenantId: Types.ObjectId,
    dto: CreateInvoiceDto,
    userId: Types.ObjectId,
  ): Promise<InvoiceDocument> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Invoice must have at least one line item.');
    }

    const patientObjectId = new Types.ObjectId(dto.patientId);

    // Calculate line items using integer minor units (cents / paise) to eliminate IEEE-754 floating point drift
    let subtotalCents = 0;
    let totalDiscountCents = 0;
    let totalTaxCents = 0;
    let grandTotalCents = 0;

    const processedItems: InvoiceLineItemSubdocument[] = dto.items.map((item) => {
      const quantity = Math.max(1, Math.round(item.quantity));
      const unitPriceCents = Math.round(item.unitPrice * 100);
      const grossCents = unitPriceCents * quantity;

      const discountCents = Math.min(
        grossCents,
        Math.max(0, Math.round((item.discountAmount || 0) * 100)),
      );
      const taxableCents = Math.max(0, grossCents - discountCents);

      const taxRatePercent = Math.max(0, Math.min(100, item.taxRatePercent || 0));
      const taxCents = Math.round((taxableCents * taxRatePercent) / 100);

      const netCents = taxableCents + taxCents;

      subtotalCents += grossCents;
      totalDiscountCents += discountCents;
      totalTaxCents += taxCents;
      grandTotalCents += netCents;

      return {
        serviceId: item.serviceId ? new Types.ObjectId(item.serviceId) : undefined,
        itemType: item.itemType,
        description: item.description.trim(),
        quantity,
        unitPrice: unitPriceCents / 100,
        discountAmount: discountCents / 100,
        taxAmount: taxCents / 100,
        netAmount: netCents / 100,
        referenceId: item.referenceId?.trim(),
      };
    });

    const subtotal = subtotalCents / 100;
    const totalDiscount = totalDiscountCents / 100;
    const totalTax = totalTaxCents / 100;
    const grandTotal = grandTotalCents / 100;
    const balanceDue = grandTotal;

    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    const invoice = await this.invoiceModel.create({
      tenantId,
      invoiceNumber,
      patientId: patientObjectId,
      admissionId: dto.admissionId ? new Types.ObjectId(dto.admissionId) : undefined,
      encounterId: dto.encounterId ? new Types.ObjectId(dto.encounterId) : undefined,
      appointmentId: dto.appointmentId ? new Types.ObjectId(dto.appointmentId) : undefined,
      status: InvoiceStatus.ISSUED,
      items: processedItems,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      paidAmount: 0,
      balanceDue,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: dto.notes?.trim(),
    });

    await this.auditService.record({
      userId: userId.toString(),
      action: 'INVOICE_CREATE',
      resource: 'Invoice',
      details: {
        invoiceNumber: invoice.invoiceNumber,
        patientId: dto.patientId,
        grandTotal: invoice.grandTotal,
        itemsCount: processedItems.length,
      },
    });

    return invoice;
  }

  async listInvoices(
    tenantId: Types.ObjectId,
    params?: {
      status?: InvoiceStatus;
      patientId?: string;
      search?: string;
      limit?: number;
      skip?: number;
    },
  ): Promise<{ invoices: InvoiceDocument[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };

    if (params?.status) {
      query.status = params.status;
    }

    if (params?.patientId) {
      query.patientId = new Types.ObjectId(params.patientId);
    }

    if (params?.search) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [{ invoiceNumber: searchRegex }, { notes: searchRegex }];
    }

    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const skip = Math.max(0, params?.skip ?? 0);

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(query)
        .populate('patientId', 'name uhid contacts gender dateOfBirth firstName lastName phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.invoiceModel.countDocuments(query).exec(),
    ]);

    return { invoices, total };
  }

  async getInvoiceById(
    tenantId: Types.ObjectId,
    invoiceId: string,
  ): Promise<{
    invoice: InvoiceDocument;
    payments: PaymentDocument[];
    refunds: RefundDocument[];
  }> {
    const invoice = await this.invoiceModel
      .findOne({ tenantId, _id: new Types.ObjectId(invoiceId) })
      .populate('patientId', 'name uhid contacts gender dateOfBirth firstName lastName phone address')
      .populate('items.serviceId', 'code name category')
      .exec();

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found.`);
    }

    const [payments, refunds] = await Promise.all([
      this.paymentModel
        .find({ tenantId, invoiceId: invoice._id })
        .populate('cashierId', 'name email firstName lastName')
        .sort({ paidAt: -1 })
        .exec(),
      this.refundModel
        .find({ tenantId, invoiceId: invoice._id })
        .populate('requestedBy', 'name email firstName lastName')
        .populate('approvedBy', 'name email firstName lastName')
        .sort({ createdAt: -1 })
        .exec(),
    ]);

    return { invoice, payments, refunds };
  }

  // ==========================================
  // PAYMENT PROCESSING
  // ==========================================
  async processPayment(
    tenantId: Types.ObjectId,
    dto: ProcessPaymentDto,
    cashierId: Types.ObjectId,
  ): Promise<PaymentDocument> {
    const invoiceObjectId = new Types.ObjectId(dto.invoiceId);
    const invoice = await this.invoiceModel.findOne({
      tenantId,
      _id: invoiceObjectId,
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${dto.invoiceId} not found.`);
    }

    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.CANCELLED ||
      invoice.status === InvoiceStatus.REFUNDED
    ) {
      throw new BadRequestException(
        `Cannot collect payment on invoice with status ${invoice.status}.`,
      );
    }

    const balanceCents = Math.round(invoice.balanceDue * 100);
    const paymentAmountCents = Math.round(dto.amount * 100);

    if (paymentAmountCents <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    if (paymentAmountCents > balanceCents) {
      throw new BadRequestException(
        `Payment amount of ${dto.amount} exceeds outstanding balance of ${invoice.balanceDue}.`,
      );
    }

    const newBalanceCents = balanceCents - paymentAmountCents;
    const newPaidCents = Math.round(invoice.paidAmount * 100) + paymentAmountCents;

    invoice.paidAmount = newPaidCents / 100;
    invoice.balanceDue = newBalanceCents / 100;
    invoice.status =
      newBalanceCents === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    await invoice.save();

    const receiptNumber = await this.generateReceiptNumber(tenantId);

    const payment = await this.paymentModel.create({
      tenantId,
      receiptNumber,
      invoiceId: invoice._id,
      patientId: invoice.patientId,
      cashierId,
      amount: paymentAmountCents / 100,
      method: dto.method,
      transactionReference: dto.transactionReference?.trim(),
      notes: dto.notes?.trim(),
      paidAt: new Date(),
    });

    await this.auditService.record({
      userId: cashierId.toString(),
      action: 'PAYMENT_PROCESS',
      resource: 'Payment',
      details: {
        receiptNumber: payment.receiptNumber,
        invoiceNumber: invoice.invoiceNumber,
        amount: payment.amount,
        method: payment.method,
        remainingBalance: invoice.balanceDue,
      },
    });

    return payment;
  }

  async listPayments(
    tenantId: Types.ObjectId,
    params?: {
      method?: PaymentMethod;
      patientId?: string;
      search?: string;
      limit?: number;
      skip?: number;
    },
  ): Promise<{ payments: PaymentDocument[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };

    if (params?.method) {
      query.method = params.method;
    }

    if (params?.patientId) {
      query.patientId = new Types.ObjectId(params.patientId);
    }

    if (params?.search) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      query.$or = [
        { receiptNumber: searchRegex },
        { transactionReference: searchRegex },
        { notes: searchRegex },
      ];
    }

    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const skip = Math.max(0, params?.skip ?? 0);

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .populate('patientId', 'name uhid contacts gender firstName lastName phone')
        .populate('cashierId', 'name email firstName lastName')
        .populate('invoiceId', 'invoiceNumber grandTotal balanceDue status')
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments(query).exec(),
    ]);

    return { payments, total };
  }

  // ==========================================
  // REFUND WORKFLOW
  // ==========================================
  async createRefund(
    tenantId: Types.ObjectId,
    dto: CreateRefundDto,
    requestedBy: Types.ObjectId,
  ): Promise<RefundDocument> {
    const invoiceObjectId = new Types.ObjectId(dto.invoiceId);
    const invoice = await this.invoiceModel.findOne({
      tenantId,
      _id: invoiceObjectId,
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${dto.invoiceId} not found.`);
    }

    const paidCents = Math.round(invoice.paidAmount * 100);
    const requestedCents = Math.round(dto.amount * 100);

    if (requestedCents <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero.');
    }

    if (requestedCents > paidCents) {
      throw new BadRequestException(
        `Refund amount of ${dto.amount} exceeds total amount paid of ${invoice.paidAmount}.`,
      );
    }

    const refundNumber = await this.generateRefundNumber(tenantId);

    const refund = await this.refundModel.create({
      tenantId,
      refundNumber,
      invoiceId: invoice._id,
      paymentId: dto.paymentId ? new Types.ObjectId(dto.paymentId) : undefined,
      amount: requestedCents / 100,
      reason: dto.reason.trim(),
      requestedBy,
      status: RefundStatus.REQUESTED,
      notes: dto.notes?.trim(),
    });

    await this.auditService.record({
      userId: requestedBy.toString(),
      action: 'REFUND_REQUEST',
      resource: 'Refund',
      details: {
        refundNumber: refund.refundNumber,
        invoiceNumber: invoice.invoiceNumber,
        amount: refund.amount,
        reason: refund.reason,
      },
    });

    return refund;
  }

  async approveRefund(
    tenantId: Types.ObjectId,
    refundId: string,
    dto: ApproveRefundDto,
    approverId: Types.ObjectId,
  ): Promise<RefundDocument> {
    const refund = await this.refundModel.findOne({
      tenantId,
      _id: new Types.ObjectId(refundId),
    });

    if (!refund) {
      throw new NotFoundException(`Refund with ID ${refundId} not found.`);
    }

    if (refund.status !== RefundStatus.REQUESTED) {
      throw new BadRequestException(
        `Cannot approve/reject refund with status ${refund.status}.`,
      );
    }

    if (dto.action === 'reject') {
      refund.status = RefundStatus.REJECTED;
      refund.approvedBy = approverId;
      refund.approvedAt = new Date();
      if (dto.notes) refund.notes = `${refund.notes ? refund.notes + ' | ' : ''}Rejected: ${dto.notes}`;
      await refund.save();
      return refund;
    }

    // Process approval & disbursement
    const invoice = await this.invoiceModel.findOne({
      tenantId,
      _id: refund.invoiceId,
    });

    if (!invoice) {
      throw new NotFoundException('Associated invoice not found.');
    }

    const refundCents = Math.round(refund.amount * 100);
    const paidCents = Math.round(invoice.paidAmount * 100);
    const newPaidCents = Math.max(0, paidCents - refundCents);
    const newBalanceCents = Math.round(invoice.balanceDue * 100) + refundCents;

    invoice.paidAmount = newPaidCents / 100;
    invoice.balanceDue = newBalanceCents / 100;

    if (newPaidCents === 0 && invoice.grandTotal === refund.amount) {
      invoice.status = InvoiceStatus.REFUNDED;
    } else {
      invoice.status =
        newBalanceCents === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
    }

    await invoice.save();

    refund.status = RefundStatus.DISBURSED;
    refund.approvedBy = approverId;
    refund.approvedAt = new Date();
    if (dto.notes) refund.notes = `${refund.notes ? refund.notes + ' | ' : ''}${dto.notes}`;
    await refund.save();

    await this.auditService.record({
      userId: approverId.toString(),
      action: 'REFUND_APPROVE',
      resource: 'Refund',
      details: {
        refundNumber: refund.refundNumber,
        invoiceNumber: invoice.invoiceNumber,
        amount: refund.amount,
        status: refund.status,
      },
    });

    return refund;
  }

  async listRefunds(
    tenantId: Types.ObjectId,
    params?: {
      status?: RefundStatus;
      limit?: number;
      skip?: number;
    },
  ): Promise<{ refunds: RefundDocument[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };

    if (params?.status) {
      query.status = params.status;
    }

    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const skip = Math.max(0, params?.skip ?? 0);

    const [refunds, total] = await Promise.all([
      this.refundModel
        .find(query)
        .populate('requestedBy', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .populate('invoiceId', 'invoiceNumber grandTotal paidAmount status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.refundModel.countDocuments(query).exec(),
    ]);

    return { refunds, total };
  }

  // ==========================================
  // UNBILLED CHARGES AGGREGATOR
  // ==========================================
  async getUnbilledCharges(
    tenantId: Types.ObjectId,
    patientId: string,
  ): Promise<UnbilledChargeItem[]> {
    const pId = new Types.ObjectId(patientId);
    const unbilledItems: UnbilledChargeItem[] = [];

    try {
      // 1. Check OPD Appointments
      const appointmentsColl = this.connection.collection('appointments');
      const appointments = await appointmentsColl
        .find({
          tenantId,
          patientId: pId,
          status: { $in: ['COMPLETED', 'CHECKED_IN'] },
        })
        .toArray();

      // Find existing invoices linked to these appointments
      const apptIds = appointments.map((a) => a._id);
      const existingInvoices = await this.invoiceModel
        .find({ tenantId, appointmentId: { $in: apptIds } })
        .select('appointmentId')
        .exec();
      const billedApptIds = new Set(
        existingInvoices.map((inv) => inv.appointmentId?.toString()),
      );

      for (const appt of appointments) {
        if (!billedApptIds.has(appt._id.toString())) {
          unbilledItems.push({
            referenceId: appt._id.toString(),
            itemType: InvoiceItemType.CONSULTATION,
            description: `OPD Consultation Token #${appt.tokenNumber} - ${appt.department || 'General'}`,
            quantity: 1,
            unitPrice: 500,
            totalAmount: 500,
            date: (appt.scheduledAt || appt.createdAt || new Date()).toISOString(),
          });
        }
      }

      // 2. Check Lab Orders
      const labOrdersColl = this.connection.collection('lab_orders');
      const labOrders = await labOrdersColl
        .find({
          tenantId,
          patientId: pId,
          status: { $in: ['VERIFIED', 'RESULT_ENTERED', 'ORDERED'] },
        })
        .toArray();

      for (const order of labOrders) {
        if (Array.isArray(order.tests)) {
          for (const test of order.tests) {
            unbilledItems.push({
              referenceId: `${order._id.toString()}-${test.testId || test.code || 'test'}`,
              itemType: InvoiceItemType.DIAGNOSTIC,
              description: `Diagnostic Lab: ${test.name || test.code || 'Test Panel'} (Order: ${order.orderNumber || 'LAB'})`,
              quantity: 1,
              unitPrice: test.tariffPrice || 250,
              totalAmount: test.tariffPrice || 250,
              date: (order.createdAt || new Date()).toISOString(),
            });
          }
        }
      }

      // 3. Check Pharmacy Dispensing Records
      const dispensingColl = this.connection.collection('dispensing_records');
      const dispensings = await dispensingColl
        .find({ tenantId, patientId: pId })
        .toArray();

      for (const rec of dispensings) {
        if (Array.isArray(rec.items)) {
          for (const item of rec.items) {
            unbilledItems.push({
              referenceId: `${rec._id.toString()}-${item.medicineId || item.batchNumber}`,
              itemType: InvoiceItemType.PHARMACY,
              description: `Pharmacy: ${item.medicineName} (${item.quantity} units)`,
              quantity: item.quantity || 1,
              unitPrice: item.unitSalePrice || (item.totalPrice / (item.quantity || 1)) || 50,
              totalAmount: item.totalPrice || 50,
              date: (rec.createdAt || new Date()).toISOString(),
            });
          }
        }
      }

      // 4. Check Inpatient Admissions (Daily Bed Charges)
      const admissionsColl = this.connection.collection('admissions');
      const admissions = await admissionsColl
        .find({ tenantId, patientId: pId })
        .toArray();

      for (const adm of admissions) {
        const start = new Date(adm.admissionDate || adm.createdAt || Date.now());
        const end = adm.dischargeDate ? new Date(adm.dischargeDate) : new Date();
        const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

        unbilledItems.push({
          referenceId: adm._id.toString(),
          itemType: InvoiceItemType.BED_CHARGE,
          description: `Inpatient Bed & Room Charges (${diffDays} days - Adm #${adm.admissionNumber || 'ADM'})`,
          quantity: diffDays,
          unitPrice: 800,
          totalAmount: diffDays * 800,
          date: start.toISOString(),
        });
      }
    } catch (err: unknown) {
      this.logger.warn(`Error scanning unbilled charges: ${err instanceof Error ? err.message : String(err)}`);
    }

    return unbilledItems;
  }

  // ==========================================
  // FINANCIAL METRICS SUMMARY
  // ==========================================
  async getBillingSummary(tenantId: Types.ObjectId): Promise<BillingSummaryMetrics> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Payments today
    const todayPayments = await this.paymentModel
      .find({
        tenantId,
        paidAt: { $gte: startOfToday },
      })
      .exec();

    let todayCollections = 0;
    const collectionsByMethod: Record<string, number> = {
      cash: 0,
      credit_card: 0,
      debit_card: 0,
      upi: 0,
      bank_transfer: 0,
      insurance_claim: 0,
    };

    for (const p of todayPayments) {
      todayCollections += p.amount;
      const method = p.method || 'cash';
      collectionsByMethod[method] = (collectionsByMethod[method] || 0) + p.amount;
    }

    // Active invoices totals
    const activeInvoices = await this.invoiceModel
      .find({
        tenantId,
        status: { $nin: [InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED] },
      })
      .select('grandTotal balanceDue status createdAt')
      .exec();

    let totalInvoiced = 0;
    let totalReceivables = 0;
    let pendingInvoicesCount = 0;

    for (const inv of activeInvoices) {
      totalInvoiced += inv.grandTotal;
      totalReceivables += inv.balanceDue;
      if (
        inv.status === InvoiceStatus.ISSUED ||
        inv.status === InvoiceStatus.PARTIALLY_PAID
      ) {
        pendingInvoicesCount++;
      }
    }

    const recentInvoicesCount = await this.invoiceModel.countDocuments({
      tenantId,
      createdAt: { $gte: startOfToday },
    });

    return {
      todayCollections: Math.round(todayCollections * 100) / 100,
      totalReceivables: Math.round(totalReceivables * 100) / 100,
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      pendingInvoicesCount,
      collectionsByMethod,
      recentInvoicesCount,
    };
  }
}
