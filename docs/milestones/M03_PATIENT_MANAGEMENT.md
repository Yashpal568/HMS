# Milestone 03 — Patient Management

## Objective
Build the authoritative patient registry, automated Unique Hospital Identifier (UHID) generation, demographic directory, duplicate detection, and authorized patient profile view adhering strictly to `docs/DATABASE.md` and `docs/PRD.md`.

## Scope
- Centralized `Patient` Mongoose model conforming to `docs/DATABASE.md`.
- Automated, sequential, collision-free UHID generation (`UHID-YYYY-XXXXXX`).
- Patient registration form:
  - Personal demographics: First name, middle name, last name, date of birth, biological sex, blood group, marital status.
  - Contact information: Phone number (primary/secondary), email, physical address (street, city, state, postal code, country).
  - Emergency contacts: Contact person name, relationship, verified phone.
  - Allergy summary: Drug, food, and environmental allergies with severity ratings (`mild`, `moderate`, `severe`).
- Duplicate detection engine checking existing records by phone number and date of birth before creating new files.
- Patient directory view (`/patients`):
  - Search by UHID, patient name, or phone number.
  - Pagination, sorting (latest first), and status filters (`active`, `inactive`, `deceased`).
- Patient profile page (`/patients/[id]`):
  - Clinical patient header banner displaying name, UHID, age, sex, blood group, and high-visibility allergy warnings.
  - Organized tabs for Demographics, Contact Details, Emergency Contacts, and Allergies.
  - Placeholders for Encounters, Appointments, Prescriptions, and Billing (ready for subsequent milestones).
- Reusable Patient API endpoints protected by JWT and RBAC (`patients.read`, `patients.create`, `patients.update`).
- Audit logging for all patient record creations, updates, and accesses.

## Out of Scope
- Appointment booking or OPD token generation (Milestone 04).
- Clinical consultation notes, vitals capture, and diagnosis coding (Milestone 05).
- IPD admission or bed allocation (Milestone 06).
- Billing invoices or payment collections (Milestone 10).
- Document scanning / binary file attachment storage (Milestone 11/Documents).

## Prerequisites
- Milestone 01 (Authentication, RBAC & Security Foundation) complete.
- Milestone 02 (Application Shell & Dashboard) complete.
- `JwtAuthGuard` and `PermissionsGuard` available.

## User Workflows
1. **Patient Registration**: Receptionist receives a new patient, clicks "Register Patient" on `/patients`, enters demographics, address, emergency contact, and allergy warnings. System checks for duplicate phone/DOB matches. Upon confirmation, generates a unique UHID, saves to MongoDB Atlas, records an audit event, and navigates to the patient profile.
2. **Patient Search**: Receptionist or Doctor searches by UHID or phone number. The directory renders instant paginated matches with quick profile navigation.
3. **Patient Profile Review**: Clinician inspects patient file; critical allergy alerts are highlighted immediately in the patient header.
4. **Updating Demographics**: Authorized staff updates contact address or phone number; changes are validated, persisted, and audited.

## Frontend Requirements
- **Pages**:
  - `/patients`: Directory table with search bar, status filters, registration button, and paginated patient rows.
  - `/patients/register`: Multi-step or grouped registration form with validation and duplicate prevention warnings.
  - `/patients/[id]`: Comprehensive patient profile with header banner and tabbed navigation.
  - `/patients/[id]/edit`: Demographic and contact update form.
- **Components**:
  - `PatientHeader`: Standardized clinical patient banner showing UHID, name, age/sex, blood group, and allergy badges.
  - `PatientSearchInput`: Debounced search input with typeahead capability.
  - `PatientTable`: High-density accessible data table with column headers, status tags, and action buttons.
  - `AllergyBadgeList`: Visual severity tags for patient allergies.
- **Forms**:
  - React Hook Form + Zod schema validation ensuring valid phone numbers, valid DOBs, and required demographic fields.
- **States**: Skeleton rows during search/load, empty state ("No patients matching search criteria"), duplicate alert modal.

## Backend Requirements
- **Modules**: `PatientsModule` in `apps/api/src/patients/`.
- **Controllers**:
  - `PatientsController`:
    - `POST /api/v1/patients`: Create patient (requires `patients.create`).
    - `GET /api/v1/patients`: List patients with query params `search`, `page`, `limit`, `status` (requires `patients.read`).
    - `GET /api/v1/patients/:id`: Get single patient by ObjectId or UHID (requires `patients.read`).
    - `PATCH /api/v1/patients/:id`: Update patient details (requires `patients.update`).
- **Services**:
  - `PatientsService`:
    - `generateUhid()`: Sequential counter or atomic format (`UHID-YYYY-NNNNNN`).
    - `checkDuplicates(dto)`: Queries by phone and DOB.
    - `createPatient(dto, tenantId, userId)`: Validates, assigns UHID, scopes to tenant, saves, and logs audit.
    - `findPatients(filter, pagination, tenantId)`: Performs case-insensitive regex or index query scoped to caller's tenantId.
    - `findPatientById(id, tenantId)`: Queries `{ _id: id, tenantId }`, returning 404 if not found or owned by another tenant.
- **DTOs**: `CreatePatientDto`, `UpdatePatientDto`, `PatientQueryDto` with `class-validator` annotations.

## Database Requirements
- **Collection**: `patients` (Tenant-Owned).
- **Schema Fields**:
  - `_id`: ObjectId
  - `tenantId`: ObjectId, required, ref: 'Tenant', index: true
  - `uhid`: String, required, tenant-scoped unique identifier
  - `name`: Object `{ first: String, middle?: String, last: String }`, required
  - `dateOfBirth`: Date, required
  - `gender`: String enum (`male`, `female`, `other`), required
  - `bloodGroup`: String enum (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, `unknown`)
  - `maritalStatus`: String enum (`single`, `married`, `divorced`, `widowed`)
  - `contacts`: Object `{ phone: String, alternatePhone?: String, email?: String, address: { street: String, city: String, state: String, postalCode: String, country: String } }`
  - `emergencyContact`: Object `{ name: String, relationship: String, phone: String }`
  - `allergies`: Array of Objects `[{ allergen: String, category: String, severity: String, notes?: String }]`
  - `status`: String enum (`active`, `inactive`, `deceased`), default `active`
  - `createdAt`, `updatedAt`: Timestamps
  - `createdBy`, `updatedBy`: String user IDs
- **Indexes**:
  - `{ tenantId: 1, uhid: 1 }` (unique: true)
  - `{ tenantId: 1, 'contacts.phone': 1, dateOfBirth: 1 }`
  - `{ tenantId: 1, 'name.last': 1, 'name.first': 1 }`
  - `{ tenantId: 1, createdAt: -1 }`

## API Requirements
- `POST /api/v1/patients`: Body `CreatePatientDto`, automatically attaches caller's `tenantId`, returns `{ success: true, data: Patient }`.
- `GET /api/v1/patients`: Query `{ search?: string, page?: number, limit?: number }`, scoped to `tenantId`, returns `{ success: true, data: Patient[], meta: PaginationMeta }`.
- `GET /api/v1/patients/:id`: Param `id`, scoped to `tenantId`, returns `{ success: true, data: Patient }` (or `404 Not Found` if belonging to another tenant).
- `PATCH /api/v1/patients/:id`: Body `UpdatePatientDto`, scoped to `tenantId`, returns `{ success: true, data: Patient }`.

## RBAC Requirements
- `patients.create`: Assigned to `super_admin`, `hospital_admin`, `receptionist`.
- `patients.read`: Assigned to all clinical and administrative roles.
- `patients.update`: Assigned to `super_admin`, `hospital_admin`, `receptionist`, `nurse`.
- `patients.delete`: Strictly restricted to `super_admin`.

## Security Requirements
- **Tenant Isolation**: Non-negotiable backend-enforced scoping using caller's verified `tenantId`. Client cannot specify or override `tenantId`.
- **IDOR Defense & Existence Masking**: Cross-tenant ID queries return uniform `404 Not Found`.
- Full request validation via DTO pipes.
- Sensitive identifiers masked on preview screens.
- Server-side authorization check for all patient mutation operations.
- Direct database queries from frontend strictly prohibited.

## Audit Requirements
- `PATIENT_CREATE`: Records new UHID, creating staff ID, timestamp.
- `PATIENT_UPDATE`: Records modified fields, updating staff ID, timestamp.
- `PATIENT_ACCESS`: Records patient record view for security accountability.

## UX Requirements
- High-contrast clinical allergy warning indicator (prominent amber/red badge).
- Inline form validation for required fields before submit.
- Keyboard-accessible table rows with enter-to-view navigation.
- Accessible pagination with explicit page number displays.

## Testing Requirements
- Unit tests for `PatientsService`:
  - Collision-free UHID generation.
  - Duplicate detection triggers when phone and DOB match.
  - Successful patient creation and retrieval.
- API integration tests:
  - Verify `patients.create` permission enforcement.
  - Verify 400 Bad Request on invalid demographic data.
  - Verify 404 Not Found on invalid patient ID.

## Acceptance Criteria
- [ ] Patient Mongoose schema matches `docs/DATABASE.md`.
- [ ] UHID generates automatically and uniquely.
- [ ] Registration form validates all inputs and captures allergies.
- [ ] Duplicate detection flags matching phone + DOB.
- [ ] Patient directory lists, searches, and paginates records.
- [ ] Patient profile displays clinical header banner and allergy badges.
- [ ] RBAC permissions enforced on backend.
- [ ] Audit logs recorded for patient operations.
- [ ] Tests cover service and controller logic.
- [ ] Production build and lint pass cleanly.

## Dependencies
- Upstream: Milestone 01 (Auth/RBAC) and Milestone 02 (App Shell).
- Downstream: Milestone 04 (Appointments & OPD), Milestone 05 (EMR), Milestone 06 (IPD).

## Implementation Notes
- Use atomic sequence counter in MongoDB for sequential UHID or year-prefixed incrementer to avoid race conditions.
- Patient name search must support case-insensitive prefix queries.

## Do Not Implement
- Appointment scheduling, consultation vitals, inpatient bed booking, or billing charges.
