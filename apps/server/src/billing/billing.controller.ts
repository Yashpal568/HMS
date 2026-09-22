import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Throttle } from '@nestjs/throttler';
import { BillingService } from './billing.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  CreateTariffDto,
  CreateInvoiceDto,
  ProcessPaymentDto,
  CreateRefundDto,
  ApproveRefundDto,
} from './dto/billing.dto.js';
import {
  ServiceCategory,
  InvoiceStatus,
  PaymentMethod,
  RefundStatus,
} from '@hms/types';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  hospitalId?: string;
  permissions: string[];
}

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Executive Financial Summary & KPI Metrics
   */
  @Get('summary')
  @RequirePermissions('billing.read')
  async getBillingSummary(@CurrentUser() user: RequestUser) {
    const data = await this.billingService.getBillingSummary(
      new Types.ObjectId(user.tenantId),
    );
    return { success: true, data };
  }

  /**
   * Hospital Service Tariff & Charge Master
   */
  @Get('tariffs')
  @RequirePermissions('billing.read')
  async listTariffs(
    @CurrentUser() user: RequestUser,
    @Query('category') category?: ServiceCategory,
  ) {
    const data = await this.billingService.listTariffs(
      new Types.ObjectId(user.tenantId),
      category,
    );
    return { success: true, data };
  }

  @Post('tariffs')
  @RequirePermissions('billing.create')
  @HttpCode(HttpStatus.CREATED)
  async createTariff(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTariffDto,
  ) {
    const data = await this.billingService.createTariff(
      new Types.ObjectId(user.tenantId),
      dto,
      new Types.ObjectId(user.userId),
    );
    return { success: true, data };
  }

  /**
   * Patient Invoices
   */
  @Get('invoices')
  @RequirePermissions('billing.read')
  async listInvoices(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: InvoiceStatus,
    @Query('patientId') patientId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const data = await this.billingService.listInvoices(
      new Types.ObjectId(user.tenantId),
      {
        status,
        patientId,
        search,
        limit: limit ? parseInt(limit, 10) : undefined,
        skip: skip ? parseInt(skip, 10) : undefined,
      },
    );
    return { success: true, data: data.invoices, total: data.total };
  }

  @Post('invoices')
  @RequirePermissions('billing.create')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    const data = await this.billingService.createInvoice(
      new Types.ObjectId(user.tenantId),
      dto,
      new Types.ObjectId(user.userId),
    );
    return { success: true, data };
  }

  @Get('invoices/:id')
  @RequirePermissions('billing.read')
  async getInvoiceById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const data = await this.billingService.getInvoiceById(
      new Types.ObjectId(user.tenantId),
      id,
    );
    return { success: true, data };
  }

  /**
   * Unbilled Charges Aggregator for Patient
   */
  @Get('unbilled-charges/:patientId')
  @RequirePermissions('billing.read')
  async getUnbilledCharges(
    @CurrentUser() user: RequestUser,
    @Param('patientId') patientId: string,
  ) {
    const data = await this.billingService.getUnbilledCharges(
      new Types.ObjectId(user.tenantId),
      patientId,
    );
    return { success: true, data };
  }

  /**
   * Payments & Receipts
   */
  @Get('payments')
  @RequirePermissions('billing.read')
  async listPayments(
    @CurrentUser() user: RequestUser,
    @Query('method') method?: PaymentMethod,
    @Query('patientId') patientId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const data = await this.billingService.listPayments(
      new Types.ObjectId(user.tenantId),
      {
        method,
        patientId,
        search,
        limit: limit ? parseInt(limit, 10) : undefined,
        skip: skip ? parseInt(skip, 10) : undefined,
      },
    );
    return { success: true, data: data.payments, total: data.total };
  }

  @Post('payments')
  @Throttle({ financial: { limit: 10, ttl: 60000 } })
  @RequirePermissions('billing.create')
  @HttpCode(HttpStatus.CREATED)
  async processPayment(
    @CurrentUser() user: RequestUser,
    @Body() dto: ProcessPaymentDto,
  ) {
    const data = await this.billingService.processPayment(
      new Types.ObjectId(user.tenantId),
      dto,
      new Types.ObjectId(user.userId),
    );
    return { success: true, data };
  }

  /**
   * Refunds & Adjustments
   */
  @Get('refunds')
  @RequirePermissions('billing.read')
  async listRefunds(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: RefundStatus,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const data = await this.billingService.listRefunds(
      new Types.ObjectId(user.tenantId),
      {
        status,
        limit: limit ? parseInt(limit, 10) : undefined,
        skip: skip ? parseInt(skip, 10) : undefined,
      },
    );
    return { success: true, data: data.refunds, total: data.total };
  }

  @Post('refunds')
  @RequirePermissions('billing.create')
  @HttpCode(HttpStatus.CREATED)
  async createRefund(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateRefundDto,
  ) {
    const data = await this.billingService.createRefund(
      new Types.ObjectId(user.tenantId),
      dto,
      new Types.ObjectId(user.userId),
    );
    return { success: true, data };
  }

  @Post('refunds/:id/approve')
  @RequirePermissions('billing.refund')
  async approveRefund(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ApproveRefundDto,
  ) {
    const data = await this.billingService.approveRefund(
      new Types.ObjectId(user.tenantId),
      id,
      dto,
      new Types.ObjectId(user.userId),
    );
    return { success: true, data };
  }
}
