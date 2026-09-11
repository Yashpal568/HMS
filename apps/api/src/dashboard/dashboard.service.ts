import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, getConnectionToken } from '@nestjs/mongoose';
import { Inject } from '@nestjs/common';
import type { Model, Connection } from 'mongoose';
import { User, UserStatus, type UserDocument } from '../users/schemas/user.schema.js';
import { AuditLog, type AuditLogDocument } from '../audit/schemas/audit-log.schema.js';
import type {
  DashboardSummary,
  ModuleReadinessItem,
  DashboardAuditItem,
} from './interfaces/dashboard.interface.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @Inject(getConnectionToken())
    private readonly connection: Connection,
  ) {}

  async getDashboardSummary(): Promise<DashboardSummary> {
    // 1. Live system & database status
    const isDbConnected = this.connection.readyState === 1;
    const uptimeSeconds = Math.floor(process.uptime());

    // 2. Real user and account metrics from MongoDB Atlas
    const [totalUsers, activeUsers, lockedUsers, usersByRole] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ status: UserStatus.ACTIVE }).exec(),
      this.userModel.countDocuments({ lockUntil: { $gt: new Date() } }).exec(),
      this.userModel
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    const roleBreakdown: Record<string, number> = {};
    for (const item of usersByRole) {
      if (item._id) {
        roleBreakdown[item._id] = item.count;
      }
    }

    // 3. Real recent security & audit activity from MongoDB Atlas
    const rawAuditLogs = await this.auditLogModel
      .find()
      .sort({ timestamp: -1 })
      .limit(8)
      .lean()
      .exec();

    const recentAuditActivity: DashboardAuditItem[] = rawAuditLogs.map((log) => ({
      id: String(log._id),
      action: log.action,
      resource: log.resource,
      status: log.status,
      timestamp: log.timestamp ? log.timestamp.toISOString() : new Date().toISOString(),
      ipAddress: log.ipAddress,
      userEmail: log.userId,
    }));

    // 4. Authoritative module readiness matrix (PRD Phase 1 alignment)
    const moduleReadiness: ModuleReadinessItem[] = [
      {
        key: 'auth_rbac',
        name: 'Authentication & RBAC',
        category: 'Security',
        status: 'active',
        route: '/login',
        description: 'Multi-role JWT, password hashing, session cookies, and permission guards',
        targetMilestone: 'Milestone 1 (Complete)',
      },
      {
        key: 'app_shell',
        name: 'Application Shell & Dashboard',
        category: 'Overview',
        status: 'active',
        route: '/dashboard',
        description: 'Enterprise sidebar, authenticated header, role-aware navigation, and live metrics',
        targetMilestone: 'Milestone 2 (Current)',
      },
      {
        key: 'patients',
        name: 'Patient Management',
        category: 'Clinical',
        status: 'scheduled',
        route: '/patients',
        description: 'UHID generation, patient registration, demographic directory, and medical profiles',
        targetMilestone: 'Milestone 3 (Next)',
      },
      {
        key: 'appointments',
        name: 'Appointments & OPD Queue',
        category: 'Clinical',
        status: 'scheduled',
        route: '/appointments',
        description: 'Doctor scheduling, token queue management, check-in, and slot allocation',
        targetMilestone: 'Milestone 4',
      },
      {
        key: 'emr',
        name: 'Doctor Consultation & EMR',
        category: 'Clinical',
        status: 'scheduled',
        route: '/emr',
        description: 'Clinical notes, vitals recording, diagnosis coding, and e-prescriptions',
        targetMilestone: 'Milestone 5',
      },
      {
        key: 'ipd',
        name: 'IPD & Bed Management',
        category: 'Clinical',
        status: 'scheduled',
        route: '/ipd',
        description: 'Admissions, ward/room allocation, bed transfers, and nursing charts',
        targetMilestone: 'Milestone 6',
      },
      {
        key: 'laboratory',
        name: 'Laboratory Information',
        category: 'Operations',
        status: 'scheduled',
        route: '/laboratory',
        description: 'Investigation orders, specimen tracking, result entry, and verifications',
        targetMilestone: 'Milestone 7',
      },
      {
        key: 'pharmacy',
        name: 'Pharmacy & Dispensing',
        category: 'Operations',
        status: 'scheduled',
        route: '/pharmacy',
        description: 'Prescription queue, batch verification, dispensing, and inventory deductions',
        targetMilestone: 'Milestone 8',
      },
      {
        key: 'inventory',
        name: 'Inventory & Procurement',
        category: 'Operations',
        status: 'scheduled',
        route: '/inventory',
        description: 'Stock tracking, purchase orders, vendor master, and stock reconciliation',
        targetMilestone: 'Milestone 9',
      },
      {
        key: 'billing',
        name: 'Billing & Invoicing',
        category: 'Finance',
        status: 'scheduled',
        route: '/billing',
        description: 'Tariffs, OPD/IPD invoices, payments processing, and financial receipts',
        targetMilestone: 'Milestone 10',
      },
      {
        key: 'reports',
        name: 'Reports & Analytics',
        category: 'Administration',
        status: 'scheduled',
        route: '/reports',
        description: 'Operational census, financial summaries, clinician workloads, and compliance',
        targetMilestone: 'Milestone 11',
      },
      {
        key: 'audit_security',
        name: 'Audit & Security Center',
        category: 'Security',
        status: 'active',
        route: '/audit',
        description: 'Security-sensitive event ledger, login tracking, and tamper-proof trail',
        targetMilestone: 'Milestone 1 (Complete)',
      },
    ];

    // 5. Clinical and operational overview (Strict adherence: Zero fake numbers)
    const clinicalOverview = {
      todayAppointments: {
        count: 0,
        note: 'No appointments scheduled for today (Appointments module scheduled in Milestone 4).',
      },
      activeAdmissions: {
        count: 0,
        note: 'No active inpatient admissions (IPD module scheduled in Milestone 6).',
      },
      pendingLabOrders: {
        count: 0,
        note: 'No pending laboratory orders (Laboratory module scheduled in Milestone 7).',
      },
      lowStockAlerts: {
        count: 0,
        note: 'No inventory alerts recorded (Inventory module scheduled in Milestone 9).',
      },
      pendingInvoices: {
        count: 0,
        note: 'No pending invoices (Billing module scheduled in Milestone 10).',
      },
    };

    return {
      system: {
        status: isDbConnected ? 'operational' : 'degraded',
        database: isDbConnected ? 'connected' : 'disconnected',
        version: '1.0.0',
        uptimeSeconds,
        timestamp: new Date().toISOString(),
      },
      authAndUsers: {
        totalUsers,
        activeUsers,
        lockedUsers,
        roleBreakdown,
      },
      recentAuditActivity,
      moduleReadiness,
      clinicalOverview,
    };
  }
}
