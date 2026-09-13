# Hospital Management System — API Specification & Conventions

**Protocol**: REST over HTTPS/TLS  
**Architecture**: Multi-Tenant SaaS API  
**Base URL**: `http://localhost:3001/api/v1` (Development) / `https://api.hms.health/api/v1` (Production)  
**Status**: Authoritative API Specification  

---

## 1. Multi-Tenant Architectural Standards & Conventions

### 1.1 Tenant Context Resolution
- **Zero Client Trust**: The API **never** accepts `tenantId` in request bodies, query strings, or unverified custom headers (`x-tenant-id`).
- **Authoritative JWT Extraction**: Upon authentication, the client receives a signed JWT containing claims `{ sub: userId, tenantId: string, role: string }`.
- **Request Context Binding**: For every authenticated endpoint, `TenantContextInterceptor` extracts `tenantId` from the verified token and attaches it to `req.user.tenantId`. All downstream services receive this verified identifier.

### 1.2 Tenant-Scoped Query Conventions
- **List / Search Endpoints**: Queries automatically apply `{ tenantId: req.user.tenantId }` as a mandatory database filter. Records belonging to other tenants are never returned or counted in pagination metadata.
- **Detail / Mutation Endpoints**: When accessing a resource by ID (`GET/PATCH/DELETE /api/v1/patients/:id`), the query enforces `{ _id: id, tenantId: req.user.tenantId }`.
- **Existence Masking**: If a resource ID exists in MongoDB Atlas but belongs to another hospital tenant, the API returns **`404 Not Found`** (identical to a non-existent ID) to prevent cross-tenant record enumeration.

### 1.3 Uniform Response Envelopes

#### Standard Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 105,
    "totalPages": 6
  }
}
```

#### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "requestId": "req-178912345"
  }
}
```

---

## 2. Existing Implemented APIs (Active in Repository)

The following endpoints are **currently implemented, tested, and active** in `apps/api`:

### System Health
- **`GET /api/v1/health`**
  - **Auth**: Public
  - **Description**: Application readiness probe reporting database connection state.
  - **Response**:
    ```json
    {
      "success": true,
      "status": "ok",
      "database": "connected"
    }
    ```

### Authentication & RBAC
- **`POST /api/v1/auth/login`**
  - **Auth**: Public
  - **Request**: `{ "email": "user@hms.local", "password": "SecurePassword" }`
  - **Response**: `{ "success": true, "user": { "id": "...", "email": "...", "role": "...", "hospitalId": "..." }, "accessToken": "..." }`
  - **Errors**: `401 Unauthorized` ("Invalid email or password", or "Account locked").
  - **Side Effect**: Issues JWT, sets HttpOnly `SameSite=lax` cookie, logs security audit event.
- **`POST /api/v1/auth/logout`**
  - **Auth**: Authenticated / Public
  - **Response**: `{ "success": true, "message": "Logged out successfully" }`
  - **Side Effect**: Clears session cookie, logs audit event.
- **`GET /api/v1/auth/me`**
  - **Auth**: Protected (`JwtAuthGuard`)
  - **Response**: `{ "success": true, "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "...", "permissions": [...], "hospitalId": "..." } }`
  - **Errors**: `401 Unauthorized`.
- **`GET /api/v1/auth/protected-test`**
  - **Auth**: Protected (`JwtAuthGuard` + `PermissionsGuard` with `users.read`)
  - **Response**: `{ "success": true, "message": "You have accessed a protected resource!" }`
  - **Errors**: `401 Unauthorized`, `403 Forbidden`.
- **`GET /api/v1/roles`**
  - **Auth**: Protected (`JwtAuthGuard` + `RolesGuard` with `super_admin`, `hospital_admin`)
  - **Response**: `{ "success": true, "roles": [...] }`
  - **Errors**: `401 Unauthorized`, `403 Forbidden`.

### Dashboard Telemetry
- **`GET /api/v1/dashboard`**
  - **Auth**: Protected (`JwtAuthGuard`)
  - **Description**: Returns live system status, registered staff counts, recent audit events, module readiness, and genuine empty state clinical placeholders.
  - **Response**:
    ```json
    {
      "success": true,
      "data": {
        "system": { "status": "operational", "database": "connected", "uptimeSeconds": 3600 },
        "authAndUsers": { "totalUsers": 1, "activeUsers": 1, "lockedUsers": 0, "roleBreakdown": { "SUPER_ADMIN": 1 } },
        "recentAuditActivity": [ ... ],
        "moduleReadiness": [ ... ],
        "clinicalOverview": {
          "todayAppointments": { "count": 0, "note": "OPD queue module scheduled for Milestone 04" },
          "activeAdmissions": { "count": 0, "note": "Inpatient module scheduled for Milestone 06" },
          "pendingLabOrders": { "count": 0, "note": "Laboratory module scheduled for Milestone 07" },
          "lowStockAlerts": { "count": 0, "note": "Pharmacy module scheduled for Milestone 08" },
          "pendingInvoices": { "count": 0, "note": "Billing module scheduled for Milestone 10" }
        }
      }
    }
    ```

---

## 3. Planned APIs (Scheduled by Milestone)

The following endpoints are **NOT YET IMPLEMENTED** and are scheduled for subsequent milestones. All tenant-owned endpoints will automatically enforce `{ tenantId: req.user.tenantId }`.

### Milestone 03 — Patient Management (Tenant-Scoped)
- `POST /api/v1/patients`: Register patient (`patients.create`). Automatically attaches `tenantId`.
- `GET /api/v1/patients`: List patients with query params `search`, `page`, `limit` (`patients.read`). Scoped to caller's `tenantId`.
- `GET /api/v1/patients/:id`: Retrieve patient profile by ObjectId or UHID (`patients.read`). Scoped to caller's `tenantId`.
- `PATCH /api/v1/patients/:id`: Update patient demographics (`patients.update`). Scoped to caller's `tenantId`.

### Milestone 04 — Appointments & OPD (Tenant-Scoped)
- `POST /api/v1/appointments`: Book outpatient appointment (`appointments.create`).
- `GET /api/v1/appointments`: List OPD queue for date/doctor (`appointments.read`).
- `GET /api/v1/appointments/slots`: Query available doctor time slots (`appointments.read`).
- `POST /api/v1/appointments/:id/check-in`: Mark patient arrival and issue token (`appointments.update`).
- `POST /api/v1/appointments/:id/cancel`: Cancel appointment (`appointments.cancel`).

### Milestone 05 — EMR & Clinical Consultation (Tenant-Scoped)
- `POST /api/v1/emr/encounters`: Initialize doctor consultation (`emr.create`).
- `GET /api/v1/emr/encounters/:id`: View clinical encounter record (`emr.read`).
- `PATCH /api/v1/emr/encounters/:id`: Save vitals, notes, and diagnoses (`emr.update`).
- `POST /api/v1/emr/encounters/:id/finalize`: Lock and sign consultation (`emr.update`).
- `POST /api/v1/emr/prescriptions`: Issue electronic prescription (`prescriptions.create`).

### Milestone 06 — IPD & Bed Management (Tenant-Scoped)
- `POST /api/v1/ipd/admissions`: Admit patient to inpatient ward (`admissions.create`).
- `GET /api/v1/ipd/admissions`: List active inpatients (`admissions.read`).
- `GET /api/v1/ipd/beds`: List beds and real-time occupancy (`beds.read`).
- `POST /api/v1/ipd/admissions/:id/transfer`: Transfer patient bed (`beds.manage`).
- `POST /api/v1/ipd/admissions/:id/discharge`: Authorize discharge (`admissions.update`).

### Milestone 07 — Laboratory Information System (Tenant-Scoped)
- `POST /api/v1/lab/orders`: Order laboratory investigations (`lab.orders.create`).
- `GET /api/v1/lab/orders`: Laboratory worklist (`lab.orders.read`).
- `POST /api/v1/lab/orders/:id/sample`: Record specimen collection (`lab.orders.update`).
- `POST /api/v1/lab/orders/:id/results`: Enter parameter results (`lab.results.enter`).
- `POST /api/v1/lab/orders/:id/verify`: Pathologist verification (`lab.results.verify`).

### Milestone 08 — Pharmacy & Dispensing (Tenant-Scoped)
- `GET /api/v1/pharmacy/prescriptions`: Undispensed prescription queue (`pharmacy.read`).
- `POST /api/v1/pharmacy/dispense`: Dispense medication and deduct batch stock (`pharmacy.dispense`).
- `GET /api/v1/pharmacy/batches`: Batch stock ledger and expiry alerts (`pharmacy.read`).

### Milestone 09 — Inventory & Procurement (Tenant-Scoped)
- `POST /api/v1/inventory/items`: Create item master (`inventory.create`).
- `POST /api/v1/inventory/purchase-orders`: Create PO (`inventory.create`).
- `POST /api/v1/inventory/purchase-orders/:id/approve`: Approve PO (`inventory.manage`).
- `POST /api/v1/inventory/grn`: Goods receipt against PO (`inventory.update`).
- `POST /api/v1/inventory/transfers`: Departmental stock movement (`inventory.update`).

### Milestone 10 — Billing, Invoicing & Payments (Tenant-Scoped)
- `POST /api/v1/billing/invoices`: Generate patient invoice (`billing.invoices.create`).
- `GET /api/v1/billing/invoices`: Search invoices (`billing.invoices.read`).
- `POST /api/v1/billing/payments`: Process payment and issue receipt (`billing.payments.process`).
- `POST /api/v1/billing/refunds`: Issue credit note or refund (`billing.refunds.manage`).

### Milestone 11 — Reports & Master Audit (Tenant-Scoped)
- `GET /api/v1/reports/census`: Operational census and bed occupancy (`reports.read`).
- `GET /api/v1/reports/financial`: Daily collections and revenue attribution (`reports.financial.read`).
- `GET /api/v1/audit`: Paginated search of security audit trail (`audit.logs.read`).
- `GET /api/v1/audit/export`: Export audit log as CSV (`audit.logs.read`).

### SaaS Platform Management APIs (Global Scope — Platform Super Admin Only)
- `POST /api/v1/platform/tenants`: Onboard new hospital organization.
- `GET /api/v1/platform/tenants`: Directory of customer tenants.
- `PATCH /api/v1/platform/tenants/:id/status`: Suspend or reactivate tenant.
- `GET /api/v1/platform/subscriptions`: Subscription lifecycle overview.
- `POST /api/v1/platform/plans`: Configure plan definitions and limits.
