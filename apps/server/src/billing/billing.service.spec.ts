import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BillingService } from './billing.service.js';
import { Types } from 'mongoose';
import {
  ServiceCategory,
  InvoiceStatus,
  InvoiceItemType,
  PaymentMethod,
  RefundStatus,
} from '@hms/types';
import { BadRequestException } from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;
  let mockServiceModel: any;
  let mockInvoiceModel: any;
  let mockPaymentModel: any;
  let mockRefundModel: any;
  let mockConnection: any;
  let mockAuditService: any;

  const tenantId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const patientId = new Types.ObjectId();
  const invoiceId = new Types.ObjectId();

  beforeEach(() => {
    mockServiceModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      insertMany: vi.fn(),
    };

    mockInvoiceModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
    };

    mockPaymentModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
    };

    mockRefundModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
    };

    mockConnection = {
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn(),
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(true),
    };

    service = new BillingService(
      mockServiceModel,
      mockInvoiceModel,
      mockPaymentModel,
      mockRefundModel,
      mockConnection,
      mockAuditService,
    );
  });

  describe('Tariff Management', () => {
    it('should create a new tariff with auto-generated code', async () => {
      mockServiceModel.countDocuments.mockResolvedValue(0);
      mockServiceModel.findOne.mockResolvedValue(null);
      mockServiceModel.create.mockImplementation((data: any) => Promise.resolve({ _id: new Types.ObjectId(), ...data }));

      const result = await service.createTariff(
        tenantId,
        {
          name: 'General Consultation',
          category: ServiceCategory.CONSULTATION,
          standardRate: 350.5,
          taxRatePercent: 0,
        },
        userId,
      );

      expect(mockServiceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          code: 'SRV-001',
          name: 'General Consultation',
          standardRate: 350.5,
        }),
      );
      expect(result.code).toBe('SRV-001');
      expect(mockAuditService.record).toHaveBeenCalled();
    });

    it('should reject duplicate tariff code', async () => {
      mockServiceModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(), code: 'CONS-GEN' });

      await expect(
        service.createTariff(
          tenantId,
          {
            code: 'CONS-GEN',
            name: 'General Consultation',
            category: ServiceCategory.CONSULTATION,
            standardRate: 300,
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Invoice Engine', () => {
    it('should calculate invoice line items with exact decimal precision and zero floating-point drift', async () => {
      mockInvoiceModel.countDocuments.mockResolvedValue(5);
      mockInvoiceModel.create.mockImplementation((data: any) => Promise.resolve({ _id: invoiceId, ...data }));

      const dto = {
        patientId: patientId.toString(),
        items: [
          {
            itemType: InvoiceItemType.CONSULTATION,
            description: 'Specialist Consultation',
            quantity: 1,
            unitPrice: 500,
            discountAmount: 50,
            taxRatePercent: 0,
          },
          {
            itemType: InvoiceItemType.PROCEDURE,
            description: 'Wound Dressing',
            quantity: 2,
            unitPrice: 200,
            discountAmount: 0,
            taxRatePercent: 5,
          },
        ],
      };

      const result = await service.createInvoice(tenantId, dto as any, userId);

      // Calculation check:
      // Item 1: gross = 500, discount = 50, taxable = 450, tax = 0, net = 450
      // Item 2: gross = 400, discount = 0, taxable = 400, tax = 20, net = 420
      // Subtotal = 500 + 400 = 900
      // Total Discount = 50
      // Total Tax = 20
      // Grand Total = 450 + 420 = 870
      // Balance Due = 870
      expect(mockInvoiceModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          invoiceNumber: expect.stringMatching(/^INV-\d{4}-00006$/),
          subtotal: 900,
          totalDiscount: 50,
          totalTax: 20,
          grandTotal: 870,
          paidAmount: 0,
          balanceDue: 870,
          status: InvoiceStatus.ISSUED,
        }),
      );
      expect(result.grandTotal).toBe(870);
      expect(result.balanceDue).toBe(870);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INVOICE_CREATE' }),
      );
    });

    it('should reject invoice with empty items list', async () => {
      await expect(
        service.createInvoice(tenantId, { patientId: patientId.toString(), items: [] } as any, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Payment Processing', () => {
    it('should process partial payment and update status to PARTIALLY_PAID', async () => {
      const mockInvoice = {
        _id: invoiceId,
        tenantId,
        patientId,
        invoiceNumber: 'INV-2026-00001',
        grandTotal: 1000,
        paidAmount: 0,
        balanceDue: 1000,
        status: InvoiceStatus.ISSUED,
        save: vi.fn().mockResolvedValue(true),
      };

      mockInvoiceModel.findOne.mockResolvedValue(mockInvoice);
      mockPaymentModel.countDocuments.mockResolvedValue(0);
      mockPaymentModel.create.mockImplementation((data: any) => Promise.resolve({ _id: new Types.ObjectId(), ...data }));

      const payment = await service.processPayment(
        tenantId,
        {
          invoiceId: invoiceId.toString(),
          amount: 400,
          method: PaymentMethod.UPI,
          transactionReference: 'UPI-12345',
        },
        userId,
      );

      expect(mockInvoice.paidAmount).toBe(400);
      expect(mockInvoice.balanceDue).toBe(600);
      expect(mockInvoice.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(payment.receiptNumber).toMatch(/^RCP-\d{4}-00001$/);
      expect(payment.amount).toBe(400);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PAYMENT_PROCESS' }),
      );
    });

    it('should process full payment and update status to PAID', async () => {
      const mockInvoice = {
        _id: invoiceId,
        tenantId,
        patientId,
        invoiceNumber: 'INV-2026-00001',
        grandTotal: 1000,
        paidAmount: 400,
        balanceDue: 600,
        status: InvoiceStatus.PARTIALLY_PAID,
        save: vi.fn().mockResolvedValue(true),
      };

      mockInvoiceModel.findOne.mockResolvedValue(mockInvoice);
      mockPaymentModel.countDocuments.mockResolvedValue(1);
      mockPaymentModel.create.mockImplementation((data: any) => Promise.resolve({ _id: new Types.ObjectId(), ...data }));

      const payment = await service.processPayment(
        tenantId,
        {
          invoiceId: invoiceId.toString(),
          amount: 600,
          method: PaymentMethod.CASH,
        },
        userId,
      );

      expect(mockInvoice.paidAmount).toBe(1000);
      expect(mockInvoice.balanceDue).toBe(0);
      expect(mockInvoice.status).toBe(InvoiceStatus.PAID);
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(payment.amount).toBe(600);
    });

    it('should reject payment exceeding outstanding balance', async () => {
      const mockInvoice = {
        _id: invoiceId,
        tenantId,
        grandTotal: 1000,
        paidAmount: 800,
        balanceDue: 200,
        status: InvoiceStatus.PARTIALLY_PAID,
      };

      mockInvoiceModel.findOne.mockResolvedValue(mockInvoice);

      await expect(
        service.processPayment(
          tenantId,
          {
            invoiceId: invoiceId.toString(),
            amount: 250,
            method: PaymentMethod.CASH,
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Refund Workflow', () => {
    it('should create refund request within paid amount threshold', async () => {
      const mockInvoice = {
        _id: invoiceId,
        tenantId,
        paidAmount: 500,
        invoiceNumber: 'INV-2026-00001',
      };

      mockInvoiceModel.findOne.mockResolvedValue(mockInvoice);
      mockRefundModel.countDocuments.mockResolvedValue(0);
      mockRefundModel.create.mockImplementation((data: any) => Promise.resolve({ _id: new Types.ObjectId(), ...data }));

      const refund = await service.createRefund(
        tenantId,
        {
          invoiceId: invoiceId.toString(),
          amount: 200,
          reason: 'Cancelled laboratory procedure',
        },
        userId,
      );

      expect(refund.refundNumber).toMatch(/^RFD-\d{4}-00001$/);
      expect(refund.status).toBe(RefundStatus.REQUESTED);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REFUND_REQUEST' }),
      );
    });

    it('should reject refund exceeding total amount paid', async () => {
      const mockInvoice = {
        _id: invoiceId,
        tenantId,
        paidAmount: 300,
      };

      mockInvoiceModel.findOne.mockResolvedValue(mockInvoice);

      await expect(
        service.createRefund(
          tenantId,
          {
            invoiceId: invoiceId.toString(),
            amount: 500,
            reason: 'Excessive refund',
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve refund, disburse funds, and adjust invoice balances', async () => {
      const refundId = new Types.ObjectId();
      const mockRefund = {
        _id: refundId,
        tenantId,
        invoiceId,
        amount: 200,
        status: RefundStatus.REQUESTED,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockInvoice = {
        _id: invoiceId,
        tenantId,
        invoiceNumber: 'INV-2026-00001',
        grandTotal: 1000,
        paidAmount: 500,
        balanceDue: 500,
        status: InvoiceStatus.PARTIALLY_PAID,
        save: vi.fn().mockResolvedValue(true),
      };

      mockRefundModel.findOne.mockResolvedValue(mockRefund);
      mockInvoiceModel.findOne.mockResolvedValue(mockInvoice);

      const approved = await service.approveRefund(
        tenantId,
        refundId.toString(),
        { action: 'approve', notes: 'Approved by Medical Director' },
        userId,
      );

      expect(approved.status).toBe(RefundStatus.DISBURSED);
      expect(mockInvoice.paidAmount).toBe(300);
      expect(mockInvoice.balanceDue).toBe(700);
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(mockRefund.save).toHaveBeenCalled();
    });
  });

  describe('Unbilled Charges Aggregator', () => {
    it('should aggregate pending appointments, lab tests, and dispensing items for patient', async () => {
      mockConnection.collection.mockImplementation((name: string) => {
        if (name === 'appointments') {
          return {
            find: () => ({
              toArray: () =>
                Promise.resolve([
                  {
                    _id: new Types.ObjectId(),
                    tokenNumber: 12,
                    department: 'Cardiology',
                    scheduledAt: new Date(),
                  },
                ]),
            }),
          };
        }
        if (name === 'lab_orders') {
          return {
            find: () => ({
              toArray: () =>
                Promise.resolve([
                  {
                    _id: new Types.ObjectId(),
                    orderNumber: 'LAB-2026-0001',
                    tests: [{ code: 'CBC', name: 'Complete Blood Count', tariffPrice: 250 }],
                  },
                ]),
            }),
          };
        }
        return {
          find: () => ({
            toArray: () => Promise.resolve([]),
          }),
        };
      });

      mockInvoiceModel.find.mockReturnValue({
        select: () => ({
          exec: () => Promise.resolve([]),
        }),
      });

      const unbilled = await service.getUnbilledCharges(tenantId, patientId.toString());

      expect(unbilled.length).toBe(2);
      expect(unbilled[0].itemType).toBe(InvoiceItemType.CONSULTATION);
      expect(unbilled[0].totalAmount).toBe(500);
      expect(unbilled[1].itemType).toBe(InvoiceItemType.DIAGNOSTIC);
      expect(unbilled[1].totalAmount).toBe(250);
    });
  });
});
