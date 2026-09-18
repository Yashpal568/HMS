# Hospital Management System — Multi-Application Design System

**SOURCE-OF-TRUTH OWNER**: `docs/DESIGN.md` (UI/UX DESIGN)  
**Classification**: Authoritative  
**Product**: Multi-Tenant Hospital Management SaaS & Patient Healthcare Platform  
**Applications**: `apps/hms-client`, `apps/patient-app`, `apps/super-admin`  
**Foundation**: Tailwind CSS, Radix UI Primitives, Lucide Icons  
**Status**: Authoritative Design Specification  

---

## 1. Design System Philosophy

The HMS design system balances clinical rigor, administrative efficiency, and consumer trust across three specialized application surfaces:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SURFACE-SPECIFIC DESIGN POSTURE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. apps/hms-client (Clinical & Operational Workstation)                     │
│    • Mood: Professional, calm, precision-engineered, high-density          │
│    • Primary Focus: Fast data entry, keyboard shortcuts, clear alert banners│
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. apps/patient-app (Consumer Healthcare Platform)                         │
│    • Mood: Warm, reassuring, mobile-first, accessible, frictionless         │
│    • Primary Focus: Large touch targets (≥48px), visual queue progression   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. apps/super-admin (SaaS Platform Owner Console)                          │
│    • Mood: Analytical, authoritative, metric-driven, sovereign control      │
│    • Primary Focus: Multi-tenant telemetry, MRR cards, feature switches     │
└─────────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Authenticity Rule**:
> Dashboard widgets, patient directories, and queue counters must NEVER display fabricated metrics, fake revenue numbers, or decorative placeholder data. Interfaces display authentic live data or polished, actionable empty states.

---

## 2. Curated Color Architecture (HSL Tokens)

The design system rejects default saturated primary colors in favor of balanced, accessible healthcare tones:

### 2.1. Brand Palette Tokens
- **Clinical Primary (Teal / Cyan)**: `hsl(187, 85%, 38%)`  
  *Communicates medical precision, hygiene, and calm.*
- **Platform Indigo (Super Admin Primary)**: `hsl(243, 75%, 59%)`  
  *Used across SaaS governance and analytics surfaces.*
- **Patient Comfort Slate (Patient App Primary)**: `hsl(215, 25%, 27%)`  
  *Provides reassuring clarity without overwhelming clinical anxiety.*

### 2.2. Semantic Status Colors
- **Success (Emerald)**: `hsl(142, 72%, 29%)` — Confirmed appointments, paid invoices, normal lab values.
- **Warning (Amber)**: `hsl(38, 92%, 50%)` — Approaching queue turns, low inventory reorder alert, past-due billing.
- **Destructive (Rose)**: `hsl(346, 84%, 53%)` — Allergy alerts, abnormal lab parameters, cancelled visits, emergency admissions.
- **Info (Sky)**: `hsl(199, 89%, 48%)` — Informational banners, scheduled visits, in-transit lab specimens.

### 2.3. Neutral Surfaces & Backgrounds
- **Canvas / Background**: `hsl(210, 20%, 98%)` (Light mode), `hsl(222, 47%, 11%)` (Dark mode)
- **Card / Surface**: `hsl(0, 0%, 100%)` (Light mode), `hsl(217, 33%, 17%)` (Dark mode)
- **Border / Divider**: `hsl(214, 32%, 91%)` (Subtle 1px borders; heavy shadows avoided)
- **Text Primary**: `hsl(222, 47%, 11%)` (High contrast, WCAG AAA compliant)
- **Text Muted**: `hsl(215, 16%, 47%)` (Labels, metadata, timestamps)

---

## 3. Typography & Hierarchy

The interface employs clean, humanist sans-serif typography (`Inter` as primary font family) for readability at varying display scales:

| Element | Size | Weight | Line Height | Tracking | Usage |
|---|---|---|---|---|---|
| **Display Heading** | 32px (`2rem`) | 700 (Bold) | 1.2 | `-0.02em` | Auth landing hero, queue token callout |
| **Page Heading (H1)** | 24px (`1.5rem`) | 600 (Semibold) | 1.3 | `-0.01em` | Screen titles (e.g. "Patient Directory") |
| **Section Heading (H2)** | 18px (`1.125rem`) | 600 (Semibold) | 1.4 | `normal` | Card headers, table titles |
| **Subheading (H3)** | 14px (`0.875rem`) | 500 (Medium) | 1.4 | `normal` | Modal headers, group titles |
| **Body (Default)** | 14px (`0.875rem`) | 400 (Regular) | 1.5 | `normal` | Table cells, form fields, paragraphs |
| **Caption / Meta** | 12px (`0.75rem`) | 400 / 500 | 1.4 | `+0.01em` | Badges, timestamps, UHID labels |

---

## 4. Component Standards

### 4.1. Data Tables (`hms-client` & `super-admin`)
- **Sticky Column Headers**: Ensure column context is preserved during vertical scrolling.
- **Alignment Rules**:
  - Text and status badges: Left-aligned.
  - Dates and timestamps: Left-aligned with monospace font.
  - Quantities and monetary amounts: Strictly **right-aligned** for rapid visual ledger scanning.
- **Row States**: Subtle hover highlight (`bg-muted/50`), keyboard focus ring, and selectable checkboxes.
- **Required States**: Every table component must render distinct loading skeleton, empty state (with icon and call-to-action), and error state.

### 4.2. Patient Allergy & Alert Banners
- Prominently positioned at the top of the patient workspace.
- High-visibility red/amber badge list highlighting known drug allergies (e.g. `Penicillin`, `NSAIDs`).
- Inpatient fall-risk and isolation precautions prominently tagged.

### 4.3. Real-Time Queue Tracker (`patient-app`)
- Prominent Token Display card:
  ```text
  ┌────────────────────────────────────────────────────────┐
  │                      YOUR TOKEN                        │
  │                        A-027                           │
  │                                                        │
  │   Serving: A-019    Ahead: 8 Patients    Wait: ~42m    │
  │   Doctor: Dr. Sarah Jenkins (Room 4) - CONSULTING      │
  │                                                        │
  │   ●●●●●●●●○○○○○○○○○○○○○○○○○○○○○○○○ (Progress)          │
  └────────────────────────────────────────────────────────┘
  ```

### 4.4. Micro-Animations & Interaction Feedback
- **Duration**: Fast, subtle animations between 150ms and 200ms (`ease-out`).
- **Forbidden**: Sluggish multi-second page transitions or bouncing physics that impede critical healthcare workflows.
- **Skeleton Loaders**: Pulsing skeleton loaders matching the exact shape of content cards, tables, and metric blocks during data retrieval.
- **Command Palette**: `Cmd+K` / `Ctrl+K` accessible global navigation palette for rapid patient search and department switching.
