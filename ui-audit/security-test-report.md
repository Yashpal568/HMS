# HMS Security & Authorization Audit Report

## 1. Security Architecture Summary
The HMS MedCore platform implements a **Zero-Trust Multi-Tenant Architecture** hosted on MongoDB Atlas with NestJS security guards and Next.js frontend applications.

Priority Hierarchy:
```text
Tenant Isolation > Security > Architecture > Database Integrity > PRD > Design System > Convenience
```

---

## 2. Non-Destructive Authorization Test Results

### Restricted Role: `PHARMACIST` (`pharmacy.staff@hms.local`)
We evaluated the enforcement boundary when a non-administrative hospital staff member attempts to directly access privileged administrative interfaces.

| Target Route | Target Privilege | Frontend Behavior | Backend API Invocation | Backend HTTP Status | Security Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/users` | `users.manage` | Page layout rendered; table empty | `GET /api/v1/users` | **403 Forbidden** | **CONFIRMED SECURE (API Guard Enforced)** |
| `/roles` | `roles.manage` | Page layout rendered; table empty | `GET /api/v1/roles` | **403 Forbidden** | **CONFIRMED SECURE (API Guard Enforced)** |
| `/permissions`| `permissions.read` | Page layout rendered; table empty | `GET /api/v1/roles/permissions` | **403 Forbidden** | **CONFIRMED SECURE (API Guard Enforced)** |
| `/workspaces` | `workspaces.read` | Page layout rendered; catalog empty | `GET /api/v1/workspaces` | **403 Forbidden** | **CONFIRMED SECURE (API Guard Enforced)** |
| `/workspace-assignments` | `workspaces.manage` | Page layout rendered; matrix empty | `GET /api/v1/workspaces/assignments` | **403 Forbidden** | **CONFIRMED SECURE (API Guard Enforced)** |
| `/audit` | `audit.read` | Page layout rendered; ledger empty | `GET /api/v1/audit` | **403 Forbidden** | **CONFIRMED SECURE (API Guard Enforced)** |

**Security Finding**: The backend strictly rejects unauthorized data access requests with **HTTP 403 Forbidden**, ensuring complete data protection. The frontend presents an empty shell instead of bouncing the user to `/dashboard`. Recommended remediation documented in Issue **SEC-001**.

---

## 3. Tenant Isolation Analysis
1. **Tenant Derivation**: The backend strictly derives `tenantId` from the verified JWT payload (`req.user.tenantId`).
2. **Anti-IDOR Protection**: Entity queries (appointments, patients, lab orders, invoices) enforce compound queries scoped by `{ _id, tenantId }`. Queries against non-existent or other-tenant IDs return uniform **404 Not Found**, preventing cross-hospital enumeration.
3. **No Unscoped Queries**: Monorepo linting and architectural invariants forbid unscoped tenant collection queries.

---

## 4. Zero-PHI Technical Invariant
1. Platform Super Admin credentials (`platform@hmsmedcore.com`, `tenantId: null`) operate strictly within the SaaS Control Plane (`apps/super-admin`).
2. Super Admin tokens attempting to call hospital clinical endpoints (`/patients`, `/emr`, `/ipd`, `/lab`, `/pharmacy`, `/billing`) are permanently blocked at the guard layer with **403 Forbidden** (`TENANT_PHI_ACCESS_PROHIBITED`).
3. No Protected Health Information (PHI) is exposed to the platform vendor or platform administrators.

---

## 5. HTTP Security Headers
The following production security headers were verified on the running application:
- `Content-Security-Policy`: Strict script-src and default-src directives.
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`.
- `X-Frame-Options`: `DENY` (prevents clickjacking attacks).
- `X-Content-Type-Options`: `nosniff` (prevents MIME confusion).
- `Cache-Control`: `no-store, no-cache, must-revalidate, proxy-revalidate` on sensitive healthcare endpoints.
