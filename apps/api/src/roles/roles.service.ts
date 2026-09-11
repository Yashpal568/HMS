import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema.js';
import { Permission, PermissionDocument } from './schemas/permission.schema.js';

export const INITIAL_PERMISSIONS = [
  { slug: 'users.read', description: 'View staff and users', module: 'users' },
  { slug: 'users.create', description: 'Create staff and users', module: 'users' },
  { slug: 'users.update', description: 'Update staff and users', module: 'users' },
  { slug: 'users.delete', description: 'Delete staff and users', module: 'users' },
  { slug: 'roles.read', description: 'View roles and permissions', module: 'roles' },
  { slug: 'roles.manage', description: 'Manage roles and permissions', module: 'roles' },
  { slug: 'audit.read', description: 'View security and audit logs', module: 'audit' },
  { slug: 'hospital.manage', description: 'Manage hospital and branches', module: 'hospital' },
  { slug: 'patients.read', description: 'View patient records', module: 'patients' },
  { slug: 'patients.create', description: 'Register new patients', module: 'patients' },
  { slug: 'patients.update', description: 'Update patient information', module: 'patients' },
  { slug: 'appointments.read', description: 'View appointments', module: 'appointments' },
  { slug: 'appointments.create', description: 'Schedule appointments', module: 'appointments' },
  { slug: 'appointments.update', description: 'Update/cancel appointments', module: 'appointments' },
  { slug: 'emr.read', description: 'View electronic medical records', module: 'emr' },
  { slug: 'emr.create', description: 'Create clinical encounters and notes', module: 'emr' },
  { slug: 'emr.update', description: 'Update clinical notes', module: 'emr' },
  { slug: 'ipd.read', description: 'View inpatient records and beds', module: 'ipd' },
  { slug: 'ipd.manage', description: 'Admit and manage inpatient beds', module: 'ipd' },
  { slug: 'nursing.create', description: 'Record nursing notes and tasks', module: 'nursing' },
  { slug: 'lab.read', description: 'View laboratory tests and orders', module: 'lab' },
  { slug: 'lab.update', description: 'Enter and verify lab test results', module: 'lab' },
  { slug: 'pharmacy.read', description: 'View pharmacy stock and orders', module: 'pharmacy' },
  { slug: 'pharmacy.dispense', description: 'Dispense medications', module: 'pharmacy' },
  { slug: 'inventory.read', description: 'View inventory and stock', module: 'inventory' },
  { slug: 'inventory.manage', description: 'Manage inventory items and purchase orders', module: 'inventory' },
  { slug: 'billing.read', description: 'View invoices and receipts', module: 'billing' },
  { slug: 'billing.create', description: 'Generate invoices and record payments', module: 'billing' },
  { slug: 'billing.refund', description: 'Process billing refunds', module: 'billing' },
  { slug: 'reports.read', description: 'View operational and financial reports', module: 'reports' },
];

export const INITIAL_ROLES = [
  {
    name: 'SUPER_ADMIN',
    description: 'System Super Administrator with all permissions',
    permissions: ['*'],
  },
  {
    name: 'HOSPITAL_ADMIN',
    description: 'Hospital Administrator managing staff, operations and settings',
    permissions: [
      'users.read', 'users.create', 'users.update',
      'roles.read',
      'audit.read',
      'hospital.manage',
      'patients.read', 'patients.create', 'patients.update',
      'appointments.read', 'appointments.create', 'appointments.update',
      'billing.read',
      'reports.read',
    ],
  },
  {
    name: 'DOCTOR',
    description: 'Medical Doctor with clinical and patient consultation access',
    permissions: [
      'patients.read',
      'appointments.read', 'appointments.update',
      'emr.read', 'emr.create', 'emr.update',
      'lab.read',
      'pharmacy.read',
    ],
  },
  {
    name: 'NURSE',
    description: 'Registered Nurse managing vitals, nursing tasks and bed care',
    permissions: [
      'patients.read',
      'appointments.read',
      'emr.read',
      'nursing.create',
      'ipd.read',
    ],
  },
  {
    name: 'RECEPTIONIST',
    description: 'Front desk receptionist managing patient registration and queues',
    permissions: [
      'patients.read', 'patients.create', 'patients.update',
      'appointments.read', 'appointments.create', 'appointments.update',
      'billing.read',
    ],
  },
  {
    name: 'LAB_TECHNICIAN',
    description: 'Laboratory technician processing test orders and results',
    permissions: [
      'patients.read',
      'lab.read', 'lab.update',
    ],
  },
  {
    name: 'PHARMACIST',
    description: 'Hospital pharmacist dispensing medications and checking stock',
    permissions: [
      'patients.read',
      'pharmacy.read', 'pharmacy.dispense',
      'inventory.read',
    ],
  },
  {
    name: 'ACCOUNTANT',
    description: 'Finance specialist handling invoices, payments and receipts',
    permissions: [
      'billing.read', 'billing.create', 'billing.refund',
      'reports.read',
    ],
  },
  {
    name: 'INVENTORY_MANAGER',
    description: 'Manager overseeing supplies, stock levels and purchase orders',
    permissions: [
      'inventory.read', 'inventory.manage',
      'reports.read',
    ],
  },
];

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<PermissionDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedPermissionsAndRoles();
    } catch (err) {
      this.logger.warn(`Could not seed roles on startup: ${(err as Error).message}`);
    }
  }

  async seedPermissionsAndRoles(): Promise<void> {
    // Seed Permissions
    for (const p of INITIAL_PERMISSIONS) {
      await this.permissionModel.updateOne(
        { slug: p.slug },
        { $setOnInsert: p },
        { upsert: true },
      );
    }

    // Seed Roles
    for (const r of INITIAL_ROLES) {
      await this.roleModel.updateOne(
        { name: r.name },
        { $setOnInsert: { ...r, isSystem: true } },
        { upsert: true },
      );
    }

    this.logger.log('Initial system roles and permissions verified.');
  }

  async findByName(name: string): Promise<RoleDocument | null> {
    return this.roleModel.findOne({ name: name.toUpperCase() }).exec();
  }

  async findAllRoles(): Promise<RoleDocument[]> {
    return this.roleModel.find().exec();
  }

  async findAllPermissions(): Promise<PermissionDocument[]> {
    return this.permissionModel.find().exec();
  }

  async getPermissionsForRole(roleName: string): Promise<string[]> {
    const role = await this.findByName(roleName);
    if (!role) return [];
    return role.permissions || [];
  }
}
