#!/usr/bin/env node
/**
 * hr-anomaly-scan.js — CLI runner for HR access anomaly detection.
 *
 * Walks recent AuditLog DATA_READ + DATA_EXPORTED events, groups by
 * actor, and flags any actor exceeding thresholds. Emits
 * `security.suspicious_activity` events that downstream security
 * dashboards + SIEM consumers pick up.
 *
 * Cron usage — every 15 minutes:
 *
 *   *\/15 * * * *  /usr/bin/node /app/backend/scripts/hr-anomaly-scan.js --quiet
 *
 * Exit codes:
 *   0 — scan completed, no new anomalies emitted
 *   1 — scan completed, at least one new anomaly emitted
 *   2 — internal error (DB unreachable, scan threw)
 *
 * Usage:
 *   node scripts/hr-anomaly-scan.js
 *   node scripts/hr-anomaly-scan.js --dry-run
 *   node scripts/hr-anomaly-scan.js --json
 *   node scripts/hr-anomaly-scan.js --quiet
 *   node scripts/hr-anomaly-scan.js --help
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'hr-anomaly-scan — proactive breach detection for HR data access',
      '',
      'Scans recent HR AuditLog events (data.read + data.exported) and',
      'flags actors exceeding thresholds by emitting',
      'security.suspicious_activity events.',
      '',
      'Exit codes:',
      '  0  no new anomalies detected (all flagged users were already',
      '     within cooldown, or nothing over threshold)',
      '  1  at least one NEW anomaly was emitted this run',
      '  2  internal error',
      '',
      'Usage:',
      '  node scripts/hr-anomaly-scan.js             colorized summary',
      '  node scripts/hr-anomaly-scan.js --dry-run   detect but do NOT emit',
      '  node scripts/hr-anomaly-scan.js --json      machine-readable JSON',
      '  node scripts/hr-anomaly-scan.js --quiet     exit-code only',
      '  node scripts/hr-anomaly-scan.js --help      this message',
      '',
      'Env:',
      '  MONGODB_URI                                 (default localhost/alawael-erp)',
      '  HR_ANOMALY_WINDOW_MINUTES                   default 60',
      '  HR_ANOMALY_READS_PER_HOUR                   default 100',
      '  HR_ANOMALY_EXPORTS_PER_DAY                  default 5',
      '  HR_ANOMALY_COOLDOWN_MINUTES                 default 60',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = args.has('--json');
const QUIET = args.has('--quiet');
const DRY = args.has('--dry-run');
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
  const { createHrAnomalyDetectorService } = require('../services/hr/hrAnomalyDetectorService');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const detector = createHrAnomalyDetectorService({ auditLogModel: AuditLog });

  const windowMinutes = Number.parseInt(process.env.HR_ANOMALY_WINDOW_MINUTES || '60', 10);
  const readsPerHourThreshold = Number.parseInt(process.env.HR_ANOMALY_READS_PER_HOUR || '100', 10);
  const exportsPerDayThreshold = Number.parseInt(process.env.HR_ANOMALY_EXPORTS_PER_DAY || '5', 10);
  const cooldownMinutes = Number.parseInt(process.env.HR_ANOMALY_COOLDOWN_MINUTES || '60', 10);

  const report = await detector.scan({
    windowMinutes,
    readsPerHourThreshold,
    exportsPerDayThreshold,
    cooldownMinutes,
    dryRun: DRY,
  });

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else if (!QUIET) {
    const { totals, flagged } = report;
    const newAnomalies = totals.read_anomalies + totals.export_anomalies;
    process.stdout.write(
      [
        `${c.bold}HR Anomaly Scan${c.reset} — ${report.scannedAt}${DRY ? c.yellow + ' (dry-run)' + c.reset : ''}`,
        '',
        `${c.cyan}Thresholds${c.reset}`,
        `  window:          ${windowMinutes} min`,
        `  reads/hour:      ${readsPerHourThreshold}`,
        `  exports/day:     ${exportsPerDayThreshold}`,
        `  cooldown:        ${cooldownMinutes} min`,
        '',
        `${c.cyan}Results${c.reset}`,
        `  new read-anomalies:    ${newAnomalies > 0 ? c.red : c.green}${totals.read_anomalies}${c.reset}`,
        `  new export-anomalies:  ${totals.export_anomalies > 0 ? c.red : c.green}${totals.export_anomalies}${c.reset}`,
        `  cooldown skipped:      ${c.dim}${totals.cooldown_skipped}${c.reset}`,
        '',
        ...(flagged.length > 0
          ? [
              `${c.cyan}Flagged${c.reset}`,
              ...flagged.map(
                f =>
                  `  ${f.cooldownSkipped ? c.dim + '(cooldown)' + c.reset + ' ' : ''}user=${f.userId} role=${f.userRole || 'unknown'} reason=${f.reason} count=${f.observedCount}`
              ),
              '',
            ]
          : []),
      ].join('\n')
    );
  }

  const newAnomalies = report.totals.read_anomalies + report.totals.export_anomalies;
  process.exit(newAnomalies > 0 ? 1 : 0);
}

main().catch(err => {
  process.stderr.write(`[hr-anomaly-scan] ERROR: ${err.stack || err.message || err}\n`);
  process.exit(2);
});
