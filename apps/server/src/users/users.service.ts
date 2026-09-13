import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserDocument, UserStatus } from './schemas/user.schema.js';

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
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedSuperAdmin();
    } catch (err) {
      this.logger.warn(`Could not seed super admin user: ${(err as Error).message}`);
    }
  }

  async seedSuperAdmin(): Promise<void> {
    const adminEmail = (process.env.SUPER_ADMIN_EMAIL || 'admin@hms.local').toLowerCase();
    const existing = await this.userModel.findOne({ email: adminEmail }).exec();

    if (!existing) {
      const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@HMS2026';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      await this.userModel.create({
        email: adminEmail,
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'SUPER_ADMIN',
        permissions: ['*'],
        status: UserStatus.ACTIVE,
      });

      this.logger.log(`Default Super Admin seeded (${adminEmail}).`);
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
    });
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
