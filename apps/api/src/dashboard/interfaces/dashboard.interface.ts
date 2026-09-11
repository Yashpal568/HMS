export interface DashboardAuditItem {
  id: string;
  action: string;
  resource: string;
  status: string;
  timestamp: string;
  ipAddress?: string;
  userEmail?: string;
}

export interface ModuleReadinessItem {
  key: string;
  name: string;
  category: 'Overview' | 'Clinical' | 'Operations' | 'Finance' | 'Administration' | 'Security';
  status: 'active' | 'scheduled' | 'in_development';
  route: string;
  description: string;
  targetMilestone: string;
}

export interface DashboardSummary {
  system: {
    status: 'operational' | 'degraded' | 'maintenance';
    database: string;
    version: string;
    uptimeSeconds: number;
    timestamp: string;
  };
  authAndUsers: {
    totalUsers: number;
    activeUsers: number;
    lockedUsers: number;
    roleBreakdown: Record<string, number>;
  };
  recentAuditActivity: DashboardAuditItem[];
  moduleReadiness: ModuleReadinessItem[];
  clinicalOverview: {
    todayAppointments: { count: number; note: string };
    activeAdmissions: { count: number; note: string };
    pendingLabOrders: { count: number; note: string };
    lowStockAlerts: { count: number; note: string };
    pendingInvoices: { count: number; note: string };
  };
}
