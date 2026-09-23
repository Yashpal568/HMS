import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { Employee, EmployeeDocument } from '../workforce/schemas/employee.schema.js';
import { Department, DepartmentDocument } from '../organization/schemas/department.schema.js';
import { ResourceScope } from '@hms/types';

export interface WorkspaceDefinition {
  code: string;
  name: string;
  description: string;
  defaultScope: 'HOSPITAL_WIDE' | 'DEPARTMENT_ONLY' | 'TEAM_ONLY' | 'ASSIGNED_RESOURCES';
  navigation: string[];
  allowedActions: string[];
  badgeColor: string;
}

export const STANDARD_WORKSPACES: Record<string, WorkspaceDefinition> = {
  HOSPITAL_ADMIN: {
    code: 'HOSPITAL_ADMIN',
    name: 'Hospital Administrator Workspace',
    description: 'Executive clinical governance, operational capacity, and resource management',
    defaultScope: 'HOSPITAL_WIDE',
    navigation: [
      'dashboard',
      'patients',
      'appointments',
      'emr',
      'ipd',
      'laboratory',
      'pharmacy',
      'inventory',
      'billing',
      'reports',
      'staff',
      'departments',
      'audit',
    ],
    allowedActions: [
      'users.manage',
      'hospital.manage',
      'departments.manage',
      'reports.view',
      'audit.view',
    ],
    badgeColor: 'teal',
  },
  DOCTOR: {
    code: 'DOCTOR',
    name: 'Doctor Clinical Workspace',
    description: 'Outpatient consultation cockpit, electronic medical records, and diagnostic requisitions',
    defaultScope: 'ASSIGNED_RESOURCES',
    navigation: ['dashboard', 'appointments', 'emr', 'patients', 'laboratory'],
    allowedActions: ['emr.create', 'emr.update', 'prescriptions.create', 'lab.order'],
    badgeColor: 'teal',
  },
  RECEPTIONIST: {
    code: 'RECEPTIONIST',
    name: 'OPD Reception & Queue Hub',
    description: 'Patient check-in, token distribution, appointment scheduling, and registration',
    defaultScope: 'DEPARTMENT_ONLY',
    navigation: ['dashboard', 'patients', 'appointments', 'billing'],
    allowedActions: ['patients.create', 'appointments.create', 'queue.checkin'],
    badgeColor: 'sky',
  },
  NURSE: {
    code: 'NURSE',
    name: 'Inpatient Ward Station',
    description: 'Bedside telemetry, vitals recording, inpatient care tasks, and medication administration',
    defaultScope: 'DEPARTMENT_ONLY',
    navigation: ['dashboard', 'ipd', 'emr', 'patients', 'pharmacy'],
    allowedActions: ['vitals.record', 'nursing.notes', 'ipd.manage'],
    badgeColor: 'rose',
  },
  PHARMACIST: {
    code: 'PHARMACIST',
    name: 'Pharmacy & Dispensary Center',
    description: 'e-Prescription fulfillment, FEFO batch selection, expiry watch, and drug dispensing',
    defaultScope: 'DEPARTMENT_ONLY',
    navigation: ['dashboard', 'pharmacy', 'inventory'],
    allowedActions: ['pharmacy.dispense', 'inventory.view'],
    badgeColor: 'emerald',
  },
  LAB_TECHNICIAN: {
    code: 'LAB_TECHNICIAN',
    name: 'Laboratory Diagnostic Station',
    description: 'Specimen accessioning, analyzer telemetry, test result entry, and pathology verification',
    defaultScope: 'DEPARTMENT_ONLY',
    navigation: ['dashboard', 'laboratory'],
    allowedActions: ['lab.accession', 'lab.results.enter'],
    badgeColor: 'purple',
  },
  ACCOUNTANT: {
    code: 'ACCOUNTANT',
    name: 'Billing & Cashier Command',
    description: 'Invoice settlements, cashier balance, payment reconciliation, and claims',
    defaultScope: 'HOSPITAL_WIDE',
    navigation: ['dashboard', 'billing', 'reports'],
    allowedActions: ['billing.create', 'billing.collect', 'billing.refund'],
    badgeColor: 'amber',
  },
  INVENTORY_MANAGER: {
    code: 'INVENTORY_MANAGER',
    name: 'Store & Inventory Management',
    description: 'Warehouse GRN receipt, purchase orders, reorder point alarms, and supplier ledger',
    defaultScope: 'HOSPITAL_WIDE',
    navigation: ['dashboard', 'inventory', 'reports'],
    allowedActions: ['inventory.grn', 'inventory.po', 'inventory.adjust'],
    badgeColor: 'indigo',
  },
  DEPARTMENT_MANAGER: {
    code: 'DEPARTMENT_MANAGER',
    name: 'Department Operational Management',
    description: 'Departmental staff scheduling, shift assignments, attendance approvals, and metrics',
    defaultScope: 'DEPARTMENT_ONLY',
    navigation: ['dashboard', 'staff', 'appointments', 'reports'],
    allowedActions: ['schedules.manage', 'attendance.approve', 'leave.approve'],
    badgeColor: 'cyan',
  },
};

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
  ) {}

  getTemplates() {
    return Object.values(STANDARD_WORKSPACES);
  }

  async resolveUserWorkspaces(tenantId: string, userId: string, preferredWorkspaceCode?: string) {
    const tId = new Types.ObjectId(tenantId);
    const uId = new Types.ObjectId(userId);

    const user = await this.userModel.findOne({ _id: uId, hospitalId: tId }).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let employee: EmployeeDocument | null = null;
    if (user.employeeId) {
      employee = await this.employeeModel
        .findOne({ _id: user.employeeId, tenantId: tId })
        .populate('departmentId', 'name code')
        .populate('teamId', 'name code')
        .exec();
    } else {
      // Look up by email as fallback
      employee = await this.employeeModel
        .findOne({ email: user.email.toLowerCase(), tenantId: tId })
        .populate('departmentId', 'name code')
        .populate('teamId', 'name code')
        .exec();
    }

    // Determine assigned workspace codes
    let workspaceCodes: string[] = [];
    if (employee && employee.assignedWorkspaces && employee.assignedWorkspaces.length > 0) {
      workspaceCodes = employee.assignedWorkspaces;
    } else if (user.role === 'HOSPITAL_ADMIN') {
      // Hospital Admin has access to preview all workspaces
      workspaceCodes = Object.keys(STANDARD_WORKSPACES);
    } else {
      workspaceCodes = [user.role];
    }

    const availableWorkspaces = workspaceCodes
      .map((code) => STANDARD_WORKSPACES[code])
      .filter((ws): ws is WorkspaceDefinition => !!ws);

    // Determine active workspace: preferred if authorized, else first available
    let activeWorkspace: WorkspaceDefinition | undefined;
    if (preferredWorkspaceCode && (user.role === 'HOSPITAL_ADMIN' || workspaceCodes.includes(preferredWorkspaceCode))) {
      activeWorkspace = STANDARD_WORKSPACES[preferredWorkspaceCode];
    }
    if (!activeWorkspace) {
      activeWorkspace = availableWorkspaces[0] || STANDARD_WORKSPACES.HOSPITAL_ADMIN;
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      employee: employee
        ? {
            id: employee._id.toString(),
            employeeId: employee.employeeId,
            firstName: employee.firstName,
            lastName: employee.lastName,
            designation: employee.designation,
            department: (employee.departmentId as any)?.name || 'General',
            departmentId: (employee.departmentId as any)?._id?.toString(),
            scope: employee.accessScope,
          }
        : null,
      activeWorkspace,
      availableWorkspaces,
      effectivePermissions: user.permissions || [],
      scope: employee?.accessScope || 'HOSPITAL_WIDE',
    };
  }

  async switchActiveWorkspace(tenantId: string, userId: string, workspaceCode: string) {
    const targetWs = STANDARD_WORKSPACES[workspaceCode];
    if (!targetWs) {
      throw new BadRequestException(`Invalid workspace code "${workspaceCode}".`);
    }

    const context = await this.resolveUserWorkspaces(tenantId, userId, workspaceCode);
    const isAuthorized =
      context.role === 'HOSPITAL_ADMIN' ||
      context.availableWorkspaces.some((ws) => ws.code === workspaceCode);

    if (!isAuthorized) {
      throw new ForbiddenException(`You do not have access to the "${targetWs.name}".`);
    }

    return {
      activeWorkspace: targetWs,
      context,
    };
  }

  async getAllWorkspaceAssignments(tenantId: string) {
    const tId = new Types.ObjectId(tenantId);
    const employees = await this.employeeModel
      .find({ tenantId: tId })
      .populate('departmentId', 'name code')
      .populate('teamId', 'name code')
      .populate('userId', 'email role status')
      .sort({ createdAt: -1 })
      .exec();

    return employees.map((emp) => ({
      id: emp._id.toString(),
      _id: emp._id.toString(),
      employeeId: emp.employeeId,
      employeeCode: emp.employeeId,
      name: `${emp.firstName} ${emp.lastName}`,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      staffType: emp.staffType,
      designation: emp.designation,
      department: (emp.departmentId as any)?.name || 'Unassigned',
      departmentId: (emp.departmentId as any)?._id?.toString(),
      team: (emp.teamId as any)?.name || 'Unassigned',
      teamId: (emp.teamId as any)?._id?.toString(),
      assignedRoles: emp.assignedRoles || (emp.userId ? [(emp.userId as any).role] : []),
      assignedWorkspaces: emp.assignedWorkspaces || [],
      accessScope: emp.accessScope || ResourceScope.HOSPITAL_WIDE,
      isUserLinked: !!emp.userId,
      userStatus: (emp.userId as any)?.status || null,
      userId: (emp.userId as any)?._id?.toString() || null,
    }));
  }

  async assignWorkspace(
    tenantId: string,
    dto: {
      employeeId: string;
      role?: string;
      departmentId?: string;
      teamId?: string;
      workspaces: string[];
      accessScope?: ResourceScope;
    },
  ) {
    const tId = new Types.ObjectId(tenantId);
    let employee = null;
    if (Types.ObjectId.isValid(dto.employeeId)) {
      employee = await this.employeeModel
        .findOne({ _id: new Types.ObjectId(dto.employeeId), tenantId: tId })
        .exec();
    }
    if (!employee) {
      employee = await this.employeeModel
        .findOne({ employeeId: dto.employeeId, tenantId: tId })
        .exec();
    }

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    // Validate workspace codes
    for (const wsCode of dto.workspaces) {
      if (!STANDARD_WORKSPACES[wsCode]) {
        throw new BadRequestException(`Unrecognized workspace code "${wsCode}".`);
      }
    }

    employee.assignedWorkspaces = dto.workspaces;
    if (dto.role) {
      employee.assignedRoles = [dto.role.toUpperCase()];
    }
    if (dto.departmentId) {
      employee.departmentId = new Types.ObjectId(dto.departmentId);
    }
    if (dto.teamId) {
      employee.teamId = new Types.ObjectId(dto.teamId);
    }
    if (dto.accessScope) {
      employee.accessScope = dto.accessScope;
    }

    await employee.save();

    // Synchronize linked user if present
    if (employee.userId && dto.role) {
      await this.userModel.updateOne(
        { _id: employee.userId },
        {
          role: dto.role.toUpperCase(),
          department: (employee.departmentId as any)?.name,
        },
      );
    }

    return {
      success: true,
      message: 'Workspace assignment updated successfully.',
      employee: {
        id: employee._id.toString(),
        employeeId: employee.employeeId,
        assignedWorkspaces: employee.assignedWorkspaces,
        accessScope: employee.accessScope,
      },
    };
  }
}

