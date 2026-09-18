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
import { LaboratoryService } from './laboratory.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '@hms/types';
import { CreateLabOrderDto } from './dto/create-lab-order.dto.js';
import { CollectSampleDto } from './dto/collect-sample.dto.js';
import { EnterLabResultsDto } from './dto/enter-results.dto.js';
import { VerifyLabOrderDto } from './dto/verify-order.dto.js';
import { CreateLabTestDto } from './dto/create-lab-test.dto.js';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  hospitalId?: string;
  permissions: string[];
}

@Controller('lab')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  /**
   * Laboratory operational KPI dashboard
   */
  @Get('dashboard')
  @RequirePermissions('lab.read')
  async getDashboardMetrics(@CurrentUser() user: RequestUser) {
    const data = await this.laboratoryService.getDashboardMetrics(user.tenantId);
    return { success: true, data };
  }

  /**
   * Retrieve diagnostic test catalog
   */
  @Get('tests')
  @RequirePermissions('lab.read')
  async getTestCatalog(
    @CurrentUser() user: RequestUser,
    @Query('category') category?: string,
  ) {
    const data = await this.laboratoryService.getTestCatalog(user.tenantId, category);
    return { success: true, data };
  }

  /**
   * Create new custom test in catalog
   */
  @Post('tests')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)
  @RequirePermissions('lab.tests.manage')
  async createTest(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateLabTestDto,
  ) {
    const data = await this.laboratoryService.createTest(user.tenantId, user.userId, dto);
    return { success: true, data };
  }

  /**
   * Create electronic laboratory requisition
   */
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
  )
  @RequirePermissions('lab.orders.create')
  async createOrder(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateLabOrderDto,
  ) {
    const data = await this.laboratoryService.createOrder(user.tenantId, user.userId, dto);
    return { success: true, data };
  }

  /**
   * List laboratory orders with filtering
   */
  @Get('orders')
  @RequirePermissions('lab.read')
  async getOrders(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.laboratoryService.getOrders(user.tenantId, {
      status,
      priority,
      patientId,
      doctorId,
      search,
      startDate,
      endDate,
    });
    return { success: true, data };
  }

  /**
   * Get single order by ID
   */
  @Get('orders/:id')
  @RequirePermissions('lab.read')
  async getOrderById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const data = await this.laboratoryService.getOrderById(user.tenantId, id);
    return { success: true, data };
  }

  /**
   * Record phlebotomy specimen collection & accession barcode
   */
  @Post('orders/:id/sample')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.LAB_TECHNICIAN,
    UserRole.NURSE,
  )
  @RequirePermissions('lab.orders.update')
  async collectSample(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CollectSampleDto,
  ) {
    const data = await this.laboratoryService.collectSample(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
    return { success: true, data };
  }

  /**
   * Enter bench parameter results with automated reference range flagging
   */
  @Post('orders/:id/results')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.LAB_TECHNICIAN,
  )
  @RequirePermissions('lab.results.enter')
  async enterResults(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: EnterLabResultsDto,
  ) {
    const data = await this.laboratoryService.enterResults(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
    return { success: true, data };
  }

  /**
   * Pathologist verification & digital sign-off
   */
  @Post('orders/:id/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.DOCTOR,
  )
  @RequirePermissions('lab.results.verify')
  async verifyOrder(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: VerifyLabOrderDto,
  ) {
    const data = await this.laboratoryService.verifyOrder(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
    return { success: true, data };
  }
}
