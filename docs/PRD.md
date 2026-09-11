# Hospital Management System — Master PRD
Version 1.0 | Phase 1 Core HMS → Phase 2 AI | Database: MongoDB Atlas

## 1. Product Goal
Build a secure, professional Hospital Management System covering patient registration, OPD, EMR, IPD, nursing, laboratory, pharmacy, inventory, billing, documents, notifications, reports, staff administration, audit and security.

The system handles sensitive healthcare data. Security, authorization, auditability, data integrity, backup/recovery and operational reliability are first-class requirements.

## 2. Phase 1 Modules
1. Authentication & security
2. Users, roles & permissions
3. Hospital, departments & staff
4. Patient registration/profile
5. Appointments & OPD
6. Doctor consultation / EMR
7. IPD / admissions / wards / rooms / beds
8. Nursing
9. Laboratory
10. Pharmacy
11. Inventory & procurement
12. Billing / payments / refunds
13. Documents
14. Notifications
15. Reports & dashboards
16. Audit & security center
17. Settings
18. Operations / backup tooling

## 3. Phase 2 AI
Possible controlled features:
- Reception/appointment assistant
- Hospital knowledge assistant
- Doctor documentation copilot
- Record summarization
- Discharge-summary drafting
- Lab assistant
- Pharmacy assistant
- Inventory forecasting
- Management intelligence
- Security anomaly detection

AI is NOT part of Phase 1 unless separately approved.

## 4. Initial Roles
Super Admin, Hospital Admin, Doctor, Nurse, Receptionist, Lab Technician, Pharmacist, Accountant, Inventory Manager.

Roles are permission bundles. Resource/department/branch restrictions may also apply.

## 5. Core Workflows

### OPD
Registration → appointment/walk-in → check-in → queue → consultation → investigation/prescription → billing → payment → follow-up.

### IPD
Admission → bed allocation → doctor/nursing care → investigations/pharmacy → discharge → final billing → payment.

### Laboratory
Order → sample collection → processing → result entry → verification → report.

### Pharmacy
Prescription → batch/stock validation → dispensing → stock transaction → receipt.

### Inventory
Purchase order → receiving → batch/expiry → stock ledger → issue/adjustment → audit.

### Billing
Service/tariff → invoice → payment → receipt → outstanding/refund where permitted.

## 6. Functional Requirements

### Authentication
Secure login/logout, password reset, account activation/deactivation, session expiration, rate limiting, optional MFA, security-event logging.

### Patient
Create/search/update patient, unique UHID, demographics, contacts, allergies, documents, encounter history, authorized clinical history, duplicate detection.

### Appointment
Doctor schedules, appointment create/reschedule/cancel, walk-in, queue/token, check-in, status tracking, follow-up.

### EMR
Encounter, chief complaint, clinical notes, vitals, diagnoses, investigation orders, prescriptions, follow-up, draft/final workflow where approved.

### IPD
Admission, ward/room/bed, bed availability, transfer, rounds, nursing, investigations, medication workflow, discharge.

### Lab
Test catalog, orders, samples, results, verification, reports, correction/audit trail.

### Pharmacy
Medicine catalog, batches, expiry, stock, dispensing, returns, suppliers, purchasing.

### Inventory
Item catalog, suppliers, purchase orders, receiving, stock movements, adjustments, low-stock and expiry reports.

### Billing
Services, tariffs, invoices, discounts, payments, receipts, outstanding, refunds, financial reports.

### Documents
Upload, protected access, metadata, versioning where required, access audit.

### Reports
Patient volume, appointments, OPD/IPD, beds, lab workload, pharmacy stock, expiry, revenue, collections, outstanding, user activity, security/audit.

## 7. Non-Functional Requirements
- Secure by default
- Responsive enterprise web UI
- Role-specific dashboards
- Strong validation
- Reliable transactions
- Structured logging
- Audit sensitive actions
- Pagination
- Background jobs for slow tasks
- Automated tests
- Reproducible deployment
- No secrets in source control

## 8. Security
Use HTTPS/TLS, restricted MongoDB Atlas network access/private connectivity where feasible, least-privilege DB credentials, strong authentication, Argon2id if application-managed passwords are used, backend RBAC, object-level authorization, rate limiting, validation, secure headers, XSS/CSRF protections as applicable, safe file uploads, audit logs, encrypted backups and no sensitive medical data in logs.

Applicable Indian/local healthcare and privacy obligations must be confirmed with the hospital and qualified professionals. Never claim regulatory compliance without assessment.

## 9. Acceptance Criteria
A feature is complete only when UI, API, MongoDB data model/indexes, validation, authorization, audit handling, tests, error states and documentation are complete.

## 10. Anti-Hallucination Requirement
The coding agent must not invent hospital policies, clinical rules, dosages, reference ranges, insurance rules, permissions, integrations or requirements.

For ambiguity:
```text
OPEN QUESTION:
[ambiguity]

OPTIONS:
A. ...
B. ...

RECOMMENDATION:
...

WAITING FOR APPROVAL: YES
```
Do not implement ambiguous business logic until approved.


## 11. Deployment Strategy
### Phase 1 — Web First
Build and validate the complete HMS as a browser-based application using Next.js/React + NestJS + MongoDB Atlas.

### Phase 2 — Windows Desktop
After the web HMS is stable and accepted, package the existing frontend with Electron to produce a Windows `.exe`/`.msi`.

The desktop application must use the same NestJS API and must not access MongoDB directly.

### Future On-Premise Option
If a hospital requires local-only data, deploy the same backend on the hospital's server and use an approved local MongoDB deployment. The frontend can remain browser-based or be packaged as an Electron desktop application.

This deployment strategy avoids a rewrite while allowing Web, Windows and future mobile clients.
