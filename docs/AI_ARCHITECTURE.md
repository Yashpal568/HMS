# Artificial Intelligence Architecture Specification (Phase 2 Roadmap)

**SOURCE-OF-TRUTH OWNER**: `docs/AI_ARCHITECTURE.md` (AI/AGENT ARCHITECTURE)  
**Classification**: Authoritative  
**Phase Status**: AI Ready in Phase 1; Implementation Strictly Deferred to Phase 2  
**Scope**: AI Gateway, Agent Orchestrator, Policy Engine, Scoped Tool Execution, Audit Logging  
**Status**: Authoritative AI Specification  

---

## 1. Architectural Principles & Non-Negotiable Directives

1. **Phase 1 Boundary**: No AI models, LangChain/LlamaIndex agents, or external LLM API dependencies are implemented in Phase 1. Phase 1 focuses exclusively on clean REST API interfaces, robust data models, and audit logs.
2. **Zero Direct Database Access for AI**: Under no circumstances will an AI model, LLM agent, or external agentic framework be granted direct network or credential access to MongoDB Atlas or Redis.
3. **Strict Policy & Permission Inheritance**: Every AI agent invocation MUST inherit the authenticated caller's security context:
   ```text
   Caller Context: { tenantId, userId, role, permissions }
         │
         ▼
   AI Agent inherits identical context; cannot exceed caller's privileges
   ```
4. **Human-in-the-Loop for Clinical Decisions**: AI will NEVER autonomously make high-impact clinical decisions, prescribe medication, alter diagnoses, or discharge patients. AI acts purely as an assistive copilot requiring explicit human clinician signoff.
5. **System Resilience**: The core Hospital Management System must continue operating with 100% functionality if AI services, LLM providers, or network gateways experience outages.

---

## 2. Phase 2 AI Architectural Topology

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CLINICAL & PATIENT APPLICATIONS                       │
│       apps/hms-client        apps/patient-app        apps/super-admin       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS (Tool Request / Query)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CANONICAL BACKEND PLATFORM                         │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        1. AI GATEWAY                                 │  │
│   │   Rate Limiter • PII/PHI Redactor • Token Metering • Provider Router │  │
│   └──────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ Redacted Prompt + User Context       │
│                                      ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                     2. AGENT ORCHESTRATOR                            │  │
│   │   Plan Generation • Context Assembly • Agent State Machine           │  │
│   └──────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ Requested Tool Action                │
│                                      ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                  3. POLICY & PERMISSION ENGINE                       │  │
│   │   Validates Action against caller's RBAC and Tenant boundary         │  │
│   └──────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ Permitted Action                     │
│                                      ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                    4. APPROVED TOOL RUNTIME                          │  │
│   │   Narrowly Scoped Internal API Calls (/api/v1/...)                   │  │
│   └──────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ Output / Proposed Mutation           │
│                                      ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                  5. CLINICAL VALIDATION & SIGN-OFF                   │  │
│   │   Doctor / Admin Review & Explicit Approval Confirmation             │  │
│   └──────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ Approved State Mutation              │
│                                      ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                   6. IMMUTABLE AI AUDIT TRAIL                        │  │
│   │   Logs prompt hash, model ID, tool used, human signoff, and timestamp│  │
│   └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 18 Specialized Healthcare AI Agents Catalog

When Phase 2 is initiated, the system will implement specialized, bounded agents:

### 3.1. Front-Office & Patient Operations
1. **Reception Agent**: Answers patient inquiries regarding hospital specialties, consulting hours, and directions.
2. **Appointment Agent**: Conversational scheduling assistant that maps patient symptoms to appropriate specialties and finds optimal slots.
3. **Queue Agent**: Monitors waiting room velocity, detects doctor delays, and recalculates wait times dynamically.
4. **Patient Communication Agent**: Drafts multilingual SMS/WhatsApp appointment reminders and preparation instructions (e.g. fasting for blood tests).

### 3.2. Clinical & Diagnostic Copilots
5. **Doctor Documentation Copilot**: Converts doctor dictation or shorthand into structured SOAP (Subjective, Objective, Assessment, Plan) consultation notes.
6. **Clinical Record Summarizer**: Synthesizes multi-year patient EMR history into a concise 1-page chronological briefing before consultations.
7. **Discharge Summary Agent**: Compiles inpatient vitals, lab results, medications, and physician notes into a comprehensive draft discharge summary.
8. **Lab Workflow Agent**: Flags critical abnormal lab values and notifies ordering physicians immediately.

### 3.3. Pharmacy & Inventory Assistants
9. **Pharmacy Assistant**: Cross-checks prescribed medications against known patient drug allergies and adverse drug-drug interactions.
10. **Inventory Agent**: Monitors consumable usage patterns and identifies fast-moving vs. slow-moving surgical supplies.
11. **Procurement Agent**: Drafts purchase orders to preferred suppliers when items reach reorder thresholds.
12. **Predictive Inventory**: Forecasts seasonal medicine demand (e.g. anti-malarials, antibiotics) using historic patient trends.

### 3.4. Billing, Operations & Platform Intelligence
13. **Billing Assistant**: Audits complex inpatient bills to ensure all dispensed medications, nursing charges, and lab tests are accurately reconciled.
14. **Hospital Operations Copilot**: Alerts hospital administrators to upcoming bed crunches, staffing shortages, or surge ward demands.
15. **Predictive Patient Flow**: Forecasts daily OPD footfalls and peak arrival hours to optimize doctor shift rosters.
16. **Natural-Language Analytics**: Allows administrators to query operational data using plain English (e.g. "What was our bed occupancy rate in ICU last month?").
17. **Security Anomaly Agent**: Detects abnormal EMR access patterns or bulk patient record exports.
18. **Knowledge Assistant**: Answers staff questions regarding hospital SOPs, infection control guidelines, and billing rules.

---

## 4. Architectural Readiness in Phase 1

To ensure seamless Phase 2 integration without refactoring Phase 1 code:
- **Clean RESTful APIs**: Every domain module exposes deterministic JSON REST endpoints suitable for tool calling.
- **Granular RBAC**: Permission tokens (e.g. `appointments:create`, `prescriptions:draft`) provide the exact permission boundary needed by AI tools.
- **Audit Log Infrastructure**: The `audit_logs` schema includes an `isAiAssisted: Boolean` and `aiModelId?: String` field to record AI operations natively.
