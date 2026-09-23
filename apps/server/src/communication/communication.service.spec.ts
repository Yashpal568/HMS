import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { CommunicationService } from './communication.service.js';
import { TaskStatus, HospitalNotificationType } from '@hms/types';

describe('CommunicationService', () => {
  let service: CommunicationService;
  let mockTaskModel: any;
  let mockNotificationModel: any;

  const tenantId = new Types.ObjectId().toString();
  const userId = new Types.ObjectId().toString();
  const assigneeId = new Types.ObjectId().toString();

  beforeEach(() => {
    mockTaskModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
    };
    mockNotificationModel = {
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateMany: vi.fn(),
      countDocuments: vi.fn(),
    };

    service = new CommunicationService(
      mockTaskModel as any,
      mockNotificationModel as any,
    );
  });

  describe('createTask', () => {
    it('should create task and dispatch notification when assigneeId is present', async () => {
      let createdTask: any;
      (service as any).taskModel = vi.fn().mockImplementation(function (dto: any) {
        const doc = {
          ...dto,
          _id: new Types.ObjectId(),
          save: vi.fn().mockResolvedValue(dto),
        };
        createdTask = doc;
        return doc;
      });

      let createdNotif: any;
      (service as any).notificationModel = vi.fn().mockImplementation(function (dto: any) {
        const doc = {
          ...dto,
          _id: new Types.ObjectId(),
          save: vi.fn().mockResolvedValue(dto),
        };
        createdNotif = doc;
        return doc;
      });

      await service.createTask(tenantId, userId, {
        title: 'Prepare ICU Bed A-102',
        description: 'Post-op patient arriving in 30 mins',
        assigneeId,
      });

      expect(createdTask.title).toBe('Prepare ICU Bed A-102');
      expect(createdTask.status).toBe(TaskStatus.PENDING);
      expect(createdNotif.recipientId).toEqual(new Types.ObjectId(assigneeId));
      expect(createdNotif.type).toBe(HospitalNotificationType.TASK_ASSIGNED);
    });
  });

  describe('notifications', () => {
    it('should retrieve notifications and count unread', async () => {
      const mockNotifs = [{ title: 'Stock Alert', isRead: false }];
      mockNotificationModel.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockNotifs),
          }),
        }),
      });
      mockNotificationModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const result = await service.getNotifications(tenantId, userId);
      expect(result.notifications).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
    });
  });
});
