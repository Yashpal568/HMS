import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from './inventory.service.js';
import { Types } from 'mongoose';
import {
  InventoryCategory,
  PurchaseOrderStatus,
  StockMovementType,
} from '@hms/types';
import { BadRequestException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockItemModel: any;
  let mockSupplierModel: any;
  let mockPoModel: any;
  let mockGrnModel: any;
  let mockMovementModel: any;
  let mockAuditService: any;

  const tenantId = new Types.ObjectId();
  const userId = new Types.ObjectId().toString();
  const itemId = new Types.ObjectId();
  const supplierId = new Types.ObjectId();
  const poId = new Types.ObjectId();

  beforeEach(() => {
    mockItemModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      insertMany: vi.fn(),
    };

    mockSupplierModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      insertMany: vi.fn(),
    };

    mockPoModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
    };

    mockGrnModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
    };

    mockMovementModel = {
      countDocuments: vi.fn(),
      create: vi.fn(),
      find: vi.fn(),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    service = new InventoryService(
      mockItemModel,
      mockSupplierModel,
      mockPoModel,
      mockGrnModel,
      mockMovementModel,
      mockAuditService,
    );
  });

  describe('getDashboardMetrics', () => {
    it('should aggregate total items, low-stock count, and total valuation accurately', async () => {
      mockItemModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(3),
      });

      const sampleItems = [
        { stockOnHand: 10, reorderLevel: 20, unitCost: 5 }, // Low stock: 10 <= 20
        { stockOnHand: 50, reorderLevel: 20, unitCost: 10 }, // Healthy: 50 > 20
        { stockOnHand: 0, reorderLevel: 10, unitCost: 15 }, // Out of stock
      ];

      mockItemModel.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(sampleItems),
        }),
      });

      mockPoModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(2),
      });

      mockMovementModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(5),
      });

      const metrics = await service.getDashboardMetrics(tenantId);

      expect(metrics.totalItemsCount).toBe(3);
      expect(metrics.lowStockCount).toBe(1);
      expect(metrics.outOfStockCount).toBe(1);
      expect(metrics.activePurchaseOrdersCount).toBe(2);
      // Valuation: 10*5 + 50*10 + 0*15 = 50 + 500 + 0 = 550
      expect(metrics.totalValuation).toBe(550);
      expect(metrics.recentMovementsCount).toBe(5);
    });
  });

  describe('createItem', () => {
    it('should reject if itemCode already exists for tenant', async () => {
      mockItemModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: itemId, itemCode: 'ITM-SUR-001' }),
      });

      await expect(
        service.createItem(tenantId, {
          itemCode: 'ITM-SUR-001',
          name: 'Sterile Gloves',
          category: InventoryCategory.SURGICAL,
          uom: 'Box',
          reorderLevel: 20,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create item successfully and record initial movement if initialStock > 0', async () => {
      mockItemModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const createdItem = {
        _id: itemId,
        tenantId,
        itemCode: 'ITM-SUR-001',
        name: 'Sterile Gloves',
        category: InventoryCategory.SURGICAL,
        uom: 'Box',
        reorderLevel: 20,
        stockOnHand: 50,
      };

      mockItemModel.create.mockResolvedValue(createdItem);
      mockMovementModel.create.mockResolvedValue({});

      const result = await service.createItem(tenantId, {
        itemCode: 'ITM-SUR-001',
        name: 'Sterile Gloves',
        category: InventoryCategory.SURGICAL,
        uom: 'Box',
        reorderLevel: 20,
        initialStock: 50,
      });

      expect(result.itemCode).toBe('ITM-SUR-001');
      expect(mockMovementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId,
          type: StockMovementType.GRN_RECEIPT,
          quantity: 50,
          balanceAfter: 50,
        }),
      );
    });
  });

  describe('createPurchaseOrder & approvePurchaseOrder', () => {
    it('should calculate line totals, set status to SUBMITTED, and audit action', async () => {
      mockSupplierModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: supplierId, name: 'Apex Med' }),
      });

      mockItemModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: itemId,
          itemCode: 'ITM-SUR-001',
          name: 'Gloves',
          uom: 'Box',
        }),
      });

      mockPoModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      });

      const createdPo = {
        _id: poId,
        poNumber: 'PO-2026-00001',
        totalAmount: 240,
        status: PurchaseOrderStatus.SUBMITTED,
      };

      mockPoModel.create.mockResolvedValue(createdPo);

      const res = await service.createPurchaseOrder(tenantId, userId, {
        supplierId: supplierId.toString(),
        items: [{ itemId: itemId.toString(), quantityOrdered: 20, unitPrice: 12 }],
      });

      expect(res.status).toBe(PurchaseOrderStatus.SUBMITTED);
      expect(mockPoModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: 240,
          status: PurchaseOrderStatus.SUBMITTED,
        }),
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PURCHASE_ORDER_CREATE',
        }),
      );
    });

    it('should transition PO status to APPROVED on administrative sign-off', async () => {
      const mockPo = {
        _id: poId,
        poNumber: 'PO-2026-00001',
        status: PurchaseOrderStatus.SUBMITTED,
        totalAmount: 240,
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockPoModel.findOne.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockPo),
          }),
        }),
      });

      const approved = await service.approvePurchaseOrder(tenantId, userId, poId.toString());

      expect(approved.status).toBe(PurchaseOrderStatus.APPROVED);
      expect(approved.approvedBy).toEqual(new Types.ObjectId(userId));
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PURCHASE_ORDER_APPROVE',
        }),
      );
    });
  });

  describe('createGoodsReceipt (GRN)', () => {
    it('should reject goods receipt if purchase order is not approved', async () => {
      const mockPo = {
        _id: poId,
        poNumber: 'PO-2026-00001',
        status: PurchaseOrderStatus.SUBMITTED, // Not approved!
        items: [],
      };

      mockPoModel.findOne.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockPo),
          }),
        }),
      });

      await expect(
        service.createGoodsReceipt(tenantId, userId, {
          poId: poId.toString(),
          items: [{ itemId: itemId.toString(), quantityReceived: 10, lotNumber: 'LOT-123' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should atomically increment stock, update PO line items, advance PO to COMPLETED, and record stock movement', async () => {
      const mockPo = {
        _id: poId,
        poNumber: 'PO-2026-00001',
        supplierId,
        status: PurchaseOrderStatus.APPROVED,
        items: [
          {
            itemId,
            itemCode: 'ITM-SUR-001',
            itemName: 'Gloves',
            quantityOrdered: 20,
            quantityReceived: 0,
            unitPrice: 12,
          },
        ],
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };

      mockPoModel.findOne.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockPo),
          }),
        }),
      });

      // Updated item after stock increment
      mockItemModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: itemId,
          itemCode: 'ITM-SUR-001',
          name: 'Gloves',
          stockOnHand: 70, // 50 prior + 20 received
        }),
      });

      mockGrnModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      });

      mockGrnModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        grnNumber: 'GRN-2026-00001',
        poId,
      });

      mockMovementModel.create.mockResolvedValue({});

      await service.createGoodsReceipt(tenantId, userId, {
        poId: poId.toString(),
        items: [
          {
            itemId: itemId.toString(),
            quantityReceived: 20,
            lotNumber: 'LOT-GLV-991',
            expiryDate: '2028-12-31',
          },
        ],
      });

      // Item stock incremented
      expect(mockItemModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: itemId, tenantId },
        { $inc: { stockOnHand: 20 } },
        { new: true },
      );

      // PO status updated to COMPLETED since 20/20 received
      expect(mockPo.status).toBe(PurchaseOrderStatus.COMPLETED);
      expect(mockPo.items[0].quantityReceived).toBe(20);

      // Movement created
      expect(mockMovementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId,
          type: StockMovementType.GRN_RECEIPT,
          quantity: 20,
          balanceAfter: 70,
        }),
      );

      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GOODS_RECEIVE',
        }),
      );
    });
  });

  describe('transferStock & adjustStock', () => {
    it('should deduct central stock and write dept_transfer movement', async () => {
      mockItemModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: itemId,
          itemCode: 'ITM-SUR-001',
          name: 'Gloves',
          stockOnHand: 45, // 50 - 5
        }),
      });

      mockMovementModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        balanceAfter: 45,
      });

      await service.transferStock(tenantId, userId, {
        itemId: itemId.toString(),
        quantity: 5,
        toDepartment: 'Emergency Room',
        reason: 'Ward supply top-up',
      });

      expect(mockItemModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: itemId, tenantId, stockOnHand: { $gte: 5 } },
        { $inc: { stockOnHand: -5 } },
        { new: true },
      );

      expect(mockMovementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId,
          type: StockMovementType.DEPT_TRANSFER,
          toLocation: 'Emergency Room',
          quantity: -5,
          balanceAfter: 45,
        }),
      );
    });

    it('should reject transfer if central stock is insufficient', async () => {
      // findOneAndUpdate returns null because stockOnHand was less than requested
      mockItemModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      mockItemModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: itemId,
          stockOnHand: 3,
        }),
      });

      await expect(
        service.transferStock(tenantId, userId, {
          itemId: itemId.toString(),
          quantity: 10,
          toDepartment: 'ICU',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record loss adjustment with valid reason', async () => {
      mockItemModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: itemId,
          stockOnHand: 48, // 50 - 2
        }),
      });

      mockMovementModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        balanceAfter: 48,
      });

      await service.adjustStock(tenantId, userId, {
        itemId: itemId.toString(),
        quantity: 2,
        type: 'loss',
        reason: 'Water damage during packaging transport',
      });

      expect(mockMovementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId,
          type: StockMovementType.ADJUSTMENT_LOSS,
          quantity: -2,
          balanceAfter: 48,
          reason: 'Water damage during packaging transport',
        }),
      );
    });
  });
});
