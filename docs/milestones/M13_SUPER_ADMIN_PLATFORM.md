# Milestone 13 — SaaS Platform Owner Console & Super Admin Control Plane

## Objective
Establish the authoritative administrative, operational, and commercial control plane for the SaaS Platform Owner (`apps/super-admin/` and backend `/api/v1/super-admin/*`), enabling end-to-end tenant provisioning, tier and pricing plan governance, subscription lifecycle enforcement, emergency quota overrides, platform-wide infrastructure telemetry, and maintenance broadcasting—with cryptographic Zero-PHI isolation from hospital clinical records conforming to `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/SAAS.md`, and `docs/SECURITY.md`.

---

## Scope

### 1. Backend Platform Control Plane API (`apps/server/src/super-admin/`)
- **Module Architecture**: `SuperAdminModule`, `SuperAdminController`, and `SuperAdminService`.
- **Platform Control Plane Route Namespace**: All routes strictly hosted under `/api/v1/super-admin/*`.
- **Core Endpoints**:
  - `POST /api/v1/super-admin/auth/login`: Two-factor verified Super Admin authentication issuing JWT with `surface: 'SUPER_ADMIN'`, role `SUPER_ADMIN`, and `tenantId: null`.
  - `GET /api/v1/super-admin/tenants`: Paginated tenant registry with status, tier, active user counts, and filter options.
  - `POST /api/v1/super-admin/tenants`: Tenant provisioning engine creating `Tenant`, initial `Hospital`, and initial `HOSPITAL_ADMIN` user in a single atomic transaction.
  - `GET /api/v1/super-admin/tenants/:id`: Detailed tenant profile including subscription tier, feature flags, license quota usage, and custom domains.
  - `PATCH /api/v1/super-admin/tenants/:id/status`: Tenant lifecycle transition engine (`TRIAL`, `ACTIVE`, `SUSPENDED`, `OFFBOARDED`).
  - `PATCH /api/v1/super-admin/tenants/:id/quotas`: Administrative quota burst override (`maxDoctors`, `maxBeds`, `maxStorageGb`) with custom expiry.
  - `GET /api/v1/super-admin/plans`: Global subscription plan catalog query.
  - `POST /api/v1/super-admin/plans` & `PATCH /api/v1/super-admin/plans/:id`: Plan authoring and tier management (`STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`).
  - `GET /api/v1/super-admin/subscriptions`: Multi-tenant subscription status, MRR metrics, billing ledger, and renewal tracking.
  - `GET /api/v1/super-admin/telemetry`: Platform-wide operational telemetry aggregating Atlas cluster ping, Redis memory, active connection pool, and request throughput.
  - `GET /api/v1/super-admin/audit`: Immutable platform audit trail of Super Admin administrative actions.
  - `POST /api/v1/super-admin/broadcasts`: Platform maintenance and incident alert announcement publisher.
- **RBAC & Architectural Guardrails**:
  - Gated by `@Roles('SUPER_ADMIN')` and granular `platform.*` permissions (`platform.tenants.manage`, `platform.plans.manage`, etc.).
  - **Zero-PHI Access Invariant**: Absolute prohibition on Super Admin access to clinical data (`/api/v1/patients`, `/api/v1/emr`, `/api/v1/prescriptions`, `/api/v1/lab`, `/api/v1/billing`). Any attempt returns `HTTP 403 Forbidden` (`TENANT_PHI_ACCESS_PROHIBITED`).

### 2. Frontend Application (`apps/super-admin/`)
- Dedicated Next.js 14 presentation layer styled with Tailwind CSS and `@hms/ui` components conforming to `docs/DESIGN.md`.
- **Application Views**:
  - `/login`: Secure authentication portal with email/password and TOTP 2FA code input.
  - `/dashboard`: Platform executive cockpit featuring MRR/ARR counters, active tenant cards, total registered clinicians, system uptime, and cluster health badges.
  - `/tenants`: Searchable, filterable tenant directory displaying status pills (`Active`, `Trial`, `Suspended`), subscription tier, and quick action menus.
  - `/tenants/new`: Multi-step tenant provisioning wizard:
    1. Organization & hospital profile (legal name, registration, contact).
    2. Subdomain & custom domain configuration (`[subdomain].hmsmedcore.com`).
    3. Subscription plan selection (`STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`).
    4. Hospital Administrator initial account seeding.
  - `/tenants/[id]`: 360-degree tenant operational view:
    - Organization overview & contact info.
    - Quota utilization bars (Doctors used/allowed, Beds used/allowed, Storage used/allowed).
    - Lifecycle action buttons (Suspend, Reactivate, Extend Trial).
    - Temporary quota override modal.
  - `/plans`: Pricing plan catalog manager displaying tier cards, feature matrix toggles, quota limit editors, and currency pricing (`₹ INR` / `$ USD`).
  - `/subscriptions`: Global billing overview, renewal calendar, failed payment alerts, and manual invoice adjustment triggers.
  - `/telemetry`: Real-time infrastructure monitoring dashboard showing database ping latency, active connection pool, memory RSS/heap, and API request volume.
  - `/audit`: Platform governance audit trail viewer with search, actor filtering, and sanitized JSON payload inspector.
  - `/broadcasts`: Maintenance announcement broadcaster with severity levels (`INFO`, `WARNING`, `CRITICAL`), target audience selection, and expiry timers.

---

## Out of Scope
- Direct access to patient medical charts, clinical encounter notes, prescriptions, or laboratory diagnostic results (Strict Zero-PHI Boundary).
- Hospital-internal staffing rosters, departmental shift planning, or clinical inventory (handled inside `apps/hms-client`).
- Consumer patient self-service appointment scheduling (handled inside `apps/patient-app`).
- Clinical AI copilots or clinical decision support (deferred to Phase 2).

---

## Prerequisites
- Milestones 0 through 12 fully implemented, verified, and passing all security and tenant isolation test suites.
- Authoritative documentation updated and aligned across PRD, Architecture, SaaS, Database, and Security specs.

---

## User Workflows

1. **Hospital Onboarding (Tenant Provisioning)**:
   - SaaS Owner logs into `apps/super-admin` with TOTP 2FA.
   - Navigates to `/tenants/new`, enters hospital legal details ("Apollo City Hospital"), sets subdomain `apollo-city`, selects `GROWTH_HOSPITAL` tier, and assigns initial admin email (`admin@apollocity.com`).
   - System provisionally seeds the tenant, hospital, departments, and admin account; emits `TENANT_PROVISION` audit log; and sends welcome credentials.

2. **Commercial Tier Enforcement & Quota Override**:
   - Apollo City Hospital reaches their licensed 25-doctor ceiling and requests an emergency 5-seat burst for epidemic response.
   - SaaS Owner reviews request in `/tenants/[id]`, clicks "Apply Quota Override", sets `maxDoctors: 30` expiring in 30 days, and logs rationale.
   - Hospital can immediately register additional physicians without subscription upgrade friction.

3. **Delinquent Tenant Suspension & Reinstatement**:
   - A tenant exceeds the 14-day payment grace period.
   - SaaS Owner navigates to `/tenants/[id]`, clicks "Suspend Tenant", enters suspension reason ("Invoice #INV-2026-0042 overdue by 30 days").
   - Backend sets `tenant.status = 'SUSPENDED'`; all active staff tokens for that tenant are immediately invalidated in Redis.
   - Upon wire payment receipt, SaaS Owner clicks "Reactivate Tenant", restoring immediate clinical access.

4. **Global System Maintenance Broadcast**:
   - DevOps team schedules a database patch window.
   - SaaS Owner navigates to `/broadcasts`, composes message: "Scheduled maintenance in 2 hours. System will operate in read-only mode for 15 minutes", selects severity `WARNING`, and clicks "Publish Broadcast".
   - Active clinical workstations across all hospital tenants display a non-intrusive warning banner.

---

## Frontend Requirements (`apps/super-admin/`)

- **Design System & Shell**:
  - Reuses `@hms/ui` button, card, dialog, badge, table, and form primitives.
  - Distinctive SaaS Control Plane visual identity: Deep slate/zinc dark aesthetic with emerald accents for healthy systems and amber/rose alerts.
- **Key Components**:
  - `SuperAdminAppShell`: Navigation header, platform breadcrumbs, cluster health pill, and user profile with sign-out.
  - `TenantCard` & `TenantTable`: Visual representation of tenant operational status with one-click actions.
  - `QuotaUsageBar`: Progress bar displaying resource usage vs. licensed plan threshold with warning state at >90%.
  - `PlanEditorModal`: Form to adjust tier limits, prices, and enabled clinical modules.
  - `BroadcastBannerEditor`: Form to compose and schedule global system alerts.

---

## Backend Requirements (`apps/server/src/super-admin/`)

- **Service Layer (`SuperAdminService`)**:
  - `provisionTenant(dto)`: Atomic multi-collection transaction creating Tenant, Hospital, Admin User, and Subscription.
  - `updateTenantStatus(tenantId, status, reason)`: Modifies tenant status and revokes Redis session tokens for suspended tenants.
  - `applyQuotaOverride(tenantId, overrides)`: Updates subscription limits override with expiration timestamp.
  - `getPlatformTelemetry()`: Gathers live Mongoose connection metrics, Redis memory, and system resource stats.
- **Guards & Interceptors**:
  - `SuperAdminGuard`: Asserts `req.user.role === 'SUPER_ADMIN'` and `req.user.tenantId === null`.
  - `ZeroPhiGuard`: Intercepts and denies any Super Admin request attempting to access clinical endpoints with `403 Forbidden`.

---

## Verification & Testing Plan

1. **Unit Tests (`apps/server/src/super-admin/super-admin.service.spec.ts`)**:
   - Test atomic tenant provisioning and transaction rollback on failure.
   - Test lifecycle state transitions (`ACTIVE` -> `SUSPENDED` -> `ACTIVE`).
   - Test quota override calculation and expiry validation.
   - Test platform telemetry aggregation.
2. **End-to-End Test Suite (`test/super-admin.e2e-spec.ts`)**:
   - Super Admin authentication with TOTP validation.
   - Provisioning flow creating tenant, hospital, and admin user.
   - Quota enforcement rejecting doctor creation beyond licensed tier limits.
   - Suspension flow verifying immediate 403 rejection for suspended tenant staff.
   - **Zero-PHI Boundary Test**: Verify that calling `GET /api/v1/patients` with a Super Admin token strictly returns `403 Forbidden`.
3. **Monorepo Quality Gates**:
   - `pnpm typecheck` across all 8 packages/apps with zero errors.
   - `pnpm lint` with zero errors and zero warnings.
   - `pnpm --filter @hms/super-admin build` passing with zero errors.
