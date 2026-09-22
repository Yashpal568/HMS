# Hospital Management System — SaaS & Multi-Tenancy Architecture

**SOURCE-OF-TRUTH OWNER**: `docs/SAAS.md` (SAAS BUSINESS MODEL)  
**Classification**: Authoritative  
**Product**: Multi-Tenant Hospital Management SaaS  
**Scope**: Commercial Tiers, Subscription Lifecycles, Quota Enforcement, Feature Flags  
**Control Plane**: `apps/super-admin/`  
**Status**: Authoritative SaaS Specification  

---

## 1. Tenancy Model & Domain Hierarchy

The system operates as a sovereign multi-tenant Software-as-a-Service platform. Every healthcare organization, hospital network, or standalone clinic is an isolated **Tenant**:

```text
┌──────────────────────────────────────────────────────────┐
│                 PLATFORM (SaaS Provider)                 │
│                 Managed via apps/super-admin             │
└────────────────────────────┬─────────────────────────────┘
                             │ Governs & provisions
                             ▼
┌──────────────────────────────────────────────────────────┐
│             TENANT / HOSPITAL ORGANIZATION               │
│             Unique Tenant Slug & MongoDB Tenant ID       │
└──────────────┬─────────────────────────────┬─────────────┘
               │ 1:N                         │ 1:N
               ▼                             ▼
┌──────────────────────────────┐ ┌─────────────────────────┐
│     HOSPITAL BRANCHES        │ │   STAFF USERS & ROLES   │
│  Campuses, physical clinics  │ │  Admins, Doctors, Nurses│
└──────────────┬───────────────┘ └─────────────────────────┘
               │ 1:N
               ▼
┌──────────────────────────────────────────────────────────┐
│                PATIENTS, CLINICAL & BILLING              │
│  Isolated strictly within the tenant's data boundary     │
└──────────────────────────────────────────────────────────┘
```

> [!CRITICAL]
> **Tenant Isolation Invariant**:
> Tenant A can never query, observe, modify, or infer the existence of Tenant B's clinical, demographic, or financial records. All queries against tenant-owned collections MUST be scoped with `{ tenantId: user.tenantId }`.

---

## 2. Commercial Subscription Tiers

Subscriptions bind a tenant to a commercial package with predefined entitlements and quotas:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMMERCIAL PLAN MATRIX                            │
├──────────────────┬─────────────────┬────────────────────┬───────────────────┤
│ PLAN CODE        │ TARGET CLIENT   │ RESOURCE LIMITS    │ INCLUDED MODULES  │
├──────────────────┼─────────────────┼────────────────────┼───────────────────┤
│ FREE_TRIAL       │ Evaluation for  │ • Max 2 Doctors    │ • OPD             │
│                  │ prospective     │ • Max 5 Staff      │ • Appointments    │
│                  │ hospital clients│ • Max 5 Beds       │ • EMR Prescriptive│
│                  │ (14 Days)       │ • 5 GB Storage     │ • Simple Billing  │
├──────────────────┼─────────────────┼────────────────────┼───────────────────┤
│ STARTER_CLINIC   │ Small outpatient│ • Max 3 Doctors    │ • OPD             │
│                  │ clinics & single│ • Max 10 Staff     │ • Appointments    │
│                  │ practices       │ • 0 Inpatient Beds │ • EMR Prescriptive│
│                  │ (₹4,999 / mo)   │ • 15 GB Storage    │ • Simple Billing  │
├──────────────────┼─────────────────┼────────────────────┼───────────────────┤
│ GROWTH_HOSPITAL  │ Mid-sized acute │ • Max 20 Doctors   │ • All Starter +   │
│                  │ care & specialty│ • Max 75 Staff     │ • IPD & Beds      │
│                  │ hospitals       │ • Max 50 Beds      │ • Pharmacy        │
│                  │ (₹19,999 / mo)  │ • 150 GB Storage   │ • Laboratory (LIS)│
├──────────────────┼─────────────────┼────────────────────┼───────────────────┤
│ ENTERPRISE_      │ Large medical   │ • Unlimited Doctors│ • All Modules     │
│ NETWORK          │ centers & multi-│ • Unlimited Staff  │ • Inventory / PO  │
│                  │ campus networks │ • 500+ Beds        │ • Multi-Branch    │
│                  │ (Custom Quote)  │ • 1 TB+ Storage    │ • Advanced Reports│
│                  │                 │                    │ • Phase 2 AI Ready│
└──────────────────┴─────────────────┴────────────────────┴───────────────────┘
```

### The Global Plan Catalog Entity (`plans` Collection)
Plans are managed centrally by the Platform Super Admin and instantiated as immutable tier definitions:
- `code`: Unique machine identifier (`FREE_TRIAL`, `STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`).
- `name`: Display title (e.g. "Growth Hospital Plan").
- `description`: Commercial description and feature highlights.
- `tier`: Classification hierarchy (`TRIAL`, `STANDARD`, `PREMIUM`, `ENTERPRISE`).
- `pricing`: `{ monthlyPrice: number, annualPrice: number, currency: 'INR' | 'USD' }`.
- `limits`: `{ maxDoctors: number, maxStaff: number, maxBeds: number, maxStorageGb: number }`.
- `includedModules`: Array of enabled modules (`['opd', 'emr', 'ipd', 'pharmacy', 'lab', 'inventory', 'billing', 'reports']`).
- `isActive`: Boolean toggle controlling availability in registration wizards.

---

## 3. Subscription Lifecycle State Machine

A tenant's operational capabilities in `apps/hms-client` are governed by their subscription state:

```text
               ┌──────────┐
               │  TRIAL   │  (Evaluation period, e.g. 14 days)
               └────┬─────┘
                    │ Payment / Upgrade
                    ▼
 ┌──────────┐   ┌──────────┐   Payment Failure    ┌──────────┐
 │ CANCELLED│◄──┤  ACTIVE  ├─────────────────────►│ PAST_DUE │ (7-day grace period)
 └──────────┘   └────┬─────┘                      └────┬─────┘
                     │ Compliance / Policy Lockout     │ Grace Period Elapsed
                     ▼                                 ▼
               ┌──────────┐                      ┌──────────┐
               │ SUSPENDED│◄─────────────────────┤ EXPIRED  │
               └──────────┘                      └──────────┘
```

### Lifecycle State Policies:
- **`TRIAL`**: Full access to configured tier features for evaluation. Shows trial expiration countdown banner.
- **`ACTIVE`**: Regular paid operational status.
- **`PAST_DUE`**: Billing attempt failed. The hospital maintains clinical access, but Hospital Admins receive prominent payment warning notices.
- **`SUSPENDED`**: Administrative lockout triggered by platform operators. Hospital staff cannot create or mutate records.
- **`CANCELLED`**: Hospital requested contract termination. Operates until the end of the prepaid billing cycle.
- **`EXPIRED`**: Evaluation or grace period ended without renewal. Read-only archive access to prevent clinical data abandonment.

---

## 4. Quota Enforcement Architecture

Quotas are enforced programmatically at the service layer prior to record creation:

```typescript
// Example: Enforcing Doctor Quota
async createDoctor(tenantId: string, dto: CreateDoctorDto): Promise<DoctorDocument> {
  const subscription = await this.subscriptionService.getTenantSubscription(tenantId);
  const currentDoctorCount = await this.doctorModel.countDocuments({ tenantId });

  if (currentDoctorCount >= subscription.limits.maxDoctors) {
    throw new ForbiddenException(
      `Doctor seat limit (${subscription.limits.maxDoctors}) reached for plan "${subscription.planCode}". Upgrade plan in Super Admin.`
    );
  }

  // Proceed with creation...
}
```

### Monitored Quotas:
1. **Physician Seats (`maxDoctors`)**: Total active doctor accounts assigned to the hospital.
2. **Staff Accounts (`maxStaff`)**: Total nursing, administrative, and clinical staff.
3. **Inpatient Capacity (`maxBeds`)**: Total physical beds registered in the IPD ward manager.
4. **Cloud Document Storage (`maxStorageGb`)**: Total cumulative size of uploaded medical scans and reports.

---

## 5. Dynamic Feature Flags

Feature flags provide granular module toggles without redeploying backend code:
- **Global Toggles**: Disable a feature platform-wide (e.g. during emergency maintenance).
- **Tenant Overrides**: Enable a beta module (e.g. `ai_documentation_copilot`) for an Enterprise pilot hospital before general release.
- **Module Guards**: Route guards inspect both subscription entitlements and active feature flags before allowing API execution.

---

## 6. SaaS Super Admin Control Plane (`apps/super-admin/`)

The SaaS platform owner, operations engineers, and commercial account managers govern the global multi-tenant ecosystem via `apps/super-admin/`:

### 6.1. Tenant Provisioning Protocol & Database Lifecycle
When onboarding a new hospital client, the Super Admin console initiates a transactional provisioning workflow:
1. **Tenant Registration**: Captures hospital organization name, legal registration number, tax identifiers (GST/VAT), primary contact, assigned subdomain/slug (`https://{slug}.hmsmedcore.com`), and selected plan.
2. **Initial Database Seeding**:
   - Creates the sovereign `tenants` record.
   - Instantiates the initial root `hospitals` facility branch (`isPrimaryBranch: true`).
   - Creates the initial `users` record with role `HOSPITAL_ADMIN` and status `ACTIVE`, dispatching an encrypted cryptographic password creation invite link.
   - Seeds standard service tariff catalog (`services`) and standard diagnostic tests (`lab_tests`) for the new tenant.
   - Creates the initial `subscriptions` record bound to the selected plan.
3. **Audit Log Emission**: Emits a `TENANT_PROVISION` event to the platform-tier audit ledger.

### 6.2. Tenant Lifecycle Governance & Lockout Mechanics
The control plane governs operational access across tenant lifecycle stages:
- **Activation**: Enables full operational status (`status: 'ACTIVE'`).
- **Administrative Suspension**: Immediate platform-level lockout with mandatory reason logging (`TENANT_SUSPEND`). The backend interceptor blocks all write requests from staff belonging to suspended tenants with `403 Forbidden ("Hospital tenant is suspended. Contact SaaS support.")`.
- **Reinstatement**: Restores operational capabilities (`TENANT_REINSTATE`).
- **Offboarding / Deletion Guard**: Permanent deletion requires dual-authorization and a 30-day pending purge window to protect clinical record continuity.

### 6.3. Commercial Plan Management & Custom Enterprise Contracts
- Author, edit, and publish plans in the `plans` catalog.
- Support custom negotiated enterprise terms (e.g. customized seat limits, private storage pools, multi-branch add-ons).
- Toggle module availability per plan tier.

### 6.4. Quota Burst & Temporary Resource Overrides
- When hospitals experience seasonal emergencies or epidemic surges, Super Admins can grant temporary quota bursts (e.g. extra bed capacity or temporary doctor seats) via an administrative override recorded in `subscriptions.limitsOverride`.
- Burst allocations carry an expiration timestamp and reason code, automatically reverting to standard tier limits upon expiry.

### 6.5. Platform Operations Telemetry
- Real-time aggregation across all active hospitals:
  - Total active hospital tenants and active clinical seats.
  - Platform-wide daily appointments, consultations, and bed occupancy rates.
  - MongoDB Atlas cluster telemetry: latency ping, pool size, document count, and storage.
  - Redis queue health and background worker throughput.
  - Global rate limiter breach and intrusion attempt logs.

### 6.6. Global System Broadcasts & Maintenance Windows
- Publish platform maintenance banners displayed to all active `apps/hms-client` sessions.
- Trigger global maintenance mode, allowing read-only access while database migrations execute.

### 6.7. The Strict Zero-PHI Invariant & Regulatory Compliance
- **Zero Access to Patient Clinical Data**: Platform Super Admins are strictly barred from accessing individual patient records, clinical consultation notes, prescriptions, laboratory reports, or diagnostic images.
- **Architectural Enforcement**: No API route under `/api/v1/super-admin/*` queries or returns patient PHI. Any attempt by a Super Admin token to call tenant-level clinical endpoints returns `403 Forbidden`.
- **Regulatory Alignment**: Guarantees HIPAA, GDPR, and Indian Digital Personal Data Protection (DPDP) compliance by maintaining a permanent, unbridgeable barrier between platform infrastructure operations and sensitive clinical healthcare data.
