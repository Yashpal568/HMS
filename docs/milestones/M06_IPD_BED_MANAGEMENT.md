# Milestone 06 — IPD & Bed Management

## Objective
Build the Inpatient Department (IPD) workflow covering inpatient admissions, real-time ward/room/bed occupancy tracking, bed allocations, bed transfers, inpatient nursing notes, and discharge management conforming to `docs/DATABASE.md`.

## Scope
- Ward, Room, and Bed hierarchy configuration:
  - Wards (e.g. General Ward, Semi-Private, Deluxe Private, ICU, CCU, Post-Op).
  - Rooms linked to wards with room numbers and room classifications.
  - Beds linked to rooms with unique bed numbers and status: `available`, `occupied`, `maintenance`, `cleaning`.
- Inpatient Admission workflow (`admissions`):
  - Patient lookup via UHID.
  - Admission source: `opd_referral`, `emergency`, `elective_transfer`.
  - Attending physician and primary nursing station assignment.
  - Initial admitting diagnosis and clinical notes.
  - Real-time Bed Allocation: Atomic reservation changing bed status to `occupied`.
- Bed Occupancy & Visual Ward Matrix (`/ipd/beds`):
  - Interactive grid displaying all beds color-coded by occupancy status.
  - One-click access to the admitted patient's clinical file.
- Internal Bed Transfer workflow:
  - Moving a patient between beds (e.g., ICU to General Ward).
  - Records transfer reason, timestamps, transferring staff, and releases previous bed for `cleaning`.
- Inpatient Nursing & Daily Rounds Notes:
  - Periodic vitals logging, nursing care records, and daily doctor progress notes.
- Discharge Workflow (`discharge_records`):
  - Doctor discharge summary: Course in hospital, final diagnosis, discharge medications, follow-up instructions, and condition at discharge (`cured`, `improved`, `transferred`, `lama`, `deceased`).
  - Releases bed, changing status to `cleaning`.

## Out of Scope
- Pharmacy inpatient batch dispensing and medication carts (Milestone 08).
- Itemized daily bed charges and final inpatient billing settlement (Milestone 10).
- External ambulance dispatch or hospital transport logistics.

## Prerequisites
- Milestone 03 (Patient Management - UHID and patient records).
- Milestone 04 (Appointments & OPD - referral source).
- Milestone 05 (Doctor Consultation & EMR - clinical diagnosis).

## User Workflows
1. **Admit Inpatient**: Doctor orders IPD admission from consultation or Emergency. IPD coordinator searches patient UHID, assigns Dr. Davis as attending physician, reviews available ICU beds on the visual bed board, selects Bed ICU-04, and completes admission.
2. **Bed Allocation**: System atomically marks Bed ICU-04 as `occupied`, creates an active `Admission` document, and records a `BED_ALLOCATION` audit event.
3. **Internal Transfer**: Patient stabilizes after 48 hours; doctor requests transfer to Step-Down Ward. Nurse initiates transfer, selects Bed W2-08, previous bed ICU-04 enters `cleaning` status, and Bed W2-08 becomes `occupied`.
4. **Housekeeping Sign-off**: Housekeeping completes bed sanitation and marks Bed ICU-04 as `available`.
5. **Inpatient Discharge**: Doctor prepares discharge summary, specifies follow-up in 7 days, and approves discharge. System logs `IPD_DISCHARGE` and queues records for final invoice audit.

## Frontend Requirements
- **Pages**:
  - `/ipd`: Inpatient overview board with current census, active admissions list, and department occupancy rates.
  - `/ipd/admissions/new`: Admission wizard with patient selector, attending doctor, admitting diagnosis, and bed chooser.
  - `/ipd/beds`: Real-time visual Ward and Bed occupancy dashboard.
  - `/ipd/admissions/[id]`: Active inpatient profile with daily rounds timeline and nursing charts.
  - `/ipd/admissions/[id]/discharge`: Discharge summary authoring view.
- **Components**:
  - `BedOccupancyCard`: Visual bed tile with status badge, patient name/UHID (if occupied), and quick action menu.
  - `WardFilterBar`: Tabs to filter by ward type (ICU, General, Maternity, Surgical).
  - `BedTransferModal`: Form to select destination ward/bed and input clinical transfer justification.
  - `DischargeSummaryForm`: Clinical form capturing hospital stay narrative and discharge condition.
- **States**: Visual occupancy progress bars (e.g. "General Ward: 82% occupied"), empty ward alerts, bed clash warning.

## Backend Requirements
- **Modules**: `IpdModule` in `apps/api/src/ipd/`.
- **Controllers**:
  - `IpdController`:
    - `POST /api/v1/ipd/admissions`: Admit patient (`admissions.create`).
    - `GET /api/v1/ipd/admissions`: List admissions with status filters (`admissions.read`).
    - `GET /api/v1/ipd/admissions/:id`: Retrieve admission file (`admissions.read`).
    - `POST /api/v1/ipd/admissions/:id/transfer`: Transfer bed (`beds.manage`).
    - `POST /api/v1/ipd/admissions/:id/discharge`: Authorize discharge (`admissions.update`).
    - `GET /api/v1/ipd/beds`: List beds with ward filter and status (`beds.read`).
    - `PATCH /api/v1/ipd/beds/:id/status`: Update bed status (`available`, `cleaning`, `maintenance`).
- **Services**:
  - `IpdService`: Manages admissions lifecycle and transitions.
  - `BedService`: Atomic bed state locking, occupancy calculations, transfer logging.
- **DTOs**: `CreateAdmissionDto`, `TransferBedDto`, `DischargeDto`, `CreateBedDto`.

## Database Requirements
- **Collections**:
  - `wards` (Tenant-Owned):
    - `_id`: ObjectId
    - `tenantId`: ObjectId, ref 'Tenant', required, index: true
    - `name`: String, required (e.g. "Intensive Care Unit")
    - `code`: String, required (e.g. "ICU")
    - `type`: String enum (`general`, `semi_private`, `private`, `icu`, `ccu`, `maternity`, `pediatric`)
    - `floor`: String
    - `totalBeds`: Number
    - `isActive`: Boolean
  - `beds` (Tenant-Owned):
    - `_id`: ObjectId
    - `tenantId`: ObjectId, ref 'Tenant', required, index: true
    - `bedNumber`: String, required (e.g. "ICU-01")
    - `wardId`: ObjectId, ref 'Ward', required
    - `status`: String enum (`available`, `occupied`, `maintenance`, `cleaning`), default `available`
    - `currentAdmissionId`: ObjectId, ref 'Admission'
    - `createdAt`, `updatedAt`: Timestamps
  - `admissions` (Tenant-Owned):
    - `_id`: ObjectId
    - `tenantId`: ObjectId, ref 'Tenant', required, index: true
    - `admissionNumber`: String, required (e.g. "ADM-2026-00042")
    - `patientId`: ObjectId, ref 'Patient', required
    - `attendingDoctorId`: ObjectId, ref 'User', required
    - `admittedBedId`: ObjectId, ref 'Bed', required
    - `admissionDate`: Date, required
    - `admittingDiagnosis`: String, required
    - `status`: String enum (`admitted`, `discharged`, `transferred`), default `admitted`
    - `dischargeDate`: Date
    - `dischargeCondition`: String
    - `dischargeSummary`: String
    - `createdAt`, `updatedAt`: Timestamps
  - `bed_allocations` (Tenant-Owned):
    - `_id`: ObjectId
    - `tenantId`: ObjectId, ref 'Tenant', required, index: true
    - `admissionId`: ObjectId, ref 'Admission', required
    - `patientId`: ObjectId, ref 'Patient', required
    - `bedId`: ObjectId, ref 'Bed', required
    - `allocatedAt`: Date, required
    - `releasedAt`: Date
    - `transferReason`: String
- **Indexes**:
  - `wards`: `{ tenantId: 1, code: 1 }` (unique)
  - `beds`: `{ tenantId: 1, wardId: 1, status: 1 }`
  - `beds`: `{ tenantId: 1, wardId: 1, bedNumber: 1 }` (unique)
  - `admissions`: `{ tenantId: 1, patientId: 1, status: 1 }`
  - `admissions`: `{ tenantId: 1, admissionNumber: 1 }` (unique)
  - `bed_allocations`: `{ tenantId: 1, admissionId: 1, allocatedAt: -1 }`

## API Requirements
- `POST /api/v1/ipd/admissions`: Body `{ patientId, attendingDoctorId, bedId, admittingDiagnosis }`, scoped to `tenantId`, returns `{ success, data: Admission }`.
- `GET /api/v1/ipd/beds`: Query `{ wardId?, status? }`, scoped to `tenantId`, returns `{ success, data: Bed[] }`.
- `POST /api/v1/ipd/admissions/:id/transfer`: Body `{ destinationBedId, reason }`, scoped to `tenantId`, returns `{ success, data: Admission }`.
- `POST /api/v1/ipd/admissions/:id/discharge`: Body `{ dischargeSummary, condition, followUpInstructions }`, scoped to `tenantId`, returns `{ success, data: Admission }`.

## RBAC Requirements
- `admissions.create`: `super_admin`, `hospital_admin`, `doctor`, `receptionist`.
- `admissions.read`: All clinical and administrative roles.
- `admissions.update`: `doctor`, `nurse`.
- `beds.manage`: `hospital_admin`, `nurse`.

## Security Requirements
- **Tenant Isolation**: All IPD operations strictly scoped to caller's verified `tenantId`.
- Atomic bed allocation prevents two patients from being assigned to the same bed concurrently.
- Discharge authorization restricted strictly to medical officers and doctors.

## Audit Requirements
- `IPD_ADMISSION`: Records admission ID, patient ID, bed ID, admitting doctor.
- `BED_ALLOCATION`: Records bed ID and allocated admission ID.
- `BED_TRANSFER`: Records from-bed, to-bed, transfer reason, and authorizer.
- `IPD_DISCHARGE`: Records discharge date, final condition, and discharging doctor.

## UX Requirements
- Color-coded bed tiles providing instant visual status comprehension:
  - Green = Available
  - Red = Occupied
  - Amber = Cleaning / Sanitization in progress
  - Slate = Maintenance / Out of service
- Accessible dialog for bed transfers with confirmation of bed readiness.

## Testing Requirements
- Unit tests for `BedService`:
  - Occupied bed cannot be double-allocated.
  - Transferring patient frees origin bed and marks it for cleaning.
  - Ward bed census correctly calculates available vs total beds.
- API tests:
  - Admitting patient without valid bed returns 400 Bad Request.
  - Discharge sets bed status to `cleaning`.

## Acceptance Criteria
- [ ] Ward and Bed collections configured with occupancy lifecycle.
- [ ] Visual bed matrix displays color-coded bed statuses in real time.
- [ ] Patient admission reserves bed atomically.
- [ ] Bed transfer workflow reassigns bed and records transfer history.
- [ ] Inpatient discharge workflow captures summary and frees bed.
- [ ] Role-based guards enforce admission and discharge rights.
- [ ] Unit and API tests pass cleanly.

## Dependencies
- Upstream: Milestone 03 (Patient Registry) and Milestone 05 (Doctor Diagnosis).
- Downstream: Milestone 10 (IPD Bed Invoicing and Final Billing).

## Implementation Notes
- Bed allocation and status update MUST execute inside a MongoDB transaction to prevent concurrency conflicts during rush admissions.

## Do Not Implement
- Inpatient drug dispensing, inventory item depletion, or final payment receipts.
