import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import {
  QueueEntryStatus,
  QueuePriority,
  AppointmentStatus,
} from '@hms/types';
import { QueueService } from './queue.service.js';

describe('QueueService (Enterprise OPD Queue Engine)', () => {
  let service: QueueService;
  let mockQueueModel: any;
  let mockQueueEntryModel: any;
  let mockAppointmentModel: any;

  const tenantId = new Types.ObjectId().toString();
  const doctorId = new Types.ObjectId().toString();
  const patientId = new Types.ObjectId().toString();
  const appointmentId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockQueueModel = {
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }),
      find: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    mockQueueEntryModel = vi.fn().mockImplementation(function (this: any, dto: any) {
      this._id = new Types.ObjectId();
      Object.assign(this, dto);
      this.save = vi.fn().mockResolvedValue(this);
      return this;
    });
    mockQueueEntryModel.findOne = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
    mockQueueEntryModel.findOneAndUpdate = vi.fn();
    mockQueueEntryModel.find = vi.fn();
    mockQueueEntryModel.countDocuments = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(0) });

    mockAppointmentModel = {
      updateOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue({}) }),
    };

    service = new QueueService(mockQueueModel, mockQueueEntryModel, mockAppointmentModel);
  });

  describe('checkInPatient', () => {
    it('should atomically issue sequential token and check in patient with WAITING status', async () => {
      const mockQueueDoc = {
        _id: new Types.ObjectId(),
        totalTokensIssued: 42,
      };
      mockQueueModel.findOneAndUpdate.mockResolvedValue(mockQueueDoc);

      const result = await service.checkInPatient(tenantId, {
        patientId,
        doctorId,
        department: 'Cardiology',
        appointmentId,
        priority: QueuePriority.URGENT,
        chiefComplaint: 'Chest tightness',
      });

      expect(mockQueueModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result.tokenNumber).toBe(42);
      expect(result.formattedToken).toBe('C-042');
      expect(result.status).toBe(QueueEntryStatus.WAITING);
      expect(result.priority).toBe(QueuePriority.URGENT);
      expect(result.priorityWeight).toBe(10);
      expect(mockAppointmentModel.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: AppointmentStatus.CHECKED_IN,
            tokenNumber: 42,
          }),
        }),
      );
    });

    it('should prevent duplicate check-in for the same appointment', async () => {
      mockQueueEntryModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      });

      await expect(
        service.checkInPatient(tenantId, {
          patientId,
          doctorId,
          department: 'Cardiology',
          appointmentId,
        }),
      ).rejects.toThrow('already checked into queue');
    });
  });

  describe('callNextPatient (Concurrency Safety)', () => {
    it('should atomically claim highest priority waiting patient', async () => {
      const mockEntry = {
        _id: new Types.ObjectId(),
        queueId: new Types.ObjectId(),
        tokenNumber: 15,
        formattedToken: 'C-015',
        status: QueueEntryStatus.CALLED,
      };

      const populateChain = {
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockEntry),
      };
      mockQueueEntryModel.findOneAndUpdate.mockReturnValue(populateChain);

      const result = await service.callNextPatient(tenantId, doctorId, {
        date: '2026-09-22',
      });

      expect(result).toBeDefined();
      expect(result?.tokenNumber).toBe(15);
      expect(mockQueueEntryModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: QueueEntryStatus.WAITING,
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            status: QueueEntryStatus.CALLED,
          }),
        }),
        expect.objectContaining({
          sort: { priorityWeight: -1, tokenNumber: 1 },
          new: true,
        }),
      );
      expect(mockQueueModel.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: {
            currentServingToken: 15,
            currentServingEntryId: mockEntry._id,
          },
        }),
      );
    });

    it('should return null when no patients are waiting in queue', async () => {
      const populateChain = {
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      };
      mockQueueEntryModel.findOneAndUpdate.mockReturnValue(populateChain);

      const result = await service.callNextPatient(tenantId, doctorId, {});
      expect(result).toBeNull();
    });
  });

  describe('State Machine Transitions', () => {
    it('should transition from CALLED to IN_CONSULTATION', async () => {
      const entryId = new Types.ObjectId().toString();
      const mockEntry = {
        _id: new Types.ObjectId(entryId),
        status: QueueEntryStatus.IN_CONSULTATION,
        appointmentId: new Types.ObjectId(),
      };
      mockQueueEntryModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEntry),
      });

      const result = await service.startConsultation(tenantId, entryId, doctorId);
      expect(result.status).toBe(QueueEntryStatus.IN_CONSULTATION);
      expect(mockAppointmentModel.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: { status: AppointmentStatus.IN_CONSULTATION },
        }),
      );
    });

    it('should transition from IN_CONSULTATION to COMPLETED and increment queue counter', async () => {
      const entryId = new Types.ObjectId().toString();
      const mockEntry = {
        _id: new Types.ObjectId(entryId),
        queueId: new Types.ObjectId(),
        status: QueueEntryStatus.COMPLETED,
        appointmentId: new Types.ObjectId(),
      };
      mockQueueEntryModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEntry),
      });

      const result = await service.completeConsultation(tenantId, entryId, doctorId);
      expect(result.status).toBe(QueueEntryStatus.COMPLETED);
      expect(mockQueueModel.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $inc: { totalCompleted: 1 },
        }),
      );
    });

    it('should transition from CALLED to SKIPPED when patient does not respond', async () => {
      const entryId = new Types.ObjectId().toString();
      const mockEntry = {
        _id: new Types.ObjectId(entryId),
        queueId: new Types.ObjectId(),
        status: QueueEntryStatus.SKIPPED,
      };
      mockQueueEntryModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEntry),
      });

      const result = await service.skipPatient(tenantId, entryId, doctorId, {
        reason: 'No response after 3 calls',
      });
      expect(result.status).toBe(QueueEntryStatus.SKIPPED);
      expect(mockQueueModel.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $inc: { totalSkipped: 1 },
        }),
      );
    });
  });
});
