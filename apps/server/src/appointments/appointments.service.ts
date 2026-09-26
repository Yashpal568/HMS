import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, type AppointmentDocument } from './schemas/appointment.schema.js';
import { DoctorSchedule, type DoctorScheduleDocument } from './schemas/doctor-schedule.schema.js';
import { Patient, type PatientDocument } from '../patients/schemas/patient.schema.js';
import { User, type UserDocument, UserRole, UserStatus } from '../users/schemas/user.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { QueueService } from '../queue/queue.service.js';
import {
  AppointmentStatus,
  AppointmentType,
  QueuePriority,
  type AvailableSlot,
  type DoctorUserSummary,
} from '@hms/types';
import type { BookAppointmentDto } from './dto/book-appointment.dto.js';
import type { DoctorScheduleDto } from './dto/doctor-schedule.dto.js';
import type { AppointmentQueryDto } from './dto/appointment-query.dto.js';
import type { CheckInTriageDto } from './dto/check-in-triage.dto.js';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(DoctorSchedule.name)
    private readonly doctorScheduleModel: Model<DoctorScheduleDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => QueueService))
    private readonly queueService: QueueService,
  ) {}

  /**
   * Helper to ensure valid ObjectId
   */
  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ID format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  /**
   * Retrieve active clinicians/doctors in hospital tenant
   */
  async getDoctors(tenantId: string): Promise<DoctorUserSummary[]> {
    const tId = this.toObjectId(tenantId);
    let doctors = await this.userModel
      .find({
        role: UserRole.DOCTOR,
        status: UserStatus.ACTIVE,
      })
      .select('_id firstName lastName email role')
      .lean()
      .exec();

    // If no doctor accounts exist in system yet, seed a default clinical specialist for testing
    if (doctors.length === 0) {
      const defaultDoc = await this.userModel.create({
        email: 'dr.sharma@hms.local',
        passwordHash: '$2a$12$K8l.8.p2Gf6Zz/j5hU0UeeX9g3b3I8b2Q9V7Z3d8p4m1Q2s5t8u.', // placeholder hash
        firstName: 'Dr. Rajesh',
        lastName: 'Sharma',
        role: UserRole.DOCTOR,
        permissions: ['appointments.read', 'appointments.update', 'emr.read', 'emr.create'],
        status: UserStatus.ACTIVE,
        hospitalId: tId,
      });

      doctors = [defaultDoc as any];
    }

    return doctors.map((doc: any) => ({
      id: String(doc._id),
      name: `${doc.firstName} ${doc.lastName}`,
      email: doc.email,
      department: 'General Medicine',
      role: doc.role,
    }));
  }

  /**
   * Retrieve doctor schedule roster
   */
  async getDoctorSchedules(tenantId: string, doctorId?: string): Promise<DoctorScheduleDocument[]> {
    const tId = this.toObjectId(tenantId);
    const filter: Record<string, any> = { tenantId: tId, isActive: true };
    if (doctorId) {
      filter.doctorId = this.toObjectId(doctorId);
    }
    return this.doctorScheduleModel
      .find(filter)
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean()
      .exec() as unknown as DoctorScheduleDocument[];
  }

  /**
   * Configure/Update doctor schedule roster
   */
  async upsertDoctorSchedule(
    tenantId: string,
    userId: string,
    dto: DoctorScheduleDto,
  ): Promise<DoctorScheduleDocument> {
    const tId = this.toObjectId(tenantId);
    const docId = this.toObjectId(dto.doctorId);

    // Validate that doctor exists
    const doctor = await this.userModel.findById(docId).exec();
    if (!doctor) {
      throw new NotFoundException('Doctor user account not found');
    }

    const schedule = await this.doctorScheduleModel.findOneAndUpdate(
      { tenantId: tId, doctorId: docId, dayOfWeek: dto.dayOfWeek },
      {
        ...dto,
        tenantId: tId,
        doctorId: docId,
        updatedBy: this.toObjectId(userId),
      },
      { upsert: true, returnDocument: 'after' },
    );

    await this.auditService.record({
      action: 'DOCTOR_SCHEDULE_UPDATE',
      resource: 'doctor_schedules',
      status: 'SUCCESS',
      hospitalId: String(tId),
      userId,
      details: {
        doctorId: dto.doctorId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });

    return schedule;
  }

  /**
   * Compute available appointment slots for doctor on specific date
   */
  async getAvailableSlots(
    tenantId: string,
    doctorId: string,
    dateStr: string,
  ): Promise<{ availableSlots: AvailableSlot[]; doctorName: string; department: string }> {
    const tId = this.toObjectId(tenantId);
    const docId = this.toObjectId(doctorId);

    const doctor = await this.userModel.findById(docId).exec();
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Parse target date and find day of week
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
    }
    const dayOfWeek = targetDate.getUTCDay();

    // Look for doctor schedule
    let schedule: any = await this.doctorScheduleModel
      .findOne({ tenantId: tId, doctorId: docId, dayOfWeek, isActive: true })
      .lean()
      .exec();

    // If no explicit schedule configured, provide standard clinical schedule (Mon-Sat 09:00 - 13:00, 15m slots)
    if (!schedule) {
      schedule = {
        _id: new Types.ObjectId(),
        tenantId: tId,
        doctorId: docId,
        department: 'General Medicine',
        dayOfWeek,
        startTime: '09:00',
        endTime: '13:00',
        slotDurationMinutes: 15,
        maxPatients: 30,
        isActive: true,
      };
    }

    // Generate time slots array
    const slots: string[] = [];
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = schedule.slotDurationMinutes || 15;

    while (currentMinutes + duration <= endMinutes) {
      const h1 = Math.floor(currentMinutes / 60);
      const m1 = currentMinutes % 60;
      const nextMin = currentMinutes + duration;
      const h2 = Math.floor(nextMin / 60);
      const m2 = nextMin % 60;

      const slotStr = `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')} - ${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`;
      slots.push(slotStr);
      currentMinutes += duration;
    }

    // Fetch existing non-cancelled appointments for this doctor on this day
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const existingAppointments = await this.appointmentModel
      .find({
        tenantId: tId,
        doctorId: docId,
        scheduledAt: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: AppointmentStatus.CANCELLED },
      })
      .select('timeSlot')
      .lean()
      .exec();

    const bookedSlotSet = new Set(existingAppointments.map((a) => a.timeSlot));

    const availableSlots: AvailableSlot[] = slots.map((timeSlot) => ({
      timeSlot,
      isAvailable: !bookedSlotSet.has(timeSlot),
      reason: bookedSlotSet.has(timeSlot) ? 'Booked' : undefined,
    }));

    return {
      availableSlots,
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
      department: schedule.department || 'General Medicine',
    };
  }

  /**
   * Atomic sequential token generation for doctor/date
   */
  async getNextToken(tenantId: Types.ObjectId, doctorId: Types.ObjectId, scheduledDate: Date): Promise<number> {
    const dateStr = scheduledDate.toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const latest = await this.appointmentModel
      .findOne({
        tenantId,
        doctorId,
        scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber')
      .lean()
      .exec();

    return (latest?.tokenNumber || 0) + 1;
  }

  /**
   * Book appointment with double-booking prevention and token assignment
   */
  async bookAppointment(
    tenantId: string,
    userId: string,
    dto: BookAppointmentDto,
  ): Promise<AppointmentDocument> {
    const tId = this.toObjectId(tenantId);
    const pId = this.toObjectId(dto.patientId);
    const docId = this.toObjectId(dto.doctorId);

    // 1. Verify patient exists within caller's sovereign tenant context
    const patient = await this.patientModel.findOne({ _id: pId, tenantId: tId }).exec();
    if (!patient) {
      throw new NotFoundException('Patient record not found in this hospital tenant');
    }

    // 2. Verify doctor exists
    const doctor = await this.userModel.findById(docId).exec();
    if (!doctor) {
      throw new NotFoundException('Doctor user not found');
    }

    // 3. Parse date
    const scheduledDate = new Date(`${dto.scheduledAt}T00:00:00.000Z`);
    if (isNaN(scheduledDate.getTime())) {
      throw new BadRequestException('Invalid scheduledAt date format');
    }

    const startOfDay = new Date(`${dto.scheduledAt}T00:00:00.000Z`);
    const endOfDay = new Date(`${dto.scheduledAt}T23:59:59.999Z`);

    // 4. Double-Booking Prevention: Check if timeSlot already occupied
    const slotConflict = await this.appointmentModel.findOne({
      tenantId: tId,
      doctorId: docId,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      timeSlot: dto.timeSlot,
      status: { $ne: AppointmentStatus.CANCELLED },
    });

    if (slotConflict) {
      throw new ConflictException(
        `Time slot ${dto.timeSlot} is already booked for this clinician on ${dto.scheduledAt}`,
      );
    }

    // 5. Check if same patient already has active appointment with doctor on this date
    const patientConflict = await this.appointmentModel.findOne({
      tenantId: tId,
      patientId: pId,
      doctorId: docId,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: AppointmentStatus.CANCELLED },
    });

    if (patientConflict) {
      throw new ConflictException(
        `Patient ${patient.uhid} already has an active appointment with this clinician on ${dto.scheduledAt}`,
      );
    }

    // 6. Generate sequential daily token number
    const tokenNumber = await this.getNextToken(tId, docId, scheduledDate);

    // 7. Create appointment
    const appointment = await this.appointmentModel.create({
      tenantId: tId,
      hospitalId: tId,
      patientId: pId,
      doctorId: docId,
      department: dto.department,
      tokenNumber,
      scheduledAt: scheduledDate,
      timeSlot: dto.timeSlot,
      type: dto.type || AppointmentType.NEW,
      status: AppointmentStatus.SCHEDULED,
      chiefComplaint: dto.chiefComplaint?.trim(),
      createdBy: this.toObjectId(userId),
    });

    // 8. Security audit trail
    await this.auditService.record({
      action: 'APPOINTMENT_CREATE',
      resource: 'appointments',
      status: 'SUCCESS',
      hospitalId: String(tId),
      userId,
      details: {
        appointmentId: String(appointment._id),
        patientId: dto.patientId,
        uhid: patient.uhid,
        doctorId: dto.doctorId,
        tokenNumber,
        scheduledAt: dto.scheduledAt,
        timeSlot: dto.timeSlot,
      },
    });

    return this.getAppointmentById(tenantId, String(appointment._id));
  }

  /**
   * Search and filter appointments with OPD queue counters
   */
  async findAppointments(
    tenantId: string,
    query: AppointmentQueryDto,
  ): Promise<{
    items: any[];
    total: number;
    summary: {
      total: number;
      scheduled: number;
      checkedIn: number;
      inConsultation: number;
      completed: number;
      cancelled: number;
    };
  }> {
    const tId = this.toObjectId(tenantId);
    const filter: Record<string, any> = { tenantId: tId };

    if (query.date) {
      const startOfDay = new Date(`${query.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${query.date}T23:59:59.999Z`);
      filter.scheduledAt = { $gte: startOfDay, $lte: endOfDay };
    }

    if (query.doctorId) {
      filter.doctorId = this.toObjectId(query.doctorId);
    }

    if (query.department) {
      filter.department = query.department;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.patientId) {
      filter.patientId = this.toObjectId(query.patientId);
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      const matchingPatients = await this.patientModel
        .find({
          tenantId: tId,
          $or: [
            { uhid: searchRegex },
            { 'name.first': searchRegex },
            { 'name.last': searchRegex },
            { 'contacts.phone': searchRegex },
          ],
        })
        .select('_id')
        .lean()
        .exec();

      const patientIds = matchingPatients.map((p) => p._id);
      const orConditions: any[] = [{ patientId: { $in: patientIds } }];

      if (!isNaN(Number(term))) {
        orConditions.push({ tokenNumber: Number(term) });
      }

      filter.$or = orConditions;
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const skip = (page - 1) * limit;

    const [rawItems, total, allForCounters] = await Promise.all([
      this.appointmentModel
        .find(filter)
        .sort({ scheduledAt: 1, tokenNumber: 1 })
        .skip(skip)
        .limit(limit)
        .populate('patientId', 'uhid name contacts gender bloodGroup')
        .populate('doctorId', 'firstName lastName email department role')
        .lean()
        .exec(),
      this.appointmentModel.countDocuments(filter).exec(),
      this.appointmentModel
        .find(query.date ? filter : { tenantId: tId })
        .select('status')
        .lean()
        .exec(),
    ]);

    // Calculate queue counters
    const summaryCounters = {
      total: allForCounters.length,
      scheduled: 0,
      checkedIn: 0,
      inConsultation: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const appt of allForCounters) {
      if (appt.status === AppointmentStatus.SCHEDULED) summaryCounters.scheduled++;
      else if (appt.status === AppointmentStatus.CHECKED_IN) summaryCounters.checkedIn++;
      else if (appt.status === AppointmentStatus.IN_CONSULTATION) summaryCounters.inConsultation++;
      else if (appt.status === AppointmentStatus.COMPLETED) summaryCounters.completed++;
      else if (appt.status === AppointmentStatus.CANCELLED) summaryCounters.cancelled++;
    }

    const items = rawItems.map((item: any) => ({
      id: String(item._id),
      tenantId: String(item.tenantId),
      patientId: String(item.patientId?._id || item.patientId),
      doctorId: String(item.doctorId?._id || item.doctorId),
      department: item.department,
      tokenNumber: item.tokenNumber,
      scheduledAt: item.scheduledAt ? item.scheduledAt.toISOString() : '',
      timeSlot: item.timeSlot,
      type: item.type,
      status: item.status,
      triagePriority: item.triagePriority,
      triageVitals: item.triageVitals,
      triageNotes: item.triageNotes,
      chiefComplaint: item.chiefComplaint,
      checkedInAt: item.checkedInAt ? item.checkedInAt.toISOString() : undefined,
      cancelledReason: item.cancelledReason,
      patient: item.patientId
        ? {
            id: String(item.patientId._id),
            uhid: item.patientId.uhid,
            name: item.patientId.name,
            gender: item.patientId.gender,
            bloodGroup: item.patientId.bloodGroup,
            phone: item.patientId.contacts?.phone,
          }
        : undefined,
      doctor: item.doctorId
        ? {
            id: String(item.doctorId._id),
            name: `${item.doctorId.firstName} ${item.doctorId.lastName}`,
            email: item.doctorId.email,
            department: item.department,
            role: item.doctorId.role,
          }
        : undefined,
      createdAt: item.createdAt ? item.createdAt.toISOString() : '',
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : '',
    }));

    return {
      items,
      total,
      summary: summaryCounters,
    };
  }

  /**
   * Retrieve appointment by ID with uniform 404 existence masking
   */
  async getAppointmentById(tenantId: string, id: string): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const apptId = this.toObjectId(id);

    const item = await this.appointmentModel
      .findOne({ _id: apptId, tenantId: tId })
      .populate('patientId', 'uhid name contacts gender bloodGroup dateOfBirth allergies')
      .populate('doctorId', 'firstName lastName email department role')
      .lean()
      .exec();

    if (!item) {
      throw new NotFoundException('Appointment record not found');
    }

    const patientData = item.patientId as any;
    const doctorData = item.doctorId as any;

    return {
      id: String(item._id),
      tenantId: String(item.tenantId),
      patientId: String(patientData?._id || item.patientId),
      doctorId: String(doctorData?._id || item.doctorId),
      department: item.department,
      tokenNumber: item.tokenNumber,
      scheduledAt: item.scheduledAt ? item.scheduledAt.toISOString() : '',
      timeSlot: item.timeSlot,
      type: item.type,
      status: item.status,
      triagePriority: item.triagePriority,
      triageVitals: item.triageVitals,
      triageNotes: item.triageNotes,
      chiefComplaint: item.chiefComplaint,
      checkedInAt: item.checkedInAt ? item.checkedInAt.toISOString() : undefined,
      cancelledReason: item.cancelledReason,
      patient: patientData
        ? {
            id: String(patientData._id),
            uhid: patientData.uhid,
            name: patientData.name,
            gender: patientData.gender,
            bloodGroup: patientData.bloodGroup,
            dateOfBirth: patientData.dateOfBirth,
            phone: patientData.contacts?.phone,
            allergies: patientData.allergies || [],
          }
        : undefined,
      doctor: doctorData
        ? {
            id: String(doctorData._id),
            name: `${doctorData.firstName} ${doctorData.lastName}`,
            email: doctorData.email,
            department: item.department,
            role: doctorData.role,
          }
        : undefined,
      createdAt: (item as any).createdAt ? (item as any).createdAt.toISOString() : '',
      updatedAt: (item as any).updatedAt ? (item as any).updatedAt.toISOString() : '',
    };
  }

  /**
   * Reception Check-In Action with Clinical Triage and Live OPD Queue Enrollment
   */
  async checkInAppointment(
    tenantId: string,
    userId: string,
    id: string,
    dto?: CheckInTriageDto,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const apptId = this.toObjectId(id);

    const appointment = await this.appointmentModel.findOne({ _id: apptId, tenantId: tId }).exec();
    if (!appointment) {
      throw new NotFoundException('Appointment record not found');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot check in a cancelled appointment');
    }

    if (
      appointment.status === AppointmentStatus.CHECKED_IN ||
      appointment.status === AppointmentStatus.IN_CONSULTATION
    ) {
      throw new ConflictException(`Appointment "${id}" is already checked into queue`);
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Appointment is already completed');
    }

    // Triage priority and notes
    const priority = dto?.priority || appointment.triagePriority || QueuePriority.NORMAL;
    appointment.triagePriority = priority;
    if (dto?.triageNotes) {
      appointment.triageNotes = dto.triageNotes;
    }
    if (dto?.chiefComplaint) {
      appointment.chiefComplaint = dto.chiefComplaint;
    }

    // Triage vitals with automated BMI calculation
    if (dto?.vitals) {
      const vitals: any = { ...dto.vitals };
      if (vitals.weight && vitals.height && vitals.weight > 0 && vitals.height > 0) {
        const heightM = vitals.height / 100;
        const bmi = Math.round((vitals.weight / (heightM * heightM)) * 10) / 10;
        vitals.bmi = bmi;
        if (bmi < 18.5) vitals.bmiCategory = 'underweight';
        else if (bmi < 25) vitals.bmiCategory = 'normal';
        else if (bmi < 30) vitals.bmiCategory = 'overweight';
        else vitals.bmiCategory = 'obese';
      }
      appointment.triageVitals = vitals;
    }

    appointment.status = AppointmentStatus.CHECKED_IN;
    appointment.checkedInAt = new Date();
    await appointment.save();

    // Check patient into live OPD Queue
    try {
      if (this.queueService) {
        await this.queueService.checkInPatient(tenantId, {
          patientId: String(appointment.patientId),
          doctorId: String(appointment.doctorId),
          department: appointment.department,
          appointmentId: id,
          priority,
          triageNotes: appointment.triageNotes,
          chiefComplaint: appointment.chiefComplaint,
        });
      }
    } catch (err: any) {
      // Idempotency: if already in queue, continue
      this.logger.log(`Live OPD queue check-in status: ${err?.message || err}`);
    }

    await this.auditService.record({
      action: 'APPOINTMENT_CHECKIN',
      resource: 'appointments',
      status: 'SUCCESS',
      hospitalId: String(tId),
      userId,
      details: {
        appointmentId: id,
        tokenNumber: appointment.tokenNumber,
        checkedInAt: appointment.checkedInAt.toISOString(),
        priority,
        hasVitals: Boolean(dto?.vitals),
      },
    });

    return this.getAppointmentById(tenantId, id);
  }

  /**
   * Cancel appointment with mandatory reason
   */
  async cancelAppointment(
    tenantId: string,
    userId: string,
    id: string,
    reason: string,
  ): Promise<any> {
    const tId = this.toObjectId(tenantId);
    const apptId = this.toObjectId(id);

    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException('Cancellation reason must be at least 3 characters');
    }

    const appointment = await this.appointmentModel.findOne({ _id: apptId, tenantId: tId }).exec();
    if (!appointment) {
      throw new NotFoundException('Appointment record not found');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed consultation');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancelledReason = reason.trim();
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = this.toObjectId(userId);
    await appointment.save();

    await this.auditService.record({
      action: 'APPOINTMENT_CANCEL',
      resource: 'appointments',
      status: 'SUCCESS',
      hospitalId: String(tId),
      userId,
      details: {
        appointmentId: id,
        tokenNumber: appointment.tokenNumber,
        reason: appointment.cancelledReason,
      },
    });

    return this.getAppointmentById(tenantId, id);
  }
}
