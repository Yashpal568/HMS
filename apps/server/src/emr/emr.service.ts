import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Encounter, type EncounterDocument } from './schemas/encounter.schema.js';
import { Prescription, type PrescriptionDocument } from './schemas/prescription.schema.js';
import { Appointment, type AppointmentDocument } from '../appointments/schemas/appointment.schema.js';
import { Patient, type PatientDocument } from '../patients/schemas/patient.schema.js';
import { User, type UserDocument } from '../users/schemas/user.schema.js';
import { Queue, type QueueDocument } from '../queue/schemas/queue.schema.js';
import { QueueEntry, type QueueEntryDocument } from '../queue/schemas/queue-entry.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { LaboratoryService } from '../laboratory/laboratory.service.js';
import {
  EncounterStatus,
  PrescriptionStatus,
  AppointmentStatus,
  QueueEntryStatus,
  LabOrderPriority,
  type BmiCategory,
  type Vitals,
} from '@hms/types';
import type { UpdateEncounterDto } from './dto/update-encounter.dto.js';
import type { FinalizeEncounterDto } from './dto/finalize-encounter.dto.js';

@Injectable()
export class EmrService {
  private readonly logger = new Logger(EmrService.name);

  constructor(
    @InjectModel(Encounter.name)
    private readonly encounterModel: Model<EncounterDocument>,
    @InjectModel(Prescription.name)
    private readonly prescriptionModel: Model<PrescriptionDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly auditService: AuditService,
    @Optional()
    @Inject(forwardRef(() => LaboratoryService))
    private readonly laboratoryService?: LaboratoryService,
    @Optional()
    @InjectModel(Queue.name)
    private readonly queueModel?: Model<QueueDocument>,
    @Optional()
    @InjectModel(QueueEntry.name)
    private readonly queueEntryModel?: Model<QueueEntryDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ObjectId format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  /**
   * Automatic Body Mass Index (BMI) computation & clinical category classification
   */
  calculateBmi(weightKg?: number, heightCm?: number): { bmi?: number; category?: BmiCategory } {
    if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
      return {};
    }

    const heightMeters = heightCm / 100;
    const rawBmi = weightKg / (heightMeters * heightMeters);
    const bmi = Math.round(rawBmi * 10) / 10;

    let category: BmiCategory = 'normal';
    if (bmi < 18.5) {
      category = 'underweight';
    } else if (bmi < 25) {
      category = 'normal';
    } else if (bmi < 30) {
      category = 'overweight';
    } else {
      category = 'obese';
    }

    return { bmi, category };
  }

  /**
   * Checks prescribed medications against recorded patient allergy profile
   */
  checkAllergyContraindications(
    patientAllergies: Array<{ allergen?: string; severity?: string; reaction?: string }>,
    prescribedItems: Array<{ medicineName: string }>,
  ): string[] {
    if (!patientAllergies || patientAllergies.length === 0 || !prescribedItems || prescribedItems.length === 0) {
      return [];
    }

    const warnings: string[] = [];

    for (const item of prescribedItems) {
      const medNameLower = (item.medicineName || '').toLowerCase().trim();
      if (!medNameLower) continue;

      for (const allergy of patientAllergies) {
        const allergenLower = (allergy.allergen || '').toLowerCase().trim();
        if (!allergenLower) continue;

        // Check if medName contains allergen or allergen contains medName
        if (medNameLower.includes(allergenLower) || allergenLower.includes(medNameLower)) {
          warnings.push(
            `Allergy Warning: Prescribed "${item.medicineName}" conflicts with known patient allergy: "${allergy.allergen}" (${allergy.severity || 'moderate'} severity - ${allergy.reaction || 'allergic reaction'})`,
          );
        }
      }
    }

    return warnings;
  }

  /**
   * Start consultation: creates draft encounter or retrieves existing one for an appointment.
   * Updates appointment status to IN_CONSULTATION.
   */
  async startOrGetEncounter(
    tenantId: string,
    doctorId: string,
    appointmentId: string,
  ): Promise<{ encounter: any; warnings: string[] }> {
    const tId = this.toObjectId(tenantId);
    const docId = this.toObjectId(doctorId);
    const aptId = this.toObjectId(appointmentId);

    // 1. Verify appointment
    const appointment = await this.appointmentModel.findOne({
      _id: aptId,
      tenantId: tId,
    }).exec();

    if (!appointment) {
      throw new NotFoundException(`Appointment "${appointmentId}" not found`);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot start consultation for a cancelled appointment');
    }

    // 2. Check if encounter already exists for this appointment
    let encounter = await this.encounterModel.findOne({
      tenantId: tId,
      appointmentId: aptId,
    }).exec();

    if (!encounter) {
      // Pre-populate vitals from triage if recorded during reception check-in
      const initialVitals = (appointment as any).triageVitals || {};

      // Create new draft encounter
      encounter = new this.encounterModel({
        tenantId: tId,
        hospitalId: appointment.hospitalId,
        appointmentId: aptId,
        patientId: appointment.patientId,
        doctorId: docId,
        status: EncounterStatus.DRAFT,
        vitals: initialVitals,
        chiefComplaints: appointment.chiefComplaint ? [appointment.chiefComplaint] : [],
        diagnoses: [],
        investigations: [],
      });
      await encounter.save();

      // Transition appointment to IN_CONSULTATION if not already completed
      if (appointment.status !== AppointmentStatus.COMPLETED) {
        appointment.status = AppointmentStatus.IN_CONSULTATION;
        await appointment.save();
      }

      // Sync live OPD Queue Entry to IN_CONSULTATION
      if (this.queueEntryModel) {
        try {
          const updatedQueueEntry = await this.queueEntryModel.findOneAndUpdate(
            { tenantId: tId, appointmentId: aptId },
            {
              $set: {
                status: QueueEntryStatus.IN_CONSULTATION,
                consultationStartedAt: new Date(),
              },
            },
            { new: true },
          ).exec();

          if (updatedQueueEntry?.queueId && this.queueModel) {
            await this.queueModel.updateOne(
              { _id: updatedQueueEntry.queueId, tenantId: tId },
              {
                $set: {
                  currentServingToken: updatedQueueEntry.tokenNumber,
                  currentServingEntryId: updatedQueueEntry._id,
                },
              },
            ).exec();
          }
        } catch (err) {
          this.logger.warn(`Could not sync queue entry to IN_CONSULTATION: ${(err as Error).message}`);
        }
      }

      await this.auditService.record({
        action: 'ENCOUNTER_START',
        resource: 'Encounter',
        userId: doctorId,
        status: 'SUCCESS',
        details: {
          encounterId: encounter._id.toString(),
          appointmentId,
          patientId: appointment.patientId.toString(),
          tenantId,
        },
      });
    } else {
      // If encounter exists but has no vitals and appointment has triage vitals, populate them
      if ((!encounter.vitals || Object.keys(encounter.vitals).length === 0) && (appointment as any).triageVitals) {
        encounter.vitals = (appointment as any).triageVitals;
        await encounter.save();
      }
    }

    // Populate patient to check allergies
    const patient = await this.patientModel.findOne({
      _id: encounter.patientId,
      tenantId: tId,
    }).exec();

    const prescription = await this.prescriptionModel.findOne({
      tenantId: tId,
      encounterId: encounter._id,
    }).exec();

    const warnings = patient?.allergies && prescription?.items
      ? this.checkAllergyContraindications(patient.allergies, prescription.items)
      : [];

    return {
      encounter: {
        ...encounter.toObject(),
        patient: patient ? patient.toObject() : undefined,
        appointment: appointment.toObject(),
        prescription: prescription ? prescription.toObject() : undefined,
      },
      warnings,
    };
  }

  /**
   * Retrieve encounter details by encounter ID
   */
  async getEncounterById(tenantId: string, id: string): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const encId = this.toObjectId(id);

    const encounter = await this.encounterModel.findOne({
      _id: encId,
      tenantId: tId,
    }).exec();

    if (!encounter) {
      throw new NotFoundException(`Encounter "${id}" not found`);
    }

    const patient = await this.patientModel.findOne({
      _id: encounter.patientId,
      tenantId: tId,
    }).exec();

    const doctor = await this.userModel.findOne({
      _id: encounter.doctorId,
    }).select('firstName lastName email profile').exec();

    const appointment = encounter.appointmentId
      ? await this.appointmentModel.findOne({
          _id: encounter.appointmentId,
          tenantId: tId,
        }).exec()
      : null;

    const prescription = await this.prescriptionModel.findOne({
      tenantId: tId,
      encounterId: encounter._id,
    }).exec();

    const warnings = patient?.allergies && prescription?.items
      ? this.checkAllergyContraindications(patient.allergies, prescription.items)
      : [];

    return {
      ...(typeof encounter.toObject === 'function' ? encounter.toObject() : encounter),
      patient: patient ? (typeof patient.toObject === 'function' ? patient.toObject() : patient) : undefined,
      doctor: doctor ? {
        id: doctor._id.toString(),
        name: `${doctor.firstName} ${doctor.lastName}`.trim(),
        email: doctor.email,
      } : undefined,
      appointment: appointment ? (typeof appointment.toObject === 'function' ? appointment.toObject() : appointment) : undefined,
      prescription: prescription ? (typeof prescription.toObject === 'function' ? prescription.toObject() : prescription) : undefined,
      allergyWarnings: warnings,
    };
  }

  /**
   * Retrieve encounter by appointment ID
   */
  async getEncounterByAppointment(tenantId: string, appointmentId: string): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const aptId = this.toObjectId(appointmentId);

    const encounter = await this.encounterModel.findOne({
      tenantId: tId,
      appointmentId: aptId,
    }).exec();

    if (!encounter) {
      throw new NotFoundException(`Encounter for appointment "${appointmentId}" not found`);
    }

    return this.getEncounterById(tenantId, encounter._id.toString());
  }

  /**
   * Save draft notes, vitals, diagnoses, and prescription items
   */
  async updateEncounter(
    tenantId: string,
    doctorId: string,
    id: string,
    dto: UpdateEncounterDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const encId = this.toObjectId(id);

    const encounter = await this.encounterModel.findOne({
      _id: encId,
      tenantId: tId,
    }).exec();

    if (!encounter) {
      throw new NotFoundException(`Encounter "${id}" not found`);
    }

    if (encounter.status === EncounterStatus.FINALIZED) {
      throw new BadRequestException('Encounter is finalized and cannot be modified');
    }

    // 1. Process Vitals & BMI
    if (dto.vitals) {
      const vitalsObj: Vitals = {
        bpSystolic: dto.vitals.bpSystolic ?? encounter.vitals?.bpSystolic,
        bpDiastolic: dto.vitals.bpDiastolic ?? encounter.vitals?.bpDiastolic,
        pulse: dto.vitals.pulse ?? encounter.vitals?.pulse,
        temperature: dto.vitals.temperature ?? encounter.vitals?.temperature,
        respiratoryRate: dto.vitals.respiratoryRate ?? encounter.vitals?.respiratoryRate,
        spO2: dto.vitals.spO2 ?? encounter.vitals?.spO2,
        weight: dto.vitals.weight ?? encounter.vitals?.weight,
        height: dto.vitals.height ?? encounter.vitals?.height,
      };
      const weight = vitalsObj.weight;
      const height = vitalsObj.height;

      if (weight && height) {
        const { bmi, category } = this.calculateBmi(weight, height);
        vitalsObj.bmi = bmi;
        vitalsObj.bmiCategory = category;
      }

      encounter.vitals = vitalsObj as any;
    }

    // 2. Clinical Notes & Complaints
    if (dto.chiefComplaints !== undefined) {
      encounter.chiefComplaints = dto.chiefComplaints;
    }
    if (dto.historyOfPresentIllness !== undefined) {
      encounter.historyOfPresentIllness = dto.historyOfPresentIllness;
    }
    if (dto.examinationNotes !== undefined) {
      encounter.examinationNotes = dto.examinationNotes;
    }

    // 3. Diagnoses
    if (dto.diagnoses !== undefined) {
      encounter.diagnoses = dto.diagnoses as any;
    }

    // 4. Investigations
    if (dto.investigations !== undefined) {
      encounter.investigations = dto.investigations as any;
    }

    await encounter.save();

    // 5. Prescriptions
    let prescription = await this.prescriptionModel.findOne({
      tenantId: tId,
      encounterId: encounter._id,
    }).exec();

    if (dto.prescriptionItems !== undefined) {
      if (!prescription) {
        prescription = new this.prescriptionModel({
          tenantId: tId,
          encounterId: encounter._id,
          patientId: encounter.patientId,
          doctorId: this.toObjectId(doctorId),
          status: PrescriptionStatus.ACTIVE,
          items: dto.prescriptionItems,
          notes: dto.prescriptionNotes,
        });
      } else {
        prescription.items = dto.prescriptionItems as any;
        if (dto.prescriptionNotes !== undefined) {
          prescription.notes = dto.prescriptionNotes;
        }
      }
      await prescription.save();
    }

    // Check allergy warnings against patient
    const patient = await this.patientModel.findOne({
      _id: encounter.patientId,
      tenantId: tId,
    }).exec();

    const warnings = patient?.allergies && prescription?.items
      ? this.checkAllergyContraindications(patient.allergies, prescription.items)
      : [];

    await this.auditService.record({
      action: 'ENCOUNTER_UPDATE',
      resource: 'Encounter',
      userId: doctorId,
      status: 'SUCCESS',
      details: { encounterId: id, tenantId },
    });

    return {
      ...encounter.toObject(),
      prescription: prescription ? prescription.toObject() : undefined,
      allergyWarnings: warnings,
    };
  }

  /**
   * Finalize and seal the consultation encounter.
   * Locks the record, creates/seals electronic prescription, and marks appointment completed.
   */
  async finalizeEncounter(
    tenantId: string,
    doctorId: string,
    id: string,
    dto?: FinalizeEncounterDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const encId = this.toObjectId(id);
    const docId = this.toObjectId(doctorId);

    const encounter = await this.encounterModel.findOne({
      _id: encId,
      tenantId: tId,
    }).exec();

    if (!encounter) {
      throw new NotFoundException(`Encounter "${id}" not found`);
    }

    if (encounter.status === EncounterStatus.FINALIZED) {
      throw new BadRequestException('Encounter is already finalized');
    }

    // Apply any updates before sealing
    if (dto) {
      await this.updateEncounter(tenantId, doctorId, id, dto);
    }

    // Refresh encounter state
    const currentEncounter = await this.encounterModel.findById(encId).exec();
    if (!currentEncounter) {
      throw new NotFoundException(`Encounter "${id}" not found`);
    }

    // Ensure at least one diagnosis is present for medico-legal integrity
    if (!currentEncounter.diagnoses || currentEncounter.diagnoses.length === 0) {
      throw new BadRequestException('At least one clinical diagnosis is required to finalize consultation');
    }

    // Finalize encounter
    currentEncounter.status = EncounterStatus.FINALIZED;
    currentEncounter.finalizedAt = new Date();
    currentEncounter.finalizedBy = docId;
    await currentEncounter.save();

    // Finalize associated prescription
    const prescription = await this.prescriptionModel.findOne({
      tenantId: tId,
      encounterId: encId,
    }).exec();

    if (prescription) {
      prescription.status = PrescriptionStatus.ACTIVE;
      await prescription.save();

      await this.auditService.record({
        action: 'PRESCRIPTION_CREATE',
        resource: 'Prescription',
        userId: doctorId,
        status: 'SUCCESS',
        details: {
          prescriptionId: prescription._id.toString(),
          encounterId: id,
          patientId: currentEncounter.patientId.toString(),
          itemsCount: prescription.items.length,
          tenantId,
        },
      });
    }

    // Auto-create Laboratory Order if investigations were requisitioned
    if (this.laboratoryService && currentEncounter.investigations?.length) {
      try {
        const availableTests = (await this.laboratoryService.getTestCatalog(
          tId.toString(),
        )) as Array<{ _id: Types.ObjectId; name: string; code: string }>;
        const matchedTestIds: string[] = [];

        for (const inv of currentEncounter.investigations) {
          const invNameLower = inv.testName.toLowerCase().trim();
          const match = availableTests.find(
            (t: { name: string; code: string }) =>
              t.name.toLowerCase().includes(invNameLower) ||
              invNameLower.includes(t.name.toLowerCase()) ||
              invNameLower.includes(t.code.toLowerCase()),
          );
          if (match && !matchedTestIds.includes(match._id.toString())) {
            matchedTestIds.push(match._id.toString());
          }
        }

        const finalTestIds =
          matchedTestIds.length > 0
            ? matchedTestIds
            : availableTests.slice(0, 1).map((t: { _id: Types.ObjectId }) => t._id.toString());

        if (finalTestIds.length > 0) {
          await this.laboratoryService.createOrder(
            tId.toString(),
            doctorId,
            {
              patientId: currentEncounter.patientId.toString(),
              doctorId,
              testIds: finalTestIds,
              appointmentId: currentEncounter.appointmentId?.toString(),
              priority: currentEncounter.investigations.some((i) => i.urgency === 'urgent')
                ? LabOrderPriority.STAT
                : LabOrderPriority.ROUTINE,
              clinicalNotes: `Investigations ordered during consultation: ${currentEncounter.investigations.map((i) => i.testName).join(', ')}`,
            },
          );
        }
      } catch (err) {
        this.logger.warn(
          `Could not auto-generate lab order on encounter finalization: ${(err as Error).message}`,
        );
      }
    }

    // Transition appointment to COMPLETED
    if (currentEncounter.appointmentId) {
      await this.appointmentModel.updateOne(
        { _id: currentEncounter.appointmentId, tenantId: tId },
        { $set: { status: AppointmentStatus.COMPLETED } },
      ).exec();

      // Sync live OPD Queue Entry to COMPLETED and increment parent queue counters
      if (this.queueEntryModel) {
        try {
          const completedQueueEntry = await this.queueEntryModel.findOneAndUpdate(
            { tenantId: tId, appointmentId: currentEncounter.appointmentId },
            {
              $set: {
                status: QueueEntryStatus.COMPLETED,
                completedAt: new Date(),
              },
            },
            { new: true },
          ).exec();

          if (completedQueueEntry?.queueId && this.queueModel) {
            await this.queueModel.updateOne(
              { _id: completedQueueEntry.queueId, tenantId: tId },
              {
                $inc: { totalCompleted: 1 },
                $unset: { currentServingEntryId: '', currentServingToken: '' },
              },
            ).exec();
          }
        } catch (err) {
          this.logger.warn(`Could not sync queue entry to COMPLETED: ${(err as Error).message}`);
        }
      }
    }

    await this.auditService.record({
      action: 'ENCOUNTER_FINALIZE',
      resource: 'Encounter',
      userId: doctorId,
      status: 'SUCCESS',
      details: {
        encounterId: id,
        appointmentId: currentEncounter.appointmentId?.toString(),
        finalizedAt: currentEncounter.finalizedAt?.toISOString(),
        tenantId,
      },
    });

    return this.getEncounterById(tenantId, id);
  }

  /**
   * Retrieve longitudinal encounter history for a patient
   */
  async getPatientHistory(tenantId: string, patientId: string): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    const pId = this.toObjectId(patientId);

    const encounters = await this.encounterModel
      .find({
        tenantId: tId,
        patientId: pId,
      })
      .sort({ createdAt: -1 })
      .exec();

    const results = await Promise.all(
      encounters.map(async (enc) => {
        const doc = await this.userModel
          .findById(enc.doctorId)
          .select('firstName lastName email profile')
          .exec();

        const rx = await this.prescriptionModel
          .findOne({ tenantId: tId, encounterId: enc._id })
          .exec();

        return {
          ...enc.toObject(),
          doctor: doc ? {
            id: doc._id.toString(),
            name: `${doc.firstName} ${doc.lastName}`.trim(),
            email: doc.email,
          } : undefined,
          prescription: rx ? rx.toObject() : undefined,
        };
      }),
    );

    return results;
  }

  /**
   * Retrieve all prescriptions for a patient
   */
  async getPrescriptionsByPatient(tenantId: string, patientId: string): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    const pId = this.toObjectId(patientId);

    const prescriptions = await this.prescriptionModel
      .find({
        tenantId: tId,
        patientId: pId,
      })
      .sort({ createdAt: -1 })
      .exec();

    const results = await Promise.all(
      prescriptions.map(async (rx) => {
        const doc = await this.userModel
          .findById(rx.doctorId)
          .select('firstName lastName')
          .exec();

        return {
          ...rx.toObject(),
          doctorName: doc ? `${doc.firstName} ${doc.lastName}`.trim() : undefined,
        };
      }),
    );

    return results;
  }

  /**
   * Retrieve prescription for a specific encounter
   */
  async getPrescriptionByEncounter(tenantId: string, encounterId: string): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const encId = this.toObjectId(encounterId);

    const prescription = await this.prescriptionModel.findOne({
      tenantId: tId,
      encounterId: encId,
    }).exec();

    if (!prescription) {
      throw new NotFoundException(`Prescription for encounter "${encounterId}" not found`);
    }

    const doc = await this.userModel
      .findById(prescription.doctorId)
      .select('firstName lastName')
      .exec();

    return {
      ...prescription.toObject(),
      doctorName: doc ? `${doc.firstName} ${doc.lastName}`.trim() : undefined,
    };
  }
}
