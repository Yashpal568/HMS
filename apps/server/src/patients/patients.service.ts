import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Patient, PatientDocument } from './schemas/patient.schema.js';
import { Counter, CounterDocument } from './schemas/counter.schema.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientQueryDto } from './dto/patient-query.dto.js';
import { AuditService } from '../audit/audit.service.js';
import {
  DuplicateCheckResult,
  PaginationMeta,
  Patient as IPatient,
  PatientSummary,
  AllergySeverity,
} from '@hms/types';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Atomic, collision-free sequential UHID generator per tenant.
   * Format: UHID-YYYY-NNNNNN (e.g. UHID-2026-000001)
   */
  async generateNextUhid(tenantId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();

    const counter = await this.counterModel
      .findOneAndUpdate(
        { tenantId, year },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    const seq = counter?.seq || 1;
    const paddedSeq = seq.toString().padStart(6, '0');
    return `UHID-${year}-${paddedSeq}`;
  }

  /**
   * Duplicate detection engine querying phone number and date of birth
   * within the caller's tenant boundary.
   */
  async checkDuplicate(
    phone: string,
    dateOfBirth: string | Date,
    tenantId: Types.ObjectId,
  ): Promise<DuplicateCheckResult> {
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw new BadRequestException('Invalid date of birth provided.');
    }

    const trimmedPhone = phone.trim();

    // Look for existing patient with matching phone and birth date
    const existing = await this.patientModel
      .findOne({
        tenantId,
        'contacts.phone': trimmedPhone,
        dateOfBirth: dob,
      })
      .exec();

    if (!existing) {
      return { hasDuplicate: false };
    }

    return {
      hasDuplicate: true,
      existingPatient: {
        id: existing._id.toString(),
        uhid: existing.uhid,
        name: {
          first: existing.name.first,
          middle: existing.name.middle,
          last: existing.name.last,
        },
        phone: existing.contacts.phone,
        dateOfBirth: existing.dateOfBirth.toISOString().split('T')[0] || '',
      },
    };
  }

  /**
   * Register a new patient in the hospital directory with atomic UHID assignment.
   */
  async create(
    dto: CreatePatientDto,
    tenantId: Types.ObjectId,
    userId: string,
    hospitalId?: Types.ObjectId,
  ): Promise<IPatient> {
    const uhid = await this.generateNextUhid(tenantId);
    const dob = new Date(dto.dateOfBirth);

    const createdPatient = new this.patientModel({
      ...dto,
      tenantId,
      hospitalId,
      uhid,
      dateOfBirth: dob,
      createdBy: userId,
      updatedBy: userId,
    });

    const saved = await createdPatient.save();

    // Log security audit event
    await this.auditService.record({
      hospitalId: hospitalId?.toString(),
      userId,
      action: 'PATIENT_CREATE',
      resource: 'patients',
      status: 'SUCCESS',
      details: {
        patientId: saved._id.toString(),
        uhid: saved.uhid,
        name: `${saved.name.first} ${saved.name.last}`,
        phone: saved.contacts.phone,
      },
    });

    return this.mapToEntity(saved);
  }

  /**
   * Paginated directory search scoped strictly to caller's tenant.
   */
  async findAll(
    query: PatientQueryDto,
    tenantId: Types.ObjectId,
  ): Promise<{ data: PatientSummary[]; meta: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { tenantId };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      filter.$or = [
        { uhid: searchRegex },
        { 'name.first': searchRegex },
        { 'name.last': searchRegex },
        { 'contacts.phone': searchRegex },
      ];
    }

    const [total, documents] = await Promise.all([
      this.patientModel.countDocuments(filter).exec(),
      this.patientModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    const data = documents.map((doc) => this.mapToSummary(doc));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieve patient by ObjectId or UHID, enforcing tenant isolation and uniform 404 existence masking.
   */
  async findById(
    idOrUhid: string,
    tenantId: Types.ObjectId,
    userId?: string,
  ): Promise<IPatient> {
    const query: Record<string, unknown> = { tenantId };

    if (Types.ObjectId.isValid(idOrUhid)) {
      query._id = new Types.ObjectId(idOrUhid);
    } else {
      query.uhid = idOrUhid.toUpperCase().trim();
    }

    const patient = await this.patientModel.findOne(query).exec();

    if (!patient) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: 'Patient record not found.',
        },
      });
    }

    if (userId) {
      await this.auditService.record({
        userId,
        action: 'PATIENT_ACCESS',
        resource: 'patients',
        status: 'SUCCESS',
        details: {
          patientId: patient._id.toString(),
          uhid: patient.uhid,
        },
      });
    }

    return this.mapToEntity(patient);
  }

  /**
   * Update demographic, contact, or allergy details for an existing patient.
   */
  async update(
    id: string,
    dto: UpdatePatientDto,
    tenantId: Types.ObjectId,
    userId: string,
  ): Promise<IPatient> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: 'Patient record not found.',
        },
      });
    }

    const patient = await this.patientModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .exec();

    if (!patient) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: 'Patient record not found.',
        },
      });
    }

    if (dto.name) {
      patient.name.first = dto.name.first || patient.name.first;
      if (dto.name.middle !== undefined) patient.name.middle = dto.name.middle;
      patient.name.last = dto.name.last || patient.name.last;
    }

    if (dto.dateOfBirth) {
      patient.dateOfBirth = new Date(dto.dateOfBirth);
    }

    if (dto.gender) patient.gender = dto.gender;
    if (dto.bloodGroup) patient.bloodGroup = dto.bloodGroup;
    if (dto.maritalStatus) patient.maritalStatus = dto.maritalStatus;
    if (dto.status) patient.status = dto.status;

    if (dto.contacts) {
      if (dto.contacts.phone) patient.contacts.phone = dto.contacts.phone;
      if (dto.contacts.alternatePhone !== undefined) {
        patient.contacts.alternatePhone = dto.contacts.alternatePhone;
      }
      if (dto.contacts.email !== undefined) patient.contacts.email = dto.contacts.email;
      if (dto.contacts.address) {
        patient.contacts.address = {
          ...patient.contacts.address,
          ...dto.contacts.address,
        };
      }
    }

    if (dto.emergencyContact) {
      patient.emergencyContact = {
        ...patient.emergencyContact,
        ...dto.emergencyContact,
      };
    }

    if (dto.allergies) {
      patient.allergies = dto.allergies as unknown as typeof patient.allergies;
    }

    patient.updatedBy = userId;
    const updated = await patient.save();

    await this.auditService.record({
      userId,
      action: 'PATIENT_UPDATE',
      resource: 'patients',
      status: 'SUCCESS',
      details: {
        patientId: updated._id.toString(),
        uhid: updated.uhid,
      },
    });

    return this.mapToEntity(updated);
  }

  private mapToEntity(doc: PatientDocument): IPatient {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      uhid: doc.uhid,
      name: {
        first: doc.name.first,
        middle: doc.name.middle,
        last: doc.name.last,
      },
      dateOfBirth: doc.dateOfBirth.toISOString().split('T')[0] || '',
      gender: doc.gender,
      bloodGroup: doc.bloodGroup,
      maritalStatus: doc.maritalStatus,
      contacts: {
        phone: doc.contacts.phone,
        alternatePhone: doc.contacts.alternatePhone,
        email: doc.contacts.email,
        address: {
          street: doc.contacts.address.street,
          city: doc.contacts.address.city,
          state: doc.contacts.address.state,
          postalCode: doc.contacts.address.postalCode,
          country: doc.contacts.address.country,
        },
      },
      emergencyContact: {
        name: doc.emergencyContact.name,
        relationship: doc.emergencyContact.relationship,
        phone: doc.emergencyContact.phone,
      },
      allergies: (doc.allergies || []).map((a) => ({
        allergen: a.allergen,
        category: a.category,
        severity: a.severity,
        notes: a.notes,
      })),
      status: doc.status,
      createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString() || new Date().toISOString(),
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy,
    };
  }

  private mapToSummary(doc: PatientDocument): PatientSummary {
    const allergies = doc.allergies || [];
    const hasSevere = allergies.some((a) => a.severity === AllergySeverity.SEVERE);

    return {
      id: doc._id.toString(),
      uhid: doc.uhid,
      name: {
        first: doc.name.first,
        middle: doc.name.middle,
        last: doc.name.last,
      },
      dateOfBirth: doc.dateOfBirth.toISOString().split('T')[0] || '',
      gender: doc.gender,
      bloodGroup: doc.bloodGroup,
      phone: doc.contacts.phone,
      city: doc.contacts.address.city,
      status: doc.status,
      allergyCount: allergies.length,
      hasSevereAllergies: hasSevere,
      createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
    };
  }
}
