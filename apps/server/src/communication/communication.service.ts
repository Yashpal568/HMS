import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  HospitalTask,
  HospitalTaskDocument,
} from './schemas/hospital-task.schema.js';
import {
  HospitalNotification,
  HospitalNotificationDocument,
} from './schemas/hospital-notification.schema.js';
import {
  CreateTaskDto,
  UpdateTaskStatusDto,
  AddTaskCommentDto,
  CreateNotificationDto,
} from './dto/communication.dto.js';
import { TaskStatus, HospitalNotificationType } from '@hms/types';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    @InjectModel(HospitalTask.name)
    private readonly taskModel: Model<HospitalTaskDocument>,
    @InjectModel(HospitalNotification.name)
    private readonly notificationModel: Model<HospitalNotificationDocument>,
  ) {}

  // ==========================================================================
  // Tasks
  // ==========================================================================

  async getTasks(
    tenantId: string,
    assigneeId?: string,
    departmentId?: string,
    status?: TaskStatus,
  ) {
    const filter: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
    };
    if (assigneeId) filter.assigneeId = new Types.ObjectId(assigneeId);
    if (departmentId) filter.departmentId = new Types.ObjectId(departmentId);
    if (status) filter.status = status;

    return this.taskModel
      .find(filter)
      .populate('creatorId', 'firstName lastName email')
      .populate('assigneeId', 'firstName lastName employeeId designation')
      .populate('departmentId', 'name code')
      .sort({ priority: -1, dueDate: 1, createdAt: -1 })
      .exec();
  }

  async createTask(tenantId: string, creatorId: string, dto: CreateTaskDto) {
    const tId = new Types.ObjectId(tenantId);
    const cId = new Types.ObjectId(creatorId);

    const task = new this.taskModel({
      tenantId: tId,
      title: dto.title.trim(),
      description: dto.description?.trim(),
      creatorId: cId,
      assigneeId: dto.assigneeId ? new Types.ObjectId(dto.assigneeId) : undefined,
      departmentId: dto.departmentId ? new Types.ObjectId(dto.departmentId) : undefined,
      teamId: dto.teamId ? new Types.ObjectId(dto.teamId) : undefined,
      priority: dto.priority || 'NORMAL',
      status: TaskStatus.PENDING,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      contextType: dto.contextType || 'GENERAL',
      contextId: dto.contextId,
      contextTitle: dto.contextTitle,
      comments: [],
    });

    const saved = await task.save();

    // Auto-create notification for assignee if assigned
    if (dto.assigneeId) {
      await this.createNotification(tenantId, {
        recipientId: dto.assigneeId,
        title: 'New Clinical Task Assigned',
        message: `You were assigned task: ${dto.title}`,
        type: HospitalNotificationType.TASK_ASSIGNED,
        actionUrl: `/dashboard?task=${saved._id}`,
      });
    }

    return saved;
  }

  async updateTaskStatus(
    tenantId: string,
    taskId: string,
    dto: UpdateTaskStatusDto,
  ) {
    const task = await this.taskModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(taskId), tenantId: new Types.ObjectId(tenantId) },
        { $set: { status: dto.status } },
        { new: true },
      )
      .exec();

    if (!task) throw new NotFoundException('Task not found.');
    return task;
  }

  async addComment(
    tenantId: string,
    taskId: string,
    userId: string,
    authorName: string,
    dto: AddTaskCommentDto,
  ) {
    const task = await this.taskModel
      .findOne({ _id: new Types.ObjectId(taskId), tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (!task) throw new NotFoundException('Task not found.');

    task.comments.push({
      authorId: new Types.ObjectId(userId),
      authorName,
      content: dto.content.trim(),
      createdAt: new Date(),
    } as any);

    return task.save();
  }

  // ==========================================================================
  // Notifications
  // ==========================================================================

  async getNotifications(tenantId: string, recipientId: string, unreadOnly = false) {
    const filter: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      recipientId: new Types.ObjectId(recipientId),
    };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(50)
        .exec(),
      this.notificationModel.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        recipientId: new Types.ObjectId(recipientId),
        isRead: false,
      }).exec(),
    ]);

    return { notifications, unreadCount };
  }

  async createNotification(tenantId: string, dto: CreateNotificationDto) {
    const notif = new this.notificationModel({
      tenantId: new Types.ObjectId(tenantId),
      recipientId: new Types.ObjectId(dto.recipientId),
      title: dto.title.trim(),
      message: dto.message.trim(),
      type: dto.type || HospitalNotificationType.GENERAL,
      isRead: false,
      actionUrl: dto.actionUrl,
      metadata: dto.metadata || {},
    });

    return notif.save();
  }

  async markAsRead(tenantId: string, notificationId: string) {
    return this.notificationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(notificationId), tenantId: new Types.ObjectId(tenantId) },
        { $set: { isRead: true } },
        { new: true },
      )
      .exec();
  }

  async markAllAsRead(tenantId: string, recipientId: string) {
    await this.notificationModel
      .updateMany(
        { tenantId: new Types.ObjectId(tenantId), recipientId: new Types.ObjectId(recipientId), isRead: false },
        { $set: { isRead: true } },
      )
      .exec();

    return { success: true, message: 'All notifications marked as read.' };
  }
}
