import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema.js';
import { Team, TeamDocument } from './schemas/team.schema.js';
import {
  HospitalOnboarding,
  HospitalOnboardingDocument,
} from './schemas/hospital-onboarding.schema.js';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateTeamDto,
  UpdateTeamDto,
  AdvanceOnboardingDto,
} from './dto/organization.dto.js';
import { OnboardingStep } from '@hms/types';

export const DEFAULT_HOSPITAL_DEPARTMENTS = [
  { name: 'Outpatient Department', code: 'OPD', type: 'CLINICAL', description: 'General & specialist outpatient clinics' },
  { name: 'Emergency & Trauma', code: 'EMERGENCY', type: 'CLINICAL', description: '24/7 Acute emergency medical services' },
  { name: 'Cardiology', code: 'CARDIO', type: 'CLINICAL', description: 'Cardiovascular diagnostics and patient care' },
  { name: 'Orthopedics', code: 'ORTHO', type: 'CLINICAL', description: 'Musculoskeletal surgery and therapy' },
  { name: 'Pediatrics', code: 'PEDS', type: 'CLINICAL', description: 'Neonatal and child healthcare' },
  { name: 'General Medicine', code: 'GENMED', type: 'CLINICAL', description: 'Internal and general adult medicine' },
  { name: 'Pharmacy & Dispensary', code: 'PHARM', type: 'OPERATIONAL', description: 'Central dispensary and drug inventory' },
  { name: 'Clinical Diagnostics & Lab', code: 'LAB', type: 'DIAGNOSTIC', description: 'Pathology, hematology, and biochemistry' },
  { name: 'Inpatient Nursing Service', code: 'NURSE', type: 'CLINICAL', description: 'Ward nursing care and bedside stations' },
  { name: 'Billing & Cashier Command', code: 'BILLING', type: 'ADMINISTRATIVE', description: 'Cashier counters, insurance, and invoices' },
  { name: 'Central Medical Stores', code: 'INVENTORY', type: 'OPERATIONAL', description: 'Supply chain, procurement, and warehouse' },
  { name: 'Hospital Administration', code: 'ADMIN', type: 'ADMINISTRATIVE', description: 'Executive operations, HR, and facility governance' },
];

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Team.name)
    private readonly teamModel: Model<TeamDocument>,
    @InjectModel(HospitalOnboarding.name)
    private readonly onboardingModel: Model<HospitalOnboardingDocument>,
  ) {}

  // --------------------------------------------------------------------------
  // Departments
  // --------------------------------------------------------------------------

  async getDepartments(tenantId: string) {
    const tId = new Types.ObjectId(tenantId);
    let list = await this.departmentModel.find({ tenantId: tId }).sort({ name: 1 }).exec();

    // Auto-seed default departments if this hospital has none
    if (list.length === 0) {
      this.logger.log(`Seeding default hospital departments for tenant: ${tenantId}`);
      await this.departmentModel.insertMany(
        DEFAULT_HOSPITAL_DEPARTMENTS.map((d) => ({
          ...d,
          tenantId: tId,
          isActive: true,
        })),
      );
      list = await this.departmentModel.find({ tenantId: tId }).sort({ name: 1 }).exec();
    }

    return list;
  }

  async getDepartmentById(tenantId: string, id: string) {
    const doc = await this.departmentModel
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!doc) {
      throw new NotFoundException('Department not found.');
    }
    return doc;
  }

  async createDepartment(tenantId: string, dto: CreateDepartmentDto) {
    const tId = new Types.ObjectId(tenantId);
    const existing = await this.departmentModel
      .findOne({ tenantId: tId, code: dto.code.trim().toUpperCase() })
      .exec();

    if (existing) {
      throw new ConflictException(`Department code '${dto.code}' already exists for this hospital.`);
    }

    const created = new this.departmentModel({
      tenantId: tId,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      description: dto.description?.trim(),
      headEmployeeId: dto.headEmployeeId ? new Types.ObjectId(dto.headEmployeeId) : undefined,
      type: dto.type || 'CLINICAL',
      isActive: true,
    });

    return created.save();
  }

  async updateDepartment(tenantId: string, id: string, dto: UpdateDepartmentDto) {
    const updatePayload: Record<string, unknown> = {};
    if (dto.name) updatePayload.name = dto.name.trim();
    if (dto.description !== undefined) updatePayload.description = dto.description.trim();
    if (dto.headEmployeeId) updatePayload.headEmployeeId = new Types.ObjectId(dto.headEmployeeId);
    if (dto.type) updatePayload.type = dto.type;
    if (dto.isActive !== undefined) updatePayload.isActive = dto.isActive;

    const updated = await this.departmentModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
        { $set: updatePayload },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Department not found.');
    }
    return updated;
  }

  // --------------------------------------------------------------------------
  // Teams
  // --------------------------------------------------------------------------

  async getTeams(tenantId: string, departmentId?: string) {
    const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId) };
    if (departmentId) {
      filter.departmentId = new Types.ObjectId(departmentId);
    }
    return this.teamModel.find(filter).sort({ name: 1 }).exec();
  }

  async createTeam(tenantId: string, dto: CreateTeamDto) {
    const tId = new Types.ObjectId(tenantId);
    const dId = new Types.ObjectId(dto.departmentId);

    const dept = await this.departmentModel.findOne({ _id: dId, tenantId: tId }).exec();
    if (!dept) {
      throw new NotFoundException('Department does not exist.');
    }

    const existing = await this.teamModel
      .findOne({ tenantId: tId, departmentId: dId, code: dto.code.trim().toUpperCase() })
      .exec();

    if (existing) {
      throw new ConflictException(`Team code '${dto.code}' already exists in this department.`);
    }

    const created = new this.teamModel({
      tenantId: tId,
      departmentId: dId,
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      description: dto.description?.trim(),
      teamLeadEmployeeId: dto.teamLeadEmployeeId
        ? new Types.ObjectId(dto.teamLeadEmployeeId)
        : undefined,
      isActive: true,
    });

    return created.save();
  }

  async updateTeam(tenantId: string, id: string, dto: UpdateTeamDto) {
    const updatePayload: Record<string, unknown> = {};
    if (dto.name) updatePayload.name = dto.name.trim();
    if (dto.description !== undefined) updatePayload.description = dto.description.trim();
    if (dto.teamLeadEmployeeId)
      updatePayload.teamLeadEmployeeId = new Types.ObjectId(dto.teamLeadEmployeeId);
    if (dto.isActive !== undefined) updatePayload.isActive = dto.isActive;

    const updated = await this.teamModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
        { $set: updatePayload },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Team not found.');
    }
    return updated;
  }

  // --------------------------------------------------------------------------
  // Hospital Onboarding State
  // --------------------------------------------------------------------------

  async getOnboardingState(tenantId: string) {
    const tId = new Types.ObjectId(tenantId);
    let state = await this.onboardingModel.findOne({ tenantId: tId }).exec();

    if (!state) {
      state = new this.onboardingModel({
        tenantId: tId,
        currentStep: OnboardingStep.PROFILE,
        completedSteps: [],
        isCompleted: false,
        completionPercentage: 0,
        stepData: {},
      });
      await state.save();
    }

    return state;
  }

  async advanceOnboarding(tenantId: string, userId: string, dto: AdvanceOnboardingDto) {
    const tId = new Types.ObjectId(tenantId);
    let state = await this.onboardingModel.findOne({ tenantId: tId }).exec();

    if (!state) {
      state = new this.onboardingModel({
        tenantId: tId,
        currentStep: OnboardingStep.PROFILE,
        completedSteps: [],
        isCompleted: false,
        completionPercentage: 0,
        stepData: {},
      });
    }

    const allSteps = Object.values(OnboardingStep);
    const completedSet = new Set(state.completedSteps);
    completedSet.add(dto.completedStep);
    state.completedSteps = Array.from(completedSet);

    if (dto.nextStep) {
      state.currentStep = dto.nextStep;
    }

    if (dto.stepData) {
      state.stepData = { ...state.stepData, ...dto.stepData };
    }

    state.completionPercentage = Math.round((state.completedSteps.length / allSteps.length) * 100);
    state.isCompleted = state.completionPercentage >= 100;
    state.updatedBy = new Types.ObjectId(userId);

    return state.save();
  }
}
