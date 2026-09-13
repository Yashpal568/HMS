# Hospital Management System — Database Architecture

**Database**: MongoDB Atlas  
**Architecture**: Multi-Tenant SaaS Shared Database with Discriminator (`tenantId`)  
**ORM / Driver**: Mongoose (TypeScript)  
**Status**: Authoritative Database Specification  

---

## 1. Authoritative Database Rule

MongoDB Atlas is the cloud system of record. PostgreSQL and Prisma are explicitly excluded from the architecture.

```text
PROHIBITED DIRECT ACCESS:
  Browser ──X──► MongoDB Atlas
  Electron ──X──► MongoDB Atlas
  AI Agent ──X──► MongoDB Atlas

AUTHORITATIVE ACCESS PIPELINE:
  Web Browser / Client
          │
          ▼
  Next.js (Web Shell)
          │ HTTPS
          ▼
  NestJS REST API (Authentication + Tenant Resolution + RBAC)
          │ TLS 1.2+ Mongoose Driver
          ▼
  MongoDB Atlas Database
```

---

## 2. Collection Classification Architecture

All database collections are strictly categorized into three architectural tiers:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                        COLLECTION CLASSIFICATION                         │
├──────────────────────────────────────────────────────────────────────────┤
│ 1. GLOBAL / PLATFORM-OWNED                                              │
│    Collections managed by SaaS operations for cross-tenant management.  │
│    (Zero tenantId field; documents define or govern tenants)            │
├──────────────────────────────────────────────────────────────────────────┤
│ 2. TENANT-OWNED                                                         │
│    Collections belonging strictly to a single hospital institution.      │
│    (Mandatory indexed `tenantId: ObjectId` on every document)           │
├──────────────────────────────────────────────────────────────────────────┤
│ 3. SYSTEM-OWNED                                                         │
│    Infrastructure, event outbox, and migration tracking collections.     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1. GLOBAL / PLATFORM-OWNED Collections
- **`tenants`**: Hospital organization master records (name, slug, registration number, status, contact info, settings).
- **`subscriptions`**: Active commercial subscriptions linking tenants to plans (status, trialEndsAt, currentPeriodEndsAt).
- **`plans`**: SaaS tier master records (code, name, enabledModules, limits, capabilities).
- **`platform_users`**: SaaS provider administrative users (email, passwordHash, role: PLATFORM_SUPER_ADMIN).
- **`platform_audit_logs`**: Audit trail of SaaS-level operations (tenant creation, plan updates, suspension).

### 2. TENANT-OWNED Collections (Mandatory `tenantId`)
- **Identity & Staff**:
  - `users`: Hospital staff accounts (`tenantId`, email, passwordHash, role, permissions, status, hospitalId, branchId).
  - `roles`: Tenant-scoped RBAC role definitions (`tenantId`, name, description, permissions).
  - `hospitals`: Tenant hospital branch/facility records (`tenantId`, name, address, phone).
  - `branches`: Physical branches/campuses belonging to the hospital tenant (`tenantId`, hospitalId, name, code).
  - `departments`: Clinical and administrative departments (`tenantId`, name, code, headOfDepartment).
  - `doctor_schedules`: Clinician availability, shifts, and OPD slot configurations (`tenantId`, doctorId, dayOfWeek, slots).
- **Patient Registry**:
  - `patients`: Master patient directory (`tenantId`, uhid, name, dateOfBirth, gender, bloodGroup, contacts, emergencyContact, allergies, status).
- **OPD & Appointments**:
  - `appointments`: Outpatient bookings and queue tokens (`tenantId`, appointmentNumber, patientId, doctorId, scheduledAt, status, tokenNumber).
  - `queues`: Real-time daily OPD consultation queue state (`tenantId`, doctorId, date, activeTokenNumber).
- **Clinical EMR**:
  - `encounters`: Clinical consultations (`tenantId`, encounterNumber, patientId, doctorId, appointmentId, type, status, startedAt, endedAt).
  - `clinical_notes`: Subjective/objective clinical notes (`tenantId`, encounterId, patientId, notes, drafts).
  - `vitals`: Recorded physiological observations (`tenantId`, encounterId, patientId, temperature, pulse, bp, spo2, weight).
  - `diagnoses`: Coded medical diagnoses (`tenantId`, encounterId, patientId, icdCode, description, type).
  - `prescriptions`: Electronic prescription orders (`tenantId`, prescriptionNumber, encounterId, patientId, doctorId, items, status).
- **IPD & Inpatient Care**:
  - `admissions`: Inpatient admission records (`tenantId`, admissionNumber, patientId, admittedAt, bedId, admittingDoctorId, status).
  - `wards`: Inpatient ward configurations (`tenantId`, name, type, gender).
  - `rooms`: Rooms within wards (`tenantId`, wardId, roomNumber, type).
  - `beds`: Individual hospital beds and real-time occupancy (`tenantId`, wardId, roomId, bedNumber, status: available/occupied/maintenance).
  - `bed_allocations`: Historic and active bed assignments (`tenantId`, admissionId, bedId, allocatedAt, vacatedAt).
  - `nursing_notes`: Inpatient nursing entries and vital charts (`tenantId`, admissionId, nurseId, notes, observations).
- **Laboratory Information System (LIS)**:
  - `lab_tests`: Test catalog and reference ranges (`tenantId`, testCode, name, category, price, normalRanges).
  - `lab_orders`: Diagnostic investigation orders (`tenantId`, orderNumber, patientId, encounterId, tests, status).
  - `lab_samples`: Specimen collection records (`tenantId`, orderId, barcode, sampleType, collectedAt, status).
  - `lab_results`: Recorded parameter results (`tenantId`, orderId, testId, values, verifiedBy, status).
- **Pharmacy & Inventory**:
  - `medicines`: Medication master catalog (`tenantId`, code, brandName, genericName, dosageForm, strength).
  - `medicine_batches`: Stock inventory batches (`tenantId`, medicineId, batchNumber, expiryDate, purchaseRate, mrp, stockQuantity).
  - `dispensing_records`: Prescription fulfillment logs (`tenantId`, prescriptionId, patientId, items, dispensedBy, dispensedAt).
  - `inventory_items`: Non-pharmaceutical consumable and surgical items (`tenantId`, code, name, category, reorderLevel).
  - `purchase_orders`: Vendor procurement orders (`tenantId`, poNumber, supplierId, items, totalAmount, status).
  - `stock_movements`: Immutable ledger of stock movements (`tenantId`, itemId, batchNumber, movementType, quantity, reference).
- **Billing & Financials**:
  - `tariffs`: Standard service charges and procedure fee schedules (`tenantId`, code, name, category, basePrice).
  - `invoices`: Patient billing statements (`tenantId`, invoiceNumber, patientId, encounterId, items, totalAmount, discount, tax, payableAmount, status).
  - `payments`: Processed financial receipts (`tenantId`, receiptNumber, invoiceId, amount, paymentMethod, transactionReference, status).
  - `refunds`: Authorized financial returns and credit notes (`tenantId`, refundNumber, paymentId, amount, reason, authorizedBy).
- **Documents & Audit**:
  - `documents`: Metadata for uploaded clinical files/scans (`tenantId`, patientId, fileName, fileUrl, mimeType, accessAudit).
  - `audit_logs`: Immutable tenant security and operational audit trail (`tenantId`, userId, action, entity, entityId, details, ipAddress).

### 3. SYSTEM-OWNED Collections
- **`system_settings`**: Global or tenant-overridable system flags.
- **`outbox_events`**: Guaranteed delivery pattern for asynchronous tasks.
- **`migrations`**: Database schema and index versioning records.

---

## 3. Common Schema Fields & Tenant Ownership

All tenant-owned schemas in Mongoose must inherit the following standard fields:

```typescript
@Schema({ timestamps: true })
export class TenantEntity {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: false, index: true })
  hospitalId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false, index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}
```

---

## 4. Tenant-Scoped Unique Indexes

In a multi-tenant SaaS, uniqueness constraints must be scoped by `tenantId`. Global uniqueness is only applied to universal credentials (such as staff user emails).

```text
MANDATORY COMPOUND UNIQUE INDEXES:

1. Patient Registry:
   db.patients.createIndex({ tenantId: 1, uhid: 1 }, { unique: true })

2. Invoices:
   db.invoices.createIndex({ tenantId: 1, invoiceNumber: 1 }, { unique: true })

3. Receipts:
   db.payments.createIndex({ tenantId: 1, receiptNumber: 1 }, { unique: true })

4. Appointments:
   db.appointments.createIndex({ tenantId: 1, appointmentNumber: 1 }, { unique: true })

5. Encounters:
   db.encounters.createIndex({ tenantId: 1, encounterNumber: 1 }, { unique: true })

6. Prescriptions:
   db.prescriptions.createIndex({ tenantId: 1, prescriptionNumber: 1 }, { unique: true })

7. Lab Orders:
   db.lab_orders.createIndex({ tenantId: 1, orderNumber: 1 }, { unique: true })

8. Medicine Batches:
   db.medicine_batches.createIndex({ tenantId: 1, medicineId: 1, batchNumber: 1 }, { unique: true })

9. Beds:
   db.beds.createIndex({ tenantId: 1, wardId: 1, roomId: 1, bedNumber: 1 }, { unique: true })
```

---

## 5. Performance & Operational Compound Indexes

To support rapid query execution while guaranteeing tenant isolation, every query filter must hit an index that includes `tenantId` as the leading key:

```text
QUERY INDEXES:

db.users.createIndex({ tenantId: 1, email: 1 })
db.users.createIndex({ tenantId: 1, role: 1, status: 1 })

db.patients.createIndex({ tenantId: 1, 'contacts.phone': 1, dateOfBirth: 1 })
db.patients.createIndex({ tenantId: 1, 'name.last': 1, 'name.first': 1 })
db.patients.createIndex({ tenantId: 1, createdAt: -1 })

db.appointments.createIndex({ tenantId: 1, doctorId: 1, scheduledAt: 1 })
db.appointments.createIndex({ tenantId: 1, patientId: 1, scheduledAt: -1 })

db.encounters.createIndex({ tenantId: 1, patientId: 1, createdAt: -1 })
db.vitals.createIndex({ tenantId: 1, patientId: 1, recordedAt: -1 })

db.admissions.createIndex({ tenantId: 1, status: 1, admittedAt: -1 })
db.beds.createIndex({ tenantId: 1, status: 1, wardId: 1 })

db.lab_orders.createIndex({ tenantId: 1, status: 1, createdAt: -1 })
db.medicine_batches.createIndex({ tenantId: 1, expiryDate: 1, stockQuantity: 1 })

db.invoices.createIndex({ tenantId: 1, status: 1, createdAt: -1 })
db.payments.createIndex({ tenantId: 1, invoiceId: 1, createdAt: -1 })

db.audit_logs.createIndex({ tenantId: 1, timestamp: -1 })
db.audit_logs.createIndex({ tenantId: 1, userId: 1, timestamp: -1 })
```

---

## 6. Financial Precision Standard

- **No Floating Point**: Never use standard JavaScript `Number` or floating-point arithmetic for pricing, discounts, billing subtotals, taxes, or payments.
- **Representation**: All monetary fields must be stored as **`mongoose.Schema.Types.Decimal128`** or **integer minor currency units** (e.g. paisa or cents).
- **Calculation**: Financial operations must use decimal arithmetic libraries (e.g. `decimal.js`) or integer math to eliminate IEEE-754 calculation drift.

---

## 7. Sensitive Fields & Redaction

- **Password Hashes**: Marked `{ select: false }` on the `User` schema.
- **Audit Payloads**: Passwords, tokens, authorization headers, and payment instrument numbers are automatically stripped by the audit logger.
- **Medical Privacy**: Patient clinical observations and HIV/sensitive diagnoses are restricted to authorized clinical roles.
