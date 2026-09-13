# Milestone 05 — Doctor Consultation & EMR

## Objective
Build the core clinical consultation workspace for physicians to conduct outpatient examinations, record patient vitals, document clinical notes, record ICD-10 diagnoses, generate digital prescriptions, and order investigations.

## Scope
- Clinical Encounter management (`encounters` collection):
  - Association with patient (UHID), doctor, and appointment.
  - Lifecycle: `draft` / `in_progress` → `finalized` / `completed`.
- Vitals collection and auto-calculations:
  - Blood pressure (systolic/diastolic mm Hg), pulse rate (bpm), temperature, respiratory rate, SpO2 (%), height (cm), weight (kg).
  - Automatic BMI computation and classification (`underweight`, `normal`, `overweight`, `obese`).
- Physician Clinical Notes:
  - Chief complaints, History of Present Illness (HPI), physical examination findings, systemic exam, and treatment plan.
- Diagnosis Recording (`diagnoses`):
  - Primary diagnosis and secondary comorbidities.
  - ICD-10 code search and free-text clinical description.
  - Diagnosis status: `provisional` vs `confirmed`.
- E-Prescriptions (`prescriptions`):
  - Itemized drug entries: Generic/brand name, dosage form (tablet, capsule, suspension, injection), strength, frequency/schedule (e.g. 1-0-1, OD, BD, TID, PRN), administration route, duration (days), total quantity, and meal instructions (e.g., "After meals").
  - Allergy contraindication warnings against patient allergy profile.
- Investigation Orders (requisitions for laboratory tests).
- Doctor Consultation Workspace UI (`/emr/consultation/[appointmentId]`):
  - Split-screen or focused layout: Left pane displays patient history and vitals; right pane provides SOAP notes and prescription builder.
- Finalize Consultation workflow: Signs and seals encounter, transitions appointment to `completed`, and queues prescription for pharmacy dispensing.

## Out of Scope
- Pharmacy batch selection, stock deduction, and dispensing (Milestone 08).
- Laboratory sample collection, result entry, and technician verification (Milestone 07).
- Inpatient nursing medication administration charts (Milestone 06).
- Automated AI clinical documentation copilot (Phase 2 AI).

## Prerequisites
- Milestone 03 (Patient Management - UHID, demographics, allergies).
- Milestone 04 (Appointments & OPD - appointment queue and check-in).

## User Workflows
1. **Start Consultation**: Doctor opens OPD queue, selects checked-in patient, and clicks "Start Consultation". System creates an active `Encounter` and updates appointment state to `in_consultation`.
2. **Review Patient Context**: Doctor views patient clinical banner (UHID, age, sex, and critical allergy alerts).
3. **Record Vitals**: Nurse or Doctor enters BP (120/80), Pulse (72), Temp (98.6 F), Weight (70kg), Height (175cm). System automatically calculates BMI (22.9, Normal).
4. **Document Clinical Notes & Diagnoses**: Doctor records complaints, searches ICD-10 for "Acute upper respiratory infection", marks as confirmed.
5. **Build E-Prescription**: Doctor adds Amoxicillin 500mg, 1 tablet TID for 5 days. System verifies against patient allergies.
6. **Finalize Encounter**: Doctor reviews summary, clicks "Complete Consultation". Notes become read-only, prescription is sealed, and patient is discharged from queue.

## Frontend Requirements
- **Pages**:
  - `/emr`: Doctor's active patient queue and recent consultation history.
  - `/emr/consultation/[appointmentId]`: Complete physician consultation cockpit.
  - `/patients/[id]/emr`: Historical timeline of past patient encounters and prescriptions.
- **Components**:
  - `VitalsCaptureCard`: Input fields with unit indicators, BMI auto-display, and previous vitals comparison.
  - `DiagnosisSelector`: Autocomplete ICD-10 selector with custom entry option.
  - `PrescriptionBuilder`: Dynamic row editor for medicines with dosage presets, frequency buttons, and meal timing toggles.
  - `PatientAllergyAlertBox`: Prominent banner warning doctor of severe allergies.
  - `EncounterSummaryModal`: Review step before finalizing clinical document.
- **States**: Autosave draft indicators ("Draft saved 2m ago"), finalizing loading spinner, confirmation modal on encounter seal.

## Backend Requirements
- **Modules**: `EmrModule` in `apps/api/src/emr/`.
- **Controllers**:
  - `EmrController`:
    - `POST /api/v1/emr/encounters`: Initialize encounter (`emr.create`).
    - `GET /api/v1/emr/encounters/:id`: Retrieve encounter details (`emr.read`).
    - `PATCH /api/v1/emr/encounters/:id`: Save draft notes, vitals, diagnoses (`emr.update`).
    - `POST /api/v1/emr/encounters/:id/finalize`: Finalize and lock encounter (`emr.update`).
    - `POST /api/v1/emr/prescriptions`: Create e-prescription (`prescriptions.create`).
    - `GET /api/v1/emr/patients/:patientId/history`: Encounter history (`emr.read`).
- **Services**:
  - `EmrService`: Manages encounter state transitions, merges vitals, checks allergy interactions.
  - `PrescriptionService`: Validates prescription items, formats instructions, links to encounter.

## Database Requirements
- **Collections**:
  - `encounters` (Tenant-Owned):
    - `_id`: ObjectId
    - `tenantId`: ObjectId, ref 'Tenant', required, index: true
    - `hospitalId`: ObjectId, ref 'Hospital', required: false
    - `patientId`: ObjectId, ref 'Patient', required
    - `doctorId`: ObjectId, ref 'User', required
    - `appointmentId`: ObjectId, ref 'Appointment', required
    - `status`: String enum (`draft`, `finalized`), default `draft`
    - `vitals`: Object `{ bpSystolic: Number, bpDiastolic: Number, pulse: Number, temperature: Number, respiratoryRate: Number, spO2: Number, weight: Number, height: Number, bmi: Number }`
    - `chiefComplaints`: Array of Strings
    - `historyOfPresentIllness`: String
    - `examinationNotes`: String
    - `diagnoses`: Array of Objects `[{ code: String, description: String, type: String, status: String }]`
    - `finalizedAt`: Date
    - `createdAt`, `updatedAt`: Timestamps
  - `prescriptions` (Tenant-Owned):
    - `_id`: ObjectId
    - `tenantId`: ObjectId, ref 'Tenant', required, index: true
    - `encounterId`: ObjectId, ref 'Encounter', required
    - `patientId`: ObjectId, ref 'Patient', required
    - `doctorId`: ObjectId, ref 'User', required
    - `status`: String enum (`active`, `dispensed`, `cancelled`), default `active`
    - `items`: Array of Objects `[{ medicineName: String, dosageForm: String, strength: String, frequency: String, route: String, durationDays: Number, quantity: Number, instructions: String }]`
    - `createdAt`, `updatedAt`: Timestamps
- **Indexes**:
  - `encounters`: `{ tenantId: 1, patientId: 1, createdAt: -1 }`
  - `encounters`: `{ tenantId: 1, appointmentId: 1 }` (unique)
  - `prescriptions`: `{ tenantId: 1, encounterId: 1 }`
  - `prescriptions`: `{ tenantId: 1, patientId: 1, createdAt: -1 }`

## API Requirements
- `POST /api/v1/emr/encounters`: Body `{ appointmentId, patientId }`, scoped to `tenantId`, returns `{ success, data: Encounter }`.
- `PATCH /api/v1/emr/encounters/:id`: Body `{ vitals, chiefComplaints, notes, diagnoses, prescriptionItems }`, scoped to `tenantId`.
- `POST /api/v1/emr/encounters/:id/finalize`: Seals record, scoped to `tenantId`, updates appointment to `completed`.

## RBAC Requirements
- `emr.create`, `emr.update`: `doctor`.
- `emr.read`: `doctor`, `nurse`, `hospital_admin`.
- `prescriptions.create`: `doctor`.
- `prescriptions.read`: `doctor`, `nurse`, `pharmacist`.

## Security Requirements
- Finalized encounters are immutable; updates after finalization require an explicit addendum mechanism.
- Tamper-proof timestamping on doctor signature.
- Strict authorization check: Only the attending doctor can edit draft encounter notes.

## Audit Requirements
- `ENCOUNTER_START`: Records encounter ID, doctor ID, patient ID.
- `ENCOUNTER_FINALIZE`: Records finalized timestamp, doctor signature ID.
- `PRESCRIPTION_CREATE`: Records prescribed items and patient ID.

## UX Requirements
- High-efficiency clinician layout minimizing mouse clicks (tab order, keyboard shortcuts for dosage).
- Prominent drug-allergy alert modal if doctor prescribes a contraindicated drug category.
- Print-ready prescription stylesheet view for clinic printers.

## Testing Requirements
- Unit tests:
  - BMI calculation logic across metric/imperial boundaries.
  - Encounter finalization locks edits against subsequent mutation.
  - Allergy alert trigger when prescribed drug matches patient allergy string.
- API tests:
  - Non-doctor roles rejected when attempting to create clinical notes.
  - Appointment status accurately transitions to `completed` upon encounter sign-off.

## Acceptance Criteria
- [ ] Doctor consultation cockpit loads checked-in patient details and allergy warnings.
- [ ] Vitals recording automatically computes and classifies BMI.
- [ ] Diagnosis selector supports primary/secondary designations.
- [ ] Prescription builder supports itemized medicines, schedules, and instructions.
- [ ] Finalize workflow locks encounter and marks appointment complete.
- [ ] Role guards allow only doctors to create prescriptions.
- [ ] Unit and API tests pass.

## Dependencies
- Upstream: Milestone 03 (Patients) and Milestone 04 (Appointments).
- Downstream: Milestone 07 (Laboratory Orders) and Milestone 08 (Pharmacy Dispensing).

## Implementation Notes
- Store structured prescription items rather than raw strings to facilitate automatic pharmacy stock lookup and drug validation.

## Do Not Implement
- Pharmacy inventory deductions, lab specimen processing, or inpatient bed nursing charts.
