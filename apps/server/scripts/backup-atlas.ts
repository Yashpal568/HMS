/**
 * Automated MongoDB Atlas Backup & Snapshot Tooling
 * Conforming to docs/SECURITY.md and docs/milestones/M12_PRODUCTION_HARDENING_SECURITY_BACKUP.md
 */

import mongoose from 'mongoose';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const COLLECTIONS_TO_BACKUP = [
  'tenants',
  'users',
  'hospitals',
  'departments',
  'patients',
  'appointments',
  'encounters',
  'admissions',
  'beds',
  'lab_orders',
  'lab_tests',
  'medicines',
  'medicine_batches',
  'inventory_items',
  'invoices',
  'payments',
  'refunds',
  'audit_logs',
];

function loadEnv() {
  if (process.env.MONGODB_URI) return;
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'apps/server/.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val.replace(/^["']|["']$/g, '');
            }
          }
        }
      }
    }
  }
}

async function runBackup() {
  loadEnv();
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required.');
  }

  console.log('[BACKUP] Initializing automated backup snapshot...');
  console.log(`[BACKUP] Target MongoDB: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('Could not obtain database reference from Mongoose.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupData: Record<string, any[]> = {};
  const manifest: Record<string, number> = {};
  let totalDocs = 0;

  for (const colName of COLLECTIONS_TO_BACKUP) {
    try {
      const docs = await db.collection(colName).find({}).toArray();
      backupData[colName] = docs;
      manifest[colName] = docs.length;
      totalDocs += docs.length;
      console.log(`  ✓ Backed up [${colName}]: ${docs.length} documents`);
    } catch (err: any) {
      console.warn(`  ⚠ Warning: Collection [${colName}] not found or empty: ${err.message}`);
      backupData[colName] = [];
      manifest[colName] = 0;
    }
  }

  const exportPayload = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    databaseName: db.databaseName,
    totalDocuments: totalDocs,
    manifest,
    data: backupData,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const backupFilePath = path.join(backupDir, `hms-backup-${timestamp}.json`);
  fs.writeFileSync(backupFilePath, jsonString, 'utf-8');

  // Compute SHA-256 checksum
  const hash = crypto.createHash('sha256').update(jsonString).digest('hex');
  const checksumFilePath = path.join(backupDir, `hms-backup-${timestamp}.sha256`);
  fs.writeFileSync(checksumFilePath, hash, 'utf-8');

  // Record audit trail event
  try {
    await db.collection('audit_logs').insertOne({
      action: 'SYSTEM_BACKUP_EXECUTE',
      resource: 'database',
      resourceId: backupFilePath,
      timestamp: new Date(),
      status: 'SUCCESS',
      metadata: {
        backupFile: path.basename(backupFilePath),
        sha256: hash,
        totalDocuments: totalDocs,
        collectionsCount: Object.keys(manifest).length,
      },
    });
    console.log('  ✓ Recorded [SYSTEM_BACKUP_EXECUTE] in audit_logs.');
  } catch (err: any) {
    console.warn('  ⚠ Failed to record audit log:', err.message);
  }

  await mongoose.disconnect();

  console.log('\n======================================================');
  console.log('  AUTOMATED SNAPSHOT COMPLETED SUCCESSFULLY');
  console.log(`  File:     ${backupFilePath}`);
  console.log(`  SHA-256:  ${hash}`);
  console.log(`  Total:    ${totalDocs} documents across ${Object.keys(manifest).length} collections`);
  console.log('======================================================\n');
}

void runBackup();
