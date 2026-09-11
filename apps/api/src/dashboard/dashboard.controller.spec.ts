import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardController } from './dashboard.controller.js';
import type { DashboardSummary } from './interfaces/dashboard.interface.js';

describe('DashboardController', () => {
  let controller: DashboardController;
  let mockDashboardService: any;

  const mockSummary: DashboardSummary = {
    system: {
      status: 'operational',
      database: 'connected',
      version: '1.0.0',
      uptimeSeconds: 120,
      timestamp: '2026-09-11T12:00:00.000Z',
    },
    authAndUsers: {
      totalUsers: 3,
      activeUsers: 3,
      lockedUsers: 0,
      roleBreakdown: { SUPER_ADMIN: 1, DOCTOR: 2 },
    },
    recentAuditActivity: [],
    moduleReadiness: [],
    clinicalOverview: {
      todayAppointments: { count: 0, note: 'Empty' },
      activeAdmissions: { count: 0, note: 'Empty' },
      pendingLabOrders: { count: 0, note: 'Empty' },
      lowStockAlerts: { count: 0, note: 'Empty' },
      pendingInvoices: { count: 0, note: 'Empty' },
    },
  };

  beforeEach(() => {
    mockDashboardService = {
      getDashboardSummary: vi.fn().mockResolvedValue(mockSummary),
    };
    controller = new DashboardController(mockDashboardService);
  });

  it('should return wrapped ApiResponse with dashboard summary', async () => {
    const response = await controller.getDashboardSummary();

    expect(response.success).toBe(true);
    expect(response.data).toEqual(mockSummary);
    expect(mockDashboardService.getDashboardSummary).toHaveBeenCalledTimes(1);
  });
});
