# Milestone 07 — Laboratory Information System (LIS)

## Objective
Build the hospital Laboratory Information System (LIS) managing diagnostic test catalogs, electronic laboratory requisitions, specimen collection tracking, result entry with normal reference range validation, technician verification, and formatted diagnostic reports conforming to `docs/DATABASE.md`.

## Scope
- Diagnostic Test Master Catalog (`lab_tests`):
  - Test code, test name, category (Hematology, Biochemistry, Microbiology, Immunology, Serology, Pathology).
  - Required specimen type (e.g. Venous Blood, Serum, Plasma, Midstream Urine, Sputum).
  - Structured parameter definitions: Parameter name, standard unit, reference ranges (stratified by gender and age brackets), and critical alert thresholds.
  - Standard tariff/price reference.
- Laboratory Order Management (`lab_orders`):
  - Electronic requisitions originating from OPD consultation, IPD rounds, or direct lab reception.
  - Order priority: `routine`, `urgent`, `stat` (emergency immediate).
  - Status lifecycle: `ordered` → `sample_collected` → `in_process` → `result_entered` → `verified` → `cancelled`.
- Specimen Collection & Barcode Tracking (`lab_samples`):
  - Accessioning workflow: Assigns unique accession number and barcode.
  - Captures collection timestamp, container type (e.g. EDTA, Sodium Citrate, Plain), and phlebotomist identity.
- Result Entry Workflow (`lab_results`):
  - Parameter-by-parameter value entry.
  - Automated flag calculation: Compares measured values against reference ranges, assigning visual flags: `NORMAL`, `HIGH`, `LOW`, `CRITICAL`.
  - Free-text interpretation notes and micro-organism/culture growth observations.
- Two-Tier Verification & Authorization (`lab_reports`):
  - Medical Laboratory Technician enters values.
  - Pathologist / Laboratory Director reviews, approves, and electronically signs results.
  - Published reports become immutable and visible in the patient's EMR profile.

## Out of Scope
- Direct automated bi-directional serial/HL7 interfacing with physical chemistry analyzers (Phase 2 integrations).
- Billing invoice generation and lab payment settlement (Milestone 10).
- Inventory consumption tracking for laboratory reagents (Milestone 09).

## Prerequisites
- Milestone 03 (Patient Registry - patient UHID).
- Milestone 05 (Doctor Consultation & EMR - electronic investigation requisitions).

## User Workflows
1. **Requisition**: Attending doctor selects "Complete Blood Count (CBC)" and "Lipid Profile" during consultation. System generates a `LabOrder` with `routine` priority.
2. **Sample Collection**: Phlebotomist retrieves order by patient UHID, draws venous blood into EDTA and Gel SST tubes, clicks "Collect Sample", and attaches barcode `ACC-2026-0914`. Order state transitions to `sample_collected`.
3. **Result Entry**: Lab Technician receives specimen in hematology lab, enters Hemoglobin (13.5 g/dL), WBC (7,200 /uL), Platelets (240,000 /uL). System marks all values as `NORMAL`. For Serum Cholesterol (245 mg/dL), system flags as `HIGH`.
4. **Pathologist Verification**: Pathologist inspects results, reviews high cholesterol flag, enters clinical comment ("Hypercholesterolemia noted; recommend dietary intervention and repeat in 3 months"), and signs off report.
5. **Publishing**: Report state updates to `verified`. Attending physician and patient profile immediately reflect the verified report.

## Frontend Requirements
- **Pages**:
  - `/laboratory`: Master laboratory dashboard with work queues (Pending Collection, In Process, Awaiting Verification, Completed Today).
  - `/laboratory/tests`: Diagnostic test catalog master.
  - `/laboratory/orders/new`: Lab requisition entry for outpatient walk-ins.
  - `/laboratory/worklist`: Technician bench worksheet for batch result entry.
  - `/laboratory/reports/[orderId]`: Diagnostic lab report view with PDF download/print layout.
- **Components**:
  - `ResultEntryGrid`: Dynamic table displaying parameter name, unit, reference range, numeric input, and auto-computed flag.
  - `CriticalValueAlert`: Red alert banner triggered when a result enters life-threatening critical range.
  - `AccessionBadge`: Barcode format representation with accession identifier.
  - `PathologistSignatureBox`: Verification stamp showing approving doctor and timestamp.
- **States**: High/Low color indicators (Red for High, Blue for Low, Flashing Amber for Critical), pending verification filter.

## Backend Requirements
- **Modules**: `LaboratoryModule` in `apps/api/src/laboratory/`.
- **Controllers**:
  - `LaboratoryController`:
    - `POST /api/v1/lab/orders`: Create order (`lab.orders.create`).
    - `GET /api/v1/lab/orders`: List orders by date, status, priority, patient (`lab.orders.read`).
    - `POST /api/v1/lab/orders/:id/sample`: Record sample collection (`lab.orders.update`).
    - `POST /api/v1/lab/orders/:id/results`: Enter parameter results (`lab.results.enter`).
    - `POST /api/v1/lab/orders/:id/verify`: Approve and sign report (`lab.results.verify`).
    - `GET /api/v1/lab/tests`: Retrieve test catalog (`lab.tests.read`).
- **Services**:
  - `LaboratoryService`: Manages order lifecycle, auto-computes abnormal flags against reference ranges, and handles pathologist verification.

## Database Requirements
- **Collections**:
  - `lab_tests`:
    - `code`: String, unique (e.g. "CBC", "LIPID")
    - `name`: String, required
    - `category`: String enum (`hematology`, `biochemistry`, `microbiology`, `immunology`, `serology`, `pathology`)
    - `specimenType`: String
    - `parameters`: Array of Objects `[{ name: String, unit: String, referenceMin: Number, referenceMax: Number, criticalLow: Number, criticalHigh: Number, textOptions?: String[] }]`
    - `tariffPrice`: Number
    - `isActive`: Boolean
  - `lab_orders`:
    - `orderNumber`: String, unique (e.g. "LAB-2026-00108")
    - `patientId`: ObjectId, ref 'Patient', required
    - `doctorId`: ObjectId, ref 'User', required
    - `testIds`: Array of ObjectIds, ref 'LabTest', required
    - `priority`: String enum (`routine`, `urgent`, `stat`), default `routine`
    - `status`: String enum (`ordered`, `sample_collected`, `in_process`, `result_entered`, `verified`, `cancelled`), default `ordered`
    - `accessionNumber`: String
    - `sampleCollectedAt`: Date
    - `results`: Array of Objects `[{ testId: ObjectId, parameterName: String, value: String, numericValue?: Number, unit: String, flag: String, referenceText: String }]`
    - `verifiedBy`: ObjectId, ref 'User'
    - `verifiedAt`: Date
    - `technicianNotes`: String
    - `pathologistRemarks`: String
    - `createdAt`, `updatedAt`: Timestamps
- **Indexes**:
  - `lab_orders`: `{ patientId: 1, createdAt: -1 }`
  - `lab_orders`: `{ status: 1, priority: 1, createdAt: -1 }`
  - `lab_orders`: `{ orderNumber: 1 }` (unique)
  - `lab_tests`: `{ code: 1 }` (unique)

## API Requirements
- `POST /api/v1/lab/orders`: Body `{ patientId, doctorId, testIds, priority }`, returns `{ success, data: LabOrder }`.
- `POST /api/v1/lab/orders/:id/sample`: Body `{ containerType, collectedNotes }`, returns `{ success, data: LabOrder }`.
- `POST /api/v1/lab/orders/:id/results`: Body `{ results: [{ testId, parameterName, value }] }`, returns `{ success, data: LabOrder }`.
- `POST /api/v1/lab/orders/:id/verify`: Body `{ pathologistRemarks }`, returns `{ success, data: LabOrder }`.

## RBAC Requirements
- `lab.orders.create`: `doctor`, `hospital_admin`, `receptionist`.
- `lab.orders.read`: All clinical roles.
- `lab.results.enter`: `lab_technician`, `super_admin`.
- `lab.results.verify`: `super_admin`, `doctor` (Pathologist role).

## Security Requirements
- Parameter validation: Numeric results validated for sanity boundaries.
- Verified reports are locked against modification; corrections require a distinct addendum record.
- Strict isolation: Lab results for restricted infectious panels follow hospital confidentiality tags.

## Audit Requirements
- `LAB_ORDER_CREATE`: Records requisitioning physician, tests requested, and patient UHID.
- `SAMPLE_COLLECT`: Records phlebotomist ID, accession barcode, and timestamp.
- `LAB_RESULT_ENTER`: Records technician identity and entered parameter values.
- `LAB_RESULT_VERIFY`: Records pathologist identity, verification timestamp, and remarks.

## UX Requirements
- High-efficiency worklist allowing lab technicians to rapidly tab through parameter inputs.
- Clear visual differentiation for abnormal flags (High in bold red, Low in deep blue).
- Print stylesheet producing an official hospital diagnostic letterhead format.

## Testing Requirements
- Unit tests:
  - Abnormal flag computation correctly labels values below min as `LOW`, above max as `HIGH`, and inside range as `NORMAL`.
  - Critical threshold alert triggers when value crosses critical boundaries.
  - Only authorized users with `lab.results.verify` can sign off.
- API tests:
  - Entering results transitions status to `result_entered`.
  - Requisitioning without test IDs returns 400 Bad Request.

## Acceptance Criteria
- [ ] Diagnostic test master supports multi-parameter tests with reference ranges.
- [ ] Electronic lab orders generated with priority tags.
- [ ] Sample collection generates accession number and advances state.
- [ ] Technician result entry compares inputs against reference ranges and sets flags.
- [ ] Pathologist sign-off locks report and updates state to `verified`.
- [ ] RBAC guards restrict result entry and verification appropriately.
- [ ] Unit and API tests pass cleanly.

## Dependencies
- Upstream: Milestone 03 (Patients) and Milestone 05 (Clinical EMR Requisitions).
- Downstream: Milestone 10 (Diagnostic Billing & Invoicing).

## Implementation Notes
- Store reference range snapshots alongside the test result at the time of entry to ensure historical integrity if reference ranges are modified in the master test catalog later.

## Do Not Implement
- Physical laboratory machine serial communication, reagent warehouse depletion, or patient invoice receipts.
