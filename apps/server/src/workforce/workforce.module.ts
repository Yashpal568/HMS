import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from './schemas/employee.schema.js';
import {
  WorkforceSchedule,
  WorkforceScheduleSchema,
} from './schemas/workforce-schedule.schema.js';
import {
  AttendanceRecord,
  AttendanceRecordSchema,
} from './schemas/attendance-record.schema.js';
import {
  LeaveRequest,
  LeaveRequestSchema,
} from './schemas/leave-request.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { WorkforceService } from './workforce.service.js';
import { WorkforceController } from './workforce.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: WorkforceSchedule.name, schema: WorkforceScheduleSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [WorkforceController],
  providers: [WorkforceService],
  exports: [WorkforceService, MongooseModule],
})
export class WorkforceModule {}
