# HMS Frontend Specification

## Stack
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query where useful
- One consistent icon family

## Visual Direction
Premium healthcare enterprise UI:
- professional
- calm
- fast
- accessible
- information-dense without clutter
- desktop-first for hospital workstations
- responsive for tablet/mobile

Avoid excessive cards, gradients, animation, glassmorphism and decorative filler.

## App Shell
- Left sidebar
- Top bar
- Page title/breadcrumb
- Main content
- Notification center
- Account menu
- Global patient search
- Permission-aware navigation

## Navigation
Dashboard, Patients, Appointments, OPD, IPD, Nursing, Laboratory, Pharmacy, Inventory, Billing, Reports, Documents, Notifications, Audit & Security, Staff & Users, Settings.

Hide modules the current user cannot access.

## Primary Screens
### Login
Branding, username/email, password, sign in, forgot password, error and locked/rate-limit states.

### Dashboard
Role-specific appointments, queue, admissions, bed occupancy, pending lab work, low stock, billing indicators and alerts. Never show unauthorized data or fake production metrics.

### Patients
Search by approved identifiers/name/phone, filters, results table, quick actions, patient profile with demographics, contacts, allergies, appointments, encounters, vitals, diagnoses, prescriptions, lab reports, documents and billing summary according to permissions.

### Appointments
Calendar/list, doctor, department, date/time, patient, status, create/reschedule/cancel, queue/check-in.

### Doctor Consultation
Patient context, vitals, notes, diagnoses, investigations, prescription, follow-up, draft/final actions where approved.

### IPD
Admissions, wards, rooms, beds, availability, transfers, patient details and discharge.

### Laboratory
Orders, sample queue, result entry, verification, reports and corrections.

### Pharmacy
Prescription queue, medicine search, batch selection, stock validation, dispensing and returns.

### Inventory
Stock, purchase orders, receiving, movements, expiry and suppliers.

### Billing
Invoice creation/detail, payments, receipts, outstanding and permission-controlled refunds.

## UX Rules
Every data-heavy screen has loading, empty, error, pagination and appropriate search/filter states. Sensitive/destructive actions require confirmation. Forms are keyboard-friendly and accessible.

## Component System
Reusable Button, Input, Select, Date/Time Picker, Dialog, Drawer, Table, Pagination, Form Section, Tabs, Status, Alert, Toast, Data Panel, Timeline, Empty State, Skeleton.

Do not duplicate equivalent components.

## Security
No DB credentials or secrets in frontend. Backend is authoritative for authorization. Protected routes are UI convenience, not security.


## Desktop Packaging — Phase 2
The initial frontend is a web application. Do not add Electron during Phase 1.

When the web HMS is stable, the same frontend may be packaged with Electron:
```text
Next.js/React HMS
      ↓
Electron shell
      ↓
Windows .exe / .msi
```

Desktop-specific capabilities must be isolated behind a small adapter layer. The business logic remains in the web frontend/backend architecture.

Do not create a separate desktop UI codebase unless a specific requirement makes it necessary.
