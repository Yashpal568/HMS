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
│ STARTER_CLINIC   │ Small outpatient│ • Max 3 Doctors    │ • OPD             │
│                  │ clinics & single│ • Max 10 Staff     │ • Appointments    │
│                  │ practices       │ • 0 Inpatient Beds │ • EMR Prescriptive│
│                  │                 │ • 10 GB Storage    │ • Simple Billing  │
├──────────────────┼─────────────────┼────────────────────┼───────────────────┤
│ GROWTH_HOSPITAL  │ Mid-sized acute │ • Max 20 Doctors   │ • All Starter +   │
│                  │ care & specialty│ • Max 75 Staff     │ • IPD & Beds      │
│                  │ hospitals       │ • Max 50 Beds      │ • Pharmacy        │
│                  │                 │ • 100 GB Storage   │ • Laboratory (LIS)│
├──────────────────┼─────────────────┼────────────────────┼───────────────────┤
│ ENTERPRISE_      │ Large medical   │ • Unlimited Doctors│ • All Modules     │
│ NETWORK          │ centers & multi-│ • Unlimited Staff  │ • Inventory / PO  │
│                  │ campus networks │ • 500+ Beds        │ • Multi-Branch    │
│                  │                 │ • 1 TB+ Storage    │ • Advanced Reports│
│                  │                 │                    │ • Phase 2 AI Ready│
└──────────────────┴─────────────────┴────────────────────┴───────────────────┘
```

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

The SaaS platform owner manages the multi-tenant ecosystem via `apps/super-admin/`:
- **Tenant Provisioning**: Wizard to register hospital legal name, slug, administrator email, and provision initial database seed.
- **Subscription Management**: Modify billing cycles, upgrade/downgrade tiers, apply promotional extensions.
- **Platform Telemetry**: Aggregate active hospital count, daily consultations, database storage utilization.
- **Cross-Tenant Isolation Invariant**: Platform operators monitor platform metrics; however, private patient medical histories and doctor notes remain strictly shielded from platform admin inspection.
