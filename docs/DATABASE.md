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

## 2. Master Entity Catalog (27 Collections)

The database schema models 27 distinct entities grouped by domain and tenancy tier:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE DOMAIN TAXONOMY                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. PLATFORM & SAAS OPERATIONS                                               │
│    • tenants           • plans             • subscriptions                  │
│    • feature_flags                                                          │
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
- **Fields**:
  - `_id`: ObjectId
  - `name`: String (legal business entity title)
  - `slug`: String (unique identifier, e.g. `apollo-health`)
  - `subdomain`: String (unique subdomain: `https://{subdomain}.hmsmedcore.com`)
  - `customDomain`?: String (verified custom CNAME mapping)
  - `registrationNumber`: String (statutory hospital registration number)
  - `taxId`?: String (GSTIN / VAT identifier)
  - `status`: String enum (`TRIAL`, `ACTIVE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`)
  - `onboardingStatus`: String enum (`PENDING`, `PROVISIONED`, `ACTIVE`)
  - `contactEmail`: String
  - `contactPhone`: String
  - `billingContact`: `{ name: String, email: String, phone: String }`
  - `address`: `{ street: String, city: String, state: String, postalCode: String, country: String }`
  - `subscriptionId`: ObjectId (ref `subscriptions`)
  - `settings`: `{ timezone: String, currency: String, dateFormat: String, brandingLogoUrl?: String }`
  - `suspendedAt`?: Date
  - `suspensionReason`?: String
  - `createdAt`: Date
  - `updatedAt`: Date
- **Indexes**:
  - `{ slug: 1 }` (unique)
  - `{ subdomain: 1 }` (unique, sparse)
  - `{ customDomain: 1 }` (unique, sparse)
  - `{ status: 1 }`

#### 2. `plans`
- **Scope**: Global / Platform-Owned (Zero `tenantId` field)
- **Description**: Authoritative commercial tier definitions maintained by the Platform Super Admin.
- **Fields**:
  - `_id`: ObjectId
  - `code`: String enum (`FREE_TRIAL`, `STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`) (unique)
  - `name`: String (e.g. "Growth Hospital Plan")
  - `description`: String
  - `tier`: String enum (`TRIAL`, `STANDARD`, `PREMIUM`, `ENTERPRISE`)
  - `pricing`: `{ monthlyPrice: Number, annualPrice: Number, currency: String }`
  - `limits`: `{ maxDoctors: Number, maxStaff: Number, maxBeds: Number, maxStorageGb: Number }`
  - `includedModules`: `[String]` (e.g. `['opd', 'emr', 'ipd', 'pharmacy', 'lab', 'inventory', 'billing', 'reports']`)
  - `isActive`: Boolean (default `true`)
  - `createdAt`: Date
  - `updatedAt`: Date
- **Indexes**:
  - `{ code: 1 }` (unique)
  - `{ isActive: 1 }`

#### 3. `subscriptions`
- **Scope**: Global / Platform-Owned
- **Description**: Commercial subscription contract binding a tenant to a commercial tier.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (unique ref `tenants`)
  - `planId`: ObjectId (ref `plans`)
  - `planCode`: String enum (`FREE_TRIAL`, `STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`)
  - `status`: String enum (`TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`)
  - `billingCycle`: String enum (`MONTHLY`, `ANNUAL`)
  - `autoRenew`: Boolean (default `true`)
  - `trialStartsAt`?: Date
  - `trialEndsAt`?: Date
  - `currentPeriodStartsAt`: Date
  - `currentPeriodEndsAt`: Date
  - `lastPaymentDate`?: Date
  - `nextBillingDate`?: Date
  - `gatewayCustomerId`?: String (Stripe / Razorpay Customer ID)
  - `gatewaySubscriptionId`?: String
  - `limits`: `{ maxDoctors: Number, maxStaff: Number, maxBeds: Number, maxStorageGb: Number }`
  - `limitsOverride`?: `{ maxDoctors?: Number, maxStaff?: Number, maxBeds?: Number, maxStorageGb?: Number, expiresAt?: Date, reason?: String }`
  - `createdAt`: Date
  - `updatedAt`: Date
- **Indexes**:
  - `{ tenantId: 1 }` (unique)
  - `{ status: 1, currentPeriodEndsAt: 1 }`
  - `{ planCode: 1 }`

#### 4. `feature_flags`
- **Scope**: Global / Tenant-Overridable
- **Description**: Feature toggles and module access rules governed by SaaS tier or individual tenant override.
- **Fields**:
  - `_id`: ObjectId
  - `key`: String (e.g. `pharmacy_module`, `ipd_module`, `ai_documentation_copilot`) (unique)
  - `description`: String
  - `isGlobalEnabled`: Boolean
  - `tenantOverrides`: `[{ tenantId: ObjectId, enabled: Boolean, expiresAt?: Date }]`
  - `createdAt`: Date
  - `updatedAt`: Date
- **Indexes**:
  - `{ key: 1 }` (unique)
  - `{ 'tenantOverrides.tenantId': 1 }`

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
- **Description**: Real-time daily OPD consultation queue session per doctor/department.
- **Fields**: `_id`, `tenantId`, `hospitalId`?, `department`, `doctorId` (ref `users`), `date` (`YYYY-MM-DD`), `session` (`MORNING`, `AFTERNOON`, `EVENING`, `NIGHT`), `status` (`ACTIVE`, `PAUSED`, `CLOSED`), `currentServingToken` (Number), `currentServingEntryId` (ref `queue_entries`), `totalTokensIssued` (Number), `totalCompleted` (Number), `totalSkipped` (Number), `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, doctorId: 1, date: 1, session: 1 }` (unique)
  - `{ tenantId: 1, department: 1, date: 1, status: 1 }`
  - `{ tenantId: 1, date: 1, status: 1 }`

#### 14. `queue_entries`
- **Scope**: Tenant-Owned
- **Description**: Operational queue entry representing a patient waiting for or undergoing consultation. Decoupled from static appointments to handle walk-ins and dynamic triage reordering.
- **Fields**: `_id`, `tenantId`, `queueId` (ref `queues`), `patientId` (ref `patients`), `appointmentId`? (ref `appointments`), `encounterId`? (ref `encounters`), `doctorId` (ref `users`), `department`, `date` (`YYYY-MM-DD`), `tokenNumber` (Number), `formattedToken` (String, e.g. `C-021`), `priority` (`NORMAL`, `URGENT`, `EMERGENCY`), `priorityWeight` (Number: 0, 10, 50), `status` (`WAITING`, `CALLED`, `IN_CONSULTATION`, `COMPLETED`, `SKIPPED`, `CANCELLED`), `chiefComplaint`?, `triageNotes`?, `checkedInAt`, `calledAt`?, `consultationStartedAt`?, `completedAt`?, `skippedAt`?, `cancelledAt`?, `cancelledReason`?, `estimatedWaitMinutes`?, `createdAt`, `updatedAt`.
- **Indexes**:
  - `{ tenantId: 1, doctorId: 1, date: 1, status: 1, priorityWeight: -1, tokenNumber: 1 }` (Atomic Concurrency Dequeue Index)
  - `{ tenantId: 1, queueId: 1, status: 1, tokenNumber: 1 }`
  - `{ tenantId: 1, department: 1, date: 1, status: 1 }`
  - `{ tenantId: 1, patientId: 1, date: 1 }`
  - `{ tenantId: 1, appointmentId: 1 }` (unique, sparse)

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

#### 27. `audit_logs`
- **Scope**: Hybrid (Tenant-Owned for hospital operations, Platform-Owned where `tenantId` is null for SaaS Super Admin actions)
- **Description**: Immutable append-only operational and security audit log. Passwords, secrets, and raw PHI are automatically stripped.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`?: ObjectId (present for hospital tenant operations; `null` or omitted for platform-level Super Admin governance)
  - `userId`: ObjectId (ref `users`)
  - `userRole`: String (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, etc.)
  - `action`: String enum encompassing:
    - **Platform Control Plane Actions**: `SUPER_ADMIN_LOGIN`, `TENANT_PROVISION`, `TENANT_ACTIVATE`, `TENANT_SUSPEND`, `TENANT_REINSTATE`, `PLAN_CREATE`, `PLAN_UPDATE`, `QUOTA_OVERRIDE`, `BROADCAST_ANNOUNCE`, `DISASTER_RECOVERY_TEST`
    - **Tenant Hospital Operations**: `USER_LOGIN`, `PATIENT_CREATE`, `APPOINTMENT_CREATE`, `APPOINTMENT_CHECKIN`, `ENCOUNTER_FINALIZE`, `PRESCRIPTION_CREATE`, `SAMPLE_COLLECT`, `LAB_RESULT_ENTER`, `LAB_RESULT_VERIFY`, `MEDICINE_DISPENSE`, `INVOICE_CREATE`, `PAYMENT_PROCESS`, `REFUND_APPROVE`
  - `entity`: String (e.g. `Tenant`, `Plan`, `Subscription`, `Patient`, `Encounter`, `Invoice`)
  - `entityId`: String
  - `ipAddress`: String
  - `userAgent`: String
  - `status`: String enum (`SUCCESS`, `DENIED`, `FAILURE`)
  - `metadata`: Object (sanitized key-value JSON)
  - `timestamp`: Date
- **Indexes**:
  - `{ tenantId: 1, timestamp: -1 }`
  - `{ tenantId: 1, userId: 1, timestamp: -1 }`
  - `{ tenantId: 1, action: 1 }`
  - `{ action: 1, timestamp: -1 }` (for platform-wide security queries)

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

---

## 6. High-Frequency Database Access Patterns & Enterprise Index Strategy

To support enterprise hospital workloads (scaling towards 10,000–20,000+ patient visits per day), all queries against high-volume operational collections must execute against compound indexes with zero in-memory collations or full collection scans (`COLLSCAN`).

### 6.1. High-Frequency Query Index Matrix

| Access Pattern | Target Collection | Compound Index Specification | Index Name / Type | Purpose |
|---|---|---|---|---|
| **Clinician Next Patient Dequeue** | `queue_entries` | `{ tenantId: 1, doctorId: 1, date: 1, status: 1, priorityWeight: -1, tokenNumber: 1 }` | `idx_queue_call_next` | Concurrency-safe atomic `$set` under `findOneAndUpdate` |
| **Active Doctor Queue Board** | `queue_entries` | `{ tenantId: 1, doctorId: 1, date: 1, status: 1 }` | `idx_queue_doc_status` | Filtered queue views with pagination |
| **Department Live Queue Telemetry** | `queues` | `{ tenantId: 1, department: 1, date: 1, status: 1 }` | `idx_queue_dept_status` | Aggregated OPD load per department |
| **Patient MPI Lookup (Exact UHID)** | `patients` | `{ tenantId: 1, uhid: 1 }` | `idx_patients_uhid` (unique) | O(1) patient chart retrieval |
| **Patient Phone Search** | `patients` | `{ tenantId: 1, 'contacts.phone': 1 }` | `idx_patients_phone` | Reception intake and caller ID lookup |
| **Patient Name Prefix Search** | `patients` | `{ tenantId: 1, lastName: 1, firstName: 1 }` | `idx_patients_name` | Autocomplete directory search |
| **Expiring Pharmaceutical Batches** | `medicine_batches` | `{ tenantId: 1, expiryDate: 1, currentStockQuantity: 1 }` | `idx_batches_fefo` | FEFO automated dispensing & expiry alerts |
| **Pending Laboratory Worklist** | `lab_orders` | `{ tenantId: 1, orderStatus: 1, createdAt: -1 }` | `idx_lab_orders_worklist` | Specimen accessioning and test scheduling |
| **Outstanding Inpatient/OPD Invoices** | `invoices` | `{ tenantId: 1, status: 1, dueDate: 1 }` | `idx_invoices_due` | Cashier settlement and aging receivables |
| **Stock Movement Ledger Audit** | `stock_movements` | `{ tenantId: 1, itemId: 1, createdAt: -1 }` | `idx_movements_item` | Full provenance audit trail of supply chain |

### 6.2. Query Safety & Pagination Invariant
1. **No Unbounded Queries**: Any endpoint fetching collections without limit parameters is rejected. Maximum limit is capped at 100 records per page.
2. **Lean Projections**: Operational queries projecting lists omit large text fields (`clinicalRemarks`, `historyOfPresentIllness`, `pdfDocumentId`) using `.select()`.
3. **Cursor-Based Pagination**: For high-volume streaming endpoints (e.g. audit logs, stock ledger), keyset/cursor pagination based on `{ _id, createdAt }` is preferred over deep `.skip()` offsets.

---

## 7. Enterprise Analytical Read Models (Materialized Rollup Schemas)

At 10,000–20,000+ daily visits, dynamic runtime aggregation (`$group`, `$facet`) over raw transactional collections (`invoices`, `appointments`, `encounters`) on executive dashboard requests causes catastrophic Atlas CPU spikes. The architecture decouples operational transaction queries from analytical queries using **Materialized Read Models**.

### 7.1. `daily_operational_census`
- **Scope**: Tenant-Owned
- **Description**: Nightly/hourly pre-aggregated operational snapshot for hospital executive and department dashboards.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `date`: String (`YYYY-MM-DD`)
  - `department`: String
  - `totalRegistrations`: Number
  - `totalOpdVisits`: Number
  - `totalEmergencyVisits`: Number
  - `totalAdmissions`: Number
  - `totalDischarges`: Number
  - `averageWaitTimeMinutes`: Number
  - `averageConsultationTimeMinutes`: Number
  - `bedOccupancyPercent`: Number
  - `labOrdersCompleted`: Number
  - `prescriptionsDispensed`: Number
  - `createdAt`: Date
- **Indexes**: `{ tenantId: 1, date: -1, department: 1 }`

### 7.2. `daily_revenue_summaries`
- **Scope**: Tenant-Owned
- **Description**: Pre-aggregated daily financial ledger rollup consumed by finance executives and hospital administrators.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `date`: String (`YYYY-MM-DD`)
  - `totalBilledAmount`: Decimal128
  - `totalCollectedAmount`: Decimal128
  - `totalOutstandingAmount`: Decimal128
  - `totalDiscountsAmount`: Decimal128
  - `totalRefundsAmount`: Decimal128
  - `departmentRevenue`: `[{ department: String, billed: Decimal128, collected: Decimal128 }]`
  - `serviceCategoryRevenue`: `{ opd: Decimal128, ipd: Decimal128, pharmacy: Decimal128, laboratory: Decimal128, radiology: Decimal128 }`
  - `paymentMethodBreakdown`: `{ cash: Decimal128, upi: Decimal128, card: Decimal128, insurance: Decimal128 }`
  - `createdAt`: Date
- **Indexes**: `{ tenantId: 1, date: -1 }`

---

## 8. Enterprise Workforce, Organization & Migration Schemas

### 8.1. `departments`
- **Scope**: Tenant-Owned
- **Description**: Clinical and administrative departments within the hospital facility with automatic seeding of 12 standard healthcare services.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `name`: String (e.g. `Cardiology`, `General OPD`, `Emergency Medicine`)
  - `code`: String (e.g. `CARDIO`, `OPD`, `EMERGENCY`)
  - `type`: String enum (`CLINICAL`, `DIAGNOSTIC`, `PHARMACY`, `ADMINISTRATIVE`, `SUPPORT`)
  - `headOfDepartmentId`: ObjectId (ref `employees`, optional)
  - `isActive`: Boolean (default `true`)
  - `tags`: String array
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1, code: 1 }` (unique), `{ tenantId: 1, isActive: 1 }`

### 8.2. `teams`
- **Scope**: Tenant-Owned
- **Description**: Sub-departmental operational units and specialty clinical teams.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `departmentId`: ObjectId (ref `departments`)
  - `name`: String (e.g. `Echocardiography Unit`, `Pathology Core Team`)
  - `code`: String
  - `leaderId`: ObjectId (ref `employees`, optional)
  - `isActive`: Boolean (default `true`)
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1, departmentId: 1 }`, `{ tenantId: 1, code: 1 }`

### 8.3. `hospital_onboardings`
- **Scope**: Tenant-Owned
- **Description**: 8-step hospital facility setup and onboarding state machine tracking initialization progress.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`, unique)
  - `currentStep`: String enum (`HOSPITAL_PROFILE`, `DEPARTMENTS_CONFIG`, `WORKFORCE_IMPORT`, `BEDS_WARS_SETUP`, `TARIFF_IMPORT`, `PHARMACY_INVENTORY_IMPORT`, `LAB_TESTS_CONFIG`, `FINAL_REVIEW`)
  - `completedSteps`: String array of `OnboardingStep`
  - `status`: String enum (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`)
  - `completedAt`: Date (optional)
  - `metadata`: Mixed JSON object
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1 }` (unique)

### 8.4. `employees`
- **Scope**: Tenant-Owned
- **Description**: Master institutional workforce registry for all hospital personnel, distinct from user credentials.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `employeeId`: String (format `EMP-YYYY-NNNN`, unique per tenant)
  - `firstName`, `lastName`: String
  - `email`: String (optional)
  - `phone`: String (optional)
  - `staffType`: String enum (`DOCTOR`, `NURSE`, `PHARMACIST`, `LAB_TECHNICIAN`, `RECEPTIONIST`, `ACCOUNTANT`, `INVENTORY_MANAGER`, `ADMIN_STAFF`, `MAINTENANCE`, `OTHER`)
  - `employmentStatus`: String enum (`ACTIVE`, `PROBATION`, `ON_LEAVE`, `SUSPENDED`, `TERMINATED`)
  - `departmentId`: ObjectId (ref `departments`, optional)
  - `teamId`: ObjectId (ref `teams`, optional)
  - `userId`: ObjectId (ref `users`, optional, linked authentication account)
  - `designation`: String
  - `specialization`: String (optional)
  - `licenseNumber`: String (optional)
  - `joiningDate`: Date
  - `emergencyContact`: Object `{ name: String, relationship: String, phone: String }`
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1, employeeId: 1 }` (unique), `{ tenantId: 1, staffType: 1 }`, `{ tenantId: 1, departmentId: 1 }`, `{ tenantId: 1, userId: 1 }`

### 8.5. `workforce_schedules`
- **Scope**: Tenant-Owned
- **Description**: Institutional staff shift assignment rosters supporting overnight shifts spanning midnight.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `employeeId`: ObjectId (ref `employees`)
  - `shiftType`: String enum (`MORNING`, `EVENING`, `NIGHT`, `ROTATING`, `ON_CALL`)
  - `startTime`: String (`HH:mm`, e.g. `08:00`, `22:00`)
  - `endTime`: String (`HH:mm`, e.g. `16:00`, `06:00`)
  - `isOvernight`: Boolean (auto-calculated `startHour > endHour`)
  - `daysOfWeek`: Number array (`[0, 1, 2, 3, 4, 5, 6]`)
  - `effectiveFrom`: Date
  - `effectiveTo`: Date (optional)
  - `isActive`: Boolean (default `true`)
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1, employeeId: 1, isActive: 1 }`, `{ tenantId: 1, effectiveFrom: 1 }`

### 8.6. `attendance_records`
- **Scope**: Tenant-Owned
- **Description**: Daily attendance ledger tracking punctuality, late arrivals, early departures, and correction requests.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `employeeId`: ObjectId (ref `employees`)
  - `date`: String (`YYYY-MM-DD`)
  - `checkInTime`: Date (optional)
  - `checkOutTime`: Date (optional)
  - `status`: String enum (`PRESENT`, `LATE`, `HALF_DAY`, `ABSENT`, `ON_LEAVE`, `HOLIDAY`)
  - `lateMinutes`: Number (default `0`)
  - `earlyDepartureMinutes`: Number (default `0`)
  - `method`: String enum (`MANUAL`, `BIOMETRIC`, `WEB_PORTAL`, `SYSTEM_AUTO`)
  - `correction`: Subdocument `{ requestedCheckIn: Date, requestedCheckOut: Date, reason: String, status: String enum ('NONE', 'PENDING', 'APPROVED', 'REJECTED'), reviewedBy: ObjectId, reviewedAt: Date }`
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1, employeeId: 1, date: 1 }` (unique), `{ tenantId: 1, date: 1, status: 1 }`

### 8.7. `leave_requests`
- **Scope**: Tenant-Owned
- **Description**: Workforce leave applications with multi-day calculation, approval workflows, and automated daily attendance synchronization.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `employeeId`: ObjectId (ref `employees`)
  - `leaveType`: String enum (`CASUAL`, `SICK`, `EARNED`, `MATERNITY`, `PATERNITY`, `UNPAID`, `COMPENSATORY`)
  - `startDate`, `endDate`: String (`YYYY-MM-DD`)
  - `daysCount`: Number
  - `reason`: String
  - `status`: String enum (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`)
  - `reviewedBy`: ObjectId (ref `users`, optional)
  - `reviewRemarks`: String (optional)
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1, employeeId: 1, status: 1 }`, `{ tenantId: 1, startDate: 1, endDate: 1 }`

### 8.8. `inventory_locations`
- **Scope**: Tenant-Owned
- **Description**: Warehouse bins, central stores, and departmental drug dispensaries for multi-location inventory tracking.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `name`: String (e.g. `Main Pharmacy Store`, `ICU Drug Cabinet`)
  - `code`: String (e.g. `STORE-MAIN`, `ICU-CAB-1`)
  - `type`: String enum (`CENTRAL_STORE`, `PHARMACY_DISPENSARY`, `WARD_STOCK`, `SUB_STORE`, `QUARANTINE`)
  - `departmentId`: ObjectId (ref `departments`, optional)
  - `isActive`: Boolean (default `true`)
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1, code: 1 }` (unique), `{ tenantId: 1, isActive: 1 }`

### 8.9. `inventory_import_jobs`
- **Scope**: Tenant-Owned
- **Description**: Asynchronous batch import job tracking up to 50,000 legacy medicine/inventory records through the 4-stage pipeline.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `fileName`: String
  - `fileSizeBytes`: Number
  - `stage`: String enum (`UPLOADED`, `MAPPED`, `VALIDATING`, `READY_FOR_APPROVAL`, `IMPORTING`, `COMPLETED`, `FAILED`)
  - `totalRowsCount`: Number
  - `validRowsCount`: Number
  - `errorRowsCount`: Number
  - `importedRowsCount`: Number
  - `columnMapping`: Mixed JSON object mapping target fields (`brandName`, `genericName`, `batchNumber`, `expiryDate`, `quantity`, `unitPrice`) to CSV header indices
  - `rawSampleRows`: Array of raw string rows
  - `validationErrors`: Array of `{ rowNumber: Number, field: String, rawValue: String, message: String }`
  - `initiatedBy`: ObjectId (ref `users`)
  - `approvedBy`: ObjectId (ref `users`, optional)
  - `completedAt`: Date (optional)
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1, stage: 1 }`, `{ tenantId: 1, createdAt: -1 }`

### 8.10. `hospital_tasks`
- **Scope**: Tenant-Owned
- **Description**: Clinical and operational task management with patient/encounter context linking and threaded comments.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `title`: String
  - `description`: String (optional)
  - `priority`: String enum (`LOW`, `NORMAL`, `HIGH`, `URGENT`)
  - `status`: String enum (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
  - `creatorId`: ObjectId (ref `users`)
  - `assigneeId`: ObjectId (ref `users`, optional)
  - `departmentId`: ObjectId (ref `departments`, optional)
  - `contextType`: String enum (`PATIENT`, `ENCOUNTER`, `WARD`, `INVENTORY`, `GENERAL`)
  - `contextId`: ObjectId (optional)
  - `dueDate`: Date (optional)
  - `completedAt`: Date (optional)
  - `comments`: Array of `{ commentId: ObjectId, authorId: ObjectId, message: String, createdAt: Date }`
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1, assigneeId: 1, status: 1 }`, `{ tenantId: 1, departmentId: 1 }`, `{ tenantId: 1, dueDate: 1 }`

### 8.11. `hospital_notifications`
- **Scope**: Tenant-Owned
- **Description**: Real-time staff notifications for critical task assignments, lab panic alerts, and inventory stockouts.
- **Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId (ref `tenants`)
  - `recipientId`: ObjectId (ref `users`)
  - `title`: String
  - `message`: String
  - `type`: String enum (`TASK_ASSIGNED`, `TASK_COMPLETED`, `SHIFT_REMINDER`, `INVENTORY_ALERT`, `LAB_CRITICAL`, `ANNOUNCEMENT`, `GENERAL`)
  - `actionUrl`: String (optional)
  - `isRead`: Boolean (default `false`)
  - `readAt`: Date (optional)
  - `createdAt`, `updatedAt`: Date
- **Indexes**: `{ tenantId: 1, recipientId: 1, isRead: 1 }`, `{ tenantId: 1, createdAt: -1 }`

