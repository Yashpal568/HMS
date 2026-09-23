import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  QueueEntryStatus,
  QueuePriority,
  QueueSession,
  QueueStatus,
  AppointmentStatus,
} from '@hms/types';
import { Queue, QueueDocument } from './schemas/queue.schema.js';
import { QueueEntry, QueueEntryDocument } from './schemas/queue-entry.schema.js';
import { Appointment, AppointmentDocument } from '../appointments/schemas/appointment.schema.js';
import {
  CheckInQueueDto,
  CallNextPatientDto,
  SkipQueueEntryDto,
  QueryQueueDto,
} from './dto/queue.dto.js';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectModel(Queue.name)
    private readonly queueModel: Model<QueueDocument>,
    @InjectModel(QueueEntry.name)
    private readonly queueEntryModel: Model<QueueEntryDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  /**
   * Check-in a patient into the operational OPD queue.
   * Atomically allocates a sequential token number under the scoped queue.
   */
  async checkInPatient(tenantId: string, dto: CheckInQueueDto): Promise<QueueEntryDocument> {
    const tId = new Types.ObjectId(tenantId);
    const docId = new Types.ObjectId(dto.doctorId);
    const patId = new Types.ObjectId(dto.patientId);
    const apptId = dto.appointmentId ? new Types.ObjectId(dto.appointmentId) : undefined;
    const date = dto.date || new Date().toISOString().split('T')[0];
    const session = dto.session || QueueSession.MORNING;

    // Idempotency check: Prevent duplicate check-in for the same appointment
    if (apptId) {
      const existing = await this.queueEntryModel.findOne({
        tenantId: tId,
        appointmentId: apptId,
      }).exec();

      if (existing) {
        throw new ConflictException(`Appointment "${dto.appointmentId}" is already checked into queue`);
      }
    }

    // Atomically find or initialize doctor's queue session and increment totalTokensIssued
    const queue = await this.queueModel.findOneAndUpdate(
      {
        tenantId: tId,
        doctorId: docId,
        date,
        session,
      },
      {
        $setOnInsert: {
          tenantId: tId,
          department: dto.department,
          doctorId: docId,
          date,
          session,
          status: QueueStatus.ACTIVE,
          totalCompleted: 0,
          totalSkipped: 0,
        },
        $inc: { totalTokensIssued: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const tokenNumber = queue.totalTokensIssued;
    const deptPrefix = dto.department.charAt(0).toUpperCase();
    const formattedToken = `${deptPrefix}-${String(tokenNumber).padStart(3, '0')}`;

    const priority = dto.priority || QueuePriority.NORMAL;
    const priorityWeight =
      priority === QueuePriority.EMERGENCY ? 50 : priority === QueuePriority.URGENT ? 10 : 0;

    const entry = new this.queueEntryModel({
      tenantId: tId,
      queueId: queue._id,
      patientId: patId,
      appointmentId: apptId,
      doctorId: docId,
      department: dto.department,
      date,
      tokenNumber,
      formattedToken,
      priority,
      priorityWeight,
      status: QueueEntryStatus.WAITING,
      chiefComplaint: dto.chiefComplaint,
      triageNotes: dto.triageNotes,
      checkedInAt: new Date(),
    });

    await entry.save();

    // If an appointment is attached, sync its status to CHECKED_IN
    if (apptId) {
      await this.appointmentModel.updateOne(
        { _id: apptId, tenantId: tId },
        {
          $set: {
            status: AppointmentStatus.CHECKED_IN,
            checkedInAt: new Date(),
            tokenNumber,
          },
        },
      ).exec();
    }

    this.logger.log(
      `Patient ${dto.patientId} checked into OPD queue for Doctor ${dto.doctorId} (Token: ${formattedToken})`,
    );

    return entry;
  }

  /**
   * Concurrency-safe atomic dequeue: Clinician requests next patient.
   * Atomically claims the highest priority waiting patient preventing race conditions.
   */
  async callNextPatient(
    tenantId: string,
    doctorId: string,
    dto: CallNextPatientDto,
  ): Promise<QueueEntryDocument | null> {
    const tId = new Types.ObjectId(tenantId);
    const docId = new Types.ObjectId(doctorId);
    const today = dto.date || new Date().toISOString().split('T')[0];

    // Atomic find-and-update to transition WAITING -> CALLED
    // Sorted by priorityWeight DESC (Emergency first), then tokenNumber ASC (FIFO)
    const nextEntry = await this.queueEntryModel.findOneAndUpdate(
      {
        tenantId: tId,
        doctorId: docId,
        date: today,
        status: QueueEntryStatus.WAITING,
      },
      {
        $set: {
          status: QueueEntryStatus.CALLED,
          calledAt: new Date(),
        },
      },
      {
        sort: { priorityWeight: -1, tokenNumber: 1 },
        new: true,
      },
    )
      .populate('patientId', 'uhid firstName lastName dateOfBirth gender bloodGroup contacts')
      .populate('doctorId', 'firstName lastName email department')
      .exec();

    if (!nextEntry) {
      return null;
    }

    // Update parent queue's currently serving indicators
    await this.queueModel.updateOne(
      { _id: nextEntry.queueId, tenantId: tId },
      {
        $set: {
          currentServingToken: nextEntry.tokenNumber,
          currentServingEntryId: nextEntry._id,
        },
      },
    ).exec();

    this.logger.log(
      `Doctor ${doctorId} called next patient: Token ${nextEntry.formattedToken} (ID: ${nextEntry._id})`,
    );

    return nextEntry;
  }

  /**
   * Transition queue entry from CALLED -> IN_CONSULTATION
   */
  async startConsultation(
    tenantId: string,
    entryId: string,
    doctorId: string,
  ): Promise<QueueEntryDocument> {
    const tId = new Types.ObjectId(tenantId);
    const docId = new Types.ObjectId(doctorId);
    const eId = new Types.ObjectId(entryId);

    const entry = await this.queueEntryModel.findOneAndUpdate(
      {
        _id: eId,
        tenantId: tId,
        doctorId: docId,
        status: QueueEntryStatus.CALLED,
      },
      {
        $set: {
          status: QueueEntryStatus.IN_CONSULTATION,
          consultationStartedAt: new Date(),
        },
      },
      { new: true },
    ).exec();

    if (!entry) {
      throw new BadRequestException(
        `Queue entry "${entryId}" is not in CALLED status or does not belong to doctor`,
      );
    }

    if (entry.appointmentId) {
      await this.appointmentModel.updateOne(
        { _id: entry.appointmentId, tenantId: tId },
        { $set: { status: AppointmentStatus.IN_CONSULTATION } },
      ).exec();
    }

    return entry;
  }

  /**
   * Transition queue entry from IN_CONSULTATION -> COMPLETED
   */
  async completeConsultation(
    tenantId: string,
    entryId: string,
    doctorId: string,
  ): Promise<QueueEntryDocument> {
    const tId = new Types.ObjectId(tenantId);
    const docId = new Types.ObjectId(doctorId);
    const eId = new Types.ObjectId(entryId);

    const entry = await this.queueEntryModel.findOneAndUpdate(
      {
        _id: eId,
        tenantId: tId,
        doctorId: docId,
        status: QueueEntryStatus.IN_CONSULTATION,
      },
      {
        $set: {
          status: QueueEntryStatus.COMPLETED,
          completedAt: new Date(),
        },
      },
      { new: true },
    ).exec();

    if (!entry) {
      throw new BadRequestException(
        `Queue entry "${entryId}" is not in IN_CONSULTATION status`,
      );
    }

    // Increment completed counter on parent queue
    await this.queueModel.updateOne(
      { _id: entry.queueId, tenantId: tId },
      { $inc: { totalCompleted: 1 } },
    ).exec();

    if (entry.appointmentId) {
      await this.appointmentModel.updateOne(
        { _id: entry.appointmentId, tenantId: tId },
        { $set: { status: AppointmentStatus.COMPLETED } },
      ).exec();
    }

    return entry;
  }

  /**
   * Transition queue entry from CALLED -> SKIPPED (patient absent when called)
   */
  async skipPatient(
    tenantId: string,
    entryId: string,
    doctorId: string,
    dto?: SkipQueueEntryDto,
  ): Promise<QueueEntryDocument> {
    const tId = new Types.ObjectId(tenantId);
    const docId = new Types.ObjectId(doctorId);
    const eId = new Types.ObjectId(entryId);

    const entry = await this.queueEntryModel.findOneAndUpdate(
      {
        _id: eId,
        tenantId: tId,
        doctorId: docId,
        status: QueueEntryStatus.CALLED,
      },
      {
        $set: {
          status: QueueEntryStatus.SKIPPED,
          skippedAt: new Date(),
          cancelledReason: dto?.reason || 'Patient did not respond when called',
        },
      },
      { new: true },
    ).exec();

    if (!entry) {
      throw new BadRequestException(
        `Queue entry "${entryId}" must be in CALLED status to be skipped`,
      );
    }

    await this.queueModel.updateOne(
      { _id: entry.queueId, tenantId: tId },
      { $inc: { totalSkipped: 1 } },
    ).exec();

    return entry;
  }

  /**
   * Query doctor's active queue with pagination and summary counters
   */
  async getDoctorQueue(
    tenantId: string,
    doctorId: string,
    query: QueryQueueDto,
  ): Promise<{
    items: QueueEntryDocument[];
    total: number;
    page: number;
    limit: number;
    summary: {
      waiting: number;
      called: number;
      inConsultation: number;
      completed: number;
      skipped: number;
    };
  }> {
    const tId = new Types.ObjectId(tenantId);
    const docId = new Types.ObjectId(doctorId);
    const date = query.date || new Date().toISOString().split('T')[0];
    const page = query.page || 1;
    const limit = query.limit || 20;

    const baseFilter: Record<string, unknown> = {
      tenantId: tId,
      doctorId: docId,
      date,
    };

    if (query.status) {
      baseFilter.status = query.status;
    }

    const [items, total, allForCounters] = await Promise.all([
      this.queueEntryModel
        .find(baseFilter)
        .sort({ priorityWeight: -1, tokenNumber: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('patientId', 'uhid firstName lastName dateOfBirth gender bloodGroup contacts')
        .exec(),
      this.queueEntryModel.countDocuments(baseFilter).exec(),
      this.queueEntryModel
        .find({ tenantId: tId, doctorId: docId, date })
        .select('status')
        .lean()
        .exec(),
    ]);

    const summary = {
      waiting: 0,
      called: 0,
      inConsultation: 0,
      completed: 0,
      skipped: 0,
    };

    for (const item of allForCounters) {
      if (item.status === QueueEntryStatus.WAITING) summary.waiting++;
      else if (item.status === QueueEntryStatus.CALLED) summary.called++;
      else if (item.status === QueueEntryStatus.IN_CONSULTATION) summary.inConsultation++;
      else if (item.status === QueueEntryStatus.COMPLETED) summary.completed++;
      else if (item.status === QueueEntryStatus.SKIPPED) summary.skipped++;
    }

    return {
      items,
      total,
      page,
      limit,
      summary,
    };
  }

  /**
   * Get department-wide queue telemetry (aggregates all active doctor queues in department)
   */
  async getDepartmentQueue(
    tenantId: string,
    department: string,
    date?: string,
  ): Promise<{
    department: string;
    date: string;
    totalWaiting: number;
    totalServing: number;
    totalCompleted: number;
    queues: QueueDocument[];
  }> {
    const tId = new Types.ObjectId(tenantId);
    const today = date || new Date().toISOString().split('T')[0];

    const queues = await this.queueModel
      .find({
        tenantId: tId,
        department,
        date: today,
      })
      .populate('doctorId', 'firstName lastName email department')
      .populate('currentServingEntryId')
      .exec();

    let totalWaiting = 0;
    let totalServing = 0;
    let totalCompleted = 0;

    for (const q of queues) {
      totalCompleted += q.totalCompleted;
      if (q.currentServingEntryId) totalServing++;
      totalWaiting += Math.max(0, q.totalTokensIssued - q.totalCompleted - q.totalSkipped);
    }

    return {
      department,
      date: today,
      totalWaiting,
      totalServing,
      totalCompleted,
      queues,
    };
  }
}
