#!/usr/bin/env node
/**
 * hr-audit-retention.js — CLI runner for HR AuditLog retention.
 *
 * Archives events older than 365 days (configurable), then purges
 * archived events older than 1095 days (3 years). Both phases are
 * idempotent — safe to run repeatedly from cron.
 *
 * Cron usage — daily at 02:00:
 *
 *   0 2 * * *  /usr/bin/node /app/backend/scripts/hr-audit-retention.js --quiet
 *
 * Modes:
 *   default       run both archive + purge
 *   --archive     archive only (skip purge)
 *   --purge       purge only (skip archive)
 *   --adaptive    storage-pressure aware archive — tightens cutoff
 *                 when hot-tier row count crosses thresholds (C31)
 *   --dry-run     count affected rows without writing
 *   --json        machine-readable output
 *   --quiet       exit-code only
 *   --help        inline docs
 *
 * Exit codes:
 *   0 — completed successfully
 *   1 — completed with non-zero archive or purge counts (for ops
 *       visibility when you want to see "something happened")
 *   2 — internal error
 *
 * Env vars:
 *   MONGODB_URI                         default localhost/alawael-erp
 *   HR_AUDIT_ARCHIVE_AFTER_DAYS         default 365
 *   HR_AUDIT_PURGE_AFTER_DAYS           default 1095
 *   HR_AUDIT_BATCH_SIZE                 default 1000
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'hr-audit-retention — HR AuditLog archive + purge runner',
      '',
      'Archives HR audit events older than archiveAfterDays,',
      'then purges already-archived events older than purgeAfterDays.',
      '',
      'Exit codes:',
      '  0  clean run (no rows affected)',
      '  1  clean run + at least one row archived or purged',
      '  2  internal error',
      '',
      'Usage:',
      '  node scripts/hr-audit-retention.js              both phases',
      '  node scripts/hr-audit-retention.js --archive    archive only',
      '  node scripts/hr-audit-retention.js --purge      purge only',
      '  node scripts/hr-audit-retention.js --dry-run    count without writing',
      '  node scripts/hr-audit-retention.js --json       JSON output',
      '  node scripts/hr-audit-retention.js --quiet      exit-code only',
      '',
      'Env:',
      '  MONGODB_URI',
      '  HR_AUDIT_ARCHIVE_AFTER_DAYS      default 365',
      '  HR_AUDIT_PURGE_AFTER_DAYS        default 1095',
      '  HR_AUDIT_BATCH_SIZE              default 1000',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = args.has('--json');
const QUIET = args.has('--quiet');
const DRY = args.has('--dry-run');
const ARCHIVE_ONLY = args.has('--archive');
const PURGE_ONLY = args.has('--purge');
const ADAPTIVE = args.has('--adaptive');
const BY_TAG = args.has('--by-tag');
const useColor = !JSON_MODE && !QUIET && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
};

async function main() {
  const mongoose = require('mongoose');
  const { AuditLog } = require('../models/auditLog.model');
  const { createHrAuditRetentionService } = require('../services/hr/hrAuditRetentionService');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const svc = createHrAuditRetentionService({ auditLogModel: AuditLog });
  const archiveAfterDays = Number.parseInt(process.env.HR_AUDIT_ARCHIVE_AFTER_DAYS || '365', 10);
  const purgeAfterDays = Number.parseInt(process.env.HR_AUDIT_PURGE_AFTER_DAYS || '1095', 10);
  const batchSize = Number.parseInt(process.env.HR_AUDIT_BATCH_SIZE || '1000', 10);

  const opts = { archiveAfterDays, purgeAfterDays, batchSize, dryRun: DRY };

  let report;
  if (BY_TAG) {
    // Phase-11 C33 — per-tag policies. Walks config/hr-retention-policies.js
    // in priority order and applies each policy's archive + purge thresholds.
    report = { byPolicies: await svc.runRetentionByPolicies({ batchSize, dryRun: DRY }) };
  } else if (ADAPTIVE) {
    // Phase-11 C31 — storage-pressure aware: compute effective
    // archiveAfterDays from current hot-tier row count before
    // calling archive. Purge still uses its baseline threshold.
    const {
      createHrAdaptiveRetentionService,
    } = require('../services/hr/hrAdaptiveRetentionService');
    const adaptive = createHrAdaptiveRetentionService({
      retentionService: svc,
      auditLogModel: AuditLog,
    });
    const adaptiveReport = await adaptive.runAdaptiveRetention({
      baselineArchiveAfterDays: archiveAfterDays,
      batchSize,
      dryRun: DRY,
    });
    report = { adaptive: adaptiveReport };
    if (!PURGE_ONLY && !ARCHIVE_ONLY) {
      report.purge = await svc.purge(opts);
    }
  } else if (ARCHIVE_ONLY) {
    report = { archive: await svc.archive(opts) };
  } else if (PURGE_ONLY) {
    report = { purge: await svc.purge(opts) };
  } else {
    report = await svc.runFullRetention(opts);
  }

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else if (!QUIET) {
    const lines = [
      `${c.bold}HR AuditLog Retention${c.reset}${DRY ? c.yellow + ' (dry-run)' + c.reset : ''}`,
      '',
    ];
    if (report.byPolicies) {
      const bp = report.byPolicies;
      lines.push(`${c.cyan}Per-Tag Policies${c.reset}  (${bp.policiesRun} policies)`);
      for (const p of bp.perPolicy) {
        lines.push(
          `  ${c.bold}${p.tag}${c.reset}  archive=${p.archive.archiveAfterDays}d  purge=${p.purge.purgeAfterDays}d`
        );
        lines.push(
          `    archived:  ${p.archive.modified > 0 ? c.yellow : c.green}${p.archive.modified}${c.reset}  (matched ${p.archive.matched})`
        );
        lines.push(
          `    purged:    ${p.purge.deleted > 0 ? c.red : c.green}${p.purge.deleted}${c.reset}`
        );
      }
      lines.push('');
      lines.push(
        `  ${c.bold}Totals${c.reset}   archived=${bp.totals.archived}  purged=${bp.totals.purged}  duration=${bp.durationMs}ms`
      );
      lines.push('');
    }
    if (report.adaptive) {
      const a = report.adaptive;
      const pressureColor =
        a.pressureLevel === 'ceiling' ? c.red : a.pressureLevel === 'warning' ? c.yellow : c.green;
      lines.push(`${c.cyan}Adaptive Archive${c.reset}`);
      lines.push(`  hot_count:        ${a.hotCount != null ? a.hotCount : 'unknown'}`);
      lines.push(`  pressure_level:   ${pressureColor}${a.pressureLevel}${c.reset}`);
      lines.push(`  baseline_days:    ${a.baselineArchiveAfterDays}`);
      lines.push(`  computed_days:    ${pressureColor}${a.computedArchiveAfterDays}${c.reset}`);
      lines.push(`  matched:          ${a.archive.matched}`);
      lines.push(
        `  modified:         ${a.archive.modified > 0 ? c.yellow : c.green}${a.archive.modified}${c.reset}`
      );
      lines.push(`  batches:          ${a.archive.batches}`);
      lines.push(`  duration:         ${a.archive.durationMs}ms`);
      lines.push('');
    }
    if (report.archive) {
      const a = report.archive;
      lines.push(`${c.cyan}Archive${c.reset}`);
      lines.push(`  cutoff:       ${a.cutoff}`);
      lines.push(`  matched:      ${a.matched}`);
      lines.push(`  modified:     ${a.modified > 0 ? c.yellow : c.green}${a.modified}${c.reset}`);
      lines.push(`  batches:      ${a.batches}`);
      lines.push(`  duration:     ${a.durationMs}ms`);
      lines.push('');
    }
    if (report.purge) {
      const p = report.purge;
      lines.push(`${c.cyan}Purge${c.reset}`);
      lines.push(`  cutoff:       ${p.cutoff}`);
      lines.push(`  deleted:      ${p.deleted > 0 ? c.red : c.green}${p.deleted}${c.reset}`);
      lines.push(`  batches:      ${p.batches}`);
      lines.push(`  duration:     ${p.durationMs}ms`);
      lines.push('');
    }
    process.stdout.write(lines.join('\n'));
  }

  const affected =
    (report.archive ? report.archive.modified || 0 : 0) +
    (report.adaptive && report.adaptive.archive ? report.adaptive.archive.modified || 0 : 0) +
    (report.byPolicies
      ? (report.byPolicies.totals.archived || 0) + (report.byPolicies.totals.purged || 0)
      : 0) +
    (report.purge ? report.purge.deleted || 0 : 0);
  process.exit(affected > 0 ? 1 : 0);
}

main().catch(err => {
  process.stderr.write(`[hr-audit-retention] ERROR: ${err.stack || err.message || err}\n`);
  process.exit(2);
});
