import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminService } from './super-admin.service.js';
import { SuperAdminController } from './super-admin.controller.js';
import { Tenant, TenantSchema } from './schemas/tenant.schema.js';
import { Plan, PlanSchema } from './schemas/plan.schema.js';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema.js';
import { PlatformBroadcast, PlatformBroadcastSchema } from './schemas/platform-broadcast.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema.js';
import { AuditLog, AuditLogSchema } from '../audit/schemas/audit-log.schema.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Plan.name, schema: PlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: PlatformBroadcast.name, schema: PlatformBroadcastSchema },
      { name: User.name, schema: UserSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    AuditModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
