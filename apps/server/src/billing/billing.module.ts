import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HospitalService, HospitalServiceSchema } from './schemas/service.schema.js';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema.js';
import { Payment, PaymentSchema } from './schemas/payment.schema.js';
import { Refund, RefundSchema } from './schemas/refund.schema.js';
import { BillingService } from './billing.service.js';
import { BillingController } from './billing.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HospitalService.name, schema: HospitalServiceSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Refund.name, schema: RefundSchema },
    ]),
    AuditModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
