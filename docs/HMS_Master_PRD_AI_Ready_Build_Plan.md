# Hospital Management System (HMS) — Master PRD & AI-Ready Build Plan

**Version:** 1.0  
**Date:** 31 August 2026  
**Strategy:** Phase 1 Core HMS → Phase 2 AI  
**Primary deployment:** On-premise; SaaS/cloud supported by the same application architecture

## 0. Critical Build Rule

This file is the source of truth for implementation.

The development agent/IDE must **not invent requirements, workflows, fields, permissions, integrations, medical rules, pricing rules, or compliance claims** that are not defined here or explicitly approved.

When something is missing or ambiguous:
1. Mark it as `OPEN QUESTION`.
2. Do not silently choose a business rule.
3. Present reasonable options if useful.
4. Wait for approval before implementing behavior that changes business logic.
5. Never fabricate hospital policy, clinical protocol, insurance rules, API credentials, external integration behavior, or compliance certification.

**Safety rule:** Phase 1 is not an autonomous clinical system. It must not autonomously diagnose, prescribe, recommend treatment, or decide discharge. Phase 2 AI must use controlled APIs/tools, least privilege, audit logging, data minimization, and human approval for consequential clinical actions.

---

# 1. Product Vision

Build a secure, modular Hospital Management System that centralizes:

- Patient registration and records
- Appointments and OPD
- Doctor consultation and EMR
- IPD, wards, rooms and beds
- Nursing
- Laboratory
- Pharmacy
- Inventory and procurement
- Billing and payments
- Staff and access control
- Reports and dashboards
- Notifications
- Documents
- Audit and security
- Backup and disaster recovery

The architecture must be **AI-ready from Phase 1**, while actual AI models/agents are deferred to Phase 2.

Supported deployment models:

### On-Premise
Hospital-owned server, local PostgreSQL database, hospital LAN, controlled local access.

### SaaS / Cloud
Same application architecture deployed to managed infrastructure with explicit tenant isolation.

---

# 2. Product Principles

1. Security first.
2. Correct hospital workflow before automation.
3. Backend authorization is authoritative.
4. PostgreSQL is the system of record.
5. No direct browser-to-database access.
6. Sensitive operations are auditable.
7. Human approval for consequential clinical actions.
8. Structured data wherever practical.
9. API-first architecture.
10. AI is an extension, never the security boundary.
11. No speculative features.
12. Every important requirement must be testable.

---

# 3. Phase 1 Scope

## P0 — Mandatory

- Authentication
- User management
- Role-based access control
- Permission management
- Hospital configuration
- Departments
- Staff and doctor master
- Patient registration
- Patient profile
- Patient identifiers/UHID
- Patient contacts
- Allergies
- Appointments
- OPD
- Queue/token management
- Doctor consultation
- EMR/clinical notes
- Vitals
- Diagnoses recording
- Prescriptions
- IPD admissions
- Wards/rooms/beds
- Bed allocation/transfer
- Nursing
- Laboratory orders
- Sample workflow
- Lab results
- Pharmacy
- Medicine master
- Batch/expiry
- Inventory
- Suppliers
- Purchasing
- Billing
- Invoices
- Payments
- Receipts
- Refund workflow
- Reports
- Notifications
- Document management
- Audit logging
- Security events
- Backup/restore procedures
- On-premise deployment
- Production hardening
- Testing and UAT

## P1 — Later

- Insurance/TPA
- Advanced analytics
- Multi-branch
- Patient portal
- External integrations
- Advanced notification providers
- Additional operational modules

## Phase 2 — AI

Potential features:
- Reception/appointment agent
- Hospital knowledge assistant
- Doctor copilot
- Medical-record summarization
- Clinical documentation drafting
- Discharge-summary drafting
- Lab workflow assistant
- Pharmacy assistant
- Inventory prediction
- Management intelligence
- Security anomaly detection

Do not implement Phase 2 AI during Phase 1 unless separately approved.

---

# 4. Explicitly Out of Scope for Phase 1

Unless separately approved:

- Autonomous diagnosis
- Autonomous prescription
- Autonomous treatment recommendation
- Autonomous patient discharge decision
- Medical-device control
- Fully automated clinical decision making
- Training a custom medical foundation model
- Sending unrestricted patient data to an external LLM
- Direct AI-to-database access
- Public internet exposure of PostgreSQL
- Custom mobile apps
- Multi-hospital federation
- Insurance integrations
- Payment gateway integrations
- WhatsApp/SMS provider integration

These require approved change requests.

---

# 5. Recommended Technology Stack

## Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query where appropriate

## Backend
- Node.js
- TypeScript
- NestJS
- REST API
- OpenAPI/Swagger
- DTO validation
- Centralized error handling
- Guards/interceptors for authorization and audit concerns

## Database
- PostgreSQL
- Prisma ORM

PostgreSQL is the source of truth.

## Cache / Jobs
- Redis
- BullMQ

Redis is not the source of truth.

## Document Storage
- MinIO for on-premise object/file storage, or an approved equivalent.

Store metadata in PostgreSQL and files in protected storage.

## Authentication
Evaluate:
- Keycloak for enterprise/on-premise identity management
- Secure application-managed authentication for smaller deployments

Final choice is an `OPEN QUESTION` until deployment requirements are confirmed.

## Password hashing
- Argon2id

## Reverse proxy
- Nginx or Caddy

## Containers
- Docker
- Docker Compose for the initial single-site on-premise deployment

## Testing
- Jest
- Supertest or equivalent
- Playwright

## Version control
- Git
- GitHub/GitLab or client-approved repository

## CI/CD
- GitHub Actions/GitLab CI where appropriate

## Monitoring
Start with structured logs and health checks. Add Prometheus/Grafana/Loki only when justified.

---

# 6. High-Level Architecture

```text
Users
  |
  | HTTPS / secured hospital LAN
  v
Next.js Web App
  |
  v
Reverse Proxy
  |
  v
NestJS API
  |
  +--> Authentication / Authorization
  +--> HMS Domain Modules
  +--> Audit / Security
  +--> Notifications
  +--> Event / Outbox
  |
  +--> PostgreSQL
  |
  +--> MinIO / Document Storage
  |
  +--> Redis / BullMQ
  |
  +--> Approved External Integrations

Future Phase 2:
HMS APIs
  |
AI Gateway
  |
+--> Permission checks
+--> Data minimization
+--> Tool allowlist
+--> AI audit
  |
AI Orchestrator
  |
+--> Reception Agent
+--> Doctor Copilot
+--> Operations Agent
+--> Other approved agents
```

**Hard rule:**
```text
Browser -> API -> Service -> Database
```

Never:
```text
Browser -> PostgreSQL
AI -> PostgreSQL
```

---

# 7. On-Premise Deployment

```text
Hospital LAN
    |
Firewall / Network Gateway
    |
HMS Server
    |
    +-- Reverse Proxy
    +-- Frontend
    +-- Backend
    +-- PostgreSQL
    +-- Redis
    +-- MinIO
    +-- Worker
    +-- Backup process
```

Requirements:
- PostgreSQL must not be exposed to ordinary client devices.
- Guest Wi-Fi must not access the HMS server.
- Server should use UPS.
- Server should have restricted physical access.
- OS firewall and security updates must be enabled.
- Backups must be configured and tested.

---

# 8. SaaS Architecture

If cloud SaaS is enabled:
- Represent tenant explicitly.
- Scope tenant-owned records server-side.
- Verify tenant context on every protected request.
- Never rely on frontend tenant filtering.

Possible isolation strategies:
1. Shared database + strict tenant_id isolation
2. Separate schema per tenant
3. Separate database per tenant

Final strategy is an `OPEN QUESTION` based on scale/security requirements.

---

# 9. Core Domain Model

Minimum entities:

## Identity
- users
- roles
- permissions
- user_roles
- role_permissions
- sessions/authentication records where applicable

## Hospital
- hospitals
- branches
- departments
- staff
- doctors

## Patient
- patients
- patient_contacts
- patient_allergies
- patient_identifiers
- patient_documents

## Clinical
- encounters
- medical_records
- clinical_notes
- vitals
- diagnoses
- prescriptions
- prescription_items
- medications

## OPD
- appointments
- doctor_schedules
- queues/tokens

## IPD
- admissions
- wards
- rooms
- beds
- bed_allocations
- transfers
- discharge_records

## Nursing
- nursing_notes
- nursing_tasks
- care_records

## Laboratory
- lab_tests
- lab_orders
- lab_order_items
- samples
- lab_results
- lab_reports

## Pharmacy
- medicines
- medicine_batches
- pharmacy_transactions
- dispensing_records

## Inventory
- inventory_items
- stock_movements
- suppliers
- purchase_orders
- purchase_order_items

## Billing
- services
- tariffs
- invoices
- invoice_items
- payments
- refunds

## Communication
- notifications
- notification_templates
- notification_delivery_logs

## Documents
- documents
- document_versions
- document_access_records

## Security
- audit_logs
- security_events
- login_events

## Architecture
- outbox_events
- integration_logs
- system_settings

Review the final ERD before migrations are finalized.

---

# 10. Data Modeling Rules

1. Use consistent primary keys.
2. Use foreign keys for real relationships.
3. Use database constraints for invariants.
4. Use transactions for multi-record business operations.
5. Record created_at/updated_at on relevant entities.
6. Record created_by/updated_by where accountability matters.
7. Do not casually soft-delete clinical history.
8. Do not silently delete clinical records.
9. Ordinary users cannot modify audit history.
10. Add indexes based on actual query patterns.
11. Use migrations for all schema changes.
12. Never manually alter production schema outside migrations.

---

# 11. RBAC & Authorization

Authorization must be enforced server-side.

Example permissions:

```text
patient.view
patient.create
patient.edit

appointment.view
appointment.create
appointment.cancel

medical_record.view
medical_record.create
medical_record.edit

prescription.view
prescription.create
prescription.approve

lab.order.create
lab.result.view
lab.result.enter
lab.result.verify

pharmacy.dispense
inventory.view
inventory.adjust

billing.create
billing.view
billing.refund

user.create
user.disable
role.manage

audit.view
security.view
```

Initial roles:
- Super Admin
- Hospital Admin
- Doctor
- Nurse
- Receptionist
- Lab Technician
- Pharmacist
- Accountant

Role alone may not determine access. Department/branch/resource restrictions may be required.

---

# 12. Authentication Requirements

- Argon2id password hashing
- Strong password policy
- Brute-force protection/rate limiting
- Session expiry
- Secure session handling
- MFA capability
- Single-use expiring password-reset tokens
- Account activation/deactivation
- Login event logging
- Logout/session invalidation
- Re-authentication for sensitive actions where appropriate

Never log passwords, tokens or secrets.

---

# 13. Security Requirements

## Network
- Database not publicly exposed
- Restrict unnecessary ports
- Firewall enabled
- Guest network isolated
- TLS/HTTPS for application traffic where feasible
- Remote access only through approved secure mechanisms

## Application
- Input validation
- Output encoding
- SQL injection protection
- XSS protection
- CSRF protection where applicable
- Secure headers
- Rate limiting
- File upload validation
- Authorization on every protected API
- Protection against IDOR/broken object authorization

## Database
- Least-privilege database account
- Application must not use PostgreSQL superuser
- Database access restricted to backend/services
- Encrypted backups
- Appropriate database logging

## Secrets
- Never hard-code secrets
- Never commit secrets
- Use environment variables or approved secrets management
- Separate development/staging/production secrets

---

# 14. Patient Data Protection

Rules:
- Collect only required information.
- Restrict access by permission.
- Use least privilege.
- Do not expose patient data in public URLs.
- Do not put sensitive medical information into logs.
- Protect exports and uploaded documents.
- Audit access to sensitive records.
- Do not send patient data to external AI providers unless explicitly approved by the hospital under an appropriate architecture and policy.

Do not claim HIPAA/GDPR/other compliance without formal assessment. Confirm applicable Indian/local legal and hospital requirements with qualified advisors.

---

# 15. Audit Logging

Audit sensitive actions:
- Login/logout
- Failed login
- Patient record access/change
- Clinical note changes
- Prescription actions
- Lab result entry/verification
- Billing changes
- Refunds
- User creation/deactivation
- Role/permission changes
- Data exports
- Document access
- Security events
- Administrative changes

Minimum fields:

```text
id
actor_user_id
action
resource_type
resource_id
timestamp
ip_address
user_agent
metadata
result
```

Protect audit records from ordinary modification/deletion.

---

# 16. Document Management

Potential documents:
- Lab reports
- Prescriptions
- Discharge summaries
- Medical attachments
- Administrative documents

Requirements:
- Metadata in PostgreSQL
- File content in protected storage
- Authenticated/authorized document access
- File type and size validation
- Safe storage keys
- No executable uploads
- Malware scanning where appropriate
- Versioning where required
- Creator/timestamp tracking

Never place patient documents in a public directory.

---

# 17. Patient Module

Features:
- Register patient
- Generate unique UHID/patient identifier
- Search
- Edit permitted demographics
- View consolidated profile
- Manage contacts
- Record allergies
- View encounter history
- View documents
- View authorized clinical history

Open questions:
- UHID format
- Required demographics
- Identification documents
- Duplicate detection/merge policy

---

# 18. Appointment & OPD

Features:
- Doctor schedules
- Department schedules
- Appointment creation
- Rescheduling
- Cancellation
- Walk-ins
- Queue/token
- Appointment status
- Consultation start/end
- Follow-up

Candidate statuses:
```text
scheduled
checked_in
in_queue
in_consultation
completed
cancelled
no_show
```

Confirm exact status model with the hospital.

---

# 19. Doctor / EMR

Features:
- Patient clinical profile
- Encounter
- Chief complaint
- Clinical notes
- Vitals
- Diagnosis recording
- Prescription
- Investigation orders
- Follow-up
- Draft/final states where required

Clinical entries must be attributable to author and timestamp.

Phase 1 must not use AI for autonomous clinical decisions.

---

# 20. IPD

Workflow:
```text
Admission
  -> Ward/Room/Bed
  -> Doctor orders/rounds
  -> Nursing
  -> Lab/Pharmacy
  -> Discharge
  -> Billing
```

Requirements:
- Admission
- Ward/room/bed assignment
- Bed availability
- Transfer
- Doctor rounds
- Nursing records
- Investigation orders
- Medication workflow
- Discharge

Bed allocation must be transactional to prevent double booking.

---

# 21. Nursing

Features:
- Nursing dashboard
- Assigned patients
- Vitals
- Nursing notes
- Care tasks
- Medication/care schedule visibility
- Handover

Do not invent medication-administration policy; confirm hospital workflow.

---

# 22. Laboratory

Workflow:
```text
Order
 -> Sample Collection
 -> Processing
 -> Result Entry
 -> Verification
 -> Report
```

Requirements:
- Result entry and verification should be separable.
- Verified results must not be silently modified.
- Corrections must be auditable.
- Reference ranges must come from approved configuration/data, not invented by AI.

---

# 23. Pharmacy

Features:
- Medicine master
- Batch
- Expiry
- Stock
- Prescription dispensing
- Returns
- Suppliers
- Purchase

Inventory changes must be transactional and auditable.

AI must never silently change inventory.

---

# 24. Inventory & Procurement

Features:
- Item master
- Categories
- Suppliers
- Purchase orders
- Stock inward
- Stock outward
- Adjustments
- Batch/expiry
- Minimum stock
- Movement history

Every quantity change must have a traceable transaction.

---

# 25. Billing & Accounts

Features:
- Service master
- Tariff
- Invoice
- Invoice items
- Discounts
- Payments
- Receipts
- Outstanding
- Refunds
- Financial reports

Rules:
- Money calculations must use exact decimal or integer minor-unit handling.
- Never use floating point for financial calculations.
- Billing logic is deterministic application code, not AI.
- Refunds require appropriate permission and audit.

---

# 26. Reports & Dashboards

Initial reports:
- Patient registration
- Appointments
- OPD volume
- IPD admissions/discharges
- Bed occupancy
- Lab workload
- Pharmacy stock
- Inventory expiry
- Revenue
- Collections
- Outstanding
- User activity
- Audit/security

Reports must respect underlying data permissions.

---

# 27. Notifications

Support architecture for:
- In-app
- Email
- SMS
- Messaging providers later

Use queues for bulk/slow notifications.

Do not include sensitive patient information in notifications unless hospital policy explicitly permits it.

---

# 28. Event / Outbox Architecture

Create events for meaningful state changes:

```text
PATIENT_REGISTERED
APPOINTMENT_CREATED
APPOINTMENT_CANCELLED
PATIENT_ADMITTED
BED_ALLOCATED
LAB_ORDER_CREATED
LAB_RESULT_VERIFIED
PRESCRIPTION_CREATED
PATIENT_DISCHARGED
PAYMENT_COMPLETED
STOCK_UPDATED
```

Use an Outbox Pattern where appropriate so database changes and event creation remain consistent.

Phase 1 can use events for internal workflows. Phase 2 can consume approved events.

---

# 29. AI-Ready Contract

Phase 1 must expose secure service/API capabilities future AI can consume:

```text
getPatientProfile()
getPatientHistory()
getPatientAllergies()
getPatientLabResults()
getPatientPrescriptions()
getDoctorAvailability()
getLowStockItems()
getExpiringInventory()
getHospitalPolicies()
getOperationalMetrics()
```

Future AI tools must:
- Use authenticated identity
- Verify permissions
- Verify patient/tenant/branch scope
- Retrieve minimum necessary data
- Never execute arbitrary SQL
- Never have unrestricted database access
- Log tool calls
- Respect action-approval policies

---

# 30. Future AI Agent Permissions

## Doctor Copilot

May:
- Read authorized patient history
- Read authorized lab results
- Read medications/prescriptions
- Draft notes
- Draft summaries

May not:
- Delete records
- Change roles
- Issue final prescriptions autonomously
- Approve final clinical decisions

## Reception Agent

May:
- Search approved appointment availability
- Create/reschedule/cancel appointments according to approved rules
- Provide hospital information

May not:
- Access unrestricted clinical history
- Modify clinical records
- Perform administrative financial actions

---

# 31. AI Safety Model — Phase 2

```text
User
 -> Authentication
 -> Authorization
 -> AI Gateway
 -> Data minimization
 -> Tool allowlist
 -> AI model
 -> Output validation
 -> Human approval where required
 -> HMS API
 -> Audit
```

Never:
```text
User -> LLM -> Database
AI -> unrestricted HMS admin account
```

---

# 32. API Rules

- Prefix APIs with `/api/v1`
- Consistent resource naming
- Validate every request
- Consistent error structure
- Appropriate HTTP status codes
- Pagination for large lists
- Deliberate filtering/search
- Backend authorization on every protected operation
- Idempotency for operations where duplicate execution is dangerous
- Transactions for multi-step financial/clinical operations
- OpenAPI documentation

Example:
```text
GET    /api/v1/patients
POST   /api/v1/patients
GET    /api/v1/patients/:id
PATCH  /api/v1/patients/:id

GET    /api/v1/appointments
POST   /api/v1/appointments
PATCH  /api/v1/appointments/:id

GET    /api/v1/lab/orders/:id
POST   /api/v1/lab/orders
POST   /api/v1/lab/results/:id/verify
```

---

# 33. Frontend Rules

- Reusable components
- Shared design system
- Business rules primarily on backend
- Permission-aware UI
- Loading/error/empty states
- Accessible forms
- No secrets in browser code
- No insecure sensitive-token storage
- Backend responses are authoritative

---

# 34. Backend Rules

Layered architecture:

```text
Controller
 -> Authentication/Authorization
 -> Validation
 -> Service
 -> Repository/ORM
 -> Database
```

Important operation:

```text
Authorization
 -> Validation
 -> Transaction
 -> Audit
 -> Event
```

Do not put database queries directly in controllers.

Do not mix unrelated domains.

---

# 35. Testing

## Unit
Test:
- Billing
- Permission rules
- Bed allocation
- Inventory movement
- Appointment transitions
- Validation
- Business rules

## Integration
Test:
- API + database
- Transactions
- Authentication
- Authorization
- Audit

## E2E

### OPD
```text
Register patient
 -> Book appointment
 -> Check in
 -> Consultation
 -> Prescription
 -> Billing
 -> Payment
```

### IPD
```text
Admission
 -> Bed allocation
 -> Doctor/nursing workflow
 -> Lab/pharmacy
 -> Discharge
 -> Billing
```

### Laboratory
```text
Order
 -> Sample
 -> Result
 -> Verification
 -> Report
```

### Pharmacy
```text
Purchase
 -> Stock
 -> Prescription
 -> Dispensing
 -> Stock deduction
```

## Security tests
- Authentication bypass
- Broken authorization
- IDOR/resource access
- SQL injection
- XSS
- CSRF where applicable
- File upload abuse
- Rate limiting
- Session security
- Privilege escalation

---

# 36. Definition of Done

A feature is complete only when:
- UI implemented
- Backend implemented
- Migration completed
- Validation implemented
- Authorization implemented
- Error handling implemented
- Audit requirements considered
- Relevant tests written
- Critical edge cases tested
- API documented
- Security reviewed
- No blocking defects
- Acceptance criteria passed
- Documentation updated where required

---

# 37. Antigravity IDE Development Workflow

The IDE must work in small, verified increments.

## Step 1 — Understand
Read:
- This PRD
- Existing architecture
- Existing code
- Existing schema
- Existing API contracts

## Step 2 — Plan
Before coding, identify:
- Files/modules affected
- Schema changes
- API changes
- Permissions
- Audit requirements
- Tests
- Open questions

## Step 3 — Implement
Make the smallest coherent change.

## Step 4 — Verify
Run relevant:
- Type checking
- Linting
- Unit tests
- Integration tests
- E2E tests

## Step 5 — Review
Check:
- Security
- Authorization
- Data integrity
- Error handling
- Regression risk

## Step 6 — Report
State:
- What changed
- What was tested
- What remains
- Open questions
- Assumptions

---

# 38. Anti-Hallucination Rules for Antigravity

The development agent MUST NOT:
- Invent database fields because they seem useful.
- Invent hospital policies.
- Invent clinical reference ranges.
- Invent insurance rules.
- Invent medicine dosages.
- Invent external API endpoints.
- Invent credentials.
- Invent compliance certifications.
- Invent user permissions.
- Invent workflows not approved by the hospital.
- Replace missing requirements with guesses.
- Delete existing functionality to make a feature easier.
- Rewrite architecture without approval.
- Add libraries without explaining why.
- Create duplicate models for the same domain entity.
- Generate fake production data that could be confused with real patient data.
- Disable security checks to make development easier.

When uncertain:

```text
OPEN QUESTION:
[exact ambiguity]

PROPOSED OPTIONS:
A. ...
B. ...

RECOMMENDATION:
...

WAITING FOR APPROVAL:
Yes
```

Do not implement ambiguous business behavior until approved.

---

# 39. Change Management

Anything not in this PRD is a change request.

### Minor
UI wording, spacing, non-functional presentation.

### Moderate
New field, report, workflow variation, new permission.

### Major
New module, database redesign, external integration, deployment-model change, security architecture change, clinical workflow change.

Major changes require:
- Impact analysis
- Database impact
- API impact
- Security impact
- Testing impact
- Timeline/cost impact
- Approval

---

# 40. Environment Strategy

Minimum:
```text
Development
 -> Staging / UAT
 -> Production
```

Never test experimental code directly on production patient data.

Production database must not be used casually for development.

Use sanitized/synthetic test data.

---

# 41. Configuration

Environment-specific configuration only.

Typical categories:
```text
DATABASE_URL
REDIS_URL
STORAGE_ENDPOINT
STORAGE_BUCKET
AUTH_CONFIG
TLS_CONFIG
LOG_LEVEL
APP_ENV
```

Never commit secrets.

Maintain separate development/staging/production configuration.

---

# 42. Backup & Disaster Recovery

Define:
- Backup frequency
- Retention
- Encryption
- Destination
- Restore procedure
- RPO
- RTO

Recommended principle:
```text
Primary Database
      |
      +--> Local Backup
      |
      +--> Separate Backup Copy
```

Backups must be periodically restored/tested.

RAID is not a backup.

Exact RPO/RTO must be approved by the hospital.

---

# 43. Production Deployment Checklist

Before go-live:
- Production server hardened
- Firewall configured
- Database access restricted
- TLS configured
- Application deployed
- Migrations applied
- Backup configured
- Restore tested
- Monitoring/health checks working
- Admin accounts secured
- Default credentials removed
- Roles reviewed
- Permissions reviewed
- Audit verified
- Test data removed
- UAT signed off
- Staff training completed
- Rollback documented
- Support contacts documented

---

# 44. Performance

Do not invent SLA numbers before requirements are known.

Design for:
- Pagination
- Indexed searches
- Efficient queries
- Connection pooling
- Background jobs
- Caching where useful
- Avoiding N+1 queries
- Transaction integrity
- Async generation for large reports

Set performance benchmarks during staging.

---

# 45. Observability

Each service should provide:
- Health endpoint
- Structured logs
- Error logging
- Database health visibility
- Job/queue health
- Backup status visibility

Never log:
- Passwords
- Authentication tokens
- API secrets
- Full sensitive medical records
- Unnecessary patient identifiers

---

# 46. UI/UX Direction

The UI should be:
- Professional
- Calm
- Medical/enterprise
- Fast
- Accessible
- Consistent
- Information-dense without clutter

Use:
- Clear navigation
- Role-specific dashboards
- Search-first patient workflows
- Consistent forms
- Confirmation for destructive/sensitive actions
- Clear status indicators
- Responsive layouts

Avoid:
- Excessive animations
- Decorative UI that slows workflows
- Tiny text
- Ambiguous buttons
- Hidden critical actions

---

# 47. Recommended Build Order

## Sprint 0 — Discovery & Architecture
- Confirm requirements
- ERD
- RBAC matrix
- API conventions
- Security architecture
- Deployment architecture
- UI design system
- Open questions

## Sprint 1 — Foundation
- Repository
- Docker
- PostgreSQL
- NestJS
- Next.js
- Authentication
- Users
- Roles
- Permissions
- Audit foundation

## Sprint 2 — Hospital & Patient
- Hospital
- Departments
- Staff
- Doctors
- Patient registration
- Patient profile
- Documents
- Search

## Sprint 3 — Appointments & OPD
- Doctor schedule
- Appointment
- Queue
- Consultation
- EMR basics
- Prescription
- OPD billing

## Sprint 4 — IPD
- Admissions
- Wards
- Rooms
- Beds
- Transfers
- Doctor rounds
- Nursing
- Discharge

## Sprint 5 — Laboratory
- Test master
- Orders
- Samples
- Results
- Verification
- Reports

## Sprint 6 — Pharmacy & Inventory
- Medicines
- Batches
- Suppliers
- Purchases
- Stock
- Dispensing
- Expiry

## Sprint 7 — Billing & Reports
- Tariffs
- Invoices
- Payments
- Refunds
- Collections
- Reports
- Dashboards

## Sprint 8 — Security & Operations
- Security center
- Audit improvements
- Backup
- Restore
- Monitoring
- Deployment hardening

## Sprint 9 — Full QA & UAT
- Regression
- E2E
- Security tests
- Performance testing
- UAT
- Documentation
- Training

## Phase 2 — AI
Only after Phase 1 is stable and approved.

---

# 48. First Milestone

Do not generate every module at once.

First deliver this vertical slice:

```text
Login
 -> Role/permission check
 -> Register patient
 -> Book appointment
 -> Doctor opens patient
 -> Create consultation
 -> Create prescription
 -> Generate bill
 -> Record payment
 -> Audit everything
```

This proves the foundation before expanding.

---

# 49. Project Structure

```text
hms/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   └── styles/
│   │
│   └── api/
│       └── src/
│           ├── auth/
│           ├── users/
│           ├── roles/
│           ├── permissions/
│           ├── hospital/
│           ├── patients/
│           ├── appointments/
│           ├── opd/
│           ├── emr/
│           ├── doctors/
│           ├── ipd/
│           ├── nursing/
│           ├── laboratory/
│           ├── pharmacy/
│           ├── inventory/
│           ├── billing/
│           ├── reports/
│           ├── notifications/
│           ├── documents/
│           ├── audit/
│           ├── security/
│           ├── events/
│           └── integrations/
│
├── packages/
│   ├── shared-types/
│   ├── validation/
│   └── config/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── backup/
│   └── monitoring/
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── security/
│   ├── deployment/
│   └── workflows/
│
├── .env.example
├── docker-compose.yml
└── README.md
```

Keep tooling simple unless scale requires more.

---

# 50. Phase 1 Acceptance Criteria

Phase 1 is ready for production consideration only when:
- All P0 modules are implemented.
- Critical workflows pass E2E tests.
- RBAC is verified.
- Sensitive API endpoints are authorization-tested.
- Audit logging is verified.
- Backup and restore are tested.
- On-premise deployment is reproducible.
- Production configuration is documented.
- No critical/high security findings remain unresolved.
- Hospital stakeholders complete UAT.
- Hospital-specific workflows are explicitly approved.
- Support and recovery procedures exist.
- Data migration, if any, is validated.
- Required security/compliance review is completed.

---

# 51. Mandatory Pre-Coding Deliverables

Before production coding, the agent must produce:

1. `docs/requirements/open-questions.md`
2. `docs/architecture/system-architecture.md`
3. `docs/architecture/erd.md`
4. `docs/security/security-architecture.md`
5. `docs/security/rbac-matrix.md`
6. `docs/api/api-conventions.md`
7. `docs/workflows/opd-workflow.md`
8. `docs/workflows/ipd-workflow.md`
9. `docs/deployment/on-premise.md`
10. `docs/testing/test-strategy.md`

Do **not** generate the entire application in one step.

After these artifacts are reviewed, implement the Foundation milestone first, then proceed module by module.

---

# 52. Final Engineering Rule

Build the simplest correct system that satisfies approved requirements.

Do not add complexity because it sounds enterprise.
Do not add AI because it sounds impressive.
Do not add microservices because they sound scalable.
Do not add libraries because an AI suggested them.
Do not invent requirements.
Do not sacrifice security for speed.

Build Phase 1 as a **modular monolith with clean domain boundaries, secure APIs, PostgreSQL, events/outbox, auditability, and reproducible deployment**.

The Phase 2 AI layer must consume approved HMS capabilities through the AI Gateway and controlled tools rather than directly accessing the database.

**The HMS is the product. AI is an extension of the product.**
