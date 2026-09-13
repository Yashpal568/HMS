# Milestone 08 — Pharmacy & Dispensing

## Objective
Build the hospital pharmacy management and medication dispensing module, integrating electronic prescription queues, batch-level inventory tracking, FEFO (First Expiry, First Out) batch selection, dispensing authorization, and patient medication labeling conforming to `docs/DATABASE.md`.

## Scope
- Medication Master Catalog (`medicines`):
  - Brand name, generic (INN) composition, dosage form (tablet, capsule, syrup, ampoule, ointment, drops), strength, manufacturer.
  - Drug schedule categorization: `over_the_counter`, `prescription_only`, `schedule_h`, `narcotic_controlled`.
  - Storage condition guidelines (e.g. "Store between 2°C and 8°C").
- Batch & Expiry Tracking (`medicine_batches`):
  - Batch number, manufacture date, expiry date, initial quantity, current remaining quantity, cost price, Maximum Retail Price (MRP).
  - Automated near-expiry indicators (alerts for batches expiring within 30, 60, 90 days).
- Prescription Dispensing Queue (`/pharmacy/prescriptions`):
  - Real-time queue of incoming digital prescriptions from OPD consultations and IPD rounds.
  - Filterable by patient UHID, doctor, and date.
- Dispensing Workflow (`dispensing_records`):
  - Review of prescribed item, required quantity, and administration instructions.
  - Automated FEFO (First Expiry, First Out) batch recommendation.
  - Atomic stock quantity deduction from the selected batch upon dispensing confirmation.
  - Prescription status transition: `active` → `partially_dispensed` → `dispensed`.
- Medication Labeling & Patient Instructions:
  - Generates patient instruction labels with clear dosage schedule (Morning, Afternoon, Night, Meal timing) in plain language.
- Pharmacy Returns & Adjustments:
  - Handling patient returns with batch quantity restocking and audit trail.

## Out of Scope
- Vendor purchase orders and bulk supplier procurement (Milestone 09).
- Payment collection, cash register reconciliation, and patient invoices (Milestone 10).
- Automated robotic pill packing hardware integration.

## Prerequisites
- Milestone 03 (Patient Registry - patient UHID).
- Milestone 05 (Doctor Consultation & EMR - electronic prescriptions).

## User Workflows
1. **Prescription Arrival**: Patient arrives at the hospital pharmacy counter. Pharmacist enters UHID; system immediately loads Dr. Miller's prescription containing Amoxicillin 500mg (15 capsules) and Paracetamol 650mg (10 tablets).
2. **Batch Allocation**: Pharmacist inspects Amoxicillin stock. System recommends Batch `AMX-2401` expiring in 6 months over Batch `AMX-2409` expiring in 18 months (FEFO principle).
3. **Safety Verification**: Pharmacist reviews patient allergy alerts (e.g. "No known penicillin allergy").
4. **Dispense & Stock Deduction**: Pharmacist verifies physical strip, clicks "Confirm Dispense". System atomically deducts 15 capsules from Batch `AMX-2401`, generates printable bottle labels, updates prescription status to `dispensed`, and records a `MEDICINE_DISPENSE` audit event.
5. **Medicine Return**: Inpatient patient discharged early returns 4 unopened blisters. Pharmacist inspects seal, initiates return, restocks the specific batch, and logs audit record.

## Frontend Requirements
- **Pages**:
  - `/pharmacy`: Pharmacy dashboard showing pending prescriptions queue, near-expiry alerts, and daily dispensing volume.
  - `/pharmacy/medicines`: Drug catalog master with search by generic and brand name.
  - `/pharmacy/batches`: Batch stock ledger with filter for near-expiry and low-stock items.
  - `/pharmacy/dispense/[prescriptionId]`: Dispensing workstation with item checklist, batch picker, and label generator.
- **Components**:
  - `BatchSelector`: Dropdown displaying batch numbers, remaining stock, expiry date, and recommended FEFO tag.
  - `ExpiryBadge`: Color-coded warning tag (Red = Expired, Amber = Expiring <60 days, Green = Valid).
  - `PatientPrescriptionSummary`: Card summarizing doctor notes and prescribed duration.
  - `MedicationLabelPrintView`: Clean printable card with patient name, medicine instructions, and warning labels.
- **States**: Out-of-stock badge, batch exhaustion alert, confirmation modal for controlled substances.

## Backend Requirements
- **Modules**: `PharmacyModule` in `apps/api/src/pharmacy/`.
- **Controllers**:
  - `PharmacyController`:
    - `GET /api/v1/pharmacy/prescriptions`: Queue of undispensed prescriptions (`pharmacy.read`).
    - `POST /api/v1/pharmacy/dispense`: Execute batch deduction and record dispensing (`pharmacy.dispense`).
    - `GET /api/v1/pharmacy/medicines`: Search medicines (`pharmacy.read`).
    - `POST /api/v1/pharmacy/medicines`: Add medicine master (`pharmacy.manage`).
    - `GET /api/v1/pharmacy/batches`: List batches with near-expiry alerts (`pharmacy.read`).
    - `POST /api/v1/pharmacy/batches`: Add new batch inventory (`pharmacy.manage`).
- **Services**:
  - `PharmacyService`: Manages prescription queue, stock validation, FEFO calculation, atomic stock deductions, and returns.

## Database Requirements
- **Collections**:
  - `medicines` (Tenant-Owned):
    - `_id`: ObjectId
    - `tenantId`: ObjectId, ref 'Tenant', required, index: true
    - `brandName`: String, required
    - `genericName`: String, required
    - `dosageForm`: String enum (`tablet`, `capsule`, `syrup`, `injection`, `ointment`, `inhaler`, `drops`), required
    - `strength`: String (e.g. "500 mg")
    - `category`: String
    - `schedule`: String enum (`otc`, `prescription`, `schedule_h`, `narcotic`), default `prescription`
    - `minStockLevel`: Number (reorder trigger)
    - `isActive`: Boolean
  - `medicine_batches` (Tenant-Owned):
    - `_id`: ObjectId
    - `tenantId`: ObjectId, ref 'Tenant', required, index: true
    - `medicineId`: ObjectId, ref 'Medicine', required
    - `batchNumber`: String, required
    - `expiryDate`: Date, required
    - `manufactureDate`: Date
    - `initialQuantity`: Number, required
    - `currentQuantity`: Number, required
    - `unitCostPrice`: Number
    - `unitSalePrice`: Number (MRP)
    - `isActive`: Boolean
  - `dispensing_records` (Tenant-Owned):
    - `_id`: ObjectId
    - `tenantId`: ObjectId, ref 'Tenant', required, index: true
    - `dispenseNumber`: String, required (e.g. "DSP-2026-00312")
    - `prescriptionId`: ObjectId, ref 'Prescription', required
    - `patientId`: ObjectId, ref 'Patient', required
    - `pharmacistId`: ObjectId, ref 'User', required
    - `items`: Array of Objects `[{ medicineId: ObjectId, batchId: ObjectId, batchNumber: String, quantity: Number, instructions: String }]`
    - `dispensedAt`: Date, default Date.now
  - `pharmacy_transactions` (Tenant-Owned):
    - `_id`: ObjectId
    - `tenantId`: ObjectId, ref 'Tenant', required, index: true
    - `batchId`: ObjectId, ref 'MedicineBatch', required
    - `type`: String enum (`purchase_in`, `dispense_out`, `return_in`, `adjustment_out`), required
    - `quantity`: Number, required
    - `balanceAfter`: Number, required
    - `referenceId`: String
    - `createdAt`: Date
- **Indexes**:
  - `medicine_batches`: `{ tenantId: 1, medicineId: 1, expiryDate: 1 }`
  - `medicine_batches`: `{ tenantId: 1, medicineId: 1, batchNumber: 1 }` (unique)
  - `dispensing_records`: `{ tenantId: 1, dispenseNumber: 1 }` (unique)
  - `medicines`: `{ tenantId: 1, genericName: 1, brandName: 1 }`

## API Requirements
- `POST /api/v1/pharmacy/dispense`: Body `{ prescriptionId, items: [{ medicineId, batchId, quantity }] }`, scoped to `tenantId`, returns `{ success, data: DispensingRecord }`.
- `GET /api/v1/pharmacy/prescriptions`: Query `{ status?: string, patientId?: string }`, scoped to `tenantId`, returns `{ success, data: Prescription[] }`.
- `GET /api/v1/pharmacy/batches/alerts`: Scoped to `tenantId`, returns `{ success, data: { nearExpiry: Batch[], lowStock: Batch[] } }`.

## RBAC Requirements
- `pharmacy.dispense`: `pharmacist`, `super_admin`.
- `pharmacy.read`: `pharmacist`, `doctor`, `nurse`, `hospital_admin`.
- `pharmacy.manage`: `pharmacist`, `hospital_admin`, `super_admin`.

## Security Requirements
- **Tenant Isolation**: Pharmacy stock, medicine catalogs, and dispensing logs strictly scoped to caller's verified `tenantId`.
- Stock deduction must use MongoDB transactions or atomic `$inc` with negative balance guards (`currentQuantity >= requestedQuantity`).
- Dispensing of narcotic/Schedule H medicines requires double-entry verification of doctor prescription.
- All stock movements logged immutably in `pharmacy_transactions`.

## Audit Requirements
- `MEDICINE_DISPENSE`: Records pharmacist ID, prescription ID, batch IDs, quantities deducted.
- `BATCH_CREATE`: Records new batch inventory receipt.
- `MEDICINE_RETURN`: Records returned quantity and authorizer.

## UX Requirements
- Rapid barcode scanning support in dispensing form to match physical packaging against batch.
- Highly visible near-expiry warnings on batch selectors to prevent accidental dispensing of old stock.
- Clean medication print template formatted for standard thermal label printers.

## Testing Requirements
- Unit tests:
  - FEFO sorting correctly orders batches by nearest expiry date.
  - Dispensing deducts batch quantity and creates a transaction entry.
  - Attempting to dispense more than available stock is rejected with a descriptive error.
- API tests:
  - Only users with `pharmacy.dispense` can submit dispensing records.
  - Successfully dispensing all prescribed items transitions prescription status to `dispensed`.

## Acceptance Criteria
- [ ] Medication master catalog supports dosage forms and drug schedules.
- [ ] Batch tracking captures expiry dates and remaining quantities.
- [ ] Prescription queue lists active doctor prescriptions.
- [ ] Dispensing workflow validates stock and deducts quantities atomically.
- [ ] FEFO batch recommendations operational.
- [ ] Pharmacy transaction ledger updates on all stock movements.
- [ ] Unit and API tests pass cleanly.

## Dependencies
- Upstream: Milestone 05 (E-Prescriptions) and Milestone 03 (Patients).
- Downstream: Milestone 09 (Bulk Inventory Management) and Milestone 10 (Pharmacy Invoicing).

## Implementation Notes
- Use MongoDB transactions for dispensing to guarantee that batch quantity deduction, transaction record creation, and prescription status update succeed or fail as an atomic unit.

## Do Not Implement
- Purchase order generation to pharmaceutical manufacturers, accounts payable, or credit card processing.
