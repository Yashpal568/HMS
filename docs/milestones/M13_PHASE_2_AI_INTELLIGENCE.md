# Milestone 13 — Phase 2 AI Intelligence (Controlled Clinical Copilot)

## Objective
Implement controlled, audited, and secure AI capabilities following the strict architecture specified in `docs/ARCHITECTURE.md` and `docs/PRD.md`, ensuring that AI operates solely through approved HMS APIs with data minimization, tool allowlists, human-in-the-loop approval, and zero direct database access.

## Scope
- AI Gateway & Orchestration Architecture (`AiModule` in `apps/api/src/ai/`):
  - Strictly operates through authenticated and authorized HMS application service interfaces.
  - Zero direct MongoDB credentials or query execution rights.
  - Data minimization filter: Strips unnecessary Personally Identifiable Information (PII) before LLM prompt construction.
  - Tool Allowlist: Only predefined, read-only tools exposed to the orchestrator (e.g. `get_patient_vitals_summary`, `get_lab_results_summary`, `search_hospital_guidelines`).
- Low-Risk Administrative Assistants:
  - Reception & Appointment FAQ Assistant: Provides clinic schedules, visiting hours, and preparation guidelines for diagnostic procedures.
  - Hospital Policy & Knowledge Assistant: Searchable clinical protocols and departmental SOPs.
- Clinician Documentation Copilot (Human-in-the-Loop):
  - Consultation Notes Draft Assistant: Takes doctor's brief clinical findings and formats them into structured SOAP assessment drafts.
  - Discharge Summary Synthesizer: Summarizes patient hospital stay, lab results, and procedures into a draft discharge narrative.
  - Mandatory Approval Gate: AI output is strictly a `DRAFT`; the attending physician must explicitly review, edit, and sign off before the note is committed to the medical record.
- Diagnostic Lab Result Summarizer:
  - Highlights trends in chronic patient parameters (e.g. HbA1c or serum creatinine over previous 6 encounters) for attending doctors.
- Comprehensive AI Audit Ledger (`ai_audit_logs`):
  - Records requesting clinician ID, patient UHID, tool invocations, prompt token counts, and doctor's final accepted vs edited text.

## Out of Scope
- Autonomous clinical diagnosis or autonomous prescription generation without physician sign-off.
- Unrestricted free-form chat interfaces with access to hospital database tables.
- Replacing clinical staff decision-making.

## Prerequisites
- Phase 1 HMS Core (Milestones 01 through 12) 100% complete, verified, and officially signed off.
- Hospital Institutional Review Board (IRB) / Clinical Governance committee approval.

## User Workflows
1. **Clinical Note Drafting**: Doctor examines patient, inputs brief notes ("Cough 5d, wheeze, mild fever, throat clear, chest bilateral rhonchi"), and clicks "Draft Assessment". AI Gateway minimizes patient data, queries past encounters via approved APIs, drafts a structured assessment, and displays it in the editor.
2. **Physician Review & Signature**: Doctor reviews draft, corrects one line, clicks "Approve & Sign". System commits the finalized note to `encounters` and logs the AI interaction in `ai_audit_logs`.
3. **Discharge Summary Drafting**: At the conclusion of a 5-day IPD admission, doctor clicks "Draft Discharge Summary". AI Synthesizer aggregates admission diagnosis, daily progress notes, lab results, and procedures into a drafted narrative for doctor review.
4. **Reception FAQ Lookup**: Receptionist asks "What is the preparation required for an Abdominal Ultrasound?". Assistant returns verified hospital policy ("Fasting for 6 hours prior; drink 1L of water 1 hour before").

## Frontend Requirements
- **Components**:
  - `AiCopilotDrawer`: Slide-out clinical assistant panel with clear "AI Generated Draft - Review Required" warning.
  - `DiffReviewBox`: Highlights doctor edits against the AI-suggested draft text.
  - `AiBadge`: Prominent indicator denoting that an assessment originated from a copilot draft before doctor approval.
- **States**: AI streaming generation state, data minimization confirmation indicator.

## Backend Requirements
- **Modules**: `AiModule`, `AiGatewayService`, `AiOrchestratorService`.
- **Services**:
  - `DataMinimizer`: Redacts patient name, address, and contact numbers, substituting synthetic clinical tokens (`[PATIENT_AGE: 45, GENDER: M]`).
  - `ToolAllowlist`: Strictly enforces allowlisted function-calling capabilities.
  - `AiAuditService`: Logs all prompt contexts and clinician approval decisions.

## Database Requirements
- **Collections**:
  - `ai_audit_logs`:
    - `userId`: ObjectId, ref 'User', required
    - `patientId`: ObjectId, ref 'Patient'
    - `taskType`: String enum (`soap_draft`, `discharge_summary`, `lab_summary`, `faq`)
    - `toolsInvoked`: Array of Strings
    - `promptTokens`: Number
    - `completionTokens`: Number
    - `wasApproved`: Boolean
    - `editedByDoctor`: Boolean
    - `timestamp`: Date, default Date.now
- **Rule**: No direct MongoDB connection credentials provided to any AI engine.

## API Requirements
- `POST /api/v1/ai/copilot/draft-soap`: Body `{ encounterId, rawNotes }`, returns `{ success, data: { draftNote: string } }`.
- `POST /api/v1/ai/copilot/draft-discharge`: Body `{ admissionId }`, returns `{ success, data: { draftSummary: string } }`.
- `POST /api/v1/ai/faq`: Body `{ query: string }`, returns `{ success, data: { answer: string, sources: string[] } }`.

## RBAC Requirements
- `ai.copilot.use`: Strictly restricted to `doctor`.
- `ai.faq.use`: `receptionist`, `nurse`, `doctor`.
- `ai.audit.read`: `super_admin`, `hospital_admin`.

## Security Requirements
- Absolute enforcement of the architectural rule: `Browser → Next.js → NestJS API → AI Gateway → Tool Allowlist → Approved HMS APIs → Doctor Approval → MongoDB Atlas`.
- Zero raw database credentials exposed to AI models or LLM providers.
- Strict PII minimization before external API transmission.

## Audit Requirements
- Every AI generation request is permanently recorded in `ai_audit_logs`.
- Clinician modifications to AI drafts are tracked to monitor copilot accuracy.

## UX Requirements
- Unmistakable visual differentiation between human-authored text and AI-generated draft suggestions.
- Easy "Accept", "Edit", and "Discard" actions for clinicians.

## Testing Requirements
- Unit tests:
  - Data minimizer strips all patient identifiers from clinical context.
  - Tool allowlist rejects unapproved function calls.
  - Draft commits fail if not accompanied by authentic doctor signature.
- Integration tests:
  - Verify full workflow from raw doctor notes to finalized encounter.

## Acceptance Criteria
- [ ] AI Gateway architecture strictly follows `docs/ARCHITECTURE.md`.
- [ ] Zero direct MongoDB access for AI services.
- [ ] Data minimization verifies PII redaction.
- [ ] Tool allowlist restricts AI actions to approved read-only APIs.
- [ ] All AI outputs require explicit human doctor approval before saving.
- [ ] Comprehensive AI audit trail records all transactions.

## Dependencies
- Upstream: Phase 1 HMS Core (Milestones 01 to 12).
- Downstream: Milestone 14 (Electron Desktop Packaging).

## Implementation Notes
- AI models should be configurable via environment variables (`AI_PROVIDER`, `AI_API_KEY`) to allow swapping local on-premise models (Ollama/vLLM) for cloud models without codebase changes.

## Do Not Implement
- Autonomous clinical diagnosis or autonomous prescription authorization.
