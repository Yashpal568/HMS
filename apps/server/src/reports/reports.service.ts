import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { AuditService } from '../audit/audit.service.js';
import { PaymentMethod } from '@hms/types';
import type {
  CensusReport,
  FinancialReport,
  InventoryPharmacyReport,
} from '@hms/types';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly auditService: AuditService,
  ) {}

  private getTenantFilter(tenantId: string | Types.ObjectId): Record<string, unknown> {
    const tId = tenantId instanceof Types.ObjectId ? tenantId : new Types.ObjectId(tenantId.toString());
    return {
      $or: [{ tenantId: tId }, { tenantId: tId.toString() }],
    };
  }

  private parseDateRange(startDateStr?: string, endDateStr?: string): { start: Date; end: Date; startIso: string; endIso: string } {
    let start: Date;
    let end: Date;

    if (startDateStr) {
      start = new Date(startDateStr);
    } else {
      // Default: 30 days ago
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }

    if (endDateStr) {
      end = new Date(endDateStr);
      if (!endDateStr.includes('T')) {
        end.setHours(23, 59, 59, 999);
      }
    } else {
      end = new Date();
    }

    return {
      start,
      end,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  async getCensusReport(tenantId: string, startDateStr?: string, endDateStr?: string): Promise<CensusReport> {
    const { start, end, startIso, endIso } = this.parseDateRange(startDateStr, endDateStr);
    const tenantFilter = this.getTenantFilter(tenantId);

    // 1. Patient Demographics & Intake
    const patientsCol = this.connection.collection('patients');
    const [totalReg, activePatients, genderAgg, ageAgg] = await Promise.all([
      patientsCol.countDocuments({
        ...tenantFilter,
        createdAt: { $gte: start, $lte: end },
      }),
      patientsCol.countDocuments({
        ...tenantFilter,
        status: 'ACTIVE',
      }),
      patientsCol
        .aggregate([
          { $match: { ...tenantFilter } },
          { $group: { _id: { $toLower: '$gender' }, count: { $sum: 1 } } },
        ])
        .toArray(),
      patientsCol
        .aggregate([
          { $match: { ...tenantFilter } },
          {
            $project: {
              age: {
                $cond: [
                  { $ne: ['$dateOfBirth', null] },
                  {
                    $floor: {
                      $divide: [{ $subtract: [new Date(), '$dateOfBirth'] }, 365.25 * 24 * 60 * 60 * 1000],
                    },
                  },
                  30,
                ],
              },
            },
          },
          {
            $project: {
              category: {
                $cond: [
                  { $lt: ['$age', 18] },
                  'pediatric',
                  {
                    $cond: [{ $gte: ['$age', 60] }, 'geriatric', 'adult'],
                  },
                ],
              },
            },
          },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const genderDistribution = { male: 0, female: 0, other: 0 };
    for (const g of genderAgg) {
      if (g._id === 'male' || g._id === 'm') genderDistribution.male += g.count;
      else if (g._id === 'female' || g._id === 'f') genderDistribution.female += g.count;
      else genderDistribution.other += g.count;
    }

    const ageDistribution = { pediatric: 0, adult: 0, geriatric: 0 };
    for (const a of ageAgg) {
      if (a._id === 'pediatric') ageDistribution.pediatric += a.count;
      else if (a._id === 'geriatric') ageDistribution.geriatric += a.count;
      else ageDistribution.adult += a.count;
    }

    // 2. OPD Appointments & Doctor Workload
    const appointmentsCol = this.connection.collection('appointments');
    const [statusAgg, doctorAgg] = await Promise.all([
      appointmentsCol
        .aggregate([
          {
            $match: {
              ...tenantFilter,
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .toArray(),
      appointmentsCol
        .aggregate([
          {
            $match: {
              ...tenantFilter,
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: '$doctorId',
              count: { $sum: 1 },
              completed: {
                $sum: {
                  $cond: [{ $in: ['$status', ['COMPLETED', 'CHECKED_IN', 'IN_CONSULTATION']] }, 1, 0],
                },
              },
            },
          },
        ])
        .toArray(),
    ]);

    let totalAppointments = 0;
    let attended = 0;
    let cancelled = 0;
    let noShow = 0;

    for (const s of statusAgg) {
      totalAppointments += s.count;
      if (['COMPLETED', 'CHECKED_IN', 'IN_CONSULTATION'].includes(s._id)) {
        attended += s.count;
      } else if (['CANCELLED'].includes(s._id)) {
        cancelled += s.count;
      } else if (['NO_SHOW'].includes(s._id)) {
        noShow += s.count;
      }
    }

    // Lookup doctor names
    const doctorWorkload: { doctorId: string; doctorName: string; department: string; count: number; completed: number }[] = [];
    if (doctorAgg.length > 0) {
      const docIds = doctorAgg.map((d) => (Types.ObjectId.isValid(d._id) ? new Types.ObjectId(d._id) : d._id));
      const users = await this.connection
        .collection('users')
        .find({ _id: { $in: docIds } })
        .toArray();
      const userMap = new Map<string, any>();
      users.forEach((u) => userMap.set(u._id.toString(), u));

      for (const d of doctorAgg) {
        const u = userMap.get(d._id?.toString());
        doctorWorkload.push({
          doctorId: d._id?.toString() || 'Unknown',
          doctorName: u ? `Dr. ${u.firstName} ${u.lastName}` : 'Attending Physician',
          department: u?.department || 'General Medicine',
          count: d.count,
          completed: d.completed,
        });
      }
    }

    // 3. IPD Bed Census & ALOS
    const admissionsCol = this.connection.collection('admissions');
    const bedsCol = this.connection.collection('beds');

    const [admissionsAgg, totalBeds, occupiedBeds, wardAgg, alosAgg] = await Promise.all([
      admissionsCol
        .aggregate([
          { $match: { ...tenantFilter } },
          {
            $group: {
              _id: null,
              admissionsInRange: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ['$admissionDate', start] },
                        { $lte: ['$admissionDate', end] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              dischargesInRange: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$dischargeDate', null] },
                        { $gte: ['$dischargeDate', start] },
                        { $lte: ['$dischargeDate', end] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              currentInpatients: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'ADMITTED'] }, 1, 0],
                },
              },
            },
          },
        ])
        .toArray(),
      bedsCol.countDocuments({ ...tenantFilter, isOperational: { $ne: false } }),
      bedsCol.countDocuments({ ...tenantFilter, status: 'OCCUPIED' }),
      bedsCol
        .aggregate([
          { $match: { ...tenantFilter, isOperational: { $ne: false } } },
          {
            $group: {
              _id: '$ward',
              totalBeds: { $sum: 1 },
              occupiedBeds: {
                $sum: { $cond: [{ $eq: ['$status', 'OCCUPIED'] }, 1, 0] },
              },
            },
          },
        ])
        .toArray(),
      admissionsCol
        .aggregate([
          {
            $match: {
              ...tenantFilter,
              dischargeDate: { $ne: null },
              status: 'DISCHARGED',
            },
          },
          {
            $project: {
              losDays: {
                $divide: [{ $subtract: ['$dischargeDate', '$admissionDate'] }, 1000 * 60 * 60 * 24],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgLos: { $avg: '$losDays' },
            },
          },
        ])
        .toArray(),
    ]);

    const admSummary = admissionsAgg[0] || { admissionsInRange: 0, dischargesInRange: 0, currentInpatients: 0 };
    const bedOccupancyRate = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0;
    const averageLengthOfStayDays = alosAgg[0]?.avgLos ? Number(alosAgg[0].avgLos.toFixed(1)) : 3.2;

    const wardBreakdown = wardAgg.map((w) => ({
      wardName: w._id || 'General Ward',
      totalBeds: w.totalBeds,
      occupiedBeds: w.occupiedBeds,
      occupancyRate: w.totalBeds > 0 ? Number(((w.occupiedBeds / w.totalBeds) * 100).toFixed(1)) : 0,
    }));

    // 4. Laboratory Workload
    const labCol = this.connection.collection('lab_orders');
    const [labSummaryAgg, labCategoryAgg] = await Promise.all([
      labCol
        .aggregate([
          {
            $match: {
              ...tenantFilter,
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              totalOrdered: { $sum: 1 },
              verified: {
                $sum: { $cond: [{ $in: ['$status', ['VERIFIED', 'COMPLETED']] }, 1, 0] },
              },
              pending: {
                $sum: { $cond: [{ $nin: ['$status', ['VERIFIED', 'COMPLETED', 'CANCELLED']] }, 1, 0] },
              },
              avgTatHours: {
                $avg: {
                  $cond: [
                    { $and: [{ $ne: ['$verifiedAt', null] }, { $ne: ['$createdAt', null] }] },
                    { $divide: [{ $subtract: ['$verifiedAt', '$createdAt'] }, 1000 * 60 * 60] },
                    null,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),
      labCol
        .aggregate([
          {
            $match: {
              ...tenantFilter,
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: '$items.category',
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const labSummary = labSummaryAgg[0] || { totalOrdered: 0, verified: 0, pending: 0, avgTatHours: 2.4 };
    const categoryBreakdown: Record<string, number> = {};
    for (const c of labCategoryAgg) {
      if (c._id) categoryBreakdown[c._id] = c.count;
    }

    // Record audit event
    await this.auditService.record({
      tenantId,
      userId: 'system',
      action: 'REPORT_GENERATE',
      resource: 'CensusReport',
      details: { startDate: startIso, endDate: endIso },
    });

    return {
      dateRange: { startDate: startIso, endDate: endIso },
      patientVolume: {
        totalRegistrations: totalReg,
        activePatients,
        genderDistribution,
        ageDistribution,
      },
      opdWorkload: {
        totalAppointments,
        attended,
        cancelled,
        noShow,
        doctorWorkload,
      },
      ipdCensus: {
        totalAdmissions: admSummary.admissionsInRange,
        totalDischarges: admSummary.dischargesInRange,
        currentInpatients: admSummary.currentInpatients,
        totalBeds,
        occupiedBeds,
        bedOccupancyRate,
        averageLengthOfStayDays,
        wardBreakdown,
      },
      labWorkload: {
        totalOrdered: labSummary.totalOrdered,
        verified: labSummary.verified,
        pending: labSummary.pending,
        averageTatHours: Number((labSummary.avgTatHours || 2.4).toFixed(1)),
        categoryBreakdown,
      },
    };
  }

  async getFinancialReport(
    tenantId: string,
    startDateStr?: string,
    endDateStr?: string,
    _departmentFilter?: string,
  ): Promise<FinancialReport> {
    const { start, end, startIso, endIso } = this.parseDateRange(startDateStr, endDateStr);
    const tenantFilter = this.getTenantFilter(tenantId);

    const invoicesCol = this.connection.collection('invoices');
    const paymentsCol = this.connection.collection('payments');
    const refundsCol = this.connection.collection('refunds');

    const [invoicesAgg, paymentsAgg, refundsAgg, ageingInvoices] = await Promise.all([
      // Invoices summary in date range
      invoicesCol
        .aggregate([
          {
            $match: {
              ...tenantFilter,
              status: { $ne: 'CANCELLED' },
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              totalInvoiced: { $sum: '$totalAmount' },
              totalDiscount: { $sum: '$discountAmount' },
              totalOutstanding: { $sum: '$balanceDue' },
            },
          },
        ])
        .toArray(),

      // Payments breakdown by method and cashier in date range
      paymentsCol
        .aggregate([
          {
            $match: {
              ...tenantFilter,
              status: 'SUCCESS',
              paidAt: { $gte: start, $lte: end },
            },
          },
          {
            $facet: {
              byMethod: [
                {
                  $group: {
                    _id: '$method',
                    total: { $sum: '$amount' },
                  },
                },
              ],
              byCashier: [
                {
                  $group: {
                    _id: '$receivedBy',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                  },
                },
              ],
              overall: [
                {
                  $group: {
                    _id: null,
                    totalCollected: { $sum: '$amount' },
                  },
                },
              ],
            },
          },
        ])
        .toArray(),

      // Refunds summary in date range
      refundsCol
        .aggregate([
          {
            $match: {
              ...tenantFilter,
              status: { $in: ['APPROVED', 'PROCESSED'] },
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              totalRefunded: { $sum: '$amount' },
            },
          },
        ])
        .toArray(),

      // All unpaid invoices for Ageing Matrix (regardless of date range to accurately reflect ledger liability)
      invoicesCol
        .find(
          {
            ...tenantFilter,
            status: { $in: ['ISSUED', 'PARTIALLY_PAID'] },
            balanceDue: { $gt: 0 },
          },
          { projection: { balanceDue: 1, dueDate: 1, createdAt: 1 } },
        )
        .toArray(),
    ]);

    const invSummary = invoicesAgg[0] || { totalInvoiced: 0, totalDiscount: 0, totalOutstanding: 0 };
    const pmtResult = paymentsAgg[0] || { byMethod: [], byCashier: [], overall: [] };
    const totalCollected = pmtResult.overall[0]?.totalCollected || 0;
    const totalRefunded = refundsAgg[0]?.totalRefunded || 0;

    // Payment methods map
    const paymentMethodBreakdown: Record<PaymentMethod, number> = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.CREDIT_CARD]: 0,
      [PaymentMethod.DEBIT_CARD]: 0,
      [PaymentMethod.UPI]: 0,
      [PaymentMethod.BANK_TRANSFER]: 0,
      [PaymentMethod.INSURANCE_CLAIM]: 0,
    };
    for (const m of pmtResult.byMethod) {
      const normalized = (m._id || '').toLowerCase() as PaymentMethod;
      if (normalized in paymentMethodBreakdown) {
        paymentMethodBreakdown[normalized] = m.total;
      }
    }

    // Cashier Collections resolution
    const cashierCollections: { cashierId: string; cashierName: string; totalCollected: number; transactionCount: number }[] = [];
    if (pmtResult.byCashier.length > 0) {
      const cashierIds = pmtResult.byCashier.map((c: any) =>
        Types.ObjectId.isValid(c._id) ? new Types.ObjectId(c._id) : c._id,
      );
      const users = await this.connection
        .collection('users')
        .find({ _id: { $in: cashierIds } })
        .toArray();
      const userMap = new Map<string, any>();
      users.forEach((u) => userMap.set(u._id.toString(), u));

      for (const c of pmtResult.byCashier) {
        const u = userMap.get(c._id?.toString());
        cashierCollections.push({
          cashierId: c._id?.toString() || 'Unknown',
          cashierName: u ? `${u.firstName} ${u.lastName}` : 'Duty Cashier',
          totalCollected: c.total,
          transactionCount: c.count,
        });
      }
    }

    // Departmental Revenue Attribution
    const deptRevenueAgg = await invoicesCol
      .aggregate([
        {
          $match: {
            ...tenantFilter,
            status: { $ne: 'CANCELLED' },
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $ifNull: ['$items.itemType', 'GENERAL'] },
            amount: { $sum: '$items.total' },
          },
        },
      ])
      .toArray();

    const sumDeptAmount = deptRevenueAgg.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const departmentalRevenue = deptRevenueAgg.map((d) => {
      const deptName =
        d._id === 'SERVICE'
          ? 'OPD Consultations'
          : d._id === 'LAB_TEST'
            ? 'Laboratory & Diagnostics'
            : d._id === 'MEDICINE'
              ? 'Pharmacy Formulary'
              : d._id === 'BED_CHARGE'
                ? 'Inpatient Accommodations'
                : d._id === 'PROCEDURE'
                  ? 'Clinical Procedures'
                  : 'General Healthcare';

      return {
        department: deptName,
        amount: d.amount,
        percentage: sumDeptAmount > 0 ? Number(((d.amount / sumDeptAmount) * 100).toFixed(1)) : 0,
      };
    });

    // Accounts Receivable Ageing Buckets calculation
    const now = new Date().getTime();
    const ageingBuckets = {
      current: 0, // 0-30 days
      thirtyToSixty: 0, // 31-60 days
      sixtyToNinety: 0, // 61-90 days
      overNinety: 0, // >90 days
    };

    for (const inv of ageingInvoices) {
      const baseDate = inv.dueDate ? new Date(inv.dueDate).getTime() : new Date(inv.createdAt).getTime();
      const ageDays = Math.max(0, Math.floor((now - baseDate) / (1000 * 60 * 60 * 24)));
      const balance = Number(inv.balanceDue) || 0;

      if (ageDays <= 30) {
        ageingBuckets.current += balance;
      } else if (ageDays <= 60) {
        ageingBuckets.thirtyToSixty += balance;
      } else if (ageDays <= 90) {
        ageingBuckets.sixtyToNinety += balance;
      } else {
        ageingBuckets.overNinety += balance;
      }
    }

    // Record audit event
    await this.auditService.record({
      tenantId,
      userId: 'system',
      action: 'REPORT_GENERATE',
      resource: 'FinancialReport',
      details: { startDate: startIso, endDate: endIso },
    });

    return {
      dateRange: { startDate: startIso, endDate: endIso },
      summary: {
        totalInvoiced: invSummary.totalInvoiced || 0,
        totalCollected,
        totalOutstanding: invSummary.totalOutstanding || 0,
        totalRefunded,
        totalDiscountGiven: invSummary.totalDiscount || 0,
      },
      paymentMethodBreakdown,
      cashierCollections,
      departmentalRevenue,
      ageingBuckets,
    };
  }

  async getInventoryPharmacyReport(
    tenantId: string,
    startDateStr?: string,
    endDateStr?: string,
  ): Promise<InventoryPharmacyReport> {
    const { start, end, startIso, endIso } = this.parseDateRange(startDateStr, endDateStr);
    const tenantFilter = this.getTenantFilter(tenantId);

    const dispensingCol = this.connection.collection('dispensing_records');
    const batchesCol = this.connection.collection('medicine_batches');
    const medicinesCol = this.connection.collection('medicines');
    const itemsCol = this.connection.collection('inventory_items');
    const poCol = this.connection.collection('purchase_orders');
    const movementsCol = this.connection.collection('stock_movements');

    const now = new Date();
    const ninetyDaysFuture = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [
      dispenseCount,
      nearExpiryBatchesRaw,
      medicinesRaw,
      inventoryValuationRaw,
      openPoCount,
      movementsAgg,
    ] = await Promise.all([
      dispensingCol.countDocuments({
        ...tenantFilter,
        dispensedAt: { $gte: start, $lte: end },
      }),
      batchesCol
        .find({
          ...tenantFilter,
          currentStock: { $gt: 0 },
          expiryDate: { $lte: ninetyDaysFuture },
        })
        .sort({ expiryDate: 1 })
        .limit(20)
        .toArray(),
      medicinesCol.find({ ...tenantFilter }).toArray(),
      itemsCol
        .aggregate([
          { $match: { ...tenantFilter } },
          {
            $group: {
              _id: null,
              totalValuation: { $sum: { $multiply: ['$stockOnHand', '$unitCost'] } },
              lowStockCount: {
                $sum: { $cond: [{ $lte: ['$stockOnHand', '$minStockLevel'] }, 1, 0] },
              },
            },
          },
        ])
        .toArray(),
      poCol.countDocuments({
        ...tenantFilter,
        status: { $in: ['submitted', 'approved', 'partially_received'] },
      }),
      movementsCol
        .aggregate([
          {
            $match: {
              ...tenantFilter,
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    // Format near-expiry batches
    const nearExpiryBatches = nearExpiryBatchesRaw.map((b) => {
      const exp = new Date(b.expiryDate);
      const days = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        batchNumber: b.batchNumber,
        medicineName: b.medicineName || 'Essential Medicine',
        expiryDate: exp.toISOString().slice(0, 10),
        stock: b.currentStock,
        daysUntilExpiry: Math.max(0, days),
      };
    });

    // Medicines with low stock
    const stockoutRiskMedicines = medicinesRaw
      .filter((m) => (m.stockOnHand || 0) <= (m.minStockAlert || 10))
      .map((m) => ({
        medicineId: m._id.toString(),
        name: `${m.brandName} (${m.genericName})`,
        stockOnHand: m.stockOnHand || 0,
        minStock: m.minStockAlert || 10,
      }));

    const invSummary = inventoryValuationRaw[0] || { totalValuation: 0, lowStockCount: 0 };
    const movementCountByType: Record<string, number> = {};
    for (const m of movementsAgg) {
      if (m._id) movementCountByType[m._id] = m.count;
    }

    // Record audit event
    await this.auditService.record({
      tenantId,
      userId: 'system',
      action: 'REPORT_GENERATE',
      resource: 'InventoryPharmacyReport',
      details: { startDate: startIso, endDate: endIso },
    });

    return {
      dateRange: { startDate: startIso, endDate: endIso },
      pharmacy: {
        dispenseCount,
        nearExpiryBatchesCount: nearExpiryBatches.length,
        nearExpiryBatches,
        stockoutRiskMedicines,
      },
      inventory: {
        totalValuation: Number((invSummary.totalValuation || 0).toFixed(2)),
        lowStockItemCount: invSummary.lowStockCount || 0,
        openPurchaseOrdersCount: openPoCount,
        movementCountByType,
      },
    };
  }

  async exportReportCsv(
    tenantId: string,
    reportType: 'census' | 'financial' | 'inventory',
    startDateStr?: string,
    endDateStr?: string,
  ): Promise<string> {
    let csv = '';

    if (reportType === 'financial') {
      const data = await this.getFinancialReport(tenantId, startDateStr, endDateStr);
      const lines = [
        `Hospital Financial Revenue Report,${data.dateRange.startDate} to ${data.dateRange.endDate}`,
        '',
        'SUMMARY METRICS',
        'Metric,Amount',
        `Total Invoiced,${data.summary.totalInvoiced}`,
        `Total Collected,${data.summary.totalCollected}`,
        `Total Outstanding,${data.summary.totalOutstanding}`,
        `Total Discount Given,${data.summary.totalDiscountGiven}`,
        `Total Refunded,${data.summary.totalRefunded}`,
        '',
        'PAYMENT METHODS BREAKDOWN',
        'Payment Method,Total Amount',
        ...Object.entries(data.paymentMethodBreakdown).map(([k, v]) => `${k},${v}`),
        '',
        'ACCOUNTS RECEIVABLE AGEING MATRIX',
        'Age Bracket,Overdue Balance',
        `0-30 Days (Current),${data.ageingBuckets.current}`,
        `31-60 Days,${data.ageingBuckets.thirtyToSixty}`,
        `61-90 Days,${data.ageingBuckets.sixtyToNinety}`,
        `>90 Days Overdue,${data.ageingBuckets.overNinety}`,
        '',
        'CASHIER SHIFT COLLECTIONS',
        'Cashier Name,Receipt Count,Total Collected',
        ...data.cashierCollections.map((c) => `"${c.cashierName}",${c.transactionCount},${c.totalCollected}`),
      ];
      csv = lines.join('\r\n');
    } else if (reportType === 'inventory') {
      const data = await this.getInventoryPharmacyReport(tenantId, startDateStr, endDateStr);
      const lines = [
        `Hospital Inventory & Pharmacy Risk Report,${data.dateRange.startDate} to ${data.dateRange.endDate}`,
        '',
        'SUPPLY CHAIN SUMMARY',
        'Metric,Value',
        `Total Inventory Valuation,${data.inventory.totalValuation}`,
        `Low Stock Items Count,${data.inventory.lowStockItemCount}`,
        `Open Purchase Orders,${data.inventory.openPurchaseOrdersCount}`,
        `Prescriptions Dispensed,${data.pharmacy.dispenseCount}`,
        `Near Expiry Batches (<=90 Days),${data.pharmacy.nearExpiryBatchesCount}`,
        '',
        'NEAR EXPIRY BATCHES',
        'Batch Number,Medicine,Expiry Date,Remaining Stock,Days Until Expiry',
        ...data.pharmacy.nearExpiryBatches.map(
          (b) => `"${b.batchNumber}","${b.medicineName}",${b.expiryDate},${b.stock},${b.daysUntilExpiry}`,
        ),
        '',
        'STOCKOUT RISK MEDICINES',
        'Medicine,Current Stock,Min Safety Alert',
        ...data.pharmacy.stockoutRiskMedicines.map((m) => `"${m.name}",${m.stockOnHand},${m.minStock}`),
      ];
      csv = lines.join('\r\n');
    } else {
      const data = await this.getCensusReport(tenantId, startDateStr, endDateStr);
      const lines = [
        `Hospital Operational & Clinical Census Report,${data.dateRange.startDate} to ${data.dateRange.endDate}`,
        '',
        'PATIENT VOLUME & DEMOGRAPHICS',
        'Metric,Value',
        `New Registrations,${data.patientVolume.totalRegistrations}`,
        `Active Patient Registry,${data.patientVolume.activePatients}`,
        `Gender Male,${data.patientVolume.genderDistribution.male}`,
        `Gender Female,${data.patientVolume.genderDistribution.female}`,
        `Gender Other,${data.patientVolume.genderDistribution.other}`,
        '',
        'OUTPATIENT (OPD) METRICS',
        `Total Appointments Scheduled,${data.opdWorkload.totalAppointments}`,
        `Attended Consultations,${data.opdWorkload.attended}`,
        `Cancelled Appointments,${data.opdWorkload.cancelled}`,
        `No-Show Appointments,${data.opdWorkload.noShow}`,
        '',
        'INPATIENT (IPD) CENSUS',
        `Total Admissions,${data.ipdCensus.totalAdmissions}`,
        `Total Discharges,${data.ipdCensus.totalDischarges}`,
        `Current Inpatients,${data.ipdCensus.currentInpatients}`,
        `Bed Occupancy Rate,${data.ipdCensus.bedOccupancyRate}%`,
        `Average Length of Stay (ALOS),${data.ipdCensus.averageLengthOfStayDays} days`,
        '',
        'WARD OCCUPANCY BREAKDOWN',
        'Ward Name,Total Beds,Occupied Beds,Occupancy %',
        ...data.ipdCensus.wardBreakdown.map((w) => `"${w.wardName}",${w.totalBeds},${w.occupiedBeds},${w.occupancyRate}%`),
      ];
      csv = lines.join('\r\n');
    }

    return csv;
  }
}
