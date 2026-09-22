import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AppThrottlerGuard } from './common/guards/throttler.guard.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware.js';
import { HealthModule } from './health/health.module.js';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './users/users.module.js';
import { RolesModule } from './roles/roles.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { EmrModule } from './emr/emr.module.js';
import { IpdModule } from './ipd/ipd.module.js';
import { LaboratoryModule } from './laboratory/laboratory.module.js';
import { PharmacyModule } from './pharmacy/pharmacy.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { BillingModule } from './billing/billing.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { MailModule } from './mail/mail.module.js';
import { SuperAdminModule } from './super-admin/super-admin.module.js';
import databaseConfig from './config/database.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: ['.env.local', '.env', 'apps/api/.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 5,
      },
      {
        name: 'financial',
        ttl: 60000,
        limit: 10,
      },
    ]),
    DatabaseModule,
    AuditModule,
    RolesModule,
    UsersModule,
    AuthModule,
    MailModule,
    DashboardModule,
    PatientsModule,
    AppointmentsModule,
    EmrModule,
    IpdModule,
    LaboratoryModule,
    PharmacyModule,
    InventoryModule,
    BillingModule,
    ReportsModule,
    HealthModule,
    SuperAdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}


