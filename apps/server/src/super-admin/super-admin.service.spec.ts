import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SuperAdminService } from './super-admin.service.js';
import { Types } from 'mongoose';
import { TenantStatus, SubscriptionTier } from '@hms/types';

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let tenantModel: any;
  let planModel: any;
  let subscriptionModel: any;
  let broadcastModel: any;
  let userModel: any;
  let patientModel: any;
  let auditLogModel: any;
  let connection: any;
  let auditService: any;

  beforeEach(() => {
    tenantModel = {
      findById: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      updateOne: vi.fn(),
      countDocuments: vi.fn(),
      create: vi.fn(),
    };

    planModel = {
      findById: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      updateOne: vi.fn(),
      create: vi.fn(),
      findByIdAndUpdate: vi.fn(),
    };

    subscriptionModel = {
      findById: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
      findByIdAndUpdate: vi.fn(),
    };

    broadcastModel = {
      find: vi.fn(),
      create: vi.fn(),
      findByIdAndUpdate: vi.fn(),
    };

    userModel = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
      countDocuments: vi.fn(),
      updateMany: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }),
    };

    patientModel = {
      countDocuments: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(10) }),
    };

    auditLogModel = {
      find: vi.fn(),
    };

    connection = {
      db: {
        admin: () => ({
          ping: vi.fn().mockResolvedValue({ ok: 1 }),
        }),
      },
      collection: vi.fn().mockReturnValue({
        countDocuments: vi.fn().mockResolvedValue(5),
      }),
      base: { connections: [1] },
    };

    auditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    service = new SuperAdminService(
      tenantModel,
      planModel,
      subscriptionModel,
      broadcastModel,
      userModel,
      patientModel,
      auditLogModel,
      connection,
      auditService,
    );
  });

  describe('seedDefaultPlans', () => {
    it('should upsert default starter, growth, and enterprise plans', async () => {
      planModel.updateOne.mockResolvedValue({ acknowledged: true });

      await service.seedDefaultPlans();

      expect(planModel.updateOne).toHaveBeenCalledTimes(3);
      expect(planModel.updateOne).toHaveBeenCalledWith(
        { code: 'PLAN_STARTER' },
        expect.any(Object),
        { upsert: true },
      );
      expect(planModel.updateOne).toHaveBeenCalledWith(
        { code: 'PLAN_GROWTH' },
        expect.any(Object),
        { upsert: true },
      );
      expect(planModel.updateOne).toHaveBeenCalledWith(
        { code: 'PLAN_ENTERPRISE' },
        expect.any(Object),
        { upsert: true },
      );
    });
  });

  describe('getPlatformTelemetry', () => {
    it('should aggregate database latency, tenant counts, user totals, and memory footprint', async () => {
      tenantModel.countDocuments
        .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(4) })
        .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(3) });

      userModel.countDocuments
        .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(45) })
        .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(12) });

      const telemetry = await service.getPlatformTelemetry();

      expect(telemetry).toBeDefined();
      expect(telemetry.totalTenants).toBe(4);
      expect(telemetry.activeTenants).toBe(3);
      expect(telemetry.totalUsers).toBe(45);
      expect(telemetry.totalDoctors).toBe(12);
      expect(telemetry.databasePingMs).toBeGreaterThanOrEqual(0);
      expect(telemetry.memoryRssMb).toBeGreaterThan(0);
      expect(telemetry.systemTimestamp).toBeDefined();
    });
  });

  describe('provisionTenant', () => {
    it('should create tenant, initial hospital admin, subscription, and record audit log', async () => {
      tenantModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      userModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });

      const mockPlanId = new Types.ObjectId();
      planModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: mockPlanId,
          code: 'PLAN_GROWTH',
          tier: SubscriptionTier.GROWTH_HOSPITAL,
          priceMonthly: 19999,
          currency: 'INR',
          limits: { maxDoctors: 35, maxBeds: 120, maxStorageGb: 250 },
        }),
      });

      const mockTenantId = new Types.ObjectId();
      const mockSavedTenant = {
        _id: mockTenantId,
        name: 'Fortis Healthcare',
        subdomain: 'fortis-healthcare',
        tier: SubscriptionTier.GROWTH_HOSPITAL,
        save: vi.fn().mockResolvedValue(undefined),
        toObject: () => ({ _id: mockTenantId, name: 'Fortis Healthcare' }),
      };

      tenantModel.create.mockResolvedValue(mockSavedTenant);

      userModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        email: 'admin@fortis.com',
        role: 'HOSPITAL_ADMIN',
      });

      subscriptionModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        tenantId: mockTenantId,
        tier: SubscriptionTier.GROWTH_HOSPITAL,
      });

      const result = await service.provisionTenant(
        {
          name: 'Fortis Healthcare',
          subdomain: 'fortis-healthcare',
          tier: SubscriptionTier.GROWTH_HOSPITAL,
          adminEmail: 'admin@fortis.com',
          adminFirstName: 'Rajesh',
          adminLastName: 'Kumar',
          phone: '+91 98765 00000',
        },
        'platform@hmsmedcore.com',
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(result.adminCredentials.email).toBe('admin@fortis.com');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TENANT_PROVISION',
          resource: 'platform.tenants',
        }),
      );
    });

    it('should reject provisioning if subdomain already exists', async () => {
      tenantModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: new Types.ObjectId(), subdomain: 'fortis' }),
      });

      await expect(
        service.provisionTenant(
          {
            name: 'Fortis Duplicate',
            subdomain: 'fortis',
            tier: SubscriptionTier.STARTER_CLINIC,
            adminEmail: 'admin@fortis-dup.com',
            adminFirstName: 'A',
            adminLastName: 'B',
          },
          'platform@hmsmedcore.com',
        ),
      ).rejects.toThrow('Subdomain \'fortis\' is already in use');
    });
  });

  describe('updateTenantStatus (Suspension & Activation)', () => {
    it('should suspend tenant, record reason, cascade status to staff users, and log audit event', async () => {
      const tenantId = new Types.ObjectId().toString();
      const mockTenant = {
        _id: new Types.ObjectId(tenantId),
        name: 'Apollo Branch',
        status: TenantStatus.ACTIVE,
        save: vi.fn().mockResolvedValue(undefined),
      };

      tenantModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockTenant),
      });

      await service.updateTenantStatus(
        tenantId,
        {
          status: TenantStatus.SUSPENDED,
          reason: 'Non-payment after 30 days grace period',
        },
        'platform@hmsmedcore.com',
        '10.0.0.1',
      );

      expect(mockTenant.status).toBe(TenantStatus.SUSPENDED);
      expect((mockTenant as any).suspensionReason).toBe('Non-payment after 30 days grace period');
      expect(mockTenant.save).toHaveBeenCalled();
      expect(userModel.updateMany).toHaveBeenCalledWith(
        { hospitalId: mockTenant._id },
        { status: 'SUSPENDED' },
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TENANT_SUSPEND',
          resource: 'platform.tenants',
        }),
      );
    });
  });

  describe('overrideQuotas', () => {
    it('should adjust tenant doctor and bed limits and update subscription limitsOverride', async () => {
      const tenantId = new Types.ObjectId().toString();
      const subId = new Types.ObjectId();
      const mockTenant = {
        _id: new Types.ObjectId(tenantId),
        subscriptionId: subId,
        quotas: { maxDoctors: 10, maxBeds: 25, maxStorageGb: 50 },
        save: vi.fn().mockResolvedValue(undefined),
      };

      tenantModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockTenant),
      });
      subscriptionModel.findByIdAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({}),
      });

      await service.overrideQuotas(
        tenantId,
        { maxDoctors: 20, maxBeds: 40, reason: 'Epidemic emergency response' },
        'platform@hmsmedcore.com',
        '10.0.0.1',
      );

      expect(mockTenant.quotas.maxDoctors).toBe(20);
      expect(mockTenant.quotas.maxBeds).toBe(40);
      expect(mockTenant.save).toHaveBeenCalled();
      expect(subscriptionModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'QUOTA_OVERRIDE',
          resource: 'platform.tenants',
        }),
      );
    });
  });
});
