# Hospital Management System — Frontend Architecture Specification

**SOURCE-OF-TRUTH OWNER**: `docs/FRONTEND.md` (FRONTEND ENGINEERING)  
**Classification**: Authoritative  
**Product**: Multi-Tenant Hospital Management SaaS & Patient Healthcare Platform  
**Frontends**: Three Autonomous Next.js Applications (`hms-client`, `patient-app`, `super-admin`)  
**Shared Libraries**: Monorepo Packages (`packages/ui`, `packages/types`, `packages/config`, `packages/auth`)  
**Status**: Authoritative Frontend Specification  

---

## 1. Architectural Model & Application Boundaries

The frontend layer is strictly bifurcated into three distinct Next.js web applications, each serving a sovereign user persona and operating boundary:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND APPLICATION ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. apps/hms-client/ (Hospital Clinical & Administrative Workstation)        │
│    • Target: Hospital Admins, Doctors, Nurses, Pharmacists, Lab Techs       │
│    • UX: Desktop-first, information-dense, keyboard-navigable               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. apps/patient-app/ (Consumer Healthcare & OPD Discovery Platform)         │
│    • Target: Patients, Guardians, Family Members                            │
│    • UX: Mobile-first, consumer-grade, accessible, real-time queue tracker  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. apps/super-admin/ (SaaS Platform Owner & Multi-Tenant Control Plane)     │
│    • Target: SaaS Operator, Platform Super Admins                           │
│    • UX: Metric-dense, tenant lifecycle, plan governance, system health    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              Reuses Shared Monorepo Packages
                                      ▼
       packages/ui ── packages/types ── packages/config ── packages/auth
                                      │
              All Communicate Exclusively via HTTPS REST
                                      ▼
                             apps/server/ (API)
```

> [!CRITICAL]
> **Strict Separation Rule**:
> - `apps/patient-app` is completely decoupled from `apps/hms-client`. Patient features must never be mixed into the hospital workstation app.
> - `apps/super-admin` is completely decoupled from `apps/hms-client`. Hospital administrators must never have access to SaaS tenant governance.
> - Frontend permission checks exist solely for UI rendering and ergonomics. The NestJS backend remains the sole authoritative gatekeeper for security.
> - No frontend application or component may ever establish a direct database connection.

---

## 2. Application 1: `apps/hms-client/` (Hospital Management)

### 2.1. Target Personas & Experiences
- **Hospital Administrator**: System setup, hospital settings, departments, staff accounts, doctor schedules, billing tariff masters, audit logs, and operational reports.
- **Doctor (Physician Workspace)**: Dedicated clinical workspace designed for high throughput during outpatient shifts.
- **Nursing Staff**: Inpatient bed management, vital recording, medication administration.
- **Pharmacist**: Prescription fulfillment queue, batch selection, stock verification, dispensing.
- **Laboratory Technician**: Test order worklist, specimen barcode scanning, result parameter entry, and verification.
- **Receptionist / Cashier**: Walk-in registration, appointment booking, token issuance, and invoice payment collection.

### 2.2. Doctor Workspace Architecture
Physicians operate within a dedicated role-based cockpit in `hms-client`:
- **Doctor Dashboard**: Shift overview, pending queue count, completed consultations, and critical lab alerts.
- **Today's Appointments**: Chronological list of booked slots with check-in status.
- **Patient Queue Board**: Live list of waiting patients, current serving token, and next-patient call button.
- **Clinical Consultation View**:
  - Longitudinal patient summary (past diagnoses, active medications, allergy banner).
  - Subjective/objective clinical notes with structured templates.
  - ICD-10 diagnostic coding.
  - Electronic Prescriptions (Rx) integrated with hospital Medicine Master.
  - Diagnostic Investigation Orders (Lab / Imaging).
  - Follow-up visit scheduling.

### 2.3. Hospital Administrator Experience
- **Tenant Configuration**: Hospital branches, facilities, and contact points.
- **Department & Staff Directory**: Manage clinical specialties, assign doctors to departments, manage staff credentials and RBAC roles.
- **Operational Dashboards**: Real-time bed occupancy, OPD queue velocity, pharmacy inventory levels, and financial summaries (strictly derived from authentic tenant data; zero fabricated metrics).
- **Audit & Compliance**: Searchable log of staff actions, record views, and clinical changes.

---

## 3. Application 2: `apps/patient-app/` (Patient Healthcare Platform)

### 3.1. Design Philosophy
- **Mobile-First Experience**: Optimized for smartphones with responsive desktop support.
- **Zero Ambiguity**: Clear, high-contrast layouts, high touch-target sizes (minimum 48px), and fast performance over cellular networks.
- **Absolute Privacy Guarantee**: Patient demographic and clinical records are accessible strictly to the authenticated, authorized patient. Patient data is NEVER publicly discoverable.

### 3.2. Core Functional Modules

#### 1. Authentication & Profile
- Mobile phone / email patient registration and OTP verification.
- Secure login, password management, and personal profile management.
- Family member / dependent profile linking.

#### 2. Hospital Discovery
- Search and explore accredited hospitals and clinics.
- Filter by city, specialty, available facilities, and emergency services.
- Hospital profile pages: Location, Google Maps directions, contact details, departments, and available amenities.

#### 3. Doctor Discovery
- Search doctors by name, specialty, clinical condition, or hospital.
- Detailed doctor profiles: Qualifications, medical registration, years of experience, consulting languages, and OPD fee schedule.
- Doctor availability calendars and upcoming open consultation slots.

#### 4. Appointment Booking Wizard
- Intuitive 5-step booking flow:
  ```text
  Select Hospital ──► Select Department ──► Select Doctor ──► Select Date & Slot ──► Confirm & Generate Token
  ```
- Reschedule and cancel appointments with immediate status updates.
- Complete appointment history log (upcoming, completed, and cancelled).

#### 5. Real-Time OPD Queue Tracker
Live tracking interface that prevents long physical waits in crowded hospital lobbies:
- **Visual Display**:
  - **Your Token Number**: e.g., `A-027`
  - **Currently Serving Token**: e.g., `A-019`
  - **Patients Ahead in Queue**: e.g., `8 patients`
  - **Estimated Waiting Time**: e.g., `42 minutes` (dynamically calculated from average doctor consultation duration)
  - **Doctor Status**: `Consulting`, `On Break`, `Delayed`
- **Proactive Alerts**:
  - "Your turn is approaching (3 patients ahead)" push/SMS notification.
  - "You are next: please report to Consultation Room 4" alert.

#### 6. Patient Health Records (PHR) Vault
Secure, tamper-evident digital repository for the patient's medical history:
- **Prescriptions**: View and download authorized digital prescriptions with doctor signature.
- **Lab Reports**: Verified test results with normal range indicators and downloadable PDF reports.
- **Medical Records**: Visit history, discharge summaries, and uploaded previous health records.
- **Invoices & Receipts**: Itemized billing statements, payment receipts, and insurance claim documents.

---

## 4. Application 3: `apps/super-admin/` (SaaS Platform Owner)

### 4.1. Purpose & Access Control
- Dedicated operational control center for the SaaS platform provider.
- Accessible strictly to users with the `PLATFORM_SUPER_ADMIN` role.
- **Zero Cross-Over**: Hospital administrators have zero access to this surface. Super admins have zero access to private patient clinical records.

### 4.2. Functional Capabilities

#### 1. Tenant Management
- Onboard new hospital organizations with custom tenant slug, registration details, and admin user credentials.
- Tenant lifecycle management: Activate, Suspend (lockout), Deactivate, or Extend evaluation period.
- Configure tenant parameters: Enabled modules, hospital branches limit, bed count quota.

#### 2. SaaS Subscription & Plan Governance
- Manage subscription tiers (`STARTER_CLINIC`, `GROWTH_HOSPITAL`, `ENTERPRISE_NETWORK`).
- Manage commercial contracts, billing cycles, renewals, and invoice history.
- Dynamic feature flag management: Enable/disable modules globally or override per tenant.

#### 3. Platform Operations & Analytics
- Platform-wide operational health: Aggregate active tenants, system load, API latency.
- Business metrics: Monthly Recurring Revenue (MRR), subscription churn, active doctor seats.
- Phase 2 AI usage analytics: Token consumption, model performance, and agent error rates.

#### 4. Platform Security & Audit
- SaaS-level audit log: Tracks tenant creation, plan updates, credential resets, and emergency suspensions.
- Security anomaly monitoring and rate-limiting alerts.

---

## 5. Shared Packages Architecture

```text
packages/
├── ui/         # Design tokens, primitives, accessible UI components
├── types/      # Shared TypeScript domain contracts, DTO interfaces, and enums
├── config/     # Centralized ESLint, Tailwind, and TypeScript configs
└── auth/       # JWT payload interfaces, session context decoders, surface helpers
```

### 5.1. `packages/ui/`
Built with Tailwind CSS and Radix UI primitives:
- **Form Primitives**: `Button`, `Input`, `Select`, `Checkbox`, `Textarea`, `DatePicker`.
- **Layout & Feedback**: `Card`, `Badge`, `Skeleton`, `EmptyState`, `ErrorState`, `Dialog`, `CommandPalette`.
- **Design Tokens**: Standardized HSL color tokens (`primary`, `secondary`, `destructive`, `muted`, `accent`).

### 5.2. `packages/auth/`
Shared client/server authentication utility library:
- Defines `JwtPayload`, `UserSurface` (`HMS_CLIENT`, `PATIENT_APP`, `SUPER_ADMIN`).
- Implements `ResolvedTenantContext` interface.
- Provides token extraction and decoded claim validation without leaking server business logic.

---

## 6. Client-Side API Communication Standard

All three applications utilize a standardized HTTP client (`apiClient`) configured with interceptors:

```typescript
// Standardized API Client Architecture
class ApiClient {
  private baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    // Attach credentials / cookies
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Includes HttpOnly session cookies
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.message || 'API request failed');
    }

    return response.json();
  }
}
```

### Core API Client Rules:
1. **Never Inject Client-Supplied `tenantId`**: The client never passes `tenantId` in request bodies or custom headers. The server extracts the tenant context strictly from the authenticated session cookie/token.
2. **Handle Standardized Error Envelopes**: All API responses follow `{ success: boolean, data?: T, error?: { code: string, message: string } }`.
3. **Graceful Handling of 401 & 403**: Redirects unauthenticated users to the surface-appropriate login route while preserving return URL state.
