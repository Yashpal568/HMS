# HMS Database Design — MongoDB Atlas

## 1. Rule
MongoDB Atlas is the cloud system of record.

Never:
```text
Browser → MongoDB
AI → MongoDB
```

Always:
```text
Browser → Next.js → NestJS API → MongoDB Atlas
```

## 2. Collection Groups

### Identity
users, roles, permissions, sessions, login_events

### Hospital
hospitals, branches, departments, staff, doctor_schedules

### Patient
patients, patient_identifiers, patient_contacts, patient_allergies, patient_documents

### Clinical
encounters, clinical_notes, vitals, diagnoses, prescriptions, medications

### OPD
appointments, queues

### IPD
admissions, wards, rooms, beds, bed_allocations, transfers, discharge_records

### Nursing
nursing_notes, nursing_tasks, care_records

### Laboratory
lab_tests, lab_orders, lab_samples, lab_results, lab_reports

### Pharmacy
medicines, medicine_batches, dispensing_records, pharmacy_transactions

### Inventory
inventory_items, suppliers, purchase_orders, purchase_receipts, stock_movements

### Billing
services, tariffs, invoices, payments, refunds

### Documents
documents, document_versions, document_access_logs

### Communication
notifications, notification_templates, notification_deliveries

### Security
audit_logs, security_events, data_access_logs

### Architecture
outbox_events, integration_logs, system_settings

## 3. Common Fields
Where relevant:
```text
_id
hospitalId
branchId
createdAt
updatedAt
createdBy
updatedBy
version
```

For SaaS:
```text
tenantId
```

## 4. Modeling Rules
- Reference high-growth/independently accessed entities.
- Embed only small bounded objects where atomicity/read locality benefit.
- Avoid giant patient documents containing all history.
- Keep clinical history traceable.
- Use application and database validation where appropriate.
- Use transactions for required atomic multi-document operations.
- Do not manually modify production data.
- Use version-controlled migration/index scripts.

## 5. Patient Example
```json
{
  "_id": "ObjectId",
  "hospitalId": "ObjectId",
  "uhid": "UHID-...",
  "name": {"first": "...", "middle": "...", "last": "..."},
  "dateOfBirth": "...",
  "sex": "...",
  "contacts": [],
  "allergySummary": [],
  "status": "active",
  "createdAt": "...",
  "updatedAt": "..."
}
```
Final fields require hospital approval.

## 6. Financial Data
Use Decimal128 or integer minor units consistently. Never use JavaScript floating point for financial calculations.

## 7. Index Candidates
```text
patients: { hospitalId: 1, uhid: 1 } UNIQUE
appointments: { hospitalId: 1, doctorId: 1, scheduledAt: 1 }
appointments: { hospitalId: 1, patientId: 1, scheduledAt: -1 }
beds: { hospitalId: 1, wardId: 1, status: 1 }
lab_orders: { hospitalId: 1, patientId: 1, createdAt: -1 }
invoices: { hospitalId: 1, patientId: 1, createdAt: -1 }
audit_logs: { hospitalId: 1, timestamp: -1 }
```
Validate indexes against real query patterns before production.

## 8. Atlas Security
Use strong DB users, least privilege, network restrictions/private connectivity where feasible, TLS, encryption at rest, backups, monitoring and separate dev/staging/prod databases.

Never commit Atlas connection strings.

## 9. Backup / Recovery
Define RPO, RTO, retention, frequency, restore testing and backup destinations with the hospital. Atlas backup configuration does not automatically replace the hospital's entire disaster recovery policy.

## 10. Data Retention
Retention is an OPEN QUESTION and must be approved based on law, hospital policy and operational requirements.
