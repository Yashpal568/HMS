import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryItem, InventoryItemSchema } from './schemas/inventory-item.schema.js';
import { Supplier, SupplierSchema } from './schemas/supplier.schema.js';
import { PurchaseOrder, PurchaseOrderSchema } from './schemas/purchase-order.schema.js';
import { PurchaseReceipt, PurchaseReceiptSchema } from './schemas/purchase-receipt.schema.js';
import { StockMovement, StockMovementSchema } from './schemas/stock-movement.schema.js';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryItem.name, schema: InventoryItemSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: PurchaseReceipt.name, schema: PurchaseReceiptSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
    AuditModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
