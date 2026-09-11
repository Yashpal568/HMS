import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let mockUserModel: any;
  let mockAuditLogModel: any;
  let mockConnection: any;

  beforeEach(() => {
    mockUserModel = {
      countDocuments: vi.fn().mockImplementation((filter?: any) => {
        if (filter?.status === 'ACTIVE') {
          return { exec: vi.fn().mockResolvedValue(4) };
        }
        if (filter?.lockUntil) {
          return { exec: vi.fn().mockResolvedValue(0) };
        }
        return { exec: vi.fn().mockResolvedValue(5) };
      }),
      aggregate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          { _id: 'SUPER_ADMIN', count: 1 },
          { _id: 'DOCTOR', count: 2 },
          { _id: 'NURSE', count: 2 },
        ]),
      }),
    };

    mockAuditLogModel = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue([
                {
                  _id: 'log1',
                  action: 'LOGIN_SUCCESS',
                  resource: 'auth',
                  status: 'SUCCESS',
                  timestamp: new Date('2026-09-11T12:00:00.000Z'),
                  ipAddress: '127.0.0.1',
                  userId: 'admin@hms.local',
                },
              ]),
            }),
          }),
        }),
      }),
    };

    mockConnection = {
      readyState: 1,
    };

    dashboardService = new DashboardService(
      mockUserModel,
      mockAuditLogModel,
      mockConnection,
    );
  });

  it('should return operational system status when database is connected', async () => {
    const summary = await dashboardService.getDashboardSummary();

    expect(summary.system.status).toBe('operational');
    expect(summary.system.database).toBe('connected');
    expect(summary.system.version).toBe('1.0.0');
    expect(summary.system.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('should aggregate user counts and role breakdown from UserModel', async () => {
    const summary = await dashboardService.getDashboardSummary();

    expect(summary.authAndUsers.totalUsers).toBe(5);
    expect(summary.authAndUsers.activeUsers).toBe(4);
    expect(summary.authAndUsers.lockedUsers).toBe(0);
    expect(summary.authAndUsers.roleBreakdown).toEqual({
      SUPER_ADMIN: 1,
      DOCTOR: 2,
      NURSE: 2,
    });
  });

  it('should retrieve and map real recent audit logs', async () => {
    const summary = await dashboardService.getDashboardSummary();

    expect(summary.recentAuditActivity).toHaveLength(1);
    expect(summary.recentAuditActivity[0]).toEqual({
      id: 'log1',
      action: 'LOGIN_SUCCESS',
      resource: 'auth',
      status: 'SUCCESS',
      timestamp: '2026-09-11T12:00:00.000Z',
      ipAddress: '127.0.0.1',
      userEmail: 'admin@hms.local',
    });
  });

  it('should accurately provide real empty states for unbuilt clinical modules with zero fake numbers', async () => {
    const summary = await dashboardService.getDashboardSummary();

    expect(summary.clinicalOverview.todayAppointments.count).toBe(0);
    expect(summary.clinicalOverview.activeAdmissions.count).toBe(0);
    expect(summary.clinicalOverview.pendingLabOrders.count).toBe(0);
    expect(summary.clinicalOverview.lowStockAlerts.count).toBe(0);
    expect(summary.clinicalOverview.pendingInvoices.count).toBe(0);
  });

  it('should list all module readiness statuses aligned with master PRD roadmap', async () => {
    const summary = await dashboardService.getDashboardSummary();

    expect(summary.moduleReadiness.length).toBeGreaterThanOrEqual(10);
    const authModule = summary.moduleReadiness.find((m) => m.key === 'auth_rbac');
    expect(authModule?.status).toBe('active');
    const patientModule = summary.moduleReadiness.find((m) => m.key === 'patients');
    expect(patientModule?.status).toBe('scheduled');
  });
});
