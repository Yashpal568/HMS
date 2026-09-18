import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportsService } from './reports.service.js';
import { Types } from 'mongoose';
import { PaymentMethod } from '@hms/types';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockConnection: any;
  let mockAuditService: any;
  const tenantId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    const mockCollections: Record<string, any> = {
      patients: {
        countDocuments: vi.fn().mockImplementation((filter: any) => {
          if (filter.status === 'ACTIVE') return Promise.resolve(45);
          return Promise.resolve(12); // registered in range
        }),
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockImplementation(() => {
            return Promise.resolve([
              { _id: 'male', count: 7 },
              { _id: 'female', count: 5 },
            ]);
          }),
        }),
      },
      appointments: {
        aggregate: vi.fn().mockImplementation((pipeline: any[]) => {
          const isDoctorGroup = pipeline[1]?.$group?._id === '$doctorId';
          if (isDoctorGroup) {
            return {
              toArray: vi.fn().mockResolvedValue([
                { _id: new Types.ObjectId().toString(), count: 10, completed: 8 },
              ]),
            };
          }
          return {
            toArray: vi.fn().mockResolvedValue([
              { _id: 'COMPLETED', count: 8 },
              { _id: 'CHECKED_IN', count: 2 },
              { _id: 'CANCELLED', count: 1 },
              { _id: 'NO_SHOW', count: 1 },
            ]),
          };
        }),
      },
      admissions: {
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { admissionsInRange: 6, dischargesInRange: 4, currentInpatients: 8 },
          ]),
        }),
      },
      beds: {
        countDocuments: vi.fn().mockImplementation((filter: any) => {
          if (filter.status === 'OCCUPIED') return Promise.resolve(15);
          return Promise.resolve(20); // total beds
        }),
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { _id: 'General Ward', totalBeds: 12, occupiedBeds: 9 },
            { _id: 'ICU', totalBeds: 8, occupiedBeds: 6 },
          ]),
        }),
      },
      lab_orders: {
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { totalOrdered: 18, verified: 14, pending: 4, avgTatHours: 1.8 },
          ]),
        }),
      },
      invoices: {
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { totalInvoiced: 50000, totalDiscount: 1000, totalOutstanding: 15000 },
          ]),
        }),
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            // 15 days old -> 0-30 days
            {
              balanceDue: 5000,
              dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            },
            // 45 days old -> 31-60 days
            {
              balanceDue: 4000,
              dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            },
            // 75 days old -> 61-90 days
            {
              balanceDue: 3000,
              dueDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
            },
            // 120 days old -> >90 days
            {
              balanceDue: 2000,
              dueDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ]),
        }),
      },
      payments: {
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            {
              byMethod: [
                { _id: 'cash', total: 15000 },
                { _id: 'upi', total: 20000 },
              ],
              byCashier: [
                { _id: new Types.ObjectId().toString(), total: 35000, count: 12 },
              ],
              overall: [{ totalCollected: 35000 }],
            },
          ]),
        }),
      },
      refunds: {
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { totalRefunded: 1500 },
          ]),
        }),
      },
      dispensing_records: {
        countDocuments: vi.fn().mockResolvedValue(28),
      },
      medicine_batches: {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue([
            {
              batchNumber: 'B-101',
              medicineName: 'Paracetamol 500mg',
              currentStock: 50,
              expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
            },
          ]),
        }),
      },
      medicines: {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(),
              brandName: 'Amoxil',
              genericName: 'Amoxicillin',
              stockOnHand: 5,
              minStockAlert: 10,
            },
          ]),
        }),
      },
      inventory_items: {
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { totalValuation: 8500.5, lowStockCount: 2 },
          ]),
        }),
      },
      purchase_orders: {
        countDocuments: vi.fn().mockResolvedValue(3),
      },
      stock_movements: {
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { _id: 'grn_receipt', count: 5 },
            { _id: 'dept_transfer', count: 8 },
          ]),
        }),
      },
      users: {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(),
              firstName: 'Priya',
              lastName: 'Sharma',
              department: 'Cardiology',
            },
          ]),
        }),
      },
    };

    mockConnection = {
      collection: vi.fn().mockImplementation((name: string) => {
        return mockCollections[name] || {
          countDocuments: vi.fn().mockResolvedValue(0),
          find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
          aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
        };
      }),
    };

    service = new ReportsService(mockConnection, mockAuditService);
  });

  describe('getCensusReport', () => {
    it('should aggregate patient registrations, bed occupancy %, and ALOS', async () => {
      const report = await service.getCensusReport(tenantId);

      expect(report.patientVolume.totalRegistrations).toBe(12);
      expect(report.patientVolume.activePatients).toBe(45);
      expect(report.opdWorkload.totalAppointments).toBe(12);
      expect(report.opdWorkload.attended).toBe(10);
      expect(report.ipdCensus.totalBeds).toBe(20);
      expect(report.ipdCensus.occupiedBeds).toBe(15);
      expect(report.ipdCensus.bedOccupancyRate).toBe(75); // 15 / 20 * 100
      expect(report.ipdCensus.wardBreakdown).toHaveLength(2);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REPORT_GENERATE',
          resource: 'CensusReport',
        }),
      );
    });
  });

  describe('getFinancialReport', () => {
    it('should calculate revenue totals and accurately bucket ageing balances', async () => {
      const report = await service.getFinancialReport(tenantId);

      expect(report.summary.totalInvoiced).toBe(50000);
      expect(report.summary.totalCollected).toBe(35000);
      expect(report.summary.totalOutstanding).toBe(15000);
      expect(report.summary.totalRefunded).toBe(1500);

      // Verify Ageing Buckets
      expect(report.ageingBuckets.current).toBe(5000); // 15 days
      expect(report.ageingBuckets.thirtyToSixty).toBe(4000); // 45 days
      expect(report.ageingBuckets.sixtyToNinety).toBe(3000); // 75 days
      expect(report.ageingBuckets.overNinety).toBe(2000); // 120 days

      // Verify payment methods
      expect(report.paymentMethodBreakdown[PaymentMethod.CASH]).toBe(15000);
      expect(report.paymentMethodBreakdown[PaymentMethod.UPI]).toBe(20000);

      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REPORT_GENERATE',
          resource: 'FinancialReport',
        }),
      );
    });
  });

  describe('getInventoryPharmacyReport', () => {
    it('should detect near-expiry batches and stockout risks', async () => {
      const report = await service.getInventoryPharmacyReport(tenantId);

      expect(report.pharmacy.dispenseCount).toBe(28);
      expect(report.pharmacy.nearExpiryBatchesCount).toBe(1);
      expect(report.pharmacy.nearExpiryBatches[0].batchNumber).toBe('B-101');
      expect(report.pharmacy.stockoutRiskMedicines).toHaveLength(1);
      expect(report.pharmacy.stockoutRiskMedicines[0].name).toContain('Amoxil');
      expect(report.inventory.totalValuation).toBe(8500.5);
      expect(report.inventory.lowStockItemCount).toBe(2);
      expect(report.inventory.openPurchaseOrdersCount).toBe(3);
    });
  });

  describe('exportReportCsv', () => {
    it('should generate formatted CSV text for financial report', async () => {
      const csv = await service.exportReportCsv(tenantId, 'financial');

      expect(csv).toContain('Hospital Financial Revenue Report');
      expect(csv).toContain('SUMMARY METRICS');
      expect(csv).toContain('ACCOUNTS RECEIVABLE AGEING MATRIX');
      expect(csv).toContain('0-30 Days (Current),5000');
    });

    it('should generate formatted CSV text for census report', async () => {
      const csv = await service.exportReportCsv(tenantId, 'census');

      expect(csv).toContain('Hospital Operational & Clinical Census Report');
      expect(csv).toContain('PATIENT VOLUME & DEMOGRAPHICS');
      expect(csv).toContain('Bed Occupancy Rate,75%');
    });
  });
});
