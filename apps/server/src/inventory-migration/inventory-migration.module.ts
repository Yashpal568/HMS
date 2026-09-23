import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventoryImportJob,
  InventoryImportJobSchema,
} from './schemas/inventory-import-job.schema.js';
import {
  InventoryLocation,
  InventoryLocationSchema,
} from './schemas/inventory-location.schema.js';
import {
  Medicine,
  MedicineSchema,
} from '../pharmacy/schemas/medicine.schema.js';
import {
  MedicineBatch,
  MedicineBatchSchema,
} from '../pharmacy/schemas/medicine-batch.schema.js';
import {
  StockMovement,
  StockMovementSchema,
} from '../inventory/schemas/stock-movement.schema.js';
import { InventoryMigrationService } from './inventory-migration.service.js';
import { InventoryMigrationController } from './inventory-migration.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryImportJob.name, schema: InventoryImportJobSchema },
      { name: InventoryLocation.name, schema: InventoryLocationSchema },
      { name: Medicine.name, schema: MedicineSchema },
      { name: MedicineBatch.name, schema: MedicineBatchSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
  ],
  controllers: [InventoryMigrationController],
  providers: [InventoryMigrationService],
  exports: [InventoryMigrationService],
})
export class InventoryMigrationModule {}
