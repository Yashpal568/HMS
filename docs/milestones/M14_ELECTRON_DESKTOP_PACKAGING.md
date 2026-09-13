# Milestone 14 — Windows Desktop Electron Packaging

## Objective
Package the existing Next.js web application into an enterprise Windows desktop application (`.exe` / `.msi`) using Electron, isolating desktop-specific capabilities behind a clean adapter layer while maintaining strict connection solely through the NestJS REST API conforming to `docs/ARCHITECTURE.md` and `docs/FRONTEND.md`.

## Scope
- Electron Application Wrapper (`apps/desktop/` or root packaging pipeline):
  - Embeds the existing Next.js frontend without duplicating any business or clinical logic.
  - Native Windows desktop window frame with minimize, maximize, close, and enterprise title bar.
- Desktop Hardware & OS Adapter Layer (`packages/desktop-adapter`):
  - Direct silent printing to thermal receipt and barcode label printers without browser print dialog popups.
  - Serial/USB barcode scanner input handler for rapid patient UHID and medicine batch scanning.
  - Native Windows file save dialogs for exporting clinical reports and audit CSVs.
- Network & Offline Status Monitor:
  - Detection of hospital LAN connectivity disruptions.
  - Graceful reconnection and re-authentication handling.
- Enterprise Packaging & Installers:
  - Automated build pipeline generating Windows `.exe` and `.msi` installers.
  - Configuration for hospital-local server endpoint (`API_BASE_URL`) vs cloud backend.
- Strict Architectural Guardrail:
  - The Electron desktop app MUST NEVER connect directly to MongoDB. It operates strictly via the NestJS REST API over HTTPS/TLS.

## Out of Scope
- Rewriting frontend components into native C# / WPF.
- Local embedded SQLite replica databases with bi-directional sync (deferred to edge-sync architecture if needed).
- macOS or Linux packaging (Windows hospital workstation focus).

## Prerequisites
- Milestone 01 through Milestone 12 (Stable, tested Phase 1 Web HMS).

## User Workflows
1. **Hospital Workstation Launch**: Nurse turns on nursing station desktop PC, double-clicks "HMS MedCore" desktop shortcut. Electron shell launches full-screen, checks backend connectivity, and renders the standard secure login screen.
2. **Direct Thermal Printing**: Cashier processes a consultation fee payment and clicks "Print Receipt". Desktop adapter bypasses the OS print preview and sends raw ESC/POS commands directly to the receipt printer, issuing a receipt in under 1 second.
3. **Barcode Scanning**: Pharmacist scans a medicine carton barcode; Electron global shortcut interceptor decodes the stream and populates the batch entry field instantly.
4. **Endpoint Configuration**: Hospital IT administrator accesses configuration settings in the installer to configure the Cloud SaaS API endpoint (e.g. `https://api.hms.health/api/v1`) and default hospital tenant domain.

## Frontend Requirements
- **Adapters**:
  - `DesktopAdapter`: Interface abstracting hardware capabilities:
    ```typescript
    interface DesktopAdapter {
      isDesktop: boolean;
      printThermalReceipt(html: string): Promise<boolean>;
      printBarcodeLabel(zpl: string): Promise<boolean>;
      saveFile(data: string, defaultName: string): Promise<string>;
    }
    ```
  - Web fallback: When running in a standard browser, `DesktopAdapter` cleanly falls back to standard browser `window.print()` and standard anchor downloads.

## Backend Requirements
- **No changes to backend business logic**: The NestJS API continues serving standard REST endpoints with JWT authentication and RBAC guards.
- Client identification header (`x-client-platform: electron-windows-1.0.0`) logged in audit trail.

## Database Requirements
- Zero database changes. Electron connects strictly via REST API.

## API Requirements
- No new specialized API endpoints required. Existing `/api/v1/*` endpoints are fully reused.

## RBAC Requirements
- Same RBAC permissions enforced uniformly across web and desktop.

## Security Requirements
- Electron security best practices enforced:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - Sandbox enabled for web renderers.
  - Navigation restricted strictly to authorized internal application origins.
- Application code signing for enterprise Windows trust.

## Audit Requirements
- `DESKTOP_CLIENT_LAUNCH`: Records desktop client startup, client version, workstation hostname, and IP address.

## UX Requirements
- Seamless desktop workstation feel with optimized keyboard shortcuts (e.g. F2 for Patient Search, F5 for Queue Refresh).
- Persistent window size and display preference memory across reboots.

## Testing Requirements
- Unit tests for `DesktopAdapter`: Web fallback behaves identically in browser environments.
- Packaging verification: Automated build confirms valid `.exe` / `.msi` artifact generation.
- Security audit of Electron main process settings.

## Acceptance Criteria
- [ ] Electron wrapper boots existing Next.js frontend seamlessly.
- [ ] Zero duplication of HMS business logic.
- [ ] Direct thermal printing operational via desktop adapter.
- [ ] Standard browser fallback functional when running in web mode.
- [ ] Electron connects solely through NestJS REST API with zero direct DB access.
- [ ] Windows installer `.exe` / `.msi` generated successfully.

## Dependencies
- Upstream: Phase 1 HMS (Milestones 01 to 12).
- Downstream: Enterprise workstation deployment.

## Implementation Notes
- Keep the Electron main process minimal (`< 300 lines`) focusing purely on window management, hardware IPC, and secure shell configuration.

## Do Not Implement
- Local offline database engines, direct MongoDB drivers, or proprietary native UI frameworks.
