# Milestone 09 — Inventory & Procurement

## Objective
Build the hospital central inventory management and procurement system, covering consumable and medical item catalogs, supplier records, purchase orders (PO), Goods Receiving Notes (GRN), departmental stock distribution, and reorder threshold alerts conforming to `docs/DATABASE.md`.

## Scope
- Item Master Catalog (`inventory_items`):
  - Item code, item name, category (Medical Consumable, Surgical Supply, Reagent, Linen, General Supply, Equipment).
  - Unit of Measurement (UOM: pieces, boxes, vials, rolls, liters).
  - Minimum safety stock level, reorder quantity threshold, current stock on hand.
- Vendor & Supplier Management (`suppliers`):
  - Supplier company name, contact person, verified phone, email, tax identification (GST / VAT number), physical address, payment credit terms.
- Purchase Order Workflow (`purchase_orders`):
  - PO creation: Vendor selection, item selection, requested quantities, agreed unit purchase rates.
  - PO lifecycle: `draft` → `submitted` → `approved` → `partially_received` → `completed` → `cancelled`.
  - Multi-tier approval (hospital administrative sign-off).
- Goods Receiving Note (GRN / `purchase_receipts`):
  - Shipment receiving against an approved PO.
  - Verification of received quantities vs ordered quantities.
  - Recording lot/batch numbers and expiry dates for delivered consumables.
  - Rejection logging for damaged or substandard goods.
  - Automatic inventory stock-on-hand update.
- Departmental Stock Transfers & Stock Movements (`stock_movements`):
  - Requisitions from sub-stores (e.g. Central Store to Operating Theater, Emergency, or ICU).
  - Issue confirmation and receipt acknowledgment.
  - Stock adjustment logging for spoilage, damage, or annual physical audit discrepancies.
- Low-Stock and Critical Reorder Dashboard.

## Out of Scope
- Direct banking electronic funds transfer (EFT) payment processing to suppliers (Milestone 10/Accounts Payable).
- Biomedical engineering preventative maintenance schedules (Phase 2).
- Dispensing drugs directly to patients (Milestone 08/Pharmacy).

## Prerequisites
- Milestone 01 (Authentication & RBAC).
- Milestone 02 (Application Shell & Dashboard).

## User Workflows
1. **Catalog Setup**: Inventory Manager creates "Sterile Surgical Gloves - Size 7.5" (UOM: Box of 50, Reorder level: 20 boxes).
2. **Raise Purchase Order**: Stock level drops to 15 boxes. Inventory Manager creates PO `PO-2026-0081` to "Apex Medical Supplies Ltd" for 100 boxes at $12.00/box. Hospital Admin approves the PO.
3. **Goods Receiving (GRN)**: Delivery truck arrives. Warehouse clerk inspects 100 boxes, checks packaging, records Lot `GLV-991` expiring in 3 years, and submits GRN `GRN-2026-0044`. System immediately increases central stock on hand to 115 boxes and advances PO status to `completed`.
4. **Departmental Issue**: Emergency room nurse requests 5 boxes of gloves. Store clerk issues 5 boxes; system deducts from Central Store and credits the Emergency sub-store ledger.
5. **Physical Audit Adjustment**: Annual audit finds 1 damaged box. Store manager logs an adjustment with reason "Packaging water damaged", deducting 1 box with audit trail.

## Frontend Requirements
- **Pages**:
  - `/inventory`: Inventory dashboard with stock valuation, active purchase orders, and low-stock alerts.
  - `/inventory/items`: Item master list with category filters and stock level indicators.
  - `/inventory/items/new`: Form to create medical or consumable item.
  - `/inventory/suppliers`: Supplier directory with contact details.
  - `/inventory/purchase-orders`: Purchase order table with status chips and create PO wizard.
  - `/inventory/grn`: Goods receiving workstation for delivery check-in.
  - `/inventory/transfers`: Internal departmental stock transfer ledger.
- **Components**:
  - `StockLevelProgressBar`: Visual gauge showing current stock vs minimum reorder threshold.
  - `PurchaseOrderItemTable`: Dynamic line-item editor for PO creation (item, qty, rate, total).
  - `GrnReceivingGrid`: Table comparing ordered qty against received qty with lot number inputs.
  - `SupplierContactCard`: Summary card showing supplier address, phone, and terms.
- **States**: Out-of-stock red alert banner, partial receiving chip, approval confirmation modal.

## Backend Requirements
- **Modules**: `InventoryModule` in `apps/api/src/inventory/`.
- **Controllers**:
  - `InventoryController`:
    - `GET /api/v1/inventory/items`: List items with category and stock filters (`inventory.read`).
    - `POST /api/v1/inventory/items`: Create item master (`inventory.create`).
    - `GET /api/v1/inventory/suppliers`: Supplier directory (`inventory.read`).
    - `POST /api/v1/inventory/suppliers`: Add supplier (`inventory.manage`).
    - `POST /api/v1/inventory/purchase-orders`: Create PO (`inventory.create`).
    - `POST /api/v1/inventory/purchase-orders/:id/approve`: Approve PO (`inventory.manage`).
    - `POST /api/v1/inventory/grn`: Receive goods against PO (`inventory.update`).
    - `POST /api/v1/inventory/transfers`: Execute departmental transfer (`inventory.update`).
- **Services**:
  - `InventoryService`: Manages stock ledger balances, reorder calculations, PO workflows, and GRN stock increments.

## Database Requirements
- **Collections**:
  - `inventory_items`:
    - `itemCode`: String, unique (e.g. "ITM-GLV-001")
    - `name`: String, required
    - `category`: String enum (`consumable`, `surgical`, `reagent`, `linen`, `general`, `equipment`)
    - `uom`: String, required (e.g. "Box", "Piece")
    - `reorderLevel`: Number, required
    - `reorderQuantity`: Number
    - `stockOnHand`: Number, default 0
    - `unitCost`: Number
    - `isActive`: Boolean
  - `suppliers`:
    - `name`: String, required
    - `contactPerson`: String
    - `phone`: String, required
    - `email`: String
    - `taxId`: String
    - `address`: String
    - `paymentTerms`: String
    - `isActive`: Boolean
  - `purchase_orders`:
    - `poNumber`: String, unique (e.g. "PO-2026-00120")
    - `supplierId`: ObjectId, ref 'Supplier', required
    - `status`: String enum (`draft`, `submitted`, `approved`, `partially_received`, `completed`, `cancelled`), default `draft`
    - `items`: Array of Objects `[{ itemId: ObjectId, quantityOrdered: Number, quantityReceived: Number, unitPrice: Number, lineTotal: Number }]`
    - `totalAmount`: Number
    - `approvedBy`: ObjectId, ref 'User'
    - `approvedAt`: Date
    - `createdAt`, `updatedAt`: Timestamps
  - `purchase_receipts`:
    - `grnNumber`: String, unique (e.g. "GRN-2026-00085")
    - `poId`: ObjectId, ref 'PurchaseOrder', required
    - `supplierId`: ObjectId, ref 'Supplier', required
    - `receivedBy`: ObjectId, ref 'User', required
    - `items`: Array of Objects `[{ itemId: ObjectId, quantityReceived: Number, lotNumber: String, expiryDate: Date, unitPrice: Number }]`
    - `receivedDate`: Date, default Date.now
  - `stock_movements`:
    - `itemId`: ObjectId, ref 'InventoryItem', required
    - `type`: String enum (`grn_receipt`, `dept_transfer`, `adjustment_loss`, `adjustment_gain`), required
    - `fromLocation`: String
    - `toLocation`: String
    - `quantity`: Number, required
    - `balanceAfter`: Number, required
    - `reason`: String
    - `createdAt`: Date
- **Indexes**:
  - `inventory_items`: `{ itemCode: 1 }` (unique)
  - `inventory_items`: `{ category: 1, stockOnHand: 1 }`
  - `purchase_orders`: `{ poNumber: 1 }` (unique)
  - `purchase_orders`: `{ supplierId: 1, status: 1 }`
  - `stock_movements`: `{ itemId: 1, createdAt: -1 }`

## API Requirements
- `POST /api/v1/inventory/items`: Body `{ name, itemCode, category, uom, reorderLevel }`, returns `{ success, data: InventoryItem }`.
- `POST /api/v1/inventory/purchase-orders`: Body `{ supplierId, items: [{ itemId, quantityOrdered, unitPrice }] }`, returns `{ success, data: PurchaseOrder }`.
- `POST /api/v1/inventory/purchase-orders/:id/approve`: Returns `{ success, data: PurchaseOrder }`.
- `POST /api/v1/inventory/grn`: Body `{ poId, items: [{ itemId, quantityReceived, lotNumber, expiryDate }] }`, returns `{ success, data: PurchaseReceipt }`.
- `GET /api/v1/inventory/alerts/low-stock`: Returns items where `stockOnHand <= reorderLevel`.

## RBAC Requirements
- `inventory.read`: All hospital administrative and clinical department heads.
- `inventory.create`: `inventory_manager`, `hospital_admin`.
- `inventory.update`: `inventory_manager`, `pharmacist`.
- `inventory.manage`: `hospital_admin`, `super_admin` (required for PO approval and supplier contracts).

## Security Requirements
- All stock increments and decrements verified within transactions to prevent inventory balance drift.
- Purchase order approvals strictly gated to administrative authorities.

## Audit Requirements
- `PURCHASE_ORDER_CREATE`: Records author, supplier, line items, and total amount.
- `PURCHASE_ORDER_APPROVE`: Records approving executive and timestamp.
- `GOODS_RECEIVE`: Records receiving clerk, PO number, received quantities, and lot numbers.
- `STOCK_TRANSFER`: Records origin, destination department, and quantities transferred.

## UX Requirements
- Immediate visual warnings on inventory dashboard when critical medical supplies cross safety thresholds.
- Dynamic line-item cost calculations in PO creator.
- Clear reconciliation review during goods receipt.

## Testing Requirements
- Unit tests:
  - Low-stock query accurately filters items at or below reorder threshold.
  - GRN processing correctly updates `quantityReceived` on PO and increments `stockOnHand`.
  - PO transitions to `completed` when all line item quantities are received.
- API tests:
  - Unauthorized users rejected from approving purchase orders.
  - Receiving negative quantities is rejected with validation error.

## Acceptance Criteria
- [ ] Consumable item master configured with categories and UOMs.
- [ ] Supplier master stores verified contact and payment details.
- [ ] Purchase order creation and administrative approval workflows operational.
- [ ] Goods Receiving Note (GRN) increments stock and updates PO status.
- [ ] Departmental stock movement ledger tracks transfers immutably.
- [ ] Low-stock threshold alerts trigger accurately.
- [ ] Unit and API tests pass cleanly.

## Dependencies
- Upstream: Milestone 01 (Auth/RBAC) and Milestone 02 (App Shell).
- Downstream: Milestone 10 (Accounts Payable and Inpatient Consumables Billing).

## Implementation Notes
- Execute GRN processing inside a MongoDB transaction: updates PO line items, creates the Goods Receipt document, writes the stock movement record, and updates the item balance atomically.

## Do Not Implement
- Automated bank wire transfers, depreciation schedules for fixed assets, or patient invoice billing.
