# Milestone 04 — Appointments & OPD Queue

## Objective
Implement doctor scheduling, outpatient appointment booking, queue token dispatch, and reception check-in workflows to manage daily outpatient flow efficiently.

## Scope
- Doctor schedule and roster collection (`doctor_schedules`): Available days of week, clinic hours, appointment slot duration (e.g. 15 minutes), max daily slots.
- Appointment collection (`appointments`) conforming to `docs/DATABASE.md`.
- Appointment creation workflow:
  - Select registered patient (via UHID search).
  - Select department and attending clinician.
  - Select available time slot based on doctor's active schedule.
  - Record visit reason, visit type (`new`, `follow_up`, `walk_in`).
- Daily OPD Queue & Token Management:
  - Automatic daily sequential token number allocation (`Token #01`, `Token #02`, etc.).
  - Appointment lifecycle states: `scheduled`, `checked_in`, `in_consultation`, `completed`, `cancelled`, `no_show`.
- Reception Check-In Action: Marks arrival, timestamps check-in, and pushes the patient into the doctor's live waiting queue.
- Reception OPD Dashboard & Doctor Queue View:
  - Real-time queue table filterable by department, doctor, and date.
  - Quick action buttons to check-in, reschedule, or cancel.
- Backend API endpoints protected by JWT and RBAC (`appointments.*`).
- Security audit logging for appointment lifecycle changes.

## Out of Scope
- Doctor consultation notes, clinical diagnosis, and prescription writing (Milestone 05).
- Inpatient admission from OPD (Milestone 06).
- Billing invoice generation for consultation fees (Milestone 10).
- SMS / WhatsApp patient appointment reminder integrations (deferred to communication phase).

## Prerequisites
- Milestone 01 (Auth & RBAC).
- Milestone 02 (App Shell & Dashboard).
- Milestone 03 (Patient Management - patient directory and UHIDs available).

## User Workflows
1. **Configure Doctor Schedule**: Hospital Admin sets Dr. Smith's OPD hours (Monday-Friday, 09:00 - 13:00, 15-min slots).
2. **Book Appointment**: Receptionist enters patient UHID, selects Dr. Smith for tomorrow at 10:30 AM, notes chief complaint ("persistent cough"), and submits. System issues confirmation with Appointment ID and slot details.
3. **Walk-In Check-in**: A walk-in patient arrives. Receptionist creates walk-in appointment, immediately triggers Check-In, and issues next available token number (`Token #14`).
4. **Queue Monitoring**: Receptionist and OPD Nurse monitor live queue statuses (Waiting: 4, In Consultation: 1, Completed: 8).
5. **Cancellation / Reschedule**: Patient calls to reschedule; staff selects new slot or cancels with reason, updating appointment state and logging audit event.

## Frontend Requirements
- **Pages**:
  - `/appointments`: Daily OPD schedule and queue board.
  - `/appointments/book`: Booking wizard with patient selection, doctor selector, calendar slot picker, and complaint note.
  - `/appointments/[id]`: Detailed appointment view with history and status change controls.
  - `/appointments/schedules`: Doctor scheduling configuration view for administrators.
- **Components**:
  - `OpdQueueTable`: High-density operational table showing Token #, Patient UHID, Patient Name, Doctor, Scheduled Time, Status, and Action buttons.
  - `SlotPicker`: Visual time-grid showing available, booked, and blocked slots.
  - `AppointmentStatusBadge`: Semantic status tag (`Scheduled` [blue], `Checked-In` [teal], `In Consultation` [amber], `Completed` [green], `Cancelled` [red]).
  - `CheckInModal`: Confirmation dialog to verify patient presence.
- **States**: Skeleton grid during slot loading, empty queue message ("No appointments scheduled for selected date"), slot clash error alert.

## Backend Requirements
- **Modules**: `AppointmentsModule` in `apps/api/src/appointments/`.
- **Controllers**:
  - `AppointmentsController`:
    - `POST /api/v1/appointments`: Book appointment (`appointments.create`).
    - `GET /api/v1/appointments`: Filter appointments by date, doctorId, status, patientId (`appointments.read`).
    - `GET /api/v1/appointments/:id`: Retrieve details (`appointments.read`).
    - `POST /api/v1/appointments/:id/check-in`: Transition to `checked_in` (`appointments.update`).
    - `POST /api/v1/appointments/:id/cancel`: Transition to `cancelled` with reason (`appointments.cancel`).
    - `POST /api/v1/appointments/schedules`: Create/update doctor schedule (`hospital_admin`).
- **Services**:
  - `AppointmentsService`:
    - `getAvailableSlots(doctorId, date)`: Computes unallocated slots against doctor schedule.
    - `bookAppointment(dto, userId)`: Prevents double-booking via atomic check-and-reserve.
    - `getNextToken(doctorId, date)`: Generates daily incrementing token number.
    - `checkIn(id, userId)`: Sets status and check-in timestamp.
- **DTOs**: `BookAppointmentDto`, `CancelAppointmentDto`, `DoctorScheduleDto`.

## Database Requirements
- **Collections**:
  - `appointments`:
    - `_id`: ObjectId
    - `hospitalId`: ObjectId
    - `patientId`: ObjectId, ref 'Patient', required
    - `doctorId`: ObjectId, ref 'User', required
    - `department`: String, required
    - `tokenNumber`: Number, required
    - `scheduledAt`: Date, required
    - `timeSlot`: String (e.g. "10:30 - 10:45"), required
    - `type`: String enum (`new`, `follow_up`, `walk_in`), default `new`
    - `status`: String enum (`scheduled`, `checked_in`, `in_consultation`, `completed`, `cancelled`, `no_show`), default `scheduled`
    - `chiefComplaint`: String
    - `checkedInAt`: Date
    - `cancelledReason`: String
    - `createdAt`, `updatedAt`: Timestamps
  - `doctor_schedules`:
    - `doctorId`: ObjectId, ref 'User', required
    - `department`: String, required
    - `dayOfWeek`: Number (0-6), required
    - `startTime`: String ("09:00")
    - `endTime`: String ("13:00")
    - `slotDurationMinutes`: Number (default 15)
    - `maxPatients`: Number
    - `isActive`: Boolean
- **Indexes**:
  - `appointments`: `{ doctorId: 1, scheduledAt: 1 }`
  - `appointments`: `{ patientId: 1, scheduledAt: -1 }`
  - `appointments`: `{ doctorId: 1, scheduledAt: 1, tokenNumber: 1 }`
  - `doctor_schedules`: `{ doctorId: 1, dayOfWeek: 1 }` (unique)

## API Requirements
- `POST /api/v1/appointments`: Request `{ patientId, doctorId, scheduledAt, type, chiefComplaint }`, returns `{ success, data: Appointment }`.
- `GET /api/v1/appointments/slots`: Query `{ doctorId, date }`, returns `{ success, data: { availableSlots: string[] } }`.
- `POST /api/v1/appointments/:id/check-in`: Returns `{ success, data: Appointment }`.
- `POST /api/v1/appointments/:id/cancel`: Request `{ reason }`, returns `{ success, data: Appointment }`.

## RBAC Requirements
- `appointments.create`: `super_admin`, `hospital_admin`, `receptionist`.
- `appointments.read`: All clinical and administrative roles.
- `appointments.update`: `receptionist`, `nurse`, `doctor`.
- `appointments.cancel`: `receptionist`, `hospital_admin`.

## Security Requirements
- Slot double-booking prevention enforced via database transaction or unique slot constraint.
- Patient and doctor identifiers validated against database records.
- Input validation on date ranges and slot strings.

## Audit Requirements
- `APPOINTMENT_CREATE`: Records appointment ID, patient ID, doctor ID, scheduled date.
- `APPOINTMENT_CHECKIN`: Records check-in timestamp and staff ID.
- `APPOINTMENT_CANCEL`: Records cancellation reason and staff ID.

## UX Requirements
- Interactive time slot picker clearly highlighting booked vs free slots.
- Real-time queue count summary badges on the top of the OPD screen.
- High-visibility status transitions for reception staff.

## Testing Requirements
- Unit tests:
  - Slot generator produces correct time slots based on doctor hours and duration.
  - Double booking on the same doctor/time slot is rejected.
  - Token sequence increments properly for the same doctor and date.
- API tests:
  - Check-in transitions status to `checked_in`.
  - Cancellation requires a reason.

## Acceptance Criteria
- [ ] Doctor schedule model and API operational.
- [ ] Appointment booking validates available slots and prevents double-booking.
- [ ] Sequential daily token numbers generated automatically.
- [ ] Reception check-in workflow transitions state correctly.
- [ ] OPD queue table filters by doctor, department, and date.
- [ ] RBAC guards enforce permissions on all appointment routes.
- [ ] Audit logs recorded for booking, check-in, and cancellation.
- [ ] Unit and API tests pass cleanly.

## Dependencies
- Upstream: Milestone 03 (Patient Management).
- Downstream: Milestone 05 (Doctor Consultation & EMR).

## Implementation Notes
- MongoDB transactions should be used when booking a slot if high concurrent booking volume is expected.

## Do Not Implement
- Clinical diagnosis, medical note capture, lab test ordering, or fee invoicing.
