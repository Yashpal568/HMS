# HMS Deployment Strategy

## Approved Direction

**WEB FIRST → WINDOWS .EXE LATER**

This is the official project direction.

## Phase 1
```text
Browser
  ↓
Next.js / React
  ↓
NestJS REST API
  ↓
MongoDB Atlas
```

Build the entire core HMS this way.

## Phase 2
```text
Next.js / React
      ↓
Electron
      ↓
HMS.exe / HMS.msi
      ↓
NestJS REST API
      ↓
MongoDB Atlas
```

The desktop package reuses the existing application. Do not rewrite the HMS as a separate desktop system.

## Future On-Premise
```text
Windows/Browser Clients
          ↓
Hospital LAN
          ↓
Local NestJS Server
          ↓
Local MongoDB
```

This option is for hospitals that require local data storage.

## Non-Negotiable Rules
1. Frontend never connects directly to MongoDB.
2. Electron never connects directly to MongoDB.
3. Business logic stays in NestJS/services.
4. Phase 1 does not depend on Electron.
5. Phase 2 desktop packaging must reuse the Phase 1 frontend.
6. Cloud/on-premise database selection is an infrastructure configuration decision, not a frontend rewrite.
