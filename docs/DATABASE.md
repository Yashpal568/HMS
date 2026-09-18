# Hospital Management System — Database Architecture & Data Dictionary

**SOURCE-OF-TRUTH OWNER**: `docs/DATABASE.md` (DATA MODEL)  
**Classification**: Authoritative  
**Database**: MongoDB Atlas  
**Architecture**: Multi-Tenant SaaS Shared Database with Discriminator (`tenantId`)  
**Driver / ODM**: Mongoose (TypeScript)  
**Status**: Authoritative Database Specification  

---

## 1. Authoritative Database Directives

1. **MongoDB Atlas is the Single System of Record**: All clinical, financial, administrative, and SaaS platform data resides in MongoDB Atlas. PostgreSQL, MySQL, and Prisma are strictly prohibited.
2. **Strict Prohibition of Direct Client Database Access**:
   ```text
   Next.js Frontends (HMS Client, Patient App, Super Admin) ──X──► MongoDB Atlas
   Electron Desktop Shells                                  ──X──► MongoDB Atlas
   AI Models / Gateways                                      ──X──► MongoDB Atlas
   ```
   All database read and write operations flow exclusively through the canonical NestJS REST API (`apps/server/`).
3. **Mandatory Tenant Scoping**: Every tenant-owned document must persist an indexed `tenantId: ObjectId` referencing the `tenants` collection. All queries on tenant collections MUST include `{ tenantId: user.tenantId }`.
4. **Zero Client Trust**: The backend derives `tenantId` strictly from the cryptographically verified JWT payload (`req.user.tenantId`). Client-supplied `tenantId` values in request bodies, query parameters, or HTTP headers are rejected or stripped.

---

## 2. Master Entity Catalog (26 Collections)

The database schema models 26 distinct entities grouped by domain and tenancy tier:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE DOMAIN TAXONOMY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. PLATFORM & SAAS OPERATIONS                                               │
│    • tenants           • subscriptions     • feature_flags                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. IDENTITY, ACCESS & HOSPITAL STRUCTURE                                    │
│    • users             • roles             • permissions                    │
│    • hospitals         • departments       • doctors           • staff      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. PATIENTS, APPOINTMENTS & OPD QUEUE                                       │
│    • patients          • appointments      • queues                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. CLINICAL EMR & PHARMACY PIPELINE                                         │
│    • prescriptions     • medicines         • medicine_batches               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. INVENTORY & PROCUREMENT                                                  │
│    • inventory         • suppliers         • purchases                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. LABORATORY INFORMATION SYSTEM (LIS)                                      │
│    • lab_orders        • lab_reports                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 7. BILLING, PAYMENTS & AUDIT TRAIL                                          │
│    • invoices          • payments          • notifications                  │
│    • documents         • audit_logs                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Entity Specifications

### 3.1. Platform & SaaS Operations

#### 1. `tenants`
- **Scope**: Global / Platform-Owned (Zero `tenantId` field)
- **Description**: Sovereign hospital organization, clinic, or medical network.
- **Fields**: `_id`, `name`, `slug` (unique), `registrationNumber`, `status` (`TRIAL`, `ACTIVE`, `SUSPENDED`, `CANCELLED`), `contactEmail`, `contactPhone`, `address`, `settings` (timezone, currency, dateFormat, branding), `createdAt`, `updatedAt`.
- **Indexes**: `{ slug: 1 }` (unique), `{ status: 1 }`.

#### 2. `subscriptions`
- **Scope**: Global / Platform-Owned
- **Description**: Commercial subscription contract binding a tenant to a commercial tier.
- **Fields**: `_id`, `tenantId` (unique ref to `tenants`), `planCode` (`FREE_TRIAL`, `STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`), `status` (`TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`), `billingCycle` (`MONTHLY`, `ANNUAL`), `currentPeriodStartsAt`, `currentPeriodEndsAt`, `trialEndsAt`, `limits` (`maxDoctors`, `maxBeds`, `maxStaff`, `maxStorageGb`), `createdAt`, `updatedAt`.
- **Indexes**: `{ tenantId: 1 }` (unique), `{ status: 1, currentPeriodEndsAt: 1 }`.

#### 3. `feature_flags`
- **Scope**: Global / Tenant-Overridable
- **Description**: Feature toggles and module access rules governed by SaaS tier or individual tenant override.
- **Fields**: `_id`, `key` (e.g. `pharmacy_module`, `ipd_module`, `ai_documentation_copilot`), `description`, `isGlobalEnabled`, `tenantOverrides`: `[{ tenantId: ObjectId, enabled: Boolean, expiresAt?: Date }]`, `createdAt`, `updatedAt`.
- **Indexes**: `{ key: 1 }` (unique), `{ 'tenantOverrides.tenantId': 1 }`.

---

### 3.2. Identity, Access & Hospital Structure

#### 4. `users`
- **Scope**: Tenant-Owned (or Platform-Owned if `role === 'SUPER_ADMIN'`)
- **Description**: System user accounts across all four surfaces (Hospital Admin, Doctor, Nurse, Staff, Patient, Super Admin).
- **Fields**: `_id`, `tenantId` (optional for Super Admin), `email`, `passwordHash` (`{ select: false }`), `firstName`, `lastName`, `phone`, `role` (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `NURSE`, `PHARMACIST`, `LAB_TECHNICIAN`, `RECEPTIONIST`, `BILLING_CLERK`, `PATIENT`), `permissions` (`[String]`), `hospitalId`, `departmentId`, `status` (`ACTIVE`, `INACTIVE`, `LOCKED`), `failedLoginAttempts`, `lockUntil`, `createdAt`, `updatedAt`.
- **Indexes**: `{ email: 1 }` (unique global), `{ tenantId: 1, role: 1, status: 1 }`.

#### 5. `roles`
- **Scope**: Tenant-Owned
- **Description**: Tenant-customizable role definitions mapping to permission sets.
- **Fields**: `_id`, `tenantId`, `name`, `description`, `permissions` (`[String]`), `isSystemRole` (Boolean), `createdAt`, `updatedAt`.
- **Indexes**: `{ tenantId: 1, name: 1 }` (unique).

#### 6. `permissions`
- **Scope**: Global Master Definition
- **Description**: Authoritative catalog of granular permission tokens (format: `resource:action`).
- **Fields**: `_id`, `code` (e.g. `patients:read`, `prescriptions:create`, `billing:invoice_issue`), `module` (`PATIENTS`, `CLINICAL`, `PHARMACY`, `BILLING`, etc.), `description`.
- **Indexes**: `{ code: 1 }` (unique).

#### 7. `hospitals`
- **Scope**: Tenant-Owned
- **Description**: Hospital branch, clinic facility, or physical medical center campus.
- **Fields**: `_id`, `tenantId`, `name`, `code`, `licenseNumber`, `address` (street, city, state, postalCode, country, coordinates), `contactEmail`, `contactPhone`, `emergencyContact`, `isPrimaryBranch`, `status` (`ACTIVE`, `INACTIVE`), `createdAt`, `updatedAt`.
- **Indexes**: `{ tenantId: 1, code: 1 }` (unique), `{ tenantId: 1, status: 1 }`.

#### 8. `departments`
- **Scope**: Tenant-Owned
- **Description**: Clinical and administrative departments (e.g. Cardiology, Orthopedics, Radiology).
- **Fields**: `_id`, `tenantId`, `hospitalId`, `name`, `code`, `headOfDepartmentId` (ref `users`), `type` (`CLINICAL`, `ADMINISTRATIVE`, `DIAGNOSTIC`), `status` (`ACTIVE`, `INACTIVE`), `createdAt`, `updatedAt`.
- **Indexes**: `{ tenantId: 1, hospitalId: 1, code: 1 }` (unique).

#### 9. `doctors`
- **Scope**: Tenant-Owned
- **Description**: Clinician professional profile, qualifications, registration, and consultation fees.
- **Fields**: `_id`, `tenantId`, `userId` (ref `users`), `hospitalId`, `departmentId` (ref `departments`), `medicalLicenseNumber`, `specialties` (`[String]`), `qualification`, `experienceYears`, `consultationFee` (`Decimal128`), `opdSlotDurationMinutes`, `status` (`ACTIVE`, `ON_LEAVE`, `INACTIVE`), `createdAt`, `updatedAt`.
- **Indexes**: `{ tenantId: 1, userId: 1 }` (unique), `{ tenantId: 1, departmentId: 1 }`, `{ tenantId: 1, medicalLicenseNumber: 1 }`.

#### 10. `staff`
- **Scope**: Tenant-Owned
- **Description**: Non-physician hospital personnel (nursing, pharmacy, lab, administration).
- **Fields**: `_id`, `tenantId`, `userId` (ref `users`), `hospitalId`, `departmentId`, `employeeId`, `designation`, `shiftPattern`, `joiningDate`, `status` (`ACTIVE`, `INACTIVE`), `createdAt`, `updatedAt`.
- **Indexes**: `{ tenantId: 1, employeeId: 1 }` (unique), `{ tenantId: 1, userId: 1 }` (unique).

---

### 3.3. Patients, Appointments & OPD Queue

#### 11. `patients`
- **Scope**: Tenant-Owned
- **Description**: Master patient directory and medical registry.
- **Fields**: `_id`, `tenantId`, `uhid` (Unique Hospital Identification, e.g. `HOSP-2026-00001`), `firstName`, `lastName`, `dateOfBirth`, `gender` (`MALE`, `FEMALE`, `OTHER`), `bloodGroup` (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`), `phone`, `email`, `address`, `emergencyContact` (name, relation, phone), `allergies` (`[{ allergen: String, severity: String, reaction: String }]`), `chronicConditions` (`[String]`), `status` (`ACTIVE`, `INACTIVE`), `createdAt`, `updatedAt`.
- **Indexes**: 
  - `{ tenantId: 1, uhid: 1 }` (unique)
  - `{ tenantId: 1, phone: 1, dateOfBirth: 1 }`
  - `{ tenantId: 1, lastName: 1, firstName: 1 }`
  - `{ tenantId: 1, createdAt: -1 }`

#### 12. `appointments`
- **Scope**: Tenant-Owned
- **Description**: OPD consultation bookings, scheduling slots, and check-in status.
- **Fields**: `_id`, `tenantId`, `appointmentNumber` (e.g. `APT-2026-00042`), `patientId` (ref `patients`), `doctorId` (ref `doctors`), `hospitalId`, `departmentId`, `scheduledDate` (`YYYY-MM-DD`), `startTime` (`HH:mm`), `endTime` (`HH:mm`), `type` (`NEW_CONSULTATION`, `FOLLOW_UP`, `EMERGENCY`), `status` (`SCHEDULED`, `CONFIRMED`, `CHECKED_IN`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`, `NO_SHOW`), `cancellationReason`, `tokenNumber` (String, e.g. `A-027`), `bookedVia` (`PATIENT_APP`, `HMS_PORTAL`, `WALK_IN`), `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, appointmentNumber: 1 }` (unique)
  - `{ tenantId: 1, doctorId: 1, scheduledDate: 1 }`
  - `{ tenantId: 1, patientId: 1, scheduledDate: -1 }`
  - `{ tenantId: 1, status: 1 }`

#### 13. `queues`
- **Scope**: Tenant-Owned
- **Description**: Real-time daily OPD consultation queue state per doctor/session.
- **Fields**: `_id`, `tenantId`, `hospitalId`, `doctorId` (ref `doctors`), `date` (`YYYY-MM-DD`), `session` (`MORNING`, `EVENING`), `currentServingToken` (String), `currentServingAppointmentId` (ref `appointments`), `totalTokensIssued` (Number), `totalCompleted` (Number), `totalSkipped` (Number), `status` (`WAITING`, `ACTIVE`, `PAUSED`, `CLOSED`), `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, doctorId: 1, date: 1, session: 1 }` (unique)
  - `{ tenantId: 1, date: 1, status: 1 }`

---

### 3.4. Clinical EMR & Pharmacy Pipeline

#### 14. `prescriptions`
- **Scope**: Tenant-Owned
- **Description**: Electronic prescription orders issued by doctors during consultation.
- **Fields**: `_id`, `tenantId`, `prescriptionNumber` (e.g. `RX-2026-00108`), `patientId` (ref `patients`), `doctorId` (ref `doctors`), `appointmentId` (ref `appointments`), `diagnosisNotes` (String), `icd10Codes` (`[String]`), `items`: `[{ medicineId: ref 'medicines', medicineName: String, dosage: String, frequency: String, durationDays: Number, route: String, instructions: String, quantity: Number, dispensedQuantity: Number }]`, `status` (`DRAFT`, `ISSUED`, `PARTIALLY_DISPENSED`, `FULLY_DISPENSED`, `CANCELLED`), `issuedAt`, `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, prescriptionNumber: 1 }` (unique)
  - `{ tenantId: 1, patientId: 1, createdAt: -1 }`
  - `{ tenantId: 1, doctorId: 1, createdAt: -1 }`
  - `{ tenantId: 1, status: 1 }`

#### 15. `medicines` (Medicine Master)
- **Scope**: Tenant-Owned
- **Description**: Canonical medication master catalog for the hospital. Shared by Pharmacy, Inventory, and Billing.
- **Fields**: `_id`, `tenantId`, `code` (e.g. `MED-PCM-500`), `brandName`, `genericName`, `dosageForm` (`TABLET`, `CAPSULE`, `SYRUP`, `INJECTION`, `OINTMENT`, `IV_FLUID`), `strength` (e.g. `500mg`), `category` (`ANALGESIC`, `ANTIBIOTIC`, etc.), `hsnCode`, `gstRate` (`Decimal128`), `reorderLevel` (Number), `isNarcotic` (Boolean), `status` (`ACTIVE`, `DISCONTINUED`), `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, code: 1 }` (unique)
  - `{ tenantId: 1, brandName: 1 }`
  - `{ tenantId: 1, genericName: 1 }`

#### 16. `medicine_batches`
- **Scope**: Tenant-Owned
- **Description**: Physical batches of medication in stock, tracking expiry dates and purchase/retail pricing.
- **Fields**: `_id`, `tenantId`, `medicineId` (ref `medicines`), `batchNumber` (e.g. `BATCH-2026-B9`), `expiryDate` (Date), `manufacturingDate` (Date), `purchaseRate` (`Decimal128`), `mrp` (`Decimal128`), `salePrice` (`Decimal128`), `currentStockQuantity` (Number), `initialQuantity` (Number), `supplierId` (ref `suppliers`), `purchaseId` (ref `purchases`), `status` (`ACTIVE`, `EXPIRED`, `DEPLETED`, `RECALLED`), `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, medicineId: 1, batchNumber: 1 }` (unique)
  - `{ tenantId: 1, expiryDate: 1, currentStockQuantity: 1 }`
  - `{ tenantId: 1, status: 1 }`

---

### 3.5. Inventory & Procurement

#### 17. `inventory`
- **Scope**: Tenant-Owned
- **Description**: Master catalog and tracking for non-pharmaceutical hospital supplies, consumables, and surgical equipment.
- **Fields**: `_id`, `tenantId`, `hospitalId`, `itemCode`, `itemName`, `category` (`SURGICAL`, `CONSUMABLE`, `PPE`, `LINEN`, `EQUIPMENT`), `unitOfMeasure` (`BOX`, `PIECE`, `PACK`), `currentStock`, `reorderThreshold`, `location` (rack/shelf), `status` (`ACTIVE`, `INACTIVE`), `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, itemCode: 1 }` (unique)
  - `{ tenantId: 1, category: 1 }`

#### 18. `suppliers`
- **Scope**: Tenant-Owned
- **Description**: Vendors and pharmaceutical distributors supplying goods to the hospital.
- **Fields**: `_id`, `tenantId`, `supplierCode`, `name`, `gstNumber`, `contactPerson`, `phone`, `email`, `address`, `paymentTermsDays`, `status` (`ACTIVE`, `BLACKLISTED`), `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, supplierCode: 1 }` (unique)
  - `{ tenantId: 1, gstNumber: 1 }`

#### 19. `purchases`
- **Scope**: Tenant-Owned
- **Description**: Purchase orders and goods receipt notes (GRN) for medicines and inventory stock replenishment.
- **Fields**: `_id`, `tenantId`, `purchaseOrderNumber` (e.g. `PO-2026-0008`), `supplierId` (ref `suppliers`), `invoiceNumber`, `invoiceDate`, `items`: `[{ itemType: 'MEDICINE' | 'INVENTORY', itemId: ObjectId, batchNumber?: String, expiryDate?: Date, quantity: Number, unitPrice: Decimal128, taxAmount: Decimal128, totalAmount: Decimal128 }]`, `subtotal` (`Decimal128`), `taxTotal` (`Decimal128`), `grandTotal` (`Decimal128`), `paymentStatus` (`PENDING`, `PARTIALLY_PAID`, `PAID`), `receivingStatus` (`PENDING`, `PARTIAL`, `RECEIVED`), `receivedBy` (ref `users`), `receivedAt`, `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, purchaseOrderNumber: 1 }` (unique)
  - `{ tenantId: 1, supplierId: 1, createdAt: -1 }`

---

### 3.6. Laboratory Information System (LIS)

#### 20. `lab_orders`
- **Scope**: Tenant-Owned
- **Description**: Diagnostic laboratory test requisitions requested by clinicians.
- **Fields**: `_id`, `tenantId`, `orderNumber` (e.g. `LAB-2026-00214`), `patientId` (ref `patients`), `doctorId` (ref `doctors`), `appointmentId` (ref `appointments`), `tests`: `[{ testCode: String, testName: String, category: String, price: Decimal128, sampleType: String, status: 'ORDERED' | 'COLLECTED' | 'IN_PROCESS' | 'COMPLETED' | 'CANCELLED' }]`, `priority` (`ROUTINE`, `URGENT`, `STAT`), `totalAmount` (`Decimal128`), `paymentStatus` (`PENDING`, `PAID`), `orderStatus` (`PLACED`, `IN_PROGRESS`, `REPORTED`), `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, orderNumber: 1 }` (unique)
  - `{ tenantId: 1, patientId: 1, createdAt: -1 }`
  - `{ tenantId: 1, orderStatus: 1 }`

#### 21. `lab_reports`
- **Scope**: Tenant-Owned
- **Description**: Verified laboratory test results, parameter values, and reference range comparisons.
- **Fields**: `_id`, `tenantId`, `reportNumber` (e.g. `LREP-2026-0019`), `orderId` (ref `lab_orders`), `patientId` (ref `patients`), `testCode`, `testName`, `parameters`: `[{ name: String, value: String, unit: String, referenceRange: String, isAbnormal: Boolean }]`, `clinicalRemarks`, `conductedBy` (ref `users`), `verifiedBy` (ref `users`), `verifiedAt`, `pdfDocumentId` (ref `documents`), `status` (`DRAFT`, `VERIFIED`, `PUBLISHED`, `AMENDED`), `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, reportNumber: 1 }` (unique)
  - `{ tenantId: 1, orderId: 1 }`
  - `{ tenantId: 1, patientId: 1, createdAt: -1 }`

---

### 3.7. Billing, Payments & Audit Trail

#### 22. `invoices`
- **Scope**: Tenant-Owned
- **Description**: Comprehensive patient billing statements consolidating consultations, pharmacy, lab investigations, procedures, and bed charges.
- **Fields**: `_id`, `tenantId`, `invoiceNumber` (e.g. `INV-2026-00412`), `patientId` (ref `patients`), `appointmentId` (ref `appointments`), `items`: `[{ itemType: 'CONSULTATION' | 'PHARMACY' | 'LAB' | 'PROCEDURE' | 'BED', description: String, quantity: Number, unitPrice: Decimal128, discountAmount: Decimal128, taxAmount: Decimal128, netAmount: Decimal128, referenceId?: ObjectId }]`, `subtotal` (`Decimal128`), `discountTotal` (`Decimal128`), `taxTotal` (`Decimal128`), `grandTotal` (`Decimal128`), `paidAmount` (`Decimal128`), `balanceDue` (`Decimal128`), `status` (`DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `VOID`, `REFUNDED`), `dueDate`, `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, invoiceNumber: 1 }` (unique)
  - `{ tenantId: 1, patientId: 1, status: 1 }`
  - `{ tenantId: 1, createdAt: -1 }`

#### 23. `payments`
- **Scope**: Tenant-Owned
- **Description**: Financial transaction receipts recording settlement against issued invoices.
- **Fields**: `_id`, `tenantId`, `receiptNumber` (e.g. `RCP-2026-0038`), `invoiceId` (ref `invoices`), `patientId` (ref `patients`), `amount` (`Decimal128`), `paymentMethod` (`CASH`, `CARD`, `UPI`, `NET_BANKING`, `INSURANCE`), `transactionReference` (e.g. gateway transaction ID or bank auth code), `collectedBy` (ref `users`), `status` (`SUCCESS`, `FAILED`, `REFUNDED`), `notes`, `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, receiptNumber: 1 }` (unique)
  - `{ tenantId: 1, invoiceId: 1, createdAt: -1 }`
  - `{ tenantId: 1, patientId: 1 }`

#### 24. `notifications`
- **Scope**: Tenant-Owned
- **Description**: System alerts, queue status alerts, SMS, and WhatsApp dispatch queue logs.
- **Fields**: `_id`, `tenantId`, `recipientUserId` (ref `users`), `recipientPhone`, `recipientEmail`, `channel` (`IN_APP`, `SMS`, `WHATSAPP`, `EMAIL`), `type` (`QUEUE_ALERT`, `APPOINTMENT_REMINDER`, `LAB_REPORT_READY`, `CRITICAL_ALERT`, `INVOICE_ISSUED`), `title`, `body`, `metadata` (JSON), `status` (`PENDING`, `SENT`, `FAILED`, `READ`), `sentAt`, `readAt`, `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, recipientUserId: 1, status: 1 }`
  - `{ tenantId: 1, createdAt: -1 }`

#### 25. `documents`
- **Scope**: Tenant-Owned
- **Description**: Metadata index for patient clinical documents, scan uploads, and generated PDF reports stored in secure object storage.
- **Fields**: `_id`, `tenantId`, `patientId` (ref `patients`), `title`, `category` (`LAB_REPORT`, `PRESCRIPTION_PDF`, `DISCHARGE_SUMMARY`, `CONSENT_FORM`, `IMAGING_SCAN`), `fileName`, `fileSizeBytes`, `mimeType`, `storageKey` (S3/Cloudflare R2 object key), `uploadedBy` (ref `users`), `accessRestricted` (Boolean), `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, patientId: 1, category: 1 }`
  - `{ tenantId: 1, storageKey: 1 }` (unique)

#### 26. `audit_logs`
- **Scope**: Tenant-Owned (or Platform-Owned if `tenantId` is null)
- **Description**: Immutable append-only operational and security audit log. Passwords, secrets, and raw PHI are automatically stripped.
- **Fields**: `_id`, `tenantId` (optional for platform actions), `userId` (ref `users`), `userRole`, `action` (e.g. `USER_LOGIN`, `PATIENT_RECORD_VIEW`, `PRESCRIPTION_CREATE`, `INVOICE_VOID`), `entity` (e.g. `Patient`, `Invoice`), `entityId` (String), `ipAddress`, `userAgent`, `status` (`SUCCESS`, `DENIED`, `FAILURE`), `metadata` (sanitized key-value JSON), `timestamp`.
- **Indexes**:
  - `{ tenantId: 1, timestamp: -1 }`
  - `{ tenantId: 1, userId: 1, timestamp: -1 }`
  - `{ tenantId: 1, action: 1 }`

---

## 4. Medicine & Inventory Architecture (No Catalog Duplication)

The pharmaceutical supply chain is structured as a strict single-directional dependency flow:

```text
┌──────────────────────────────────────────────────────────┐
│              1. MEDICINE MASTER (medicines)              │
│  Canonical brand names, generics, dosage forms, HSN codes│
└────────────────────────────┬─────────────────────────────┘
                             │ Defines batch items
                             ▼
┌──────────────────────────────────────────────────────────┐
│           2. MEDICINE BATCHES (medicine_batches)         │
│  Physical lots: batch number, expiry date, purchase/MRP  │
└────────────────────────────┬─────────────────────────────┘
                             │ Stock intake & replenishment
                             ▼
┌──────────────────────────────────────────────────────────┐
│             3. INVENTORY & PROCUREMENT (purchases)       │
│  Supplier POs, Goods Receipt Notes, warehouse allocation │
└────────────────────────────┬─────────────────────────────┘
                             │ Dispensing against prescriptions
                             ▼
┌──────────────────────────────────────────────────────────┐
│             4. PHARMACY DISPENSING (prescriptions)       │
│  Batch allocation, quantity decrement, pharmacist signoff│
└────────────────────────────┬─────────────────────────────┘
                             │ Itemized bill lines
                             ▼
┌──────────────────────────────────────────────────────────┐
│                 5. BILLING & INVOICING (invoices)        │
│  Consumes batch sale price & GST. ZERO DUPLICATE CATALOG │
└──────────────────────────────────────────────────────────┘
```

### Critical Pharmaceutical Invariants:
1. **No Duplicate Catalog in Billing**: The billing engine NEVER maintains its own medicine database. Every pharmaceutical line item on an invoice references the verified `medicineId` and `batchId` from the Medicine Master.
2. **Bulk Import Capability**: Hospitals must be able to import their complete medication formulary via CSV/Excel template without developer intervention. Thousands of medicine records must NEVER be hardcoded in application source code.
3. **FEFO Enforcement**: First-Expiry, First-Out (FEFO) order is prioritized during batch allocation at the pharmacy counter.

---

## 5. Financial Precision & Integrity Standards

1. **Decimal Precision**: All currency values (`consultationFee`, `purchaseRate`, `mrp`, `unitPrice`, `taxAmount`, `grandTotal`, `paidAmount`) are stored as `mongoose.Schema.Types.Decimal128` or integer minor units. IEEE-754 standard floating-point numbers are prohibited.
2. **Atomic Multi-Document Transactions**: Financial settlements spanning multiple collections (e.g. updating `invoices.paidAmount`, inserting into `payments`, and decrementing batch stock) must execute within a MongoDB Atlas multi-document session transaction:
   ```typescript
   const session = await this.connection.startSession();
   session.startTransaction();
   try {
     // 1. Record payment receipt
     // 2. Update invoice balance and status
     // 3. Commit
     await session.commitTransaction();
   } catch (error) {
     await session.abortTransaction();
     throw error;
   } finally {
     session.endSession();
   }
   ```
