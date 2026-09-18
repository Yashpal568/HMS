# Patient Healthcare Platform Specification

**SOURCE-OF-TRUTH OWNER**: `docs/PATIENT_PLATFORM.md` (PATIENT EXPERIENCE)  
**Classification**: Authoritative  
**Application**: `apps/patient-app/`  
**Target User**: Patients, Family Caregivers, Guardians  
**Architecture**: Mobile-First Next.js Web Application  
**Status**: Authoritative Patient Platform Specification  

---

## 1. Product Mission & Architectural Isolation

The Patient Healthcare Platform is a sovereign, consumer-facing digital healthcare portal. It is completely decoupled from `apps/hms-client`.

```text
┌──────────────────────────────────────────────────────────┐
│                 apps/patient-app/ (Web)                  │
│       Consumer Experience (Mobile-First / Desktop)       │
└────────────────────────────┬─────────────────────────────┘
                             │ Authenticated REST Calls (/api/v1)
                             ▼
┌──────────────────────────────────────────────────────────┐
│                  apps/server/ (API Gateway)              │
│       Role: PATIENT | Identity Verified via JWT          │
└────────────────────────────┬─────────────────────────────┘
                             │ Tenant-Scoped Queries
                             ▼
┌──────────────────────────────────────────────────────────┐
│                      MongoDB Atlas                       │
│    Patients, Appointments, Queues, Prescriptions, Labs   │
└──────────────────────────────────────────────────────────┘
```

> [!CRITICAL]
> **Strict Privacy Guarantee**:
> Under no circumstances can patient health records, prescriptions, invoices, or appointment histories become publicly discoverable, crawlable by search engines, or accessible without cryptographic authentication.

---

## 2. Core Modules & Capabilities

### 2.1. Authentication & Personal Profile
- **Registration**: Mobile phone number / email registration with SMS/email OTP verification.
- **Login & Session**: Secure login issuing HttpOnly JWT session cookie.
- **Profile Management**: Demographics, emergency contacts, recorded drug/food allergies, and blood group.
- **Family / Dependent Profiles**: Ability to link child or elderly parent profiles under a single guardian account for appointment booking.

### 2.2. Hospital Discovery
- **Public Directory**: Browse accredited healthcare institutions and specialized clinics registered on the SaaS platform.
- **Filters**: Filter by city, specialty, available diagnostic services (e.g. MRI, 24/7 Emergency, Cath Lab), and insurance cashless network.
- **Hospital Profile**: Address, interactive map directions, operational OPD hours, facility photos, and contact directory.

### 2.3. Doctor Discovery
- **Doctor Directory**: Search physicians by name, medical specialty (e.g. Cardiology, Pediatrics), or clinical condition.
- **Detailed Profiles**: Medical credentials, board certifications, medical council registration, languages spoken, and consultation fee transparency.
- **Availability Calendar**: Live schedule calendar displaying upcoming open consultation sessions.

### 2.4. Appointment Booking Wizard
A clean, frictionless 5-step scheduling workflow:
1. **Hospital Selection**: Choose preferred hospital branch or clinic location.
2. **Department / Doctor Selection**: Pick medical specialty and physician.
3. **Date & Slot Selection**: Select preferred consultation date and available 15/30-minute time slot.
4. **Patient Confirmation**: Select self or linked family member; enter chief clinical complaint.
5. **Token Generation**: Instant booking confirmation with unique Appointment Number (e.g. `APT-2026-0042`) and initial Queue Token (e.g. `A-027`).

---

## 3. Real-Time OPD Queue Tracker

The Queue Tracker eliminates uncertainty and crowded waiting room congestion by giving patients live visibility into their consultation progress:

```text
┌──────────────────────────────────────────────────────────┐
│                   LIVE OPD QUEUE STATUS                  │
│                                                          │
│   Doctor: Dr. Rajesh Sharma, MD (Cardiology)             │
│   Hospital: City Heart Institute — Room 104              │
│   Shift: Morning Session (09:00 AM - 01:00 PM)           │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │                 YOUR TOKEN: A-027                │   │
│   └──────────────────────────────────────────────────┘   │
│                                                          │
│   Currently Serving:  A-019                              │
│   Patients Ahead:     8                                  │
│   Estimated Wait:     ~42 minutes                        │
│   Doctor Status:      Consulting                         │
│                                                          │
│   [████████████░░░░░░░░░░░░░░░░░░░░░░] 38% Progress      │
└──────────────────────────────────────────────────────────┘
```

### Queue Engine Logic:
1. **Token Generation**: Sequential daily tokens prefixed by session/doctor code (e.g. `A-001`, `A-002`).
2. **Dynamic Waiting Time Calculation**:
   $$\text{Estimated Wait} = (\text{Patients Ahead}) \times (\text{Doctor Average Consultation Duration})$$
   Default consultation slot duration: 15 minutes. Automatically adjusts based on real-time doctor velocity.
3. **Queue State Transitions**:
   `WAITING` -> `CALLED` -> `IN_CONSULTATION` -> `COMPLETED` | `SKIPPED` | `CANCELLED` | `NO_SHOW`
4. **Proactive Notifications**:
   - **Approaching Turn Alert**: Triggered when 3 patients remain ahead. ("Please arrive at the hospital waiting lounge").
   - **Next Patient Alert**: Triggered when 1 patient remains ahead. ("Please proceed to Room 104 door").

---

## 4. Personal Health Record (PHR) Vault

Patients can access authorized medical documents anytime without visiting physical records departments:
- **Electronic Prescriptions (Rx)**: Authenticated digital prescriptions issued by doctors, complete with dosage frequency, instructions, and duration.
- **Laboratory Reports**: Diagnostic blood, urine, and pathology test results with normal reference range comparisons and verified lab director signatures. Downloadable as PDF.
- **Visit History & Discharge Summaries**: Longitudinal chronicle of outpatient visits, doctor notes summaries, and inpatient hospitalizations.
- **Invoices & Receipts**: Itemized billing records, tax receipts, and payment transaction references for insurance reimbursement claims.
