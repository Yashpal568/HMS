# Hospital Management System — Disaster Recovery & Backup Runbook

**SOURCE-OF-TRUTH OWNER**: `docs/DISASTER_RECOVERY_RUNBOOK.md` (DISASTER RECOVERY)  
**Classification**: Operational Runbook  
**Target RTO (Recovery Time Objective)**: < 30 Minutes  
**Target RPO (Recovery Point Objective)**: < 5 Minutes  
**Compliance Alignment**: ISO 27001, OWASP API Security, Healthcare Data Protection  

---

## 1. Executive Summary & Recovery Objectives

In healthcare information systems, data availability and clinical integrity directly impact patient care and safety. This operational runbook establishes the protocols, automated tooling, verification schedules, and emergency failover procedures to guarantee business continuity across catastrophic hardware failures, regional network blackouts, accidental data deletion, or security incidents.

### Recovery Thresholds
| Metric | Service Level Objective | Realized Architectural Capability |
|---|---|---|
| **Recovery Point Objective (RPO)** | **< 5 Minutes** | Continuous MongoDB Atlas Oplog replication + 60s transaction journal sync. |
| **Recovery Time Objective (RTO)** | **< 30 Minutes** | Automated snapshot restores + zero-downtime rolling container redeployment. |
| **Data Integrity Verification** | **100% Cryptographic Match** | SHA-256 pre- and post-restore checksum validation on all collections. |

---

## 2. Multi-Tier Backup Architecture

### Tier 1: Continuous Cloud Native Point-in-Time Recovery (MongoDB Atlas)
- **Mechanism**: Continuous replica-set oplog tailing and automated hourly snapshot captures.
- **Retention**: 7 days of granular point-in-time rollbacks (recoverable to any specific second) and 30 days of daily snapshots.
- **Geographic Redundancy**: Multi-region replication across 3 availability zones with automated primary election in < 5 seconds.

### Tier 2: Automated Application-Layer Cryptographic Backups (`backup-atlas.ts`)
- **Execution Script**: `npx tsx scripts/backup-atlas.ts` (run from `apps/server`).
- **Functionality**:
  - Scans and snapshots 18 core domain collections (`tenants`, `users`, `patients`, `appointments`, `encounters`, `prescriptions`, `admissions`, `beds`, `lab_orders`, `medicines`, `inventory_items`, `invoices`, `payments`, `audit_logs`).
  - Serializes schema-consistent JSON archive to `./backups/hms-backup-<timestamp>.json`.
  - Computes cryptographic SHA-256 digest (`./backups/hms-backup-<timestamp>.sha256`).
  - Records an immutable `SYSTEM_BACKUP_EXECUTE` audit trail event with file name, record counts, and checksum hash.

### Tier 3: Automated Disaster Recovery Verification (`restore-verify.ts`)
- **Execution Script**: `npx tsx scripts/restore-verify.ts` (run from `apps/server`).
- **Functionality**:
  - Automatically locates the latest backup archive and reads corresponding `.sha256` digest.
  - Re-computes SHA-256 hash over the raw file payload; aborts with critical alert if mismatch detected.
  - Verifies document counts across all 18 collections against the manifest.
  - Calculates simulated restore benchmark and projected RTO.
  - Emits immutable `DISASTER_RECOVERY_TEST` audit record with execution duration and RTO/RPO validation.

---

## 3. Step-by-Step Emergency Restore Procedures

### Scenario A: Point-in-Time Rollback via MongoDB Atlas Console (Fastest)
1. **Declare Incident**: Notify the Incident Commander and open an operational emergency log.
2. **Access Atlas Console**: Log in to MongoDB Atlas > Clusters > `Cluster0` > **Backup**.
3. **Select Restore Action**: Click **Restore** on the affected cluster.
4. **Choose Point-in-Time (PITR)**:
   - Select **Point-in-Time Restore**.
   - Specify the exact UTC timestamp 1 minute prior to the corrupting event / incident.
5. **Target Selection**:
   - For non-destructive validation: Restore to a temporary staging cluster (`hms-dr-verify`).
   - For full emergency recovery: Restore in-place or point DNS to the restored cluster.
6. **Execute & Verify**: Monitor restore progress. Once completed, execute `npx tsx scripts/restore-verify.ts` to confirm document integrity.
7. **Resume Traffic**: Re-enable application traffic via Cloudflare / Render.

### Scenario B: Manual Restore from Local / S3 Cryptographic Archive
If cloud provider services are degraded or offline:
```bash
# 1. Verify archive integrity
npx tsx apps/server/scripts/restore-verify.ts

# 2. Extract and import verified collections
mongoimport --uri="mongodb+srv://<user>:<pwd>@<target-cluster>/hms_dev" \
  --collection=patients --file=backups/patients.json --jsonArray

# 3. Repeat for remaining collections or use automated restore loader
```

---

## 4. Emergency Failover Protocols

### 1. Primary Database Node Failure
- **Behavior**: MongoDB Atlas automatically detects primary heartbeat failure within 3 seconds.
- **Action**: Secondary node is automatically promoted to primary via Raft consensus.
- **Application Impact**: Zero application restart required; Mongoose driver handles temporary reconnect automatically with built-in retryable writes (`retryWrites=true`).

### 2. Backend Container Outage (Render Tier)
- **Behavior**: Render health probe fails 3 consecutive `/api/v1/health` checks.
- **Action**: Container orchestrator terminates degraded pod and spawns a fresh container instance from the immutable Docker registry image in < 15 seconds.

### 3. Edge Frontend Disruption (Vercel Tier)
- **Behavior**: Cloudflare Anycast automatically reroutes traffic to alternative edge PoPs if a single edge datacenter experiences routing issues.

---

## 5. Maintenance & Disaster Recovery Schedule

| Task | Frequency | Responsible Role | Verification Artifact |
|---|---|---|---|
| **Automated Snapshot Capture** | Daily (02:00 UTC) | Cron Job / Operations | `hms-backup-*.json` + `.sha256` |
| **Cryptographic Restore Test** | Weekly | Security / Platform Engineer | `audit_logs` (`DISASTER_RECOVERY_TEST`) |
| **Deep Health Latency Audit** | Continuous (Every 5s) | Executive Cockpit / Health Probe | `/api/v1/health/deep` |
| **Full Simulated Failover Drill**| Quarterly | Lead Architect & Security Lead | Formal Incident Post-Mortem Report |
