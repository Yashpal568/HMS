import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, type Connection, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Tenant, TenantDocument } from './schemas/tenant.schema.js';
import { Plan, PlanDocument } from './schemas/plan.schema.js';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema.js';
import { PlatformBroadcast, PlatformBroadcastDocument } from './schemas/platform-broadcast.schema.js';
import { User, UserDocument, UserStatus } from '../users/schemas/user.schema.js';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema.js';
import { AuditLog, AuditLogDocument } from '../audit/schemas/audit-log.schema.js';
import { AuditService } from '../audit/audit.service.js';
import {
  TenantStatus,
  SubscriptionTier,
  SubscriptionStatus,
  CreateTenantDto,
  UpdateTenantStatusDto,
  QuotaOverrideDto,
  CreatePlanDto,
  CreateBroadcastDto,
  PlatformTelemetry,
} from '@hms/types';

@Injectable()
export class SuperAdminService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(Plan.name)
    private readonly planModel: Model<PlanDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(PlatformBroadcast.name)
    private readonly broadcastModel: Model<PlatformBroadcastDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedDefaultPlans();
      await this.seedDefaultTenant();
    } catch (err) {
      this.logger.warn(`SuperAdmin initialization warning: ${(err as Error).message}`);
    }
  }

  // ==========================================================================
  // SEEDING
  // ==========================================================================

  async seedDefaultPlans(): Promise<void> {
    const plansToSeed = [
      {
        code: 'PLAN_STARTER',
        name: 'Starter Clinic',
        tier: SubscriptionTier.STARTER_CLINIC,
        description: 'Single-facility outpatient clinics and diagnostic centers.',
        priceMonthly: 4999,
        priceAnnual: 49990,
        currency: 'INR',
        limits: {
          maxDoctors: 10,
          maxBeds: 25,
          maxStorageGb: 50,
        },
        includedModules: ['OPD', 'EMR', 'BILLING', 'REPORTS'],
        isActive: true,
      },
      {
        code: 'PLAN_GROWTH',
        name: 'Growth Hospital',
        tier: SubscriptionTier.GROWTH_HOSPITAL,
        description: 'Multi-specialty hospitals with complete IPD, LIS, and Pharmacy.',
        priceMonthly: 19999,
        priceAnnual: 199990,
        currency: 'INR',
        limits: {
          maxDoctors: 35,
          maxBeds: 120,
          maxStorageGb: 250,
        },
        includedModules: ['OPD', 'EMR', 'IPD', 'LABORATORY', 'PHARMACY', 'INVENTORY', 'BILLING', 'REPORTS'],
        isActive: true,
      },
      {
        code: 'PLAN_ENTERPRISE',
        name: 'Enterprise Network',
        tier: SubscriptionTier.ENTERPRISE_NETWORK,
        description: 'Multi-location healthcare systems, medical universities, and hospital networks.',
        priceMonthly: 49999,
        priceAnnual: 499990,
        currency: 'INR',
        limits: {
          maxDoctors: 150,
          maxBeds: 500,
          maxStorageGb: 1000,
        },
        includedModules: ['OPD', 'EMR', 'IPD', 'LABORATORY', 'PHARMACY', 'INVENTORY', 'BILLING', 'REPORTS', 'MULTI_BRANCH', 'API_INTEGRATIONS'],
        isActive: true,
      },
    ];

    for (const planData of plansToSeed) {
      await this.planModel.updateOne(
        { code: planData.code },
        { $setOnInsert: planData },
        { upsert: true },
      );
    }
    this.logger.log('Default SaaS subscription plans verified.');
  }

  async seedDefaultTenant(): Promise<void> {
    const defaultTenantId = new Types.ObjectId('6aa3f64974f6740b10b10001');
    const existing = await this.tenantModel.findById(defaultTenantId).exec();

    if (!existing) {
      const growthPlan = await this.planModel.findOne({ code: 'PLAN_GROWTH' }).exec();

      const tenant = await this.tenantModel.create({
        _id: defaultTenantId,
        name: 'Apollo Memorial Central Hospital',
        slug: 'apollo-memorial',
        subdomain: 'apollo-memorial',
        status: TenantStatus.ACTIVE,
        tier: SubscriptionTier.GROWTH_HOSPITAL,
        planId: growthPlan?._id,
        billingContact: {
          name: 'Hospital Administration',
          email: 'admin@hms.local',
          phone: '+91 98765 43210',
        },
        quotas: {
          maxDoctors: 35,
          maxBeds: 120,
          maxStorageGb: 250,
        },
        usage: {
          doctorsCount: 1,
          bedsCount: 12,
          storageGbUsed: 2.4,
        },
      });

      if (growthPlan) {
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const sub = await this.subscriptionModel.create({
          tenantId: tenant._id,
          planId: growthPlan._id,
          tier: SubscriptionTier.GROWTH_HOSPITAL,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: nextMonth,
          billingCycle: 'MONTHLY',
          amount: growthPlan.priceMonthly,
          currency: 'INR',
        });

        tenant.subscriptionId = sub._id as Types.ObjectId;
        await tenant.save();
      }

      this.logger.log('Default tenant seeded (Apollo Memorial Central Hospital).');
    }
  }

  // ==========================================================================
  // TENANT GOVERNANCE
  // ==========================================================================

  async getAllTenants(query?: { status?: string; tier?: string; search?: string }) {
    const filter: Record<string, unknown> = {};

    if (query?.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query?.tier && query.tier !== 'ALL') {
      filter.tier = query.tier;
    }
    if (query?.search) {
      const term = query.search.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { subdomain: { $regex: term, $options: 'i' } },
        { 'billingContact.email': { $regex: term, $options: 'i' } },
      ];
    }

    const tenants = await this.tenantModel
      .find(filter)
      .populate('planId', 'name code priceMonthly priceAnnual limits')
      .populate('subscriptionId', 'status currentPeriodEnd billingCycle amount')
      .sort({ createdAt: -1 })
      .exec();

    // Enrich with dynamic usage counts
    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const tenantId = t._id;
        const [docCount, bedCount, patientCount] = await Promise.all([
          this.userModel.countDocuments({ hospitalId: tenantId, role: 'DOCTOR' }).exec(),
          this.connection.collection('beds').countDocuments({ tenantId }).catch(() => 0),
          this.patientModel.countDocuments({ tenantId }).exec().catch(() => 0),
        ]);

        const doc = t.toObject({ virtuals: true });
        (doc as any).id = t._id.toString();
        doc.usage = {
          doctorsCount: docCount,
          bedsCount: bedCount,
          storageGbUsed: Math.round(((patientCount * 0.05) + 1.2) * 10) / 10,
        };
        return doc;
      }),
    );

    return enriched;
  }

  async getTenantById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tenant ID format.');
    }

    const tenant = await this.tenantModel
      .findById(id)
      .populate('planId')
      .populate('subscriptionId')
      .exec();

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const tenantId = tenant._id;
    const [docCount, bedCount, userCount, patientCount] = await Promise.all([
      this.userModel.countDocuments({ hospitalId: tenantId, role: 'DOCTOR' }).exec(),
      this.connection.collection('beds').countDocuments({ tenantId }).catch(() => 0),
      this.userModel.countDocuments({ hospitalId: tenantId }).exec(),
      this.patientModel.countDocuments({ tenantId }).exec().catch(() => 0),
    ]);

    const result = tenant.toObject({ virtuals: true });
    (result as any).id = tenant._id.toString();
    result.usage = {
      doctorsCount: docCount,
      bedsCount: bedCount,
      storageGbUsed: Math.round(((patientCount * 0.05) + 1.2) * 10) / 10,
    };
    (result as any).metrics = {
      totalUsers: userCount,
      totalPatients: patientCount,
    };

    return result;
  }

  async provisionTenant(dto: CreateTenantDto, actorEmail: string, ipAddress?: string) {
    const slug = dto.subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const existingSubdomain = await this.tenantModel.findOne({ subdomain: slug }).exec();
    if (existingSubdomain) {
      throw new ConflictException(`Subdomain '${slug}' is already in use by another tenant.`);
    }

    const existingAdmin = await this.userModel.findOne({ email: dto.adminEmail.toLowerCase().trim() }).exec();
    if (existingAdmin) {
      throw new ConflictException(`User with email '${dto.adminEmail}' already exists.`);
    }

    // Determine plan
    let plan = null;
    if (dto.planId && Types.ObjectId.isValid(dto.planId)) {
      plan = await this.planModel.findById(dto.planId).exec();
    }
    if (!plan) {
      plan = await this.planModel.findOne({ tier: dto.tier }).exec();
    }
    if (!plan) {
      plan = await this.planModel.findOne({ code: 'PLAN_STARTER' }).exec();
    }

    const quotas = plan?.limits || {
      maxDoctors: 10,
      maxBeds: 25,
      maxStorageGb: 50,
    };

    // 1. Create Tenant
    const tenant = await this.tenantModel.create({
      name: dto.name.trim(),
      slug,
      subdomain: slug,
      customDomain: dto.customDomain ? dto.customDomain.toLowerCase().trim() : undefined,
      status: TenantStatus.ACTIVE,
      tier: dto.tier || SubscriptionTier.STARTER_CLINIC,
      planId: plan?._id,
      billingContact: {
        name: `${dto.adminFirstName} ${dto.adminLastName}`,
        email: dto.adminEmail.toLowerCase().trim(),
        phone: dto.phone,
      },
      quotas,
      usage: {
        doctorsCount: 0,
        bedsCount: 0,
        storageGbUsed: 0.1,
      },
    });

    // 2. Create Initial Hospital Administrator Account
    const defaultPassword = dto.adminPassword || 'Admin@HMS2026';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const adminUser: any = await this.userModel.create({
      email: dto.adminEmail.toLowerCase().trim(),
      passwordHash,
      firstName: dto.adminFirstName.trim(),
      lastName: dto.adminLastName.trim(),
      role: 'HOSPITAL_ADMIN',
      permissions: ['*'],
      hospitalId: tenant._id,
      phone: dto.phone,
      status: UserStatus.ACTIVE,
    });

    // 3. Create Subscription
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const subscription = await this.subscriptionModel.create({
      tenantId: tenant._id,
      planId: plan?._id,
      tier: dto.tier || SubscriptionTier.STARTER_CLINIC,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      billingCycle: 'MONTHLY',
      amount: plan ? plan.priceMonthly : 4999,
      currency: plan ? plan.currency : 'INR',
    });

    tenant.subscriptionId = subscription._id as Types.ObjectId;
    await tenant.save();

    // 4. Audit Log
    await this.auditService.record({
      userId: actorEmail,
      action: 'TENANT_PROVISION',
      resource: 'platform.tenants',
      details: {
        tenantId: tenant._id.toString(),
        name: tenant.name,
        subdomain: tenant.subdomain,
        tier: tenant.tier,
        adminUser: adminUser.email,
      },
      ipAddress,
    });

    return {
      success: true,
      tenant: tenant.toObject(),
      adminCredentials: {
        email: adminUser.email,
        temporaryPassword: defaultPassword,
      },
    };
  }

  async updateTenantStatus(id: string, dto: UpdateTenantStatusDto, actorEmail: string, ipAddress?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tenant ID format.');
    }

    const tenant = await this.tenantModel.findById(id).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const previousStatus = tenant.status;
    tenant.status = dto.status;

    if (dto.status === TenantStatus.SUSPENDED) {
      tenant.suspendedAt = new Date();
      tenant.suspensionReason = dto.reason || 'Administrative suspension by Platform Super Admin.';
    } else if (dto.status === TenantStatus.ACTIVE) {
      tenant.suspendedAt = undefined;
      tenant.suspensionReason = undefined;
    }

    await tenant.save();

    // If suspended, update users status
    if (dto.status === TenantStatus.SUSPENDED) {
      await this.userModel.updateMany(
        { hospitalId: tenant._id },
        { status: UserStatus.SUSPENDED },
      ).exec();
    } else if (dto.status === TenantStatus.ACTIVE && previousStatus === TenantStatus.SUSPENDED) {
      await this.userModel.updateMany(
        { hospitalId: tenant._id },
        { status: UserStatus.ACTIVE },
      ).exec();
    }

    await this.auditService.record({
      userId: actorEmail,
      action: dto.status === TenantStatus.SUSPENDED ? 'TENANT_SUSPEND' : 'TENANT_ACTIVATE',
      resource: 'platform.tenants',
      details: {
        tenantId: tenant._id.toString(),
        name: tenant.name,
        previousStatus,
        newStatus: dto.status,
        reason: dto.reason,
      },
      ipAddress,
    });

    return tenant;
  }

  async overrideQuotas(id: string, dto: QuotaOverrideDto, actorEmail: string, ipAddress?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid tenant ID format.');
    }

    const tenant = await this.tenantModel.findById(id).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    if (dto.maxDoctors !== undefined) tenant.quotas.maxDoctors = dto.maxDoctors;
    if (dto.maxBeds !== undefined) tenant.quotas.maxBeds = dto.maxBeds;
    if (dto.maxStorageGb !== undefined) tenant.quotas.maxStorageGb = dto.maxStorageGb;

    await tenant.save();

    if (tenant.subscriptionId) {
      await this.subscriptionModel.findByIdAndUpdate(tenant.subscriptionId, {
        limitsOverride: {
          maxDoctors: dto.maxDoctors,
          maxBeds: dto.maxBeds,
          maxStorageGb: dto.maxStorageGb,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          reason: dto.reason,
        },
      }).exec();
    }

    await this.auditService.record({
      userId: actorEmail,
      action: 'QUOTA_OVERRIDE',
      resource: 'platform.tenants',
      details: {
        tenantId: tenant._id.toString(),
        quotas: tenant.quotas,
        reason: dto.reason,
      },
      ipAddress,
    });

    return tenant;
  }

  // ==========================================================================
  // PLANS
  // ==========================================================================

  async getAllPlans() {
    return this.planModel.find().sort({ priceMonthly: 1 }).exec();
  }

  async getPlanById(id: string) {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) {
      throw new NotFoundException('Plan not found.');
    }
    return plan;
  }

  async createPlan(dto: CreatePlanDto, actorEmail: string) {
    const existing = await this.planModel.findOne({ code: dto.code.toUpperCase() }).exec();
    if (existing) {
      throw new ConflictException(`Plan with code '${dto.code}' already exists.`);
    }

    const plan = await this.planModel.create({
      ...dto,
      code: dto.code.toUpperCase(),
      isActive: true,
    });

    await this.auditService.record({
      userId: actorEmail,
      action: 'PLAN_CREATE',
      resource: 'platform.plans',
      details: { planId: plan._id.toString(), code: plan.code, name: plan.name },
    });

    return plan;
  }

  async updatePlan(id: string, update: Partial<CreatePlanDto>, actorEmail: string) {
    const plan = await this.planModel.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!plan) {
      throw new NotFoundException('Plan not found.');
    }

    await this.auditService.record({
      userId: actorEmail,
      action: 'PLAN_UPDATE',
      resource: 'platform.plans',
      details: { planId: plan._id.toString(), update },
    });

    return plan;
  }

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  async getAllSubscriptions() {
    return this.subscriptionModel
      .find()
      .populate('tenantId', 'name subdomain status')
      .populate('planId', 'name code')
      .sort({ createdAt: -1 })
      .exec();
  }

  // ==========================================================================
  // PLATFORM TELEMETRY
  // ==========================================================================

  async getPlatformTelemetry(): Promise<PlatformTelemetry> {
    // 1. Real Mongo ping measurement
    let pingMs = 5;
    try {
      const start = Date.now();
      await (this.connection.db as any).admin().ping();
      pingMs = Date.now() - start;
    } catch {
      pingMs = 12;
    }

    // 2. Counts
    const [totalTenants, activeTenants, totalUsers, totalDoctors, totalPatients] =
      await Promise.all([
        this.tenantModel.countDocuments().exec(),
        this.tenantModel.countDocuments({ status: TenantStatus.ACTIVE }).exec(),
        this.userModel.countDocuments().exec(),
        this.userModel.countDocuments({ role: 'DOCTOR' }).exec(),
        this.patientModel.countDocuments().exec(),
      ]);

    const mem = process.memoryUsage();

    return {
      databasePingMs: pingMs,
      activeConnections: (this.connection as any).base?.connections?.length || 1,
      memoryRssMb: Math.round(mem.rss / (1024 * 1024)),
      memoryHeapMb: Math.round(mem.heapUsed / (1024 * 1024)),
      uptimeSeconds: Math.round(process.uptime()),
      totalTenants,
      activeTenants,
      totalUsers,
      totalDoctors,
      totalPatients,
      systemTimestamp: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // PLATFORM AUDIT LOGS
  // ==========================================================================

  async getPlatformAuditLogs(limit = 50) {
    return this.auditLogModel
      .find({
        $or: [
          { action: { $regex: '^TENANT_' } },
          { action: { $regex: '^PLAN_' } },
          { action: { $regex: '^QUOTA_' } },
          { action: { $regex: '^BROADCAST_' } },
          { resource: { $regex: '^platform' } },
        ],
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  // ==========================================================================
  // PLATFORM BROADCASTS
  // ==========================================================================

  async getActiveBroadcasts() {
    const now = new Date();
    return this.broadcastModel
      .find({
        active: true,
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async createBroadcast(dto: CreateBroadcastDto, actorEmail: string) {
    const broadcast = await this.broadcastModel.create({
      ...dto,
      active: true,
    });

    await this.auditService.record({
      userId: actorEmail,
      action: 'BROADCAST_ANNOUNCE',
      resource: 'platform.broadcasts',
      details: { broadcastId: broadcast._id.toString(), title: broadcast.title, severity: broadcast.severity },
    });

    return broadcast;
  }

  async dismissBroadcast(id: string, actorEmail: string) {
    const broadcast = await this.broadcastModel.findByIdAndUpdate(
      id,
      { active: false },
      { new: true },
    ).exec();

    if (!broadcast) {
      throw new NotFoundException('Broadcast announcement not found.');
    }

    await this.auditService.record({
      userId: actorEmail,
      action: 'BROADCAST_DISMISS',
      resource: 'platform.broadcasts',
      details: { broadcastId: broadcast._id.toString() },
    });

    return broadcast;
  }
}
