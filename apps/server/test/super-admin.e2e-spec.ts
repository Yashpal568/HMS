import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter.js';
import { SubscriptionTier, TenantStatus } from '@hms/types';

describe('SuperAdmin Control Plane & Zero-PHI E2E Tests', () => {
  let app: INestApplication;
  let superAdminToken: string;
  let hospitalAdminToken: string;
  let createdTenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    // 1. Authenticate Platform Super Admin
    const superAdminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'platform@hmsmedcore.com',
        password: process.env.PLATFORM_SUPER_ADMIN_PASSWORD || 'Platform@Admin2026',
      });

    superAdminToken = superAdminRes.body.accessToken;

    // 2. Authenticate Hospital Admin
    const hospitalAdminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@hms.local',
        password: 'Admin@HMS2026',
      });

    hospitalAdminToken = hospitalAdminRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Control Plane RBAC & Identity Isolation', () => {
    it('should reject unauthenticated access to /super-admin/tenants with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/super-admin/tenants')
        .expect(401);
    });

    it('should reject Hospital Admin access to /super-admin/tenants with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/super-admin/tenants')
        .set('Authorization', `Bearer ${hospitalAdminToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow Super Admin access to /super-admin/tenants', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/super-admin/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Tenant Provisioning & Lifecycle Governance', () => {
    it('should provision a new hospital tenant with admin credentials and subscription', async () => {
      const uniqueSubdomain = `test-city-${Date.now().toString().slice(-6)}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/super-admin/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'City Medical Center',
          subdomain: uniqueSubdomain,
          tier: SubscriptionTier.GROWTH_HOSPITAL,
          adminEmail: `admin@${uniqueSubdomain}.com`,
          adminFirstName: 'Vikram',
          adminLastName: 'Mehta',
          phone: '+91 99887 76655',
          city: 'Mumbai',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.tenant).toBeDefined();
      expect(res.body.data.tenant.subdomain).toBe(uniqueSubdomain);
      expect(res.body.data.adminCredentials).toBeDefined();
      expect(res.body.data.adminCredentials.email).toBe(`admin@${uniqueSubdomain}.com`);

      createdTenantId = res.body.data.tenant._id;
    });

    it('should fetch single tenant operational 360 profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/super-admin/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(createdTenantId);
      expect(res.body.data.usage).toBeDefined();
    });

    it('should suspend tenant and verify status transition', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/super-admin/tenants/${createdTenantId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: TenantStatus.SUSPENDED,
          reason: 'Non-payment audit compliance failure',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TenantStatus.SUSPENDED);
    });

    it('should reactivate tenant to active status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/super-admin/tenants/${createdTenantId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: TenantStatus.ACTIVE,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TenantStatus.ACTIVE);
    });

    it('should apply quota overrides with custom limits', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/super-admin/tenants/${createdTenantId}/quotas`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          maxDoctors: 50,
          maxBeds: 150,
          reason: 'Emergency pandemic burst allocation',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.quotas.maxDoctors).toBe(50);
      expect(res.body.data.quotas.maxBeds).toBe(150);
    });
  });

  describe('Plans, Telemetry & Broadcasts', () => {
    it('should list global subscription plans', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/super-admin/plans')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should retrieve platform telemetry metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/super-admin/telemetry')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalTenants).toBeGreaterThanOrEqual(1);
      expect(res.body.data.databasePingMs).toBeDefined();
      expect(res.body.data.uptimeSeconds).toBeGreaterThan(0);
    });

    it('should create and retrieve platform maintenance broadcast', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/super-admin/broadcasts')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Scheduled Cloud Maintenance',
          message: 'System will undergo a 10-minute database index optimization at midnight UTC.',
          severity: 'WARNING',
          targetAudience: 'ALL',
        })
        .expect(201);

      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.title).toBe('Scheduled Cloud Maintenance');

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/super-admin/broadcasts')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.some((b: any) => b.title === 'Scheduled Cloud Maintenance')).toBe(true);
    });
  });

  describe('STRICT ZERO-PHI ACCESS INVARIANT', () => {
    it('SUPER_ADMIN token attempting to query patient medical records MUST be rejected with 403 TENANT_PHI_ACCESS_PROHIBITED', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('TENANT_PHI_ACCESS_PROHIBITED');
      expect(res.body.message).toContain('Platform Super Admin is prohibited from accessing tenant clinical data plane');
    });

    it('SUPER_ADMIN token attempting to access EMR clinical encounters MUST be rejected with 403 TENANT_PHI_ACCESS_PROHIBITED', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/emr/encounters/non-existent-id')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('TENANT_PHI_ACCESS_PROHIBITED');
    });
  });
});
