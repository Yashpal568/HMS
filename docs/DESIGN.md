# HMS Design System

## Design Goal
A premium enterprise healthcare interface that communicates trust, clarity and operational efficiency.

## Visual Direction
- Clean healthcare enterprise
- Light primary UI
- Neutral surfaces
- Restrained brand accent
- Semantic status colors
- Subtle borders
- Moderate radius
- Minimal shadows
- No excessive gradients/glassmorphism

## Typography
Recommended: Inter or equivalent system-safe sans-serif.

Suggested hierarchy:
- Page title: 28–32px
- Section title: 20–24px
- Field/card heading: 14–16px
- Body: 14–16px
- Supporting: 12–14px

Do not create oversized headings for data-heavy screens.

## Layout
- Sidebar: ~240–280px
- Top bar: ~64px
- Page padding: ~24–32px
- Dense operational screens may use tighter spacing
- Avoid unnecessary blank space

## Navigation
Group into:
- Overview
- Clinical
- Operations
- Finance
- Administration
- Security

Only show authorized items.

## Semantic Tokens
```text
background
surface
surface-muted
text
text-muted
border
primary
success
warning
danger
info
```

Do not hard-code unrelated colors throughout components.

## Tables
Tables are a primary interaction pattern:
- clear headers
- type-appropriate alignment
- pagination
- filters/search
- hover/focus
- empty/loading/error states
- horizontal overflow on small screens
- right-align numeric/financial values

## Forms
Visible labels, required indicators, inline validation, logical sections, clear save/cancel actions and confirmation for sensitive operations.

## Patient Header
When authorized, show name, UHID, approved demographics and important clinical alerts such as allergies. Avoid unnecessary exposure.

## Status
Use consistent status vocabulary across modules. Final hospital-specific vocabulary must be approved.

## Dashboard
Answer:
1. What needs attention?
2. What is happening now?
3. What is delayed?
4. What requires action?

Do not use fake metrics in production.

## Accessibility
Keyboard navigation, visible focus, labels, contrast, semantic HTML, error associations and status indicators that do not depend on color alone.

## Motion
Subtle transitions only. Never slow clinical or financial workflows.

## Quality Rule
Every page must look like one product. AI-generated implementation must reuse the same shell, tokens and components.
