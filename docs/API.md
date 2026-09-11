# Hospital Management System — API Specification & Conventions

Base URL: `http://localhost:3001/api/v1` (Development) / `/api/v1` (Production)

---

## 1. Architectural Standards

- **Protocol**: REST over HTTPS/TLS.
- **Data Exchange Format**: JSON (`Content-Type: application/json`).
- **Authentication**: Bearer Token in `Authorization` header (`Authorization: Bearer <JWT>`) or HttpOnly cookie.
- **Global Error Envelope**: All errors return uniform JSON without stack traces.
- **Success Envelope**: All successful responses return `{ "success": true, "data": ... }`.

### Standard Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Standard Error Response
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
  - **Description**: Application readiness probe reporting database status.
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
  - **Response**: `{ "success": true, "user": { ... }, "accessToken": "..." }`
  - **Errors**: `401 Unauthorized` ("Invalid email or password", or "Account locked").
  - **Side Effect**: Sets HttpOnly `SameSite=lax` cookie.
- **`POST /api/v1/auth/logout`**
  - **Auth**: Public / Authenticated
  - **Response**: `{ "success": true, "message": "Logged out successfully" }`
  - **Side Effect**: Clears session cookie, logs audit event.
- **`GET /api/v1/auth/me`**
  - **Auth**: Protected (`JwtAuthGuard`)
  - **Response**: `{ "success": true, "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "...", "permissions": [...] } }`
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
  - **Description**: Returns live system status, registered staff counts, recent audit events, module readiness, and empty state clinical placeholders.
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
          "todayAppointments": { "count": 0, "note": "..." },
          "activeAdmissions": { "count": 0, "note": "..." },
          "pendingLabOrders": { "count": 0, "note": "..." },
          "lowStockAlerts": { "count": 0, "note": "..." },
          "pendingInvoices": { "count": 0, "note": "..." }
        }
      }
    }
    ```

---

## 3. Planned APIs (Scheduled by Milestone)

The following endpoints are **NOT YET IMPLEMENTED** and are scheduled for upcoming milestones:

### Milestone 03 — Patient Management
- `POST /api/v1/patients`: Register patient (`patients.create`).
- `GET /api/v1/patients`: Search and list patients (`patients.read`).
- `GET /api/v1/patients/:id`: Retrieve patient profile by UHID or ID (`patients.read`).
- `PATCH /api/v1/patients/:id`: Update patient demographics (`patients.update`).

### Milestone 04 — Appointments & OPD
- `POST /api/v1/appointments`: Book outpatient appointment (`appointments.create`).
- `GET /api/v1/appointments`: List OPD queue for date/doctor (`appointments.read`).
- `GET /api/v1/appointments/slots`: Query available doctor time slots (`appointments.read`).
- `POST /api/v1/appointments/:id/check-in`: Mark patient arrival and issue token (`appointments.update`).
- `POST /api/v1/appointments/:id/cancel`: Cancel appointment with reason (`appointments.cancel`).

### Milestone 05 — EMR & Clinical Consultation
- `POST /api/v1/emr/encounters`: Initialize doctor encounter (`emr.create`).
- `GET /api/v1/emr/encounters/:id`: View encounter file (`emr.read`).
- `PATCH /api/v1/emr/encounters/:id`: Save draft vitals, notes, diagnoses (`emr.update`).
- `POST /api/v1/emr/encounters/:id/finalize`: Lock and sign encounter (`emr.update`).
- `POST /api/v1/emr/prescriptions`: Issue electronic prescription (`prescriptions.create`).

### Milestone 06 — IPD & Bed Management
- `POST /api/v1/ipd/admissions`: Admit patient to inpatient bed (`admissions.create`).
- `GET /api/v1/ipd/admissions`: List active inpatients (`admissions.read`).
- `GET /api/v1/ipd/beds`: List beds and occupancy status (`beds.read`).
- `POST /api/v1/ipd/admissions/:id/transfer`: Transfer patient bed (`beds.manage`).
- `POST /api/v1/ipd/admissions/:id/discharge`: Authorize discharge (`admissions.update`).

### Milestone 07 — Laboratory Information System
- `POST /api/v1/lab/orders`: Order laboratory investigations (`lab.orders.create`).
- `GET /api/v1/lab/orders`: Laboratory worklist (`lab.orders.read`).
- `POST /api/v1/lab/orders/:id/sample`: Record specimen collection (`lab.orders.update`).
- `POST /api/v1/lab/orders/:id/results`: Enter parameter results (`lab.results.enter`).
- `POST /api/v1/lab/orders/:id/verify`: Pathologist sign-off (`lab.results.verify`).

### Milestone 08 — Pharmacy & Dispensing
- `GET /api/v1/pharmacy/prescriptions`: Undispensed prescription queue (`pharmacy.read`).
- `POST /api/v1/pharmacy/dispense`: Deduct batch stock and dispense (`pharmacy.dispense`).
- `GET /api/v1/pharmacy/batches`: Batch stock ledger and expiry alerts (`pharmacy.read`).

### Milestone 09 — Inventory & Procurement
- `POST /api/v1/inventory/items`: Create consumable item master (`inventory.create`).
- `POST /api/v1/inventory/purchase-orders`: Create PO (`inventory.create`).
- `POST /api/v1/inventory/purchase-orders/:id/approve`: Approve PO (`inventory.manage`).
- `POST /api/v1/inventory/grn`: Receive goods against PO (`inventory.update`).
- `POST /api/v1/inventory/transfers`: Departmental stock movement (`inventory.update`).

### Milestone 10 — Billing, Invoicing & Payments
- `POST /api/v1/billing/invoices`: Generate patient invoice (`billing.invoices.create`).
- `GET /api/v1/billing/invoices`: Search invoices (`billing.invoices.read`).
- `POST /api/v1/billing/payments`: Process payment and issue receipt (`billing.payments.process`).
- `POST /api/v1/billing/refunds`: Approve refund and issue credit note (`billing.refunds.manage`).

### Milestone 11 — Reports & Master Audit
- `GET /api/v1/reports/census`: Operational footfall and bed occupancy (`reports.read`).
- `GET /api/v1/reports/financial`: Daily collections and revenue attribution (`reports.financial.read`).
- `GET /api/v1/audit`: Paginated search of security audit trail (`audit.logs.read`).
- `GET /api/v1/audit/export`: Export audit logs as CSV (`audit.logs.read`).
