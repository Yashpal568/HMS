import { Injectable, OnModuleInit, Logger, BadRequestException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserDocument, UserStatus } from './schemas/user.schema.js';
import { MailService } from '../mail/mail.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RolesService } from '../roles/roles.service.js';
import type { InviteStaffDto, ListStaffQueryDto } from './dto/invite-staff.dto.js';
import type { InviteStaffResponse, StaffUserSummary } from '@hms/types';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions?: string[];
  status?: UserStatus;
  hospitalId?: string;
  branchId?: string;
  department?: string;
  specialization?: string;
  phone?: string;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  DOCTOR: [
    'patients.read',
    'appointments.read',
    'appointments.update',
    'emr.read',
    'emr.create',
    'emr.update',
    'ipd.read',
    'ipd.manage',
    'lab.read',
    'lab.update',
    'lab.orders.create',
    'lab.orders.read',
    'lab.results.verify',
    'lab.tests.read',
    'pharmacy.read',
    'reports.read',
  ],
  NURSE: [
    'patients.read',
    'appointments.read',
    'emr.read',
    'nursing.create',
    'ipd.read',
    'ipd.manage',
    'lab.read',
    'lab.orders.read',
  ],
  RECEPTIONIST: [
    'patients.read',
    'patients.create',
    'patients.update',
    'appointments.read',
    'appointments.create',
    'appointments.update',
    'ipd.read',
    'lab.orders.create',
    'lab.orders.read',
    'lab.tests.read',
    'billing.read',
    'billing.create',
  ],
  LAB_TECHNICIAN: [
    'patients.read',
    'lab.read',
    'lab.update',
    'lab.orders.read',
    'lab.orders.update',
    'lab.results.enter',
    'lab.tests.read',
  ],
  PHARMACIST: [
    'patients.read',
    'pharmacy.read',
    'pharmacy.dispense',
    'pharmacy.manage',
    'inventory.read',
  ],
  ACCOUNTANT: [
    'billing.read',
    'billing.create',
    'billing.refund',
    'reports.read',
    'reports.financial.read',
  ],
  INVENTORY_MANAGER: [
    'inventory.read',
    'inventory.manage',
    'reports.read',
  ],
  HOSPITAL_ADMIN: [
    'users.read',
    'users.create',
    'users.update',
    'roles.read',
    'audit.read',
    'audit.logs.read',
    'hospital.manage',
    'patients.read',
    'patients.create',
    'patients.update',
    'appointments.read',
    'appointments.create',
    'appointments.update',
    'emr.read',
    'ipd.read',
    'ipd.manage',
    'lab.read',
    'lab.update',
    'lab.orders.create',
    'lab.orders.read',
    'lab.orders.update',
    'lab.results.enter',
    'lab.results.verify',
    'lab.tests.read',
    'lab.tests.manage',
    'pharmacy.read',
    'pharmacy.dispense',
    'pharmacy.manage',
    'inventory.read',
    'inventory.manage',
    'billing.read',
    'billing.create',
    'billing.refund',
    'reports.read',
    'reports.financial.read',
  ],
};

function generateSecureTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Med#${randomStr}9`;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Optional()
    private readonly mailService?: MailService,
    @Optional()
    private readonly auditService?: AuditService,
    @Optional()
    private readonly rolesService?: RolesService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedInitialAdminUsers();
    } catch (err) {
      this.logger.warn(`Could not seed initial administrators: ${(err as Error).message}`);
    }
  }

  async seedInitialAdminUsers(): Promise<void> {
    const salt = await bcrypt.genSalt(10);

    // 1. Seed Hospital Administrator (Tenant Level)
    const hospitalAdminEmail = (process.env.HOSPITAL_ADMIN_EMAIL || 'admin@hms.local').toLowerCase();
    const existingHospitalAdmin = await this.userModel.findOne({ email: hospitalAdminEmail }).exec();
    const defaultHospitalId = new Types.ObjectId('6aa3f64974f6740b10b10001');

    if (!existingHospitalAdmin) {
      const hospitalAdminPass = process.env.HOSPITAL_ADMIN_PASSWORD || 'Admin@HMS2026';
      const hash = await bcrypt.hash(hospitalAdminPass, salt);
      await this.userModel.create({
        email: hospitalAdminEmail,
        passwordHash: hash,
        firstName: 'Hospital',
        lastName: 'Administrator',
        role: 'HOSPITAL_ADMIN',
        permissions: ['*'],
        hospitalId: defaultHospitalId,
        status: UserStatus.ACTIVE,
      });
      this.logger.log(`Hospital Administrator seeded (${hospitalAdminEmail}).`);
    } else if (existingHospitalAdmin.role === 'SUPER_ADMIN') {
      existingHospitalAdmin.role = 'HOSPITAL_ADMIN';
      existingHospitalAdmin.hospitalId = defaultHospitalId;
      await existingHospitalAdmin.save();
      this.logger.log(`Migrated ${hospitalAdminEmail} to HOSPITAL_ADMIN role.`);
    }

    // 2. Seed Platform Super Admin (SaaS Owner Level)
    const platformAdminEmail = (process.env.PLATFORM_SUPER_ADMIN_EMAIL || 'platform@hmsmedcore.com').toLowerCase();
    const existingPlatformAdmin = await this.userModel.findOne({ email: platformAdminEmail }).exec();

    if (!existingPlatformAdmin) {
      const platformAdminPass = process.env.PLATFORM_SUPER_ADMIN_PASSWORD || 'Platform@Admin2026';
      const hash = await bcrypt.hash(platformAdminPass, salt);
      await this.userModel.create({
        email: platformAdminEmail,
        passwordHash: hash,
        firstName: 'SaaS',
        lastName: 'Owner',
        role: 'SUPER_ADMIN',
        permissions: [
          'platform.tenants.read',
          'platform.tenants.manage',
          'platform.tenants.suspend',
          'platform.plans.manage',
          'platform.subscriptions.manage',
          'platform.telemetry.read',
          'platform.audit.read',
          'platform.broadcast.manage',
        ],
        status: UserStatus.ACTIVE,
      });
      this.logger.log(`Platform Super Admin seeded (${platformAdminEmail}).`);
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async create(data: CreateUserData): Promise<UserDocument> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new BadRequestException('User with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    return this.userModel.create({
      email: normalizedEmail,
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      role: data.role.toUpperCase(),
      permissions: data.permissions || [],
      status: data.status || UserStatus.ACTIVE,
      hospitalId: data.hospitalId,
      branchId: data.branchId,
      department: data.department?.trim(),
      specialization: data.specialization?.trim(),
      phone: data.phone?.trim(),
    });
  }

  async inviteStaff(
    hospitalId: string,
    dto: InviteStaffDto,
    adminUser: { userId: string; email: string; name?: string },
    hospitalName?: string,
  ): Promise<InviteStaffResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new BadRequestException('A user with this email address already exists in the system.');
    }

    const temporaryPassword = generateSecureTemporaryPassword();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(temporaryPassword, salt);

    // Look up role permissions
    let permissions: string[] = [];
    if (this.rolesService) {
      try {
        const roleDoc = await this.rolesService.findByName(dto.role);
        if (roleDoc && roleDoc.permissions) {
          permissions = roleDoc.permissions;
        }
      } catch {
        // Fallback below
      }
    }
    if (!permissions.length) {
      permissions = DEFAULT_ROLE_PERMISSIONS[dto.role] || [];
    }

    const newUser = await this.userModel.create({
      email: normalizedEmail,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: dto.role,
      permissions,
      status: UserStatus.ACTIVE,
      hospitalId: new Types.ObjectId(hospitalId),
      department: dto.department?.trim(),
      specialization: dto.specialization?.trim(),
      phone: dto.phone?.trim(),
      mustChangePassword: true,
    });

    // Record in Audit Log
    if (this.auditService) {
      await this.auditService.record({
        hospitalId,
        tenantId: hospitalId,
        userId: adminUser.userId,
        userEmail: adminUser.email,
        userName: adminUser.name,
        action: 'STAFF_INVITED',
        resource: `users/${newUser._id}`,
        status: 'SUCCESS',
        details: {
          invitedUserId: newUser._id.toString(),
          invitedEmail: normalizedEmail,
          role: dto.role,
          department: dto.department,
        },
      });
    }

    // Send credentials email
    const loginUrl = process.env.APP_URL || 'http://localhost:3000/login';
    let emailDispatched = false;
    if (this.mailService) {
      const mailResult = await this.mailService.sendStaffCredentials({
        to: normalizedEmail,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        department: dto.department,
        specialization: dto.specialization,
        temporaryPassword,
        loginUrl,
        hospitalName: hospitalName || 'MedCore General Hospital',
      });
      emailDispatched = mailResult.success;
    }

    return {
      id: newUser._id.toString(),
      email: normalizedEmail,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      department: newUser.department,
      specialization: newUser.specialization,
      temporaryPassword,
      emailDispatched,
      message: emailDispatched
        ? `Staff member provisioned and login credentials emailed to ${normalizedEmail}.`
        : `Staff member provisioned. Temporary credentials generated for immediate access.`,
    };
  }

  async findStaffByHospital(
    hospitalId: string,
    query: ListStaffQueryDto = {},
  ): Promise<{ staff: StaffUserSummary[]; total: number }> {
    const filter: Record<string, unknown> = {
      hospitalId: new Types.ObjectId(hospitalId),
    };

    if (query.role) {
      filter.role = query.role.toUpperCase();
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const staff: StaffUserSummary[] = docs.map((doc) => ({
      id: doc._id.toString(),
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      role: doc.role,
      department: doc.department,
      specialization: doc.specialization,
      phone: doc.phone,
      status: doc.status,
      lastLoginAt: doc.lastLoginAt?.toISOString(),
      createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
    }));

    return { staff, total };
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      $unset: { lockUntil: 1 },
    });
  }

  async handleFailedLogin(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) return;

    const attempts = (user.failedLoginAttempts || 0) + 1;
    const update: Record<string, unknown> = { failedLoginAttempts: attempts };

    // Lock account for 15 minutes after 5 failed attempts
    if (attempts >= 5) {
      update.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      this.logger.warn(`User ${user.email} locked until ${update.lockUntil} due to failed attempts`);
    }

    await this.userModel.findByIdAndUpdate(id, update);
  }

  async findAll(hospitalId?: string): Promise<UserDocument[]> {
    const query: Record<string, unknown> = {};
    if (hospitalId) {
      query.hospitalId = hospitalId;
    }
    return this.userModel.find(query).select('-passwordHash').exec();
  }
}
