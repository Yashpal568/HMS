import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsDateString,
} from 'class-validator';
import { TaskPriority, TaskStatus, HospitalNotificationType } from '@hms/types';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsOptional()
  assigneeId?: string;

  @IsMongoId()
  @IsOptional()
  departmentId?: string;

  @IsMongoId()
  @IsOptional()
  teamId?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  contextType?: string; // PATIENT, ENCOUNTER, WARD, GENERAL

  @IsString()
  @IsOptional()
  contextId?: string;

  @IsString()
  @IsOptional()
  contextTitle?: string;
}

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status!: TaskStatus;
}

export class AddTaskCommentDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class CreateNotificationDto {
  @IsMongoId()
  @IsNotEmpty()
  recipientId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsEnum(HospitalNotificationType)
  @IsOptional()
  type?: HospitalNotificationType;

  @IsString()
  @IsOptional()
  actionUrl?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
