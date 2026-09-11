# Milestone 10 — Billing, Invoicing & Payments

## Objective
Build the hospital financial management system, covering medical service tariffs, itemized patient invoices (OPD consultations, IPD stays, laboratory tests, pharmacy medications), multi-channel payment processing, official receipt generation, and permission-controlled refunds conforming to `docs/DATABASE.md`.

## Scope
- Hospital Service Tariff & Charge Master (`services`, `tariffs`):
  - Standard service catalog (OPD Consultation, Emergency Triage, Daily Bed Charges by Ward, Procedural Fees, Nursing Care, Diagnostic Tariffs).
  - Base price, tax category (GST/VAT percentage), departmental revenue attribution.
- Patient Invoicing Engine (`invoices`):
  - Generation of itemized patient invoices linked to patient UHID.
  - Auto-aggregation of unbilled hospital charges:
    - OPD doctor consultation fees.
    - IPD daily room and nursing charges.
    - Diagnostic laboratory test orders.
    - Pharmacy dispensed medications.
  - Line-item calculations: Quantity, unit price, approved discount amount, applicable tax, and net payable amount.
  - Invoice status lifecycle: `draft` → `issued` → `partially_paid` → `paid` → `cancelled` → `refunded`.
- Multi-Method Payment Processing (`payments`):
  - Support for multiple payment methods: `cash`, `credit_card`, `debit_card`, `upi`, `bank_transfer`, `insurance_claim`.
  - Partial payment handling with live outstanding balance reconciliation.
  - Generation of official hospital receipt with receipt number, cashier signature, and tax breakdown.
- Permission-Controlled Refunds & Credit Notes (`refunds`):
  - Refund initiation with mandatory clinical or administrative justification (e.g., cancelled procedure, billing adjustment).
  - Administrative authorization gate before cash or electronic disbursement.
  - Immutable refund ledger.
- Patient Financial Ledger & Outstanding Balance Overview:
  - Account statement displaying historical invoices, payments, and outstanding balances.
- Financial Math Precision Rule:
  - All currency calculations performed strictly using `Decimal128` or integer minor units (cents / paise) to eliminate JavaScript IEEE-754 floating-point rounding errors.

## Out of Scope
- Direct banking payment gateway API webhooks (Stripe / Razorpay / Adyen direct gateway integrations deferred to integration phase).
- Third-Party Insurance TPA electronic claims interchange (EDI / claims clearinghouses).
- Hospital general ledger / Double-entry bookkeeping accounting software replacement (Tally/SAP integration).

## Prerequisites
- Milestone 03 (Patient Registry - patient UHID).
- Milestone 04 (Appointments - OPD fees).
- Milestone 05 (Doctor Consultation - consultation charges).
- Milestone 06 (IPD - bed charges).
- Milestone 07 (Laboratory - diagnostic charges).
- Milestone 08 (Pharmacy - medication dispensing charges).

## User Workflows
1. **OPD Consultation Billing**: Patient registers for consultation. Receptionist/Cashier selects Dr. Patel, system adds "Specialist OPD Consultation" ($50.00), applies 0% tax, generates invoice `INV-2026-00912`. Patient pays cash; cashier enters $50.00, issues Receipt `RCP-2026-00811`, and marks invoice as `paid`.
2. **IPD Discharge Billing**: Patient is ready for discharge after 4 days in Private Ward. Billing clerk clicks "Generate Inpatient Invoice" on admission `ADM-2026-00042`. System automatically aggregates: 4 days bed charges ($600.00), nursing charges ($150.00), lab tests ($120.00), pharmacy medications ($85.00), total $955.00.
3. **Split Payment**: Patient pays $500.00 via Credit Card and $455.00 via UPI. System creates two payment records, updates invoice balance to $0.00, and transitions status to `paid`.
4. **Refund Request**: An ultrasound was billed but cancelled because the patient was discharged early. Cashier submits a refund request for $80.00. Hospital Accountant reviews justification, approves refund, releases payment, and updates invoice to `refunded`.

## Frontend Requirements
- **Pages**:
  - `/billing`: Billing overview dashboard with daily collections, pending invoices, and outstanding patient accounts.
  - `/billing/invoices/new`: Universal invoice authoring wizard with patient search, item lookup, and auto-charge aggregator.
  - `/billing/invoices/[id]`: Itemized invoice inspection view with payment history and print receipt actions.
  - `/billing/payments`: Payment transactions register with cashier and payment method filters.
  - `/billing/tariffs`: Hospital tariff and price master configuration.
  - `/billing/refunds`: Refund requests queue for accountant authorization.
- **Components**:
  - `InvoiceLineItemEditor`: Table allowing additions of services, drugs, and lab tests with live totals.
  - `PaymentCollectionModal`: Cashier interface with payment method toggles, card approval code inputs, and tendered/change calculator.
  - `OfficialReceiptPrintView`: Clean hospital letterhead receipt formatted for A4 and 80mm thermal receipt printers.
  - `FinancialSummaryCards`: Daily cash, card, UPI, and total collection metrics.
- **States**: Paid green badge, Unpaid red badge, Partial payment indicator, Refunded amber stamp.

## Backend Requirements
- **Modules**: `BillingModule` in `apps/api/src/billing/`.
- **Controllers**:
  - `BillingController`:
    - `POST /api/v1/billing/invoices`: Create invoice (`billing.invoices.create`).
    - `GET /api/v1/billing/invoices`: List invoices with date, status, patient filters (`billing.invoices.read`).
    - `GET /api/v1/billing/invoices/:id`: Get invoice detail (`billing.invoices.read`).
    - `POST /api/v1/billing/payments`: Process payment (`billing.payments.process`).
    - `POST /api/v1/billing/refunds`: Request/approve refund (`billing.refunds.manage`).
    - `GET /api/v1/billing/tariffs`: List service charges (`billing.tariffs.read`).
- **Services**:
  - `BillingService`: Manages invoice generation, automated charge aggregation, payment reconciliation, and decimal arithmetic.
  - `PaymentService`: Validates tender amounts, creates receipts, updates outstanding invoice balances.

## Database Requirements
- **Collections**:
  - `services`:
    - `code`: String, unique (e.g. "CONS-SPEC", "BED-ICU")
    - `name`: String, required
    - `category`: String enum (`consultation`, `bed_charge`, `procedure`, `nursing`, `diagnostic`, `other`)
    - `standardRate`: Schema.Types.Decimal128, required
    - `taxRatePercent`: Number, default 0
    - `department`: String
    - `isActive`: Boolean
  - `invoices`:
    - `invoiceNumber`: String, unique (e.g. "INV-2026-00054")
    - `patientId`: ObjectId, ref 'Patient', required
    - `admissionId`: ObjectId, ref 'Admission'
    - `encounterId`: ObjectId, ref 'Encounter'
    - `status`: String enum (`draft`, `issued`, `partially_paid`, `paid`, `cancelled`, `refunded`), default `issued`
    - `items`: Array of Objects `[{ serviceId: ObjectId, description: String, quantity: Number, unitPrice: Decimal128, discountAmount: Decimal128, taxAmount: Decimal128, netAmount: Decimal128 }]`
    - `subtotal`: Schema.Types.Decimal128, required
    - `totalDiscount`: Schema.Types.Decimal128, default 0
    - `totalTax`: Schema.Types.Decimal128, default 0
    - `grandTotal`: Schema.Types.Decimal128, required
    - `paidAmount`: Schema.Types.Decimal128, default 0
    - `balanceDue`: Schema.Types.Decimal128, required
    - `createdAt`, `updatedAt`: Timestamps
  - `payments`:
    - `receiptNumber`: String, unique (e.g. "RCP-2026-00054")
    - `invoiceId`: ObjectId, ref 'Invoice', required
    - `patientId`: ObjectId, ref 'Patient', required
    - `cashierId`: ObjectId, ref 'User', required
    - `amount`: Schema.Types.Decimal128, required
    - `method`: String enum (`cash`, `credit_card`, `debit_card`, `upi`, `bank_transfer`, `insurance_claim`), required
    - `transactionReference`: String
    - `paidAt`: Date, default Date.now
  - `refunds`:
    - `refundNumber`: String, unique (e.g. "RFD-2026-00012")
    - `invoiceId`: ObjectId, ref 'Invoice', required
    - `amount`: Schema.Types.Decimal128, required
    - `reason`: String, required
    - `requestedBy`: ObjectId, ref 'User', required
    - `approvedBy`: ObjectId, ref 'User'
    - `status`: String enum (`requested`, `approved`, `rejected`, `disbursed`), default `requested`
    - `approvedAt`: Date
- **Indexes**:
  - `invoices`: `{ invoiceNumber: 1 }` (unique)
  - `invoices`: `{ patientId: 1, createdAt: -1 }`
  - `invoices`: `{ status: 1, createdAt: -1 }`
  - `payments`: `{ receiptNumber: 1 }` (unique)
  - `payments`: `{ invoiceId: 1 }`
  - `services`: `{ code: 1 }` (unique)

## API Requirements
- `POST /api/v1/billing/invoices`: Body `{ patientId, items: [{ description, quantity, unitPrice }] }`, returns `{ success, data: Invoice }`.
- `POST /api/v1/billing/payments`: Body `{ invoiceId, amount, method, transactionReference }`, returns `{ success, data: Payment }`.
- `POST /api/v1/billing/refunds`: Body `{ invoiceId, amount, reason }`, returns `{ success, data: Refund }`.
- `GET /api/v1/billing/patients/:patientId/statement`: Returns all invoices and outstanding ledger for a patient.

## RBAC Requirements
- `billing.invoices.create`: `accountant`, `hospital_admin`, `receptionist`.
- `billing.invoices.read`: All clinical and administrative roles.
- `billing.payments.process`: `accountant`, `receptionist` (Cashier privilege).
- `billing.refunds.manage`: `accountant`, `super_admin`.

## Security Requirements
- Financial math must use MongoDB `Decimal128` to maintain financial precision and eliminate floating-point drift.
- Payment updates and invoice balance reconciliation must execute inside MongoDB transactions.
- Zero cash disbursement allowed without prior authorized approval record.

## Audit Requirements
- `INVOICE_CREATE`: Records invoice number, patient UHID, items, and total amount.
- `PAYMENT_PROCESS`: Records receipt number, cashier ID, amount, and payment method.
- `REFUND_APPROVE`: Records authorizer, refunded amount, and clinical justification.

## UX Requirements
- Clear, readable breakdown of subtotals, discounts, taxes, and net payable balance.
- Instant balance calculation as cashier types tender amount.
- Print-friendly layout adhering to enterprise hospital branding.

## Testing Requirements
- Unit tests:
  - Decimal addition and rounding matches exact monetary expectations without IEEE floating-point drift.
  - Payment application properly decrements `balanceDue` and marks invoice `paid` when balance reaches zero.
  - Partial payment updates status to `partially_paid`.
- API tests:
  - Attempting to pay more than the outstanding balance is rejected.
  - Unauthorized users cannot approve refunds.

## Acceptance Criteria
- [ ] Service master stores standard rates and tax codes.
- [ ] Invoices aggregate clinical charges accurately.
- [ ] Multi-method payment processing updates balances atomically.
- [ ] Official printed receipts generated with unique numbers.
- [ ] Permission-controlled refund workflow operational with audit trail.
- [ ] Financial calculations utilize Decimal128 precision.
- [ ] Unit and API tests pass cleanly.

## Dependencies
- Upstream: Milestone 03 (Patients), Milestone 04 (Appointments), Milestone 05 (EMR), Milestone 06 (IPD), Milestone 07 (Lab), Milestone 08 (Pharmacy).
- Downstream: Milestone 11 (Financial Analytics & Census Reports).

## Implementation Notes
- Use MongoDB transactions for payment processing to guarantee that payment creation and invoice balance decrement occur atomically.

## Do Not Implement
- Automated bank clearinghouse direct integration, payroll processing, or fixed asset accounting.
