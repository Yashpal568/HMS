import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CommunicationService } from './communication.service.js';
import {
  CreateTaskDto,
  UpdateTaskStatusDto,
  AddTaskCommentDto,
} from './dto/communication.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { TaskStatus } from '@hms/types';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  hospitalId?: string;
  firstName?: string;
  lastName?: string;
}

@Controller('communication')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CommunicationController {
  constructor(private readonly commService: CommunicationService) {}

  @Get('tasks')
  async getTasks(
    @CurrentUser() user: RequestUser,
    @Query('assigneeId') assigneeId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: TaskStatus,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const tasks = await this.commService.getTasks(tenantId, assigneeId, departmentId, status);
    return { success: true, data: tasks };
  }

  @Post('tasks')
  async createTask(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTaskDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const task = await this.commService.createTask(tenantId, user.userId, dto);
    return { success: true, data: task, message: 'Task created.' };
  }

  @Patch('tasks/:id/status')
  async updateTaskStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const task = await this.commService.updateTaskStatus(tenantId, id, dto);
    return { success: true, data: task, message: 'Task status updated.' };
  }

  @Post('tasks/:id/comments')
  async addComment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AddTaskCommentDto,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const authorName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email;
    const task = await this.commService.addComment(tenantId, id, user.userId, authorName, dto);
    return { success: true, data: task, message: 'Comment added.' };
  }

  @Get('notifications')
  async getNotifications(
    @CurrentUser() user: RequestUser,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const result = await this.commService.getNotifications(tenantId, user.userId, unreadOnly === 'true');
    return { success: true, data: result.notifications, meta: { unreadCount: result.unreadCount } };
  }

  @Patch('notifications/:id/read')
  async markAsRead(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const updated = await this.commService.markAsRead(tenantId, id);
    return { success: true, data: updated };
  }

  @Post('notifications/read-all')
  async markAllAsRead(@CurrentUser() user: RequestUser) {
    const tenantId = user.tenantId || user.hospitalId;
    if (!tenantId) throw new BadRequestException('Session lacks hospital tenant context.');

    const result = await this.commService.markAllAsRead(tenantId, user.userId);
    return { success: true, message: result.message };
  }
}
