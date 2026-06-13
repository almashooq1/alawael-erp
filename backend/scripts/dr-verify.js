#!/usr/bin/env node
/**
 * @file dr-verify.js
 * @description تحقّق آلي من سلامة آخر نسخة احتياطية (Disaster-Recovery drill)
 *
 * الفكرة:
 *   1. يجد آخر ملف backup في `backups/` (gz archive من backupMongoDB)
 *      أو آخر دليل dump من db-backup.js.
 *   2. يستعيده في قاعدة بيانات سندبوكس مؤقتة (alawael_dr_verify_<ts>).
 *      نحن لا نلمس قاعدة الإنتاج إطلاقاً.
 *   3. يتحقق أن المجموعات الحرجة موجودة وفيها سجلات > الحد الأدنى.
 *   4. يُسقط قاعدة السندبوكس.
 *   5. عند الفشل يُطلق ops-alerter (whatsapp/sms/email).
 *
 * Usage:
 *   node backend/scripts/dr-verify.js          # full verification
 *   node backend/scripts/dr-verify.js --dry-run  # no restore, only locate latest
 *   node backend/scripts/dr-verify.js --json     # machine-readable output
 *
 * Env:
 *   MONGODB_URI            URI of source cluster (host only — db is overridden)
 *   BACKUP_DIR             where backupMongoDB writes archives (default: backend/backups)
 *   DB_BACKUP_DIR          where db-backup.js writes directory dumps
 *   DR_MIN_USERS           minimum users count to consider backup healthy (default: 1)
 *   DR_MIN_BENEFICIARIES   minimum beneficiaries (default: 0)
 *   DR_VERIFY_TIMEOUT_MS   per-step timeout (default: 600000 = 10 min)
 *   OPS_ALERT_EMAIL        comma-separated alert recipients
 *   OPS_ALERT_PHONE        comma-separated alert recipients
 */

'use strict';

const { execFile, execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load env from BOTH candidate locations. On the VPS the real secrets
// (MONGODB_URI with credentials) live in backend/.env — loading only the
// repo-root .env left MONGODB_URI undefined → unauthenticated localhost
// fallback → countDocuments returned -1 for every collection (the
// 2026-06-12 daily-drill failure). dotenv never overrides already-set vars,
// so real process.env / earlier file wins.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });

const logger = require('../utils/logger');
const { sendOpsAlert } = require('../services/ops-alerter');

const PRIMARY_BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const SECONDARY_BACKUP_DIR =
  process.env.DB_BACKUP_DIR || path.join(__dirname, '..', '..', 'backups', 'mongodb');

const TIMEOUT_MS = parseInt(process.env.DR_VERIFY_TIMEOUT_MS || '600000', 10);

const CRITICAL_COLLECTIONS = [
  { name: 'users', min: parseInt(process.env.DR_MIN_USERS || '1', 10) },
  { name: 'beneficiaries', min: parseInt(process.env.DR_MIN_BENEFICIARIES || '0', 10) },
  { name: 'branches', min: 0 },
  { name: 'roles', min: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function parseMongoUri(uri) {
  try {
    const url = new URL(uri);
    return {
      host: url.hostname,
      port: url.port || '27017',
      base: `${url.protocol}//${url.username ? `${url.username}:${url.password}@` : ''}${url.host}`,
      authQuery: url.search || '',
    };
  } catch {
    return { host: 'localhost', port: '27017', base: 'mongodb://localhost:27017', authQuery: '' };
  }
}

function checkTool(name) {
  try {
    execSync(`${name} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function findLatestBackup() {
  const candidates = [];

  if (fs.existsSync(PRIMARY_BACKUP_DIR)) {
    fs.readdirSync(PRIMARY_BACKUP_DIR)
      .filter(f => f.startsWith('mongodb-backup-') && (f.endsWith('.gz') || f.endsWith('.gz.enc')))
      .forEach(f => {
        const p = path.join(PRIMARY_BACKUP_DIR, f);
        const st = fs.statSync(p);
        candidates.push({
          kind: f.endsWith('.enc') ? 'archive-encrypted' : 'archive',
          path: p,
          mtime: st.mtimeMs,
          size: st.size,
        });
      });
  }

  if (fs.existsSync(SECONDARY_BACKUP_DIR)) {
    fs.readdirSync(SECONDARY_BACKUP_DIR)
      .filter(f => f.startsWith('backup_'))
      .forEach(f => {
        const p = path.join(SECONDARY_BACKUP_DIR, f);
        const st = fs.statSync(p);
        if (st.isDirectory()) {
          candidates.push({ kind: 'dir', path: p, mtime: st.mtimeMs, size: 0 });
        }
      });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0];
}

function execFileAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      cmd,
      args,
      { timeout: TIMEOUT_MS, maxBuffer: 50 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          err.stderr = stderr;
          err.stdout = stdout;
          return reject(err);
        }
        resolve({ stdout, stderr });
      }
    );
    if (!child) reject(new Error('failed to spawn'));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Restore + verify
// ─────────────────────────────────────────────────────────────────────────────
async function decryptIfNeeded(backup) {
  if (backup.kind !== 'archive-encrypted') return { archivePath: backup.path, cleanup: () => {} };

  const keyHex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('BACKUP_ENCRYPTION_KEY required to verify encrypted archive');
  }

  const { decryptFile } = require('../utils/backup-crypto');
  const tmpPath = path.join(
    require('os').tmpdir(),
    `dr-verify-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.gz`
  );
  await decryptFile({ inputPath: backup.path, outputPath: tmpPath, keyHex });
  return {
    archivePath: tmpPath,
    cleanup: () => {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* best-effort */
      }
    },
  };
}

async function restoreToSandbox(backup, sandboxDb) {
  const sourceUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  const parsed = parseMongoUri(sourceUri);
  // IMPORTANT: the restore URI must NOT contain a db name. A db in the URI
  // puts mongorestore into the deprecated --db mode, which skips per-DB dump
  // subdirectories ("don't know what to do with subdirectory ..., skipping")
  // and silently restores 0 documents. Namespace targeting is done purely
  // via --nsFrom/--nsTo below. (Verified on VPS 2026-06-12.)
  const targetUri = `${parsed.base}/${parsed.authQuery}`;

  // Decrypt to a temp file if the archive is `.gz.enc`. Cleanup afterwards.
  const { archivePath, cleanup } = await decryptIfNeeded(backup);

  try {
    if (backup.kind === 'archive' || backup.kind === 'archive-encrypted') {
      // gz archive from backupMongoDB() — restore with --archive --gzip --nsFrom/--nsTo
      const sourceDb = (() => {
        try {
          return new URL(sourceUri).pathname.replace('/', '') || 'alawael-erp';
        } catch {
          return 'alawael-erp';
        }
      })();
      const args = [
        '--uri',
        targetUri,
        '--archive=' + archivePath,
        '--gzip',
        '--nsFrom=' + sourceDb + '.*',
        '--nsTo=' + sandboxDb + '.*',
        '--drop',
      ];
      await execFileAsync('mongorestore', args);
    } else {
      // Directory dump from db-backup.js. The dump root contains a per-DB
      // subdirectory (e.g. <dump>/alawael_erp/*.bson.gz). Restoring the ROOT
      // without --nsFrom/--nsTo makes mongorestore target the ORIGINAL db
      // name — a silent no-op for the sandbox at best, and with --drop a
      // restore over PRODUCTION at worst. Point --dir at the single DB
      // subdirectory and remap it into the sandbox with --nsFrom/--nsTo.
      const entries = fs
        .readdirSync(archivePath, { withFileTypes: true })
        .filter(e => e.isDirectory());
      if (entries.length !== 1) {
        throw new Error(
          `dump_layout_unexpected: expected exactly 1 db subdirectory in ${archivePath}, found ${entries.length}`
        );
      }
      const dumpDbName = entries[0].name;
      const args = [
        '--uri',
        targetUri,
        '--dir=' + archivePath,
        '--gzip',
        '--nsInclude=' + dumpDbName + '.*',
        '--nsFrom=' + dumpDbName + '.*',
        '--nsTo=' + sandboxDb + '.*',
        '--drop',
      ];
      await execFileAsync('mongorestore', args);
    }
  } finally {
    cleanup();
  }
}

async function verifyCounts(sandboxDb) {
  // Use mongoose to read counts — reuses the project's connection logic.
  const mongoose = require('mongoose');
  const sourceUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  const parsed = parseMongoUri(sourceUri);
  const targetUri = `${parsed.base}/${sandboxDb}${parsed.authQuery}`;

  const conn = await mongoose
    .createConnection(targetUri, {
      serverSelectionTimeoutMS: 15000,
    })
    .asPromise();

  try {
    const checks = [];
    for (const col of CRITICAL_COLLECTIONS) {
      const count = await conn.db
        .collection(col.name)
        .countDocuments()
        .catch(() => -1);
      const ok = count >= col.min;
      checks.push({ collection: col.name, count, min: col.min, ok });
    }
    return checks;
  } finally {
    await conn.close().catch(() => {});
  }
}

async function dropSandbox(sandboxDb) {
  const mongoose = require('mongoose');
  const sourceUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  const parsed = parseMongoUri(sourceUri);
  const targetUri = `${parsed.base}/${sandboxDb}${parsed.authQuery}`;

  const conn = await mongoose.createConnection(targetUri).asPromise();
  try {
    await conn.dropDatabase();
  } finally {
    await conn.close().catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────
async function runVerification({ dryRun = false } = {}) {
  const startedAt = Date.now();
  const report = {
    startedAt: new Date(startedAt).toISOString(),
    backup: null,
    restored: false,
    checks: [],
    success: false,
    durationMs: 0,
    error: null,
  };

  if (!checkTool('mongorestore')) {
    report.error = 'mongorestore_not_installed';
    return report;
  }

  const latest = findLatestBackup();
  if (!latest) {
    report.error = 'no_backup_found';
    return report;
  }
  report.backup = {
    kind: latest.kind,
    path: latest.path,
    ageHours: ((Date.now() - latest.mtime) / 3_600_000).toFixed(2),
    sizeBytes: latest.size,
  };

  // Stale-backup early warning: > 36h old → fail even before restore
  const ageH = parseFloat(report.backup.ageHours);
  if (ageH > 36) {
    report.error = `backup_stale (${ageH}h old)`;
    return report;
  }

  if (dryRun) {
    report.success = true;
    report.durationMs = Date.now() - startedAt;
    return report;
  }

  const sandboxDb = `alawael_dr_verify_${Date.now()}`;
  try {
    await restoreToSandbox(latest, sandboxDb);
    report.restored = true;
    report.checks = await verifyCounts(sandboxDb);
    const allOk = report.checks.every(c => c.ok);
    report.success = allOk;
    if (!allOk) {
      const failing = report.checks.filter(c => !c.ok).map(c => `${c.collection}=${c.count}`);
      report.error = `count_threshold_failed: ${failing.join(', ')}`;
    }
  } catch (err) {
    report.error = err.message || String(err);
  } finally {
    await dropSandbox(sandboxDb).catch(e =>
      logger.warn('[dr-verify] sandbox cleanup failed', { sandboxDb, error: e.message })
    );
  }

  report.durationMs = Date.now() - startedAt;
  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const json = args.includes('--json');

  const report = await runVerification({ dryRun });

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   Al-Awael ERP — DR Verification Report          ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    console.log(`  Started   : ${report.startedAt}`);
    console.log(`  Duration  : ${(report.durationMs / 1000).toFixed(2)}s`);
    if (report.backup) {
      console.log(`  Backup    : ${report.backup.path}`);
      console.log(`              kind=${report.backup.kind}, age=${report.backup.ageHours}h`);
    }
    console.log(`  Restored  : ${report.restored ? 'yes' : 'no'}`);
    if (report.checks.length) {
      console.log('  Checks    :');
      report.checks.forEach(c =>
        console.log(
          `    ${c.ok ? '✓' : '✗'} ${c.collection.padEnd(20)} count=${c.count} (min=${c.min})`
        )
      );
    }
    console.log(`  Result    : ${report.success ? '✅ PASS' : '❌ FAIL'}`);
    if (report.error) console.log(`  Error     : ${report.error}`);
    console.log('');
  }

  if (!report.success) {
    await sendOpsAlert({
      kind: 'dr_verification_failed',
      severity: 'critical',
      subject: 'فشل التحقّق من النسخة الاحتياطية',
      body:
        `فشل التحقق الآلي من آخر نسخة احتياطية على alaweal.\n\n` +
        `السبب: ${report.error || 'غير محدّد'}\n` +
        `النسخة: ${report.backup ? report.backup.path : 'غير موجودة'}\n` +
        `العمر: ${report.backup ? report.backup.ageHours + 'h' : '-'}\n` +
        `المدة: ${(report.durationMs / 1000).toFixed(1)}s\n\n` +
        `راجع docs/blueprint/19-dr-verification.md`,
      metadata: report,
    }).catch(e => logger.error('[dr-verify] alert dispatch failed', { error: e.message }));

    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    logger.error('[dr-verify] fatal', { error: err.message, stack: err.stack });
    process.exit(2);
  });
}

module.exports = { runVerification, findLatestBackup, CRITICAL_COLLECTIONS };
