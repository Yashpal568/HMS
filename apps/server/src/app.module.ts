import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import databaseConfig from './config/database.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: ['.env.local', '.env', 'apps/api/.env', '../../.env'],
    }),
    DatabaseModule,
    AuditModule,
    RolesModule,
    UsersModule,
    AuthModule,
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
  ],
})
export class AppModule {}

