import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { InventoryService } from './inventory.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto.js';
import { StockTransferDto } from './dto/stock-transfer.dto.js';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto.js';

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  hospitalId?: string;
  permissions: string[];
}

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * Operational dashboard metrics
   */
  @Get('dashboard')
  @RequirePermissions('inventory.read')
  async getDashboardMetrics(@CurrentUser() user: RequestUser) {
    const data = await this.inventoryService.getDashboardMetrics(new Types.ObjectId(user.tenantId));
    return { success: true, data };
  }

  /**
   * Item Master Catalog
   */
  @Get('items')
  @RequirePermissions('inventory.read')
  async getItems(
    @CurrentUser() user: RequestUser,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.inventoryService.getItems(new Types.ObjectId(user.tenantId), {
      category,
      lowStock,
      search,
    });
    return { success: true, data };
  }

  @Get('items/:id')
  @RequirePermissions('inventory.read')
  async getItemById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const data = await this.inventoryService.getItemById(new Types.ObjectId(user.tenantId), id);
    return { success: true, data };
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('inventory.manage')
  async createItem(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateItemDto,
  ) {
    const data = await this.inventoryService.createItem(new Types.ObjectId(user.tenantId), dto);
    return { success: true, data };
  }

  @Patch('items/:id')
  @RequirePermissions('inventory.manage')
  async updateItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    const data = await this.inventoryService.updateItem(new Types.ObjectId(user.tenantId), id, dto);
    return { success: true, data };
  }

  /**
   * Supplier Directory
   */
  @Get('suppliers')
  @RequirePermissions('inventory.read')
  async getSuppliers(@CurrentUser() user: RequestUser) {
    const data = await this.inventoryService.getSuppliers(new Types.ObjectId(user.tenantId));
    return { success: true, data };
  }

  @Get('suppliers/:id')
  @RequirePermissions('inventory.read')
  async getSupplierById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const data = await this.inventoryService.getSupplierById(new Types.ObjectId(user.tenantId), id);
    return { success: true, data };
  }

  @Post('suppliers')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('inventory.manage')
  async createSupplier(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSupplierDto,
  ) {
    const data = await this.inventoryService.createSupplier(new Types.ObjectId(user.tenantId), dto);
    return { success: true, data };
  }

  /**
   * Purchase Order Workflows
   */
  @Get('purchase-orders')
  @RequirePermissions('inventory.read')
  async getPurchaseOrders(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    const data = await this.inventoryService.getPurchaseOrders(new Types.ObjectId(user.tenantId), {
      status,
      supplierId,
    });
    return { success: true, data };
  }

  @Get('purchase-orders/:id')
  @RequirePermissions('inventory.read')
  async getPurchaseOrderById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const data = await this.inventoryService.getPurchaseOrderById(new Types.ObjectId(user.tenantId), id);
    return { success: true, data };
  }

  @Post('purchase-orders')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('inventory.manage')
  async createPurchaseOrder(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    const data = await this.inventoryService.createPurchaseOrder(
      new Types.ObjectId(user.tenantId),
      user.userId,
      dto,
    );
    return { success: true, data };
  }

  @Post('purchase-orders/:id/approve')
  @RequirePermissions('inventory.manage')
  async approvePurchaseOrder(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    const data = await this.inventoryService.approvePurchaseOrder(
      new Types.ObjectId(user.tenantId),
      user.userId,
      id,
    );
    return { success: true, data };
  }

  @Post('purchase-orders/:id/cancel')
  @RequirePermissions('inventory.manage')
  async cancelPurchaseOrder(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const data = await this.inventoryService.cancelPurchaseOrder(
      new Types.ObjectId(user.tenantId),
      user.userId,
      id,
      reason,
    );
    return { success: true, data };
  }

  /**
   * Goods Receiving Note (GRN) Delivery Workstation
   */
  @Get('grn')
  @RequirePermissions('inventory.read')
  async getPurchaseReceipts(
    @CurrentUser() user: RequestUser,
    @Query('poId') poId?: string,
  ) {
    const data = await this.inventoryService.getPurchaseReceipts(new Types.ObjectId(user.tenantId), { poId });
    return { success: true, data };
  }

  @Post('grn')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('inventory.manage')
  async createGoodsReceipt(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateGoodsReceiptDto,
  ) {
    const data = await this.inventoryService.createGoodsReceipt(
      new Types.ObjectId(user.tenantId),
      user.userId,
      dto,
    );
    return { success: true, data };
  }

  /**
   * Departmental Stock Transfers & Physical Adjustments
   */
  @Post('transfers')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('inventory.manage')
  async transferStock(
    @CurrentUser() user: RequestUser,
    @Body() dto: StockTransferDto,
  ) {
    const data = await this.inventoryService.transferStock(
      new Types.ObjectId(user.tenantId),
      user.userId,
      dto,
    );
    return { success: true, data };
  }

  @Post('adjustments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('inventory.manage')
  async adjustStock(
    @CurrentUser() user: RequestUser,
    @Body() dto: StockAdjustmentDto,
  ) {
    const data = await this.inventoryService.adjustStock(
      new Types.ObjectId(user.tenantId),
      user.userId,
      dto,
    );
    return { success: true, data };
  }

  @Get('movements')
  @RequirePermissions('inventory.read')
  async getStockMovements(
    @CurrentUser() user: RequestUser,
    @Query('itemId') itemId?: string,
    @Query('type') type?: string,
  ) {
    const data = await this.inventoryService.getStockMovements(new Types.ObjectId(user.tenantId), {
      itemId,
      type,
    });
    return { success: true, data };
  }
}
