import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  InventoryCategory,
  PurchaseOrderStatus,
  StockMovementType,
  InventoryDashboardMetrics,
} from '@hms/types';
import { InventoryItem, InventoryItemDocument } from './schemas/inventory-item.schema.js';
import { Supplier, SupplierDocument } from './schemas/supplier.schema.js';
import { PurchaseOrder, PurchaseOrderDocument } from './schemas/purchase-order.schema.js';
import { PurchaseReceipt, PurchaseReceiptDocument } from './schemas/purchase-receipt.schema.js';
import { StockMovement, StockMovementDocument } from './schemas/stock-movement.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto.js';
import { StockTransferDto } from './dto/stock-transfer.dto.js';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto.js';

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(InventoryItem.name)
    private readonly itemModel: Model<InventoryItemDocument>,
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(PurchaseOrder.name)
    private readonly poModel: Model<PurchaseOrderDocument>,
    @InjectModel(PurchaseReceipt.name)
    private readonly grnModel: Model<PurchaseReceiptDocument>,
    @InjectModel(StockMovement.name)
    private readonly movementModel: Model<StockMovementDocument>,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultsIfEmpty();
  }

  /**
   * Idempotent Seeding of standard medical consumables, items & vetted suppliers
   */
  async seedDefaultsIfEmpty() {
    try {
      const fallbackTenantId = new Types.ObjectId('6aa3f64974f6740b10b10001');
      const itemsCount = await this.itemModel.countDocuments({ tenantId: fallbackTenantId }).exec();
      if (itemsCount > 0) {
        return;
      }

      this.logger.log('Seeding default inventory items and suppliers...');

      // 1. Seed Suppliers
      const suppliersData = [
        {
          tenantId: fallbackTenantId,
          name: 'Apex Medical Supplies Ltd',
          contactPerson: 'Vikram Malhotra',
          phone: '+91 98101 22334',
          email: 'orders@apexmed.com',
          taxId: '07AABCA1234F1Z1',
          address: 'Plot 44, Okhla Industrial Area, Phase III, New Delhi',
          paymentTerms: 'Net 30',
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          name: 'SurgiCare Life Sciences',
          contactPerson: 'Ananya Sharma',
          phone: '+91 98202 33445',
          email: 'sales@surgicare.in',
          taxId: '27AABCS5678G1Z2',
          address: 'Sector 18, Vashi, Navi Mumbai',
          paymentTerms: 'Net 45',
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          name: 'MedTech Diagnostic Reagents',
          contactPerson: 'Dr. Rajesh Kulkarni',
          phone: '+91 98303 44556',
          email: 'supply@medtechdiag.com',
          taxId: '29AABCM9012H1Z3',
          address: 'Peenya Industrial Area, Bengaluru',
          paymentTerms: 'Immediate',
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          name: 'Beacon Healthcare Logistics',
          contactPerson: 'Suresh Nair',
          phone: '+91 98404 55667',
          email: 'dispatch@beaconhl.com',
          taxId: '33AABCB3456J1Z4',
          address: 'Ambattur Industrial Estate, Chennai',
          paymentTerms: 'Net 60',
          isActive: true,
        },
      ];

      const insertedSuppliers = await this.supplierModel.insertMany(suppliersData);
      const apexSupplier = insertedSuppliers[0];

      // 2. Seed Items
      const itemsData = [
        {
          tenantId: fallbackTenantId,
          itemCode: 'ITM-SUR-001',
          name: 'Sterile Surgical Gloves - Size 7.5',
          category: InventoryCategory.SURGICAL,
          uom: 'Box of 50',
          reorderLevel: 20,
          reorderQuantity: 100,
          stockOnHand: 85,
          unitCost: 12.5,
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          itemCode: 'ITM-CON-002',
          name: 'Normal Saline 0.9% IV Infusion 500ml',
          category: InventoryCategory.CONSUMABLE,
          uom: 'Bottle',
          reorderLevel: 50,
          reorderQuantity: 200,
          stockOnHand: 140,
          unitCost: 1.5,
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          itemCode: 'ITM-CON-003',
          name: 'N95 Particulate Respirator Mask',
          category: InventoryCategory.CONSUMABLE,
          uom: 'Box of 20',
          reorderLevel: 20,
          reorderQuantity: 60,
          stockOnHand: 12, // Critical low stock alert
          unitCost: 22.0,
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          itemCode: 'ITM-CON-004',
          name: 'Disposable Syringe 5ml with 23G Needle',
          category: InventoryCategory.CONSUMABLE,
          uom: 'Box of 100',
          reorderLevel: 30,
          reorderQuantity: 100,
          stockOnHand: 65,
          unitCost: 8.0,
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          itemCode: 'ITM-SUR-005',
          name: 'IV Cannula 20G Pink with Injection Port',
          category: InventoryCategory.SURGICAL,
          uom: 'Box of 50',
          reorderLevel: 25,
          reorderQuantity: 100,
          stockOnHand: 18, // Critical low stock alert
          unitCost: 35.0,
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          itemCode: 'ITM-CON-006',
          name: 'Gauze Swabs 10x10cm 8-Ply Sterile',
          category: InventoryCategory.CONSUMABLE,
          uom: 'Pack of 100',
          reorderLevel: 40,
          reorderQuantity: 150,
          stockOnHand: 110,
          unitCost: 4.5,
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          itemCode: 'ITM-SUR-007',
          name: 'Surgical Scalpel Carbon Blades No. 11',
          category: InventoryCategory.SURGICAL,
          uom: 'Box of 100',
          reorderLevel: 10,
          reorderQuantity: 50,
          stockOnHand: 35,
          unitCost: 15.0,
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          itemCode: 'ITM-REA-008',
          name: 'Rapid Dengue NS1 / IgG / IgM Antigen Kit',
          category: InventoryCategory.REAGENT,
          uom: 'Kit of 25',
          reorderLevel: 10,
          reorderQuantity: 30,
          stockOnHand: 6, // Critical low stock alert
          unitCost: 45.0,
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          itemCode: 'ITM-LIN-009',
          name: 'Hospital Cotton Bed Sheets - Twin White',
          category: InventoryCategory.LINEN,
          uom: 'Piece',
          reorderLevel: 20,
          reorderQuantity: 60,
          stockOnHand: 45,
          unitCost: 18.0,
          isActive: true,
        },
        {
          tenantId: fallbackTenantId,
          itemCode: 'ITM-EQP-010',
          name: 'Fingertip Pulse Oximeter with OLED Display',
          category: InventoryCategory.EQUIPMENT,
          uom: 'Piece',
          reorderLevel: 5,
          reorderQuantity: 20,
          stockOnHand: 14,
          unitCost: 28.0,
          isActive: true,
        },
      ];

      const insertedItems = await this.itemModel.insertMany(itemsData);

      // 3. Seed an initial Purchase Order ready for GRN delivery check-in
      if (apexSupplier && insertedItems.length >= 2) {
        const item1 = insertedItems[0]; // Gloves
        const item2 = insertedItems[1]; // Saline

        const poNumber = 'PO-2026-00001';
        const poItems = [
          {
            itemId: item1._id,
            itemCode: item1.itemCode,
            itemName: item1.name,
            uom: item1.uom,
            quantityOrdered: 50,
            quantityReceived: 0,
            unitPrice: 12.0,
            lineTotal: 600.0,
          },
          {
            itemId: item2._id,
            itemCode: item2.itemCode,
            itemName: item2.name,
            uom: item2.uom,
            quantityOrdered: 100,
            quantityReceived: 0,
            unitPrice: 1.5,
            lineTotal: 150.0,
          },
        ];

        await this.poModel.create({
          tenantId: fallbackTenantId,
          poNumber,
          supplierId: apexSupplier._id,
          status: PurchaseOrderStatus.APPROVED,
          items: poItems,
          totalAmount: 750.0,
          notes: 'Emergency safety stock replenishment for central operating theaters.',
          approvedAt: new Date(),
        });
      }

      this.logger.log('Successfully seeded 10 inventory items, 4 suppliers, and 1 approved purchase order.');
    } catch (err) {
      this.logger.error(`Error seeding default inventory: ${(err as Error).message}`);
    }
  }

  // ==========================================
  // Number Generators
  // ==========================================

  private async generatePoNumber(tenantId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.poModel.countDocuments({ tenantId }).exec();
    const sequence = String(count + 1).padStart(5, '0');
    return `PO-${year}-${sequence}`;
  }

  private async generateGrnNumber(tenantId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.grnModel.countDocuments({ tenantId }).exec();
    const sequence = String(count + 1).padStart(5, '0');
    return `GRN-${year}-${sequence}`;
  }

  private async generateItemCode(tenantId: Types.ObjectId, category: InventoryCategory): Promise<string> {
    const prefixMap: Record<string, string> = {
      [InventoryCategory.CONSUMABLE]: 'ITM-CON',
      [InventoryCategory.SURGICAL]: 'ITM-SUR',
      [InventoryCategory.REAGENT]: 'ITM-REA',
      [InventoryCategory.LINEN]: 'ITM-LIN',
      [InventoryCategory.GENERAL]: 'ITM-GEN',
      [InventoryCategory.EQUIPMENT]: 'ITM-EQP',
    };
    const prefix = prefixMap[category] || 'ITM-GEN';
    const count = await this.itemModel.countDocuments({ tenantId }).exec();
    const sequence = String(count + 1).padStart(3, '0');
    return `${prefix}-${sequence}`;
  }

  // ==========================================
  // Dashboard Metrics
  // ==========================================

  async getDashboardMetrics(tenantId: Types.ObjectId): Promise<InventoryDashboardMetrics> {
    const [
      totalItemsCount,
      allItems,
      activePurchaseOrdersCount,
      movementsCount,
    ] = await Promise.all([
      this.itemModel.countDocuments({ tenantId, isActive: true }).exec(),
      this.itemModel.find({ tenantId, isActive: true }).select('stockOnHand reorderLevel unitCost').exec(),
      this.poModel.countDocuments({
        tenantId,
        status: { $in: [PurchaseOrderStatus.SUBMITTED, PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED] },
      }).exec(),
      this.movementModel.countDocuments({
        tenantId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }).exec(),
    ]);

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValuation = 0;

    for (const item of allItems) {
      if (item.stockOnHand === 0) {
        outOfStockCount++;
      } else if (item.stockOnHand <= item.reorderLevel) {
        lowStockCount++;
      }
      totalValuation += (item.stockOnHand || 0) * (item.unitCost || 0);
    }

    return {
      totalItemsCount,
      lowStockCount,
      outOfStockCount,
      activePurchaseOrdersCount,
      totalValuation: Math.round(totalValuation * 100) / 100,
      recentMovementsCount: movementsCount,
    };
  }

  // ==========================================
  // Item Master Management
  // ==========================================

  async getItems(tenantId: Types.ObjectId, query?: { category?: string; lowStock?: string; search?: string }) {
    const filter: any = { tenantId, isActive: true };

    if (query?.category && query.category !== 'all') {
      filter.category = query.category;
    }

    if (query?.lowStock === 'true') {
      filter.$expr = { $lte: ['$stockOnHand', '$reorderLevel'] };
    }

    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { itemCode: { $regex: q, $options: 'i' } },
      ];
    }

    return this.itemModel.find(filter).sort({ name: 1 }).exec();
  }

  async getItemById(tenantId: Types.ObjectId, id: string): Promise<InventoryItemDocument> {
    const item = await this.itemModel.findOne({ _id: new Types.ObjectId(id), tenantId }).exec();
    if (!item) {
      throw new NotFoundException(`Inventory item not found.`);
    }
    return item;
  }

  async createItem(tenantId: Types.ObjectId, dto: CreateItemDto): Promise<InventoryItemDocument> {
    const itemCode = dto.itemCode?.trim() || (await this.generateItemCode(tenantId, dto.category));

    // Check duplicate code
    const existing = await this.itemModel.findOne({ tenantId, itemCode }).exec();
    if (existing) {
      throw new BadRequestException(`Item code "${itemCode}" already exists.`);
    }

    const item = await this.itemModel.create({
      tenantId,
      itemCode,
      name: dto.name.trim(),
      category: dto.category,
      uom: dto.uom.trim(),
      reorderLevel: dto.reorderLevel,
      reorderQuantity: dto.reorderQuantity || dto.reorderLevel * 2,
      stockOnHand: dto.initialStock || 0,
      unitCost: dto.unitCost || 0,
      isActive: true,
    });

    if (dto.initialStock && dto.initialStock > 0) {
      await this.movementModel.create({
        tenantId,
        itemId: item._id,
        type: StockMovementType.GRN_RECEIPT,
        toLocation: 'Central Store',
        quantity: dto.initialStock,
        balanceAfter: dto.initialStock,
        reason: 'Initial stock on item creation',
      });
    }

    return item;
  }

  async updateItem(tenantId: Types.ObjectId, id: string, dto: UpdateItemDto): Promise<InventoryItemDocument> {
    const item = await this.getItemById(tenantId, id);

    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.uom !== undefined) item.uom = dto.uom.trim();
    if (dto.reorderLevel !== undefined) item.reorderLevel = dto.reorderLevel;
    if (dto.reorderQuantity !== undefined) item.reorderQuantity = dto.reorderQuantity;
    if (dto.unitCost !== undefined) item.unitCost = dto.unitCost;
    if (dto.isActive !== undefined) item.isActive = dto.isActive;

    return item.save();
  }

  // ==========================================
  // Supplier Management
  // ==========================================

  async getSuppliers(tenantId: Types.ObjectId) {
    return this.supplierModel.find({ tenantId, isActive: true }).sort({ name: 1 }).exec();
  }

  async getSupplierById(tenantId: Types.ObjectId, id: string): Promise<SupplierDocument> {
    const supplier = await this.supplierModel.findOne({ _id: new Types.ObjectId(id), tenantId }).exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier not found.`);
    }
    return supplier;
  }

  async createSupplier(tenantId: Types.ObjectId, dto: CreateSupplierDto): Promise<SupplierDocument> {
    return this.supplierModel.create({
      tenantId,
      name: dto.name.trim(),
      contactPerson: dto.contactPerson?.trim(),
      phone: dto.phone.trim(),
      email: dto.email?.trim(),
      taxId: dto.taxId?.trim(),
      address: dto.address?.trim(),
      paymentTerms: dto.paymentTerms?.trim() || 'Net 30',
      isActive: true,
    });
  }

  // ==========================================
  // Purchase Order Workflow
  // ==========================================

  async getPurchaseOrders(tenantId: Types.ObjectId, query?: { status?: string; supplierId?: string }) {
    const filter: any = { tenantId };

    if (query?.status && query.status !== 'all') {
      filter.status = query.status;
    }

    if (query?.supplierId && query.supplierId !== 'all') {
      filter.supplierId = new Types.ObjectId(query.supplierId);
    }

    return this.poModel
      .find(filter)
      .populate('supplierId', 'name contactPerson phone email')
      .populate('items.itemId', 'name itemCode uom')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPurchaseOrderById(tenantId: Types.ObjectId, id: string): Promise<PurchaseOrderDocument> {
    const po = await this.poModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .populate('supplierId')
      .populate('items.itemId')
      .exec();

    if (!po) {
      throw new NotFoundException(`Purchase Order not found.`);
    }
    return po;
  }

  async createPurchaseOrder(
    tenantId: Types.ObjectId,
    userId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderDocument> {
    const supplier = await this.getSupplierById(tenantId, dto.supplierId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A purchase order must contain at least one line item.');
    }

    const enrichedItems: any[] = [];
    let totalAmount = 0;

    for (const line of dto.items) {
      if (line.quantityOrdered <= 0) {
        throw new BadRequestException('Ordered quantity must be greater than zero.');
      }
      if (line.unitPrice < 0) {
        throw new BadRequestException('Unit price cannot be negative.');
      }

      const item = await this.getItemById(tenantId, line.itemId);
      const lineTotal = Math.round(line.quantityOrdered * line.unitPrice * 100) / 100;
      totalAmount += lineTotal;

      enrichedItems.push({
        itemId: item._id,
        itemCode: item.itemCode,
        itemName: item.name,
        uom: item.uom,
        quantityOrdered: line.quantityOrdered,
        quantityReceived: 0,
        unitPrice: line.unitPrice,
        lineTotal,
      });
    }

    const poNumber = await this.generatePoNumber(tenantId);

    const po = await this.poModel.create({
      tenantId,
      poNumber,
      supplierId: supplier._id,
      status: PurchaseOrderStatus.SUBMITTED,
      items: enrichedItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      notes: dto.notes?.trim(),
      createdById: new Types.ObjectId(userId),
    });

    await this.auditService.record({
      userId,
      action: 'PURCHASE_ORDER_CREATE',
      resource: `purchase_orders/${po._id}`,
      details: {
        poNumber,
        supplierName: supplier.name,
        itemCount: enrichedItems.length,
        totalAmount,
      },
    });

    return po;
  }

  async approvePurchaseOrder(
    tenantId: Types.ObjectId,
    userId: string,
    id: string,
  ): Promise<PurchaseOrderDocument> {
    const po = await this.getPurchaseOrderById(tenantId, id);

    if (po.status !== PurchaseOrderStatus.SUBMITTED && po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(`Cannot approve PO in "${po.status}" status.`);
    }

    po.status = PurchaseOrderStatus.APPROVED;
    po.approvedBy = new Types.ObjectId(userId);
    po.approvedAt = new Date();

    const saved = await po.save();

    await this.auditService.record({
      userId,
      action: 'PURCHASE_ORDER_APPROVE',
      resource: `purchase_orders/${po._id}`,
      details: {
        poNumber: po.poNumber,
        totalAmount: po.totalAmount,
      },
    });

    return saved;
  }

  async cancelPurchaseOrder(
    tenantId: Types.ObjectId,
    userId: string,
    id: string,
    reason?: string,
  ): Promise<PurchaseOrderDocument> {
    const po = await this.getPurchaseOrderById(tenantId, id);

    if (po.status === PurchaseOrderStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed purchase order.');
    }
    if (po.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Purchase order is already cancelled.');
    }

    po.status = PurchaseOrderStatus.CANCELLED;
    if (reason) {
      po.notes = po.notes ? `${po.notes} | Cancellation reason: ${reason}` : `Cancellation reason: ${reason}`;
    }

    const saved = await po.save();

    await this.auditService.record({
      userId,
      action: 'PURCHASE_ORDER_CANCEL',
      resource: `purchase_orders/${po._id}`,
      details: {
        poNumber: po.poNumber,
        reason,
      },
    });

    return saved;
  }

  // ==========================================
  // Goods Receiving Note (GRN) Engine
  // ==========================================

  async getPurchaseReceipts(tenantId: Types.ObjectId, query?: { poId?: string }) {
    const filter: any = { tenantId };
    if (query?.poId) {
      filter.poId = new Types.ObjectId(query.poId);
    }
    return this.grnModel
      .find(filter)
      .populate('poId', 'poNumber')
      .populate('supplierId', 'name contactPerson')
      .populate('items.itemId', 'name itemCode uom')
      .sort({ receivedDate: -1 })
      .exec();
  }

  async createGoodsReceipt(
    tenantId: Types.ObjectId,
    userId: string,
    dto: CreateGoodsReceiptDto,
  ): Promise<PurchaseReceiptDocument> {
    const po = await this.getPurchaseOrderById(tenantId, dto.poId);

    if (
      po.status !== PurchaseOrderStatus.APPROVED &&
      po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
    ) {
      throw new BadRequestException(
        `Goods can only be received against an APPROVED or PARTIALLY_RECEIVED purchase order. Current status: ${po.status}`,
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Goods receipt must contain at least one line item.');
    }

    const receiptItems: any[] = [];

    for (const receiptItem of dto.items) {
      if (receiptItem.quantityReceived <= 0) {
        throw new BadRequestException('Quantity received must be strictly greater than zero.');
      }
      if (!receiptItem.lotNumber || !receiptItem.lotNumber.trim()) {
        throw new BadRequestException('Lot / batch number is mandatory for all received goods.');
      }

      // Find matching PO line item
      const poLine = po.items.find(
        (i) => i.itemId.toString() === receiptItem.itemId || (i.itemId as any)?._id?.toString() === receiptItem.itemId,
      );

      if (!poLine) {
        throw new BadRequestException(`Item ${receiptItem.itemId} is not listed on Purchase Order ${po.poNumber}.`);
      }

      const remainingAllowed = poLine.quantityOrdered - poLine.quantityReceived;
      if (receiptItem.quantityReceived > remainingAllowed) {
        throw new BadRequestException(
          `Cannot receive ${receiptItem.quantityReceived} units for item "${poLine.itemName}". Remaining pending units: ${remainingAllowed}.`,
        );
      }

      // Atomically increment item stock on hand
      const updatedItem = await this.itemModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(receiptItem.itemId), tenantId },
          { $inc: { stockOnHand: receiptItem.quantityReceived } },
          { new: true },
        )
        .exec();

      if (!updatedItem) {
        throw new NotFoundException(`Inventory item ${receiptItem.itemId} not found.`);
      }

      // Update PO line item received quantity
      poLine.quantityReceived += receiptItem.quantityReceived;

      // Log stock movement
      await this.movementModel.create({
        tenantId,
        itemId: updatedItem._id,
        type: StockMovementType.GRN_RECEIPT,
        toLocation: 'Central Store',
        quantity: receiptItem.quantityReceived,
        balanceAfter: updatedItem.stockOnHand,
        referenceId: po.poNumber,
        reason: `GRN delivery against ${po.poNumber} (Lot: ${receiptItem.lotNumber})`,
        performedBy: new Types.ObjectId(userId),
      });

      receiptItems.push({
        itemId: updatedItem._id,
        itemCode: updatedItem.itemCode,
        itemName: updatedItem.name,
        quantityReceived: receiptItem.quantityReceived,
        lotNumber: receiptItem.lotNumber.trim(),
        expiryDate: receiptItem.expiryDate ? new Date(receiptItem.expiryDate) : undefined,
        unitPrice: receiptItem.unitPrice !== undefined ? receiptItem.unitPrice : poLine.unitPrice,
      });
    }

    // Determine new PO status
    const allCompleted = po.items.every((line) => line.quantityReceived >= line.quantityOrdered);
    po.status = allCompleted ? PurchaseOrderStatus.COMPLETED : PurchaseOrderStatus.PARTIALLY_RECEIVED;
    await po.save();

    const grnNumber = await this.generateGrnNumber(tenantId);

    const grn = await this.grnModel.create({
      tenantId,
      grnNumber,
      poId: po._id,
      supplierId: po.supplierId,
      receivedBy: new Types.ObjectId(userId),
      items: receiptItems,
      notes: dto.notes?.trim(),
      receivedDate: new Date(),
    });

    await this.auditService.record({
      userId,
      action: 'GOODS_RECEIVE',
      resource: `purchase_receipts/${grn._id}`,
      details: {
        grnNumber,
        poNumber: po.poNumber,
        itemsReceivedCount: receiptItems.length,
        newPoStatus: po.status,
      },
    });

    return grn;
  }

  // ==========================================
  // Departmental Transfers & Audit Adjustments
  // ==========================================

  async transferStock(
    tenantId: Types.ObjectId,
    userId: string,
    dto: StockTransferDto,
  ): Promise<StockMovementDocument> {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Transfer quantity must be strictly greater than zero.');
    }

    // Atomically decrement stock from Central Store
    const updatedItem = await this.itemModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(dto.itemId),
          tenantId,
          stockOnHand: { $gte: dto.quantity },
        },
        { $inc: { stockOnHand: -dto.quantity } },
        { new: true },
      )
      .exec();

    if (!updatedItem) {
      const item = await this.itemModel.findOne({ _id: new Types.ObjectId(dto.itemId), tenantId }).exec();
      if (!item) {
        throw new NotFoundException('Inventory item not found.');
      }
      throw new BadRequestException(
        `Insufficient central stock on hand. Available: ${item.stockOnHand}, Requested: ${dto.quantity}.`,
      );
    }

    const movement = await this.movementModel.create({
      tenantId,
      itemId: updatedItem._id,
      type: StockMovementType.DEPT_TRANSFER,
      fromLocation: 'Central Store',
      toLocation: dto.toDepartment.trim(),
      quantity: -dto.quantity,
      balanceAfter: updatedItem.stockOnHand,
      reason: dto.reason?.trim() || `Departmental issue to ${dto.toDepartment}`,
      performedBy: new Types.ObjectId(userId),
    });

    await this.auditService.record({
      userId,
      action: 'STOCK_TRANSFER',
      resource: `inventory_items/${updatedItem._id}`,
      details: {
        itemCode: updatedItem.itemCode,
        itemName: updatedItem.name,
        quantity: dto.quantity,
        toDepartment: dto.toDepartment,
        remainingStock: updatedItem.stockOnHand,
      },
    });

    return movement;
  }

  async adjustStock(
    tenantId: Types.ObjectId,
    userId: string,
    dto: StockAdjustmentDto,
  ): Promise<StockMovementDocument> {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Adjustment quantity must be strictly greater than zero.');
    }

    let updatedItem: InventoryItemDocument | null = null;
    let netChange = 0;
    let movementType: StockMovementType;

    if (dto.type === 'loss') {
      movementType = StockMovementType.ADJUSTMENT_LOSS;
      netChange = -dto.quantity;

      updatedItem = await this.itemModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(dto.itemId),
            tenantId,
            stockOnHand: { $gte: dto.quantity },
          },
          { $inc: { stockOnHand: -dto.quantity } },
          { new: true },
        )
        .exec();

      if (!updatedItem) {
        const item = await this.itemModel.findOne({ _id: new Types.ObjectId(dto.itemId), tenantId }).exec();
        if (!item) throw new NotFoundException('Inventory item not found.');
        throw new BadRequestException(`Cannot record loss of ${dto.quantity}. Stock on hand is only ${item.stockOnHand}.`);
      }
    } else {
      movementType = StockMovementType.ADJUSTMENT_GAIN;
      netChange = dto.quantity;

      updatedItem = await this.itemModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(dto.itemId), tenantId },
          { $inc: { stockOnHand: dto.quantity } },
          { new: true },
        )
        .exec();

      if (!updatedItem) {
        throw new NotFoundException('Inventory item not found.');
      }
    }

    const movement = await this.movementModel.create({
      tenantId,
      itemId: updatedItem._id,
      type: movementType,
      fromLocation: dto.type === 'loss' ? 'Central Store' : undefined,
      toLocation: dto.type === 'gain' ? 'Central Store' : undefined,
      quantity: netChange,
      balanceAfter: updatedItem.stockOnHand,
      reason: dto.reason.trim(),
      performedBy: new Types.ObjectId(userId),
    });

    await this.auditService.record({
      userId,
      action: 'STOCK_ADJUSTMENT',
      resource: `inventory_items/${updatedItem._id}`,
      details: {
        type: dto.type,
        quantity: dto.quantity,
        reason: dto.reason,
        newBalance: updatedItem.stockOnHand,
      },
    });

    return movement;
  }

  async getStockMovements(tenantId: Types.ObjectId, query?: { itemId?: string; type?: string }) {
    const filter: any = { tenantId };

    if (query?.itemId && query.itemId !== 'all') {
      filter.itemId = new Types.ObjectId(query.itemId);
    }
    if (query?.type && query.type !== 'all') {
      filter.type = query.type;
    }

    return this.movementModel
      .find(filter)
      .populate('itemId', 'name itemCode uom category')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();
  }
}
