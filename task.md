# Hospital Management System — Master Execution Tracker

**SOURCE-OF-TRUTH OWNER**: `task.md` (CURRENT EXECUTION STATE)  
**Classification**: Operational Tracker  

## CURRENT MILESTONE
**AWAITING INSTRUCTION** — Phase 1 Complete Enterprise Hospital Foundation Complete. Next: **Milestone 14 — Patient Discovery Platform (patient-app)** (`docs/milestones/M14_PATIENT_DISCOVERY_PLATFORM.md`)

---

## COMPLETED

### Milestone 0: Project Foundation & Architecture Upgrade (COMPLETED)
- **Monorepo Topology & 4-Application Ecosystem**:
  - `apps/server/` (NestJS canonical backend shared across all frontends, migrated from `apps/api`).
  - `apps/hms-client/` (Dedicated Next.js Hospital & Doctor workstation application, migrated from `apps/web`).
  - `apps/patient-app/` (Autonomous Next.js mobile-first patient healthcare platform).
  - `apps/super-admin/` (Dedicated Next.js SaaS platform owner console).
- **Shared Packages Foundation**:
  - `packages/ui/` (Design tokens, shadcn/ui primitives, buttons, cards, skeletons, command palette).
  - `packages/types/` (Shared TypeScript domain contracts, DTOs, and enums).
  - `packages/config/` (Shared ESLint, Tailwind, and TypeScript configurations).
  - `packages/auth/` (Shared JWT payload interfaces, session context decoders, surface helpers).
- **Database & Cache Baseline**:
  - MongoDB Atlas live connection with schema validation.
  - Redis cache and rate limiter configuration with tenant-namespaced key patterns.
- **Master Documentation Suite (14 Authoritative Specifications)**:
  - `docs/PRD.md` — v3.0.0 Master Product Requirements Document.
  - `docs/ARCHITECTURE.md` — 4-tier application ecosystem & request pipeline.
  - `docs/DATABASE.md` — 26 collections data dictionary, compound indexes, financial decimal precision.
  - `docs/SECURITY.md` — Zero-trust multi-tenancy, RBAC guards, OWASP API Top 10 alignment.
  - `docs/FRONTEND.md` — Architecture for `hms-client`, `patient-app`, `super-admin`, and shared packages.
  - `docs/BACKEND.md` — NestJS modular monolith, tenant scoping, Redis queues, and error envelopes.
  - `docs/DESIGN.md` — Design tokens, typography, HSL palettes, and real-time queue visual guidelines.
  - `docs/SAAS.md` — Commercial tiers, subscription lifecycle state machine, and quota enforcement.
  - `docs/PATIENT_PLATFORM.md` — Mobile-first discovery, 5-step booking wizard, live OPD queue tracker, PHR vault.
  - `docs/AI_ARCHITECTURE.md` — Phase 2 AI Gateway topology, 18 specialized healthcare agents catalog.
  - `docs/DEPLOYMENT.md` — Cloud hybrid deployment (Render, Vercel, Cloudflare, Atlas, Redis) and CI/CD.
  - `docs/DEVELOPMENT_RULES.md` — The 20 permanent Antigravity development rules.
  - `docs/MILESTONES.md` — Roadmap for Milestones 0 through 13.
  - `docs/DECISIONS.md` — Architectural Decision Records (ADR 001 to ADR 017).

### Milestone 01 — Authentication + Multi-Tenancy + RBAC (COMPLETED)
- Implemented enterprise multi-tenant identity governance, JWT authentication, and granular RBAC.
- Password hashing using bcryptjs (work factor 12) with account lockout protection.
- Guards: `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard` and cryptographic tenant derivation.

### Milestone 02 — Hospital + Departments + Doctors + Staff (COMPLETED)
- Hospital organization structure, clinical departments, staff and doctor profiles.
- Shift scheduling baseline and departmental routing.

### Milestone 03 — Patient Management (COMPLETED)
- Master Patient Index (MPI) with deterministic and probabilistic duplicate detection.
- Sequential UHID generator with multi-tenant counter schema (`PAT-YYYY-NNNNNN`).
- Patient registration, profile management, and comprehensive clinical allergy ledger.

### Milestone 04 — Appointments & OPD Queue (COMPLETED)
- Outpatient appointment scheduling engine with shift slot calculations.
- Live token issuance (`#1`, `#2`, etc.) and queue state machine (`SCHEDULED`, `CHECKED_IN`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`).
- Doctor queue board and patient lookup in `apps/hms-client`.

### Milestone 05 — Doctor Consultation & EMR (COMPLETED)
- Encounter initialization from checked-in appointments; automatic appointment status advancement.
- Real-time BMI calculator & categorization; active allergy contraindication engine.
- Immutability lock for finalized encounters and audit logging via `AuditService`.
- Full Physician Consultation Cockpit in `apps/hms-client` with SOAP notes, ICD-10 diagnoses, and prescription builder.

### Milestone 06 — IPD & Bed Management (COMPLETED)
- Inpatient admissions, ward/bed matrix, real-time census summary calculations.
- Concurrency-safe atomic bed reservation, internal transfer with housekeeping release, and discharge summary workflow.

### Milestone 07 — Laboratory Information System (LIS) (COMPLETED)
- Diagnostic test catalog browser with biological reference intervals and critical panic limits.
- Electronic requisition wizard (`LAB-YYYY-NNNNN`), phlebotomy accessioning (`ACC-YYYY-NNNNN`), dual-bench technician worksheet, and pathologist verification sign-off seal.

### Milestone 08 — Pharmacy & Dispensing (COMPLETED)
- Formulary catalog, FEFO batch recommendation, atomic stock deduction, and dispensing workstation.
- Medication instruction translator and thermal print label preview.

### Milestone 09 — Inventory, Stock & Procurement (COMPLETED)
- **Domain Contracts & Models**: `InventoryItem`, `Supplier`, `PurchaseOrder`, `PurchaseReceipt` (GRN), `StockMovement`.
- **Core Logistics Workflows**:
  - Item Master catalog with categorized hospital consumables and safety stock thresholds.
  - Approved supplier directory with statutory tax identifiers (GST/VAT) and payment credit terms.
  - Sequential purchase order requisition (`PO-YYYY-NNNNN`) and administrative approval lifecycle.
  - GRN delivery workstation (`GRN-YYYY-NNNNN`) capturing manufacturer lot/expiry and atomic stock increment.
  - Departmental transfers to clinical wards with concurrency-safe stock deduction.
  - Physical audit adjustment engine with reason codes and immutable transaction history.
- **Frontend & Currency Integration**:
  - Executive inventory dashboard with live valuation, low-stock alerts, and fast reorder triggers.
  - Global `CurrencyContext` and interactive header `CurrencySelector` defaulting to Indian Rupee (`₹ INR`).
- **Automated Testing & Build**: 10 unit tests in `inventory.service.spec.ts`. All 13 test suites passed.

### Milestone 10 — Billing, Invoicing & Payments (COMPLETED)
- **Domain Contracts (`packages/types`)**:
  - Enums: `ServiceCategory`, `InvoiceStatus`, `InvoiceItemType`, `PaymentMethod`, `PaymentStatus`, `RefundStatus`.
  - Interfaces & DTOs: `HospitalService`, `InvoiceLineItem`, `Invoice`, `Payment`, `Refund`, `BillingSummaryMetrics`, `UnbilledChargeItem`.
- **Backend Architecture (`apps/server/src/billing/`)**:
  - Mongoose Collections: `services`, `invoices`, `payments`, `refunds` with tenant isolation and compound indexes.
  - `BillingService`:
    - Idempotent tariff seeder (10 standard clinical services across consultations, procedures, lab, radiology, and beds).
    - Sequential numbering generators (`INV-YYYY-NNNNN`, `RCP-YYYY-NNNNN`, `RFD-YYYY-NNNNN`).
    - Unbilled clinical charge scanner auto-aggregating OPD visits, lab orders, pharmacy dispenses, and bed charges.
    - Atomic payment balance reconciliation with overpayment guard and immediate invoice status transition.
    - Role-gated refund creation and approval engine.
    - High-precision integer minor-unit arithmetic eliminating floating-point drift.
    - Structured audit trail logging via `AuditService.record()`.
  - `BillingController`: REST API secured with `@JwtAuthGuard`, `@RolesGuard`, and granular permissions (`billing.read`, `billing.create`, `billing.refund`).
  - Unit Tests: 11 comprehensive tests in `billing.service.spec.ts`. All 14 server test suites passed (107/107 tests).
- **Hospital Administrative Workstation (`apps/hms-client`)**:
  - `sidebar.tsx`: Activated `Billing & Invoicing` with live status indicator.
  - `/billing`: Executive revenue dashboard with KPI cards formatted in `₹ INR`, status filters, and invoice ledger.
  - `/billing/invoices/new`: Universal invoice authoring wizard with patient selector, one-click unbilled charge import, tariff selector, line item editor, and live totals.
  - `/billing/invoices/[id]`: Itemized invoice statement with payment modal, refund modal, transaction history, and official receipt thermal/A4 print preview.
  - `/billing/payments`: Payments & receipts register with payment method breakdown and transaction search.
  - `/billing/tariffs`: Service tariff master browser with category filters and Add Service modal.
  - `/billing/refunds`: Permission-controlled refunds authorization queue with accountant approval modal.
- **Verification & Validation**:
  - Live Browser Audit: 7 visual checkpoints captured and documented (screenshots `50` through `56`).
  - Monorepo Typecheck: `pnpm typecheck` passed with 0 errors across all 8 workspace projects.
  - Monorepo Linter: `pnpm lint` passed with 0 warnings and 0 errors across all workspace projects.
  - Server Unit Tests: 107/107 passed across 14 test suites (`vitest run`).
  - Production Build: `pnpm --filter @hms/hms-client build` passed with 0 errors across all 33 routes.

### Milestone 11 — Reports, Analytics & Master Audit Center (COMPLETED)
- **Domain Contracts (`packages/types`)**:
  - Domain Interfaces & DTOs: `CensusReport`, `FinancialReport`, `InventoryPharmacyReport`, `AuditLogEntry`, `AuditQueryParams`, `AuditQueryResponse`.
- **Backend Architecture (`apps/server`)**:
  - `AuditModule` & `AuditService`:
    - Enhanced `AuditLog` schema with compound indexes: `{ tenantId: 1, timestamp: -1 }`, `{ tenantId: 1, action: 1 }`, `{ tenantId: 1, userId: 1 }`.
    - Multi-criteria filtering, user profile enrichment, and RFC-4180 CSV export generator.
    - `AuditController`: REST endpoints `GET /api/v1/audit` and `GET /api/v1/audit/export` secured with `@RequirePermissions('audit.read')`.
  - `ReportsModule` & `ReportsService`:
    - Multi-collection aggregation pipelines across `patients`, `appointments`, `admissions`, `beds`, `lab_orders`, `invoices`, `payments`, `refunds`, `medicines`, and `inventory_items`.
    - Clinical census calculations: intake demographics, OPD clinic attendance & clinician workload, IPD ward bed occupancy %, ALOS (Average Length of Stay), and laboratory turnaround times (TAT).
    - Financial revenue realization, cashier shift collections, departmental revenue attribution, and Accounts Receivable ageing buckets (0–30, 31–60, 61–90, >90 days overdue).
    - Supply chain safety: near-expiry batch watch (≤90 days) and formulary stockout alerts.
    - Structured audit logging via `AuditService.record()` emitting `REPORT_GENERATE` and `AUDIT_EXPORT`.
    - `ReportsController`: `GET /api/v1/reports/census`, `GET /api/v1/reports/financial`, `GET /api/v1/reports/inventory`, `GET /api/v1/reports/export`.
  - RBAC: Registered permissions `reports.read`, `reports.financial.read`, `audit.logs.read`.
  - Unit Tests: 5 comprehensive tests in `reports.service.spec.ts`. All 15 server test suites passed (112/112 tests).
- **Hospital Administrative Workstation (`apps/hms-client`)**:
  - `sidebar.tsx`: Activated `Reports & Census` (`/reports`) and `Audit & Security` (`/audit`) with live status badges.
  - `/reports`: Executive master reports hub with quick time period presets (`Today`, `Yesterday`, `Last 7 Days`, `Month to Date`, `Custom Range`), top KPI cards, and domain tabs.
  - `/reports/census`: Operational census dashboard with bed occupancy bars, clinician consultation load ledger, and lab throughput.
  - `/reports/financial`: Financial revenue dashboard with Accounts Receivable ageing matrix cards, payment methods breakdown, and cashier shift ledger in `₹ INR`.
  - `/reports/pharmacy-inventory`: Supply chain risk governance dashboard with near-expiry batch monitoring and formulary stockout alerts.
  - `/audit`: Master security & audit center with multi-criteria filters, search input, status pills, audit log ledger, and Detailed Audit Record Inspection modal with sanitized JSON payload view.
- **Verification & Validation**:
  - Live Browser Audit: 6 visual checkpoints captured and documented (screenshots `57` through `62`).
  - Monorepo Typecheck: `pnpm typecheck` passed with 0 errors across all 8 workspace projects.
  - Monorepo Linter: `pnpm lint` passed with 0 warnings and 0 errors across all workspace projects.
  - Server Unit Tests: 112/112 passed across 15 test suites (`vitest run`).
  - Production Build: `pnpm --filter @hms/hms-client build` passed with 0 errors across all 38 routes.

### Milestone 12 — Production Hardening, Security & Disaster Recovery (COMPLETED)
- **Multi-Tier Rate Limiting & Throttling (`@nestjs/throttler`)**:
  - Global Rate Limiter: 100 req/min across all endpoints.
  - Auth Endpoint Throttler: 5 req/min on `/auth/login` with `AppThrottlerGuard` logging `RATE_LIMIT_BREACH` warnings.
  - Financial & Export Throttlers: 10 req/min on `/billing/payments` and `/reports/export`.
- **HTTP Security Headers & Cache Hardening**:
  - Hardened Helmet: strict CSP, HSTS (1-year preload), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and COOP.
  - Sensitive Healthcare Cache Control: `no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, `Expires: 0` headers.
- **Correlation ID & Zero-Leakage Exception Handling**:
  - `CorrelationIdMiddleware`: Injects/propagates `x-request-id` across requests and response headers.
  - `GlobalExceptionFilter`: Intercepts all unhandled exceptions, keeps stack traces strictly in server logs, and emits sanitized JSON error envelope with correlation ID.
- **Deep Health & Operational Telemetry (`GET /api/v1/health/deep`)**:
  - Telemetry endpoint providing live cluster roundtrip ping latency (ms), Mongoose connection pool size, memory RSS/heap, and uptime.
- **Frontend Security & Telemetry UI**:
  - `SessionTimeoutModal`: Idle listener with 25-minute warning, 300s countdown, and 30-minute auto-logout.
  - `OfflineBanner`: Network loss alert with immediate re-test connectivity check.
  - `DeepHealthModal`: Interactive telemetry dashboard modal launched from the Executive Dashboard header badge.
- **Automated Backup & Point-in-Time Restore Verification Tooling**:
  - `apps/server/scripts/backup-atlas.ts`: Backs up 18 collections to `backups/`, computes SHA-256 digest, and logs `SYSTEM_BACKUP_EXECUTE`.
  - `apps/server/scripts/restore-verify.ts`: Verifies SHA-256 cryptographic match (100%), document counts, RTO (< 30m), RPO (< 5m), and logs `DISASTER_RECOVERY_TEST`.
  - Authoritative `docs/DISASTER_RECOVERY_RUNBOOK.md` & `docs/DEPLOYMENT_GUIDE.md`.
- **Verification Gates & Test Suites**:
  - `test/tenant-isolation.e2e-spec.ts`: 8/8 tests passed (Anti-IDOR rejection, mutation rejection, parameter tampering override, query enumeration isolation, sanitized exception filter).
  - `test/vertical-slice.e2e-spec.ts`: 8/8 tests passed (Full 10-step patient journey across Receptionist, Doctor, Lab Tech, Pathologist, Pharmacist, Cashier, Admin).
  - Monorepo E2E Suites: 19/19 tests passed (4 test files).
  - Server Unit Tests: 117/117 tests passed (16 test files).
  - Monorepo Typecheck: Passed (0 errors).
  - Monorepo Lint: Passed (0 errors, 0 warnings).
  - Monorepo Build: Passed (0 errors).

### Milestone 13 — SaaS Platform Owner Console & Super Admin Control Plane (COMPLETED)
- **Authoritative Boundary Enforcement & Dual-Plane Architecture**:
  - Established two-level administrative hierarchy:
    - **Level 1 (Platform)**: SaaS Owner / Super Admin (`apps/super-admin/`) -> Tenants, plans, subscriptions, telemetry, security audit, broadcasts.
    - **Level 2 (Hospital Tenant)**: Hospital Administrator (`apps/hms-client/`) -> Individual hospital facility governance. Zero platform privileges.
  - **Zero-PHI Technical Invariant**: `RolesGuard` and `PermissionsGuard` enforce strict cryptographic separation. Super Admin attempts to access hospital clinical data (patients, encounters, diagnoses, prescriptions, lab results, billing ledgers) are hard-blocked with `403 Forbidden` (`TENANT_PHI_ACCESS_PROHIBITED`).
  - Strict isolation between platform accounts (`platform@hmsmedcore.com`, `tenantId: null`) and hospital admin accounts (`admin@hms.local`, `tenantId: 6aa3f64974f6740b10b10001`).
- **Domain Contracts & Schemas (`packages/types`, `packages/auth`, `apps/server`)**:
  - Domain Enums & Contracts: `TenantStatus`, `SubscriptionTier`, `SubscriptionStatus`, `Tenant`, `Plan`, `Subscription`, `PlatformTelemetry`, `PlatformAuditLog`, `PlatformBroadcast`, `CreateTenantDto`, `UpdateTenantStatusDto`, `QuotaOverrideDto`, `CreatePlanDto`, `CreateBroadcastDto`.
  - Mongoose Collections: `tenants`, `plans`, `subscriptions`, `platform_broadcasts` with compound indexes and tenant isolation.
- **Backend Architecture & Control Plane API (`apps/server/src/super-admin/`)**:
  - `SuperAdminService`:
    - Tenant lifecycle management (provisioning with automated admin seeding, suspension with staff login lockout, and reactivation).
    - Plan catalog management (`STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`) with live quota overrides.
    - Real-time MongoDB ping telemetry execution, Node process memory inspection, and platform-wide census aggregation.
    - Immutable security audit logging emitting `TENANT_PROVISIONED`, `TENANT_STATUS_UPDATED`, `TENANT_QUOTAS_OVERRIDDEN`, `PLATFORM_BROADCAST_CREATED`.
    - Maintenance & incident broadcasting with targeted audience routing.
  - `SuperAdminController`: All endpoints mapped under `/api/v1/super-admin/*` guarded by `JwtAuthGuard`, `RolesGuard`, and `PermissionsGuard`.
  - Platform RBAC Permissions: `platform.tenants.read`, `platform.tenants.manage`, `platform.tenants.suspend`, `platform.plans.manage`, `platform.subscriptions.manage`, `platform.telemetry.read`, `platform.audit.read`, `platform.broadcast.manage`.
- **SaaS Platform Owner Application (`apps/super-admin/`)**:
  - Visual Aesthetics: Sovereign Dark theme (`slate-950`/`slate-900`/`indigo-600`) with live cluster health badges and Zero-PHI boundary notifications.
  - Centralized API Client (`src/lib/api-client.ts`) and Auth Context (`src/context/auth-context.tsx`) with Super Admin role enforcement.
  - Responsive App Shell (`SuperAdminAppShell`) with breadcrumb navigation and mobile drawer.
  - Pages Implemented:
    - `/login`: Secure 2FA/TOTP Super Admin portal login with single-click demo credentials.
    - `/dashboard`: Executive SaaS Cockpit with MRR/ARR counter, active tenant counts, licensed clinicians, real-time Atlas ping latency, active broadcasts, and recent platform audit stream.
    - `/tenants`: Master Tenant Directory with search, status filters (`ACTIVE`, `TRIAL`, `SUSPENDED`), tier filters, doctor/bed quota utilization bars, and quick suspend/reactivate modals.
    - `/tenants/new`: 4-step Tenant Provisioning Wizard (Facility profile, Subdomain slug preview, Plan & limits selection, Hospital Admin user creation).
    - `/tenants/[id]`: 360° Tenant Detail View with doctor/bed/storage progress bars, quota override modal, lifecycle status toggle, and data isolation verification.
    - `/plans`: Subscription Plan Catalog with pricing cards, included limits, module tags, Create Custom Plan modal, and Edit Plan Limits modal.
    - `/subscriptions`: SaaS Subscriptions & MRR Billing Ledger with billing frequencies, renewal cycles, and contract standing.
    - `/telemetry`: Real-Time Infrastructure Cockpit with MongoDB ping latency gauge, connection pool counter, memory RSS/heap metrics, process uptime, and auto-refresh toggle (10s).
    - `/audit`: Platform Security Audit Trail with action filters, actor email search, and sanitized JSON payload inspector modal.
    - `/broadcasts`: System Maintenance & Incident Broadcaster with severity selector (`INFO`, `WARNING`, `CRITICAL`), audience targeting, and dismiss action.
- **Verification Gates & Test Suites**:
  - `apps/server/src/super-admin/super-admin.service.spec.ts`: 6/6 unit tests passed.
  - `apps/server/test/super-admin.e2e-spec.ts`: 13/13 E2E tests passed (RBAC access, tenant provisioning, lifecycle suspension/reactivation, quota overrides, telemetry ping, broadcasts, and Zero-PHI clinical isolation enforcement).
  - Server Unit Tests: 126/126 passed across 17 test files (`vitest run`).
  - Server E2E Tests: 32/32 passed across 5 test suites (`vitest run --config ./vitest.config.e2e.ts`).
  - Monorepo Typecheck: `pnpm typecheck` passed (0 errors across 8 projects).
  - Monorepo Linter: `pnpm lint` passed (0 errors, 0 warnings across all apps).
  - Monorepo Production Build: `pnpm build` passed (0 errors across all 4 applications and packages).

### Milestone: Complete HMS UI/UX Redesign & Role-Based Workspaces (COMPLETED)
- **Conceptual Identity & Hospital Domain Alignment**:
  - Removed all platform Super Admin identity references from `apps/hms-client`.
  - Established authenticated Hospital Administrator profile (`Rahul Sharma`, `Hospital Administrator`, `CityCare Hospital - Main Campus`).
  - Added facility context header switcher and sanitized persona names across all dashboards.
- **Eight Role-Based Workspaces**:
  - `Hospital Administrator Dashboard`: Implemented exact layout from reference design (Amber sun greeting, 6 KPI cards with sparklines, Today's OPD Flow tabs with patient roster, Live OPD Queue with highlighted Currently Serving callout, Department status bars, SVG Bed Occupancy gauge, Pending Tasks, Recent Activity feed, and MedCore quality banner).
  - `Doctor Clinical Cockpit`: Refined with active consultation callout (`A-021`), next patient queue peek (`A-022`), full schedule table, pending clinical tasks, and clinical quick actions.
  - `Receptionist OPD & Token Hub`: Live OPD token board, registration counters, and check-in / booking actions.
  - `Nurse Inpatient Care Station`: Inpatient bed acuity matrix, vitals due timers, and ward alert triggers.
  - `Pharmacy & Dispensary Center`: Dispensing queue, stock buffer warnings, and expiring batches watch.
  - `Laboratory Diagnostic Station`: Requisitions worksheet, equipment analyzer online status telemetry, and accessioning actions.
  - `Billing & Cashier Command`: Daily invoice register, cashier collections in `₹ INR`, payment method breakdown, and pending settlements.
  - `Store & Inventory Management`: Critical low stock items with deficit bars, reorder PO actions, expiring stock, and real-time movement stream.
- **Admin Workspace Preview Switcher**:
  - Added horizontal segmented workspace selector for `HOSPITAL_ADMIN` to test and preview all 8 healthcare workspaces seamlessly.
### Enterprise HMS Architecture: Domain Model, Scale & Operational Foundations (COMPLETED)
- **Domain Boundaries Decoupling**:
  - Decoupled Appointment vs Encounter vs OPD Queue workflows.
  - Upgraded `Encounter`: optional `appointmentId` (for walk-in and emergency visits), `encounterType` (`OPD`, `EMERGENCY`, `IPD`, `TELECONSULT`), `department`, and `startedAt`/`endedAt` timestamps.
- **Enterprise OPD Queue Engine (`apps/server/src/queue/`)**:
  - Implemented `Queue` and `QueueEntry` schemas with priority weights (`NORMAL`: 0, `URGENT`: 10, `EMERGENCY`: 50).
  - Explicit State Machine: `WAITING` -> `CALLED` -> `IN_CONSULTATION` -> `COMPLETED` / `SKIPPED`.
  - Concurrency-safe atomic dequeue (`callNextPatient`) via MongoDB atomic `findOneAndUpdate` with sort (`{ priorityWeight: -1, tokenNumber: 1 }`).
  - Zero duplicate patient claim race conditions guaranteed under concurrent clinician clicks.
- **High-Throughput Database Indexes & Scalability**:
  - Documented compound index matrix in `docs/DATABASE.md` ensuring 0 unindexed queries (`COLLSCAN`).
  - Designed Analytical Read Models: `daily_operational_census` and `daily_revenue_summaries` for pre-aggregated dashboard telemetry.
- **Redis Invariants & Degradation Safety**:
  - Documented exact Redis roles (rate limiting, temporary state, BullMQ queues, Pub/Sub events).
  - Enforced zero data loss invariant: Redis is strictly transient; core clinical records and concurrency safety operate directly on MongoDB Atlas.
- **Verification Gates**:
  - Server unit tests: 133/133 passing across 18 test files (including new `queue.service.spec.ts`).
  - Server E2E tests: 32/32 passing across 5 test suites.
  - Monorepo typecheck: 0 errors across all 8 workspace projects.
  - Monorepo lint: 0 warnings, 0 errors.
- **Live Browser Interactive Verification**:
  - **Super Admin SaaS Owner Panel (`http://localhost:3002`)**:
    - Login flow with demo autofill, TOTP validation fix (`totpCode` added to `LoginDto`), successful JWT issuance and session initialization.
    - `/dashboard`: ARR/MRR tickers, Active Tenants counter, MongoDB Atlas telemetry, active broadcasts ticker, recent platform audit stream.
    - `/tenants`: Real-time tenant search, status filters (`ACTIVE`, `TRIAL`, `SUSPENDED`), tier filters, quota progress bars (Beds, Doctors, Storage), Quick action dropdowns.
    - `/tenants/new`: Multi-step hospital provisioning wizard (Hospital Profile, Subdomain, Subscription Tier, Admin Account credentials).
    - `/plans`: Subscription Plans catalog, "Create Custom Plan" CTA, Starter / Professional / Enterprise plan cards, Package Entitlements, Included Modules badges, Edit Plan modal with interactive inputs.
    - `/subscriptions`: Billing cycle ledger, revenue MRR metrics, gateway status badges.
    - `/telemetry`: Live MongoDB Atlas Telemetry Cockpit, ping latency gauge (38ms), active connection counter, memory allocation tracker, 10s auto-refresh toggle.
    - `/audit`: Platform Audit Trail, Search & Actor filters, Event type filters, IP address tracking, timestamped event log.
    - `/broadcasts`: System Broadcasts Center, New Broadcast CTA with modal dialog, audience targeting, severity indicators, dismiss action.
  - **HMS Sub-User Dashboards (`http://localhost:3000`)**:
    - **Hospital Admin**: 6 operational KPIs, Today's OPD Flow with live filter tabs, Live OPD Queue token board with "Currently Serving" callout card (`A-021` Rahul Kumar), Bed Occupancy circular donut gauge (80%), Pending Tasks checklist, Recent Activity stream.
    - **Doctor Clinical Workspace**: Full EMR Board CTA, 4 clinical KPI cards, Current Patient callout (`A-021` Rahul Kumar, Chest Pain, MRN PAT-2026-000104) with "Start Consultation" CTA, Next Patient (`A-022` Priya Mehta), Today's Schedule Live Queue table with Open EMR links, Pending Clinical Items (Lab results, Follow-ups, SOAP documentation).
    - **OPD Reception & Queue Hub**: Quick action buttons (`+ Register Patient`, `Book Appointment`, `Check In`, `Search Patient`), Live OPD Token board (`A-021` through `A-025`), Today's registration summary, Recent registrations ledger.
    - **Inpatient Ward Station**: Ward Management CTA, 4 ward KPIs, Ward A Assigned Patients table (Bed `A-101`, Patient condition, Vitals schedule, Chart CTA), Recent urgent alerts (High BP alert, Doctor review requested), Nurse Quick Actions (`Record Vitals`, `Update Nursing Note`, `View Patient Chart`).
    - **Pharmacy & Dispensary Center**: `+ Dispense e-Rx` CTA, 4 pharmacy metrics, Pending Prescriptions queue table with direct `Dispense` action, Stock Warnings (Paracetamol, Amoxicillin), Expiring pharmaceuticals tracker with countdowns.
    - **Laboratory Diagnostic Station**: `+ New Requisition` CTA, 4 lab counters, Recent Lab Orders worksheet, Lab Quick Actions (`Enter Test Result`, `Upload Pathology Report`, `Mark Specimen Collected`, `Print Barcode Labels`), Equipment Telemetry status for automated analyzers (Sysmex, Cobas).
    - **Billing & Cashier Command**: `+ Create Invoice` CTA, 4 billing KPIs, Amount Collected in `₹ INR`, Recent Invoices register (`INV-2026-00001`, `INV-2026-00002`), Payment Methods breakdown (Cash, UPI QR, Debit/Credit Card, TPA/Insurance), Pending settlements ledger with `Receive ->` action.
    - **Store & Inventory Management**: `+ Add Stock / GRN` CTA, 4 inventory KPIs, Critical Low Stock table with deficit levels and `Reorder PO` CTAs, Store Quick Actions (`Add Stock (GRN Receipt)`, `Create Purchase Order`, `Physical Audit Adjustment`, `Manage Approved Suppliers`), Recent stock movements audit trail.

### Phase 1: Complete Enterprise Hospital Foundation (COMPLETED)
- **Workforce & Employee Management (`apps/server/src/workforce/`)**:
  - Decoupled `Employee` institutional records from `User` authentication credentials.
  - Auto-generated sequential employee numbering (`EMP-YYYY-NNNN`).
  - Staff categories (`DOCTOR`, `NURSE`, `PHARMACIST`, `LAB_TECHNICIAN`, `RECEPTIONIST`, `ACCOUNTANT`, `INVENTORY_MANAGER`, `ADMIN_STAFF`, etc.) and lifecycle employment states (`ACTIVE`, `PROBATION`, `ON_LEAVE`, `TERMINATED`).
  - Optional account linkage (`/api/v1/workforce/employees/:id/link-user`) enabling digital login when workstation access is provisioned.
- **Shift Scheduling & Overnight Rollover Engine**:
  - Flexible shift configuration (`MORNING`, `EVENING`, `NIGHT`, `ROTATING`, `ON_CALL`).
  - Automated `isOvernight` calculation when shift spans midnight (`startHour > endHour`).
  - Weekly recurring days assignment (`[0, 1, 2, 3, 4, 5, 6]`).
- **Attendance & Punctuality Engine**:
  - Real-time check-in/out with automated late detection (>15 minutes past scheduled start).
  - Punctuality metrics tracking `lateMinutes` and `earlyDepartureMinutes`.
  - Auditable attendance correction requests with two-person review workflow (`PENDING`, `APPROVED`, `REJECTED`).
- **Leave Management & Automated Attendance Sync**:
  - Multi-day leave requests across statutory categories (`CASUAL`, `SICK`, `EARNED`, `MATERNITY`, `PATERNITY`, `UNPAID`).
  - On administrative approval, dates within the leave period automatically synchronize as `ON_LEAVE` on the daily attendance ledger.
- **Organization Hierarchy & Onboarding State Machine (`apps/server/src/organization/`)**:
  - Departments (`departments`) and Sub-teams (`teams`) with leader attribution.
  - Automatic seeding of 12 standard clinical and operational departments (`OPD`, `EMERGENCY`, `CARDIO`, `ORTHO`, `PED`, `GYN`, `ICU`, `GENERAL_SURGERY`, `LAB`, `PHARMACY`, `RADIOLOGY`, `BILLING`) upon first access.
  - 8-step `HospitalOnboarding` state machine tracking institutional setup progress.
- **Dynamic Workspace Resolution Engine (`apps/server/src/workspaces/`)**:
  - Standard catalog of 9 workspace templates (`HOSPITAL_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `NURSE`, `PHARMACIST`, `LAB_TECHNICIAN`, `ACCOUNTANT`, `INVENTORY_MANAGER`, `DEPARTMENT_MANAGER`).
  - Contextual resolution service (`resolveUserWorkspaces`) returning tailored navigation, actions, and resource scopes based on user roles and staff profile.
- **Asynchronous Bulk Inventory Migration Pipeline (`apps/server/src/inventory-migration/`)**:
  - 4-stage pipeline for migrating 10,000–50,000 legacy records:
    1. **Upload**: RFC 4180 compliant CSV ingestion and job initialization (`inventory_import_jobs`).
    2. **Mapping**: Intelligent column header alias matching (`brandName`, `genericName`, `batchNumber`, `expiryDate`, `quantity`, `unitPrice`).
    3. **Validation**: Batch validation with granular per-row error reporting (`validationErrors`).
    4. **Execution**: One-click chunked execution creating `Medicine` records, `MedicineBatch` tracking, and immutable `StockMovementType.OPENING_BALANCE` ledger entries.
- **Clinical Tasks & Enterprise Notifications (`apps/server/src/communication/`)**:
  - Multi-context task engine linking tasks directly to `PATIENT`, `ENCOUNTER`, `WARD`, or `INVENTORY`.
  - Threaded task comments and priority tagging (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
  - Real-time internal staff notifications (`TASK_ASSIGNED`, `LAB_CRITICAL`, `INVENTORY_ALERT`, etc.) with unread counters.
- **Hospital Administrative Workstation UI (`apps/hms-client`)**:
  - `/employees`: Comprehensive Employee Directory with multi-section provisioning modal (Personal, Employment, Login Account & Workspaces), department/status filtering, and employee profile inspector.
  - `/users`: User Accounts & Access Control Hub with "+ Invite Staff User" modal generating sovereign temporary credentials with one-click copy, "Edit Access" modal, and account active/inactive state toggling.
  - `/roles`: Roles Management Hub with System vs Custom badges, privilege counts, "+ Create Custom Role" modal with domain-grouped permissions picker, and interactive privilege modification.
  - `/permissions`: Permissions Explorer indexing all platform security privileges grouped by domain (`USERS`, `EMR`, `BILLING`, `WORKFORCE`, etc.) with search, domain filtering, and tenant-protection telemetry.
  - `/workspaces`: Workspaces Catalog displaying all 9 pre-configured operational workspaces (`HOSPITAL_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `NURSE`, `PHARMACIST`, `LAB_TECHNICIAN`, `ACCOUNTANT`, `INVENTORY_MANAGER`, `DEPARTMENT_MANAGER`) with inspection drawer and one-click workspace activation.
  - `/workspace-assignments`: Workspace Authorization Matrix displaying staff members, assigned operational scopes (`HOSPITAL_WIDE`, `DEPARTMENT_ONLY`, etc.), authorized workspaces, and "+ Modify Workspaces" assignment dialog.
  - `Dynamic Workspace Engine`: Real-time `WorkspaceContext` and `WorkspaceSelector` in the top header, dynamically reconfiguring the primary navigation sidebar based on the user's active workstation.
  - `/staff`: Transformed into a 4-tab Workforce Command Hub (Staff Directory with filters/modal, Shift Rosters with overnight tags, Daily Attendance with live check-in and punctuality stats, and Leave Management with approval actions).
  - `/departments`: Transformed into an Organization Command Center with live Department cards, Sub-teams grid, Create Department/Team modals, and 8-step Onboarding progress bar.
  - `/inventory/import`: Comprehensive 4-stage Bulk Migration Center with drag-and-drop CSV upload, column auto-mapping, validation error summary, and one-click execution button.
  - `/inventory`: Quick action banner directly linking to Bulk Catalog Import.
- **Verification Gates & Monorepo Validation**:
  - 149 server unit tests passed across 23 test suites (`vitest run`).
  - Monorepo typecheck passed with 0 errors across 8 workspace packages (`pnpm typecheck`).
  - Monorepo linter passed with 0 errors and 0 warnings (`pnpm lint`).
  - Monorepo production build passed with 0 errors across all 4 applications and packages (`pnpm build`).

---

## MILESTONES INDEX

- [x] Milestone 0: Foundation & Monorepo Setup
- [x] Milestone 1: Multi-Tenancy & Auth
- [x] Milestone 2: Hospital & Core Setup
- [x] Milestone 3: Patient Management
- [x] Milestone 4: Appointments & OPD Queue
- [x] Milestone 5: Doctor Consultation & EMR
- [x] Milestone 6: IPD & Bed Management
- [x] Milestone 7: Laboratory & Diagnostics
- [x] Milestone 8: Pharmacy & Dispensing
- [x] Milestone 9: Inventory, Stock & Procurement
- [x] Milestone 10: Billing, Invoicing & Payments
- [x] Milestone 11: Reports, Analytics & Operational Census
- [x] Milestone 12: Production Hardening, Security & Disaster Recovery
- [x] Milestone 13: SaaS Platform Owner Console & Super Admin Control Plane
- [ ] Milestone 14: Patient Discovery Platform (patient-app)
- [ ] Milestone 15: Phase 2 AI Intelligence & Copilots
- [ ] Milestone 16: Windows Desktop Electron Packaging
