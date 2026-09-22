# Milestone 14 — Patient Discovery & Consumer Healthcare Platform

## Objective
Implement the sovereign, consumer-facing mobile-first healthcare portal (`apps/patient-app/`) conforming to `docs/PATIENT_PLATFORM.md`, enabling patients and family caregivers to search hospitals and accredited doctors, book appointments via an intuitive 5-step wizard, track their live OPD queue token position in real time, and access their personal health records (PHR) vault with strict cryptographic data privacy.

---

## Scope

### 1. Patient Portal Web Application (`apps/patient-app/`)
- Mobile-first, responsive Next.js 14 web application styled with Tailwind CSS and `@hms/ui`.
- **Core Views & Modules**:
  - `/login` & `/register`: Patient mobile/email OTP authentication and session management.
  - `/discover`: Public healthcare institution and doctor directory with geolocation, specialty filters, and fee transparency.
  - `/hospitals/[id]`: Hospital profile page with facility photos, specialties, OPD clinic schedules, and directions.
  - `/doctors/[id]`: Physician credential profile, consultation fees, and available appointment calendar slots.
  - `/book`: 5-step self-service appointment booking wizard:
    1. Select specialty/service.
    2. Choose doctor & clinic location.
    3. Select available date & shift slot.
    4. Provide patient/dependent details.
    5. Confirm booking and receive digital token receipt.
  - `/queue`: Real-time OPD Queue Tracker (Token number, current serving token, patients ahead, estimated wait time).
  - `/phr`: Personal Health Records vault:
    - Encrypted view of past prescriptions (Rx).
    - Diagnostic laboratory result reports with verified PDF download links.
    - Historical medical visit timelines.
  - `/profile`: Patient demographic details, emergency contacts, blood group, recorded allergies, and linked family dependents.

### 2. Backend Patient API Endpoints (`apps/server/src/patient-portal/`)
- Gated by `@Roles('PATIENT')` or public read access for discovery.
- `GET /api/v1/patient/discover/hospitals`: Public directory of accredited hospital tenants.
- `GET /api/v1/patient/discover/doctors`: Public directory of physicians filtered by specialty and hospital.
- `GET /api/v1/patient/doctors/:id/slots`: Available consultation time slots for selected dates.
- `POST /api/v1/patient/appointments`: Self-service booking endpoint binding to verified patient ID.
- `GET /api/v1/patient/appointments`: Patient's upcoming and past appointment ledger.
- `GET /api/v1/patient/queue/status/:appointmentId`: Real-time token status and queue progress.
- `GET /api/v1/patient/phr/records`: Longitudinal personal health records query.

---

## Out of Scope
- Hospital clinical administration, staff rostering, or billing ledgers (handled strictly inside `apps/hms-client`).
- SaaS platform management or tenant provisioning (handled strictly inside `apps/super-admin`).
- Unauthenticated access to private patient clinical data.

---

## Prerequisites
- Milestones 0 through 13 completed and verified.
- Canonical REST API endpoints and data models operational.
