#!/usr/bin/env node
/**
 * hr-credential-sync.js — CLI runner for HR credential status reconciliation.
 *
 * Walks the Certification + EmploymentContract collections and aligns
 * their stored `status` field with the computed-from-dates reality,
 * then reports the magnitude of SCFHS license exposure.
 *
 * Run manually after deploy, or hook it into cron (daily at 02:00):
 *
 *   0 2 * * *  /usr/bin/node /app/backend/scripts/hr-credential-sync.js --quiet
 *
 * Exit codes:
 *   0 — sync completed, nothing critical (no SCFHS expired licenses)
 *   1 — sync completed, at least one SCFHS license is expired
 *        (ops action recommended: verify the red-flag engine raised
 *        the matching operational.therapist.license.expired entries)
 *   2 — internal error (DB unreachable, sync threw)
 *
 * Usage:
 *   node scripts/hr-credential-sync.js           colorized summary
 *   node scripts/hr-credential-sync.js --json    machine-readable JSON
 *   node scripts/hr-credential-sync.js --quiet   exit-code only
 *   node scripts/hr-credential-sync.js --help    this message
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'hr-credential-sync — reconcile HR credential status fields',
      '',
      'Updates Certification.status (valid|expiring_soon|expired) and',
      'EmploymentContract.status (active → expired when end_date has passed)',
      'from the source-of-truth date fields. Safe to run repeatedly.',
      '',
      'Exit codes:',
      '  0  sync completed, no expired SCFHS licenses detected',
      '  1  sync completed, at least one employee has scfhs_expiry < now',
      '  2  internal error (DB unreachable, sync threw)',
      '',
      'Usage:',
      '  node scripts/hr-credential-sync.js           colorized summary',
      '  node scripts/hr-credential-sync.js --json    machine-readable JSON',
      '  node scripts/hr-credential-sync.js --quiet   exit-code only',
      '  node scripts/hr-credential-sync.js --help    this message',
      '',
      'Env:',
      '  MONGODB_URI          (default localhost/alawael-erp)',
      '  HR_SYNC_EXPIRING_SOON_DAYS  default 60',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = args.has('--json');
const QUIET = args.has('--quiet');
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
  const Certification = require('../models/hr/Certification');
  const EmploymentContract = require('../models/hr/EmploymentContract');
  const Employee = require('../models/HR/Employee');
  const { runFullHrCredentialSync } = require('../services/hr/hrCredentialStatusSync');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const expiringSoonDays = Number.parseInt(process.env.HR_SYNC_EXPIRING_SOON_DAYS || '60', 10);

  const logger = QUIET ? { info: () => {}, warn: () => {} } : console;

  const report = await runFullHrCredentialSync({
    Certification,
    EmploymentContract,
    Employee,
    now: new Date(),
    expiringSoonDays,
    logger,
  });

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else if (!QUIET) {
    const { certifications, employmentContracts, saudiLicenseExposure } = report;
    process.stdout.write(
      [
        `${c.bold}HR Credential Sync${c.reset} — ${report.finishedAt} (${report.durationMs}ms)`,
        '',
        `${c.cyan}Certifications${c.reset}`,
        `  scanned:         ${certifications.scanned}`,
        `  modified:        ${certifications.modified}`,
        `  valid:           ${c.green}${certifications.tally.valid}${c.reset}`,
        `  expiring_soon:   ${c.yellow}${certifications.tally.expiring_soon}${c.reset}`,
        `  expired:         ${c.red}${certifications.tally.expired}${c.reset}`,
        `  skipped:         ${certifications.tally.skipped}${c.dim} (no expiry_date)${c.reset}`,
        '',
        `${c.cyan}Employment Contracts${c.reset}`,
        `  flipped active → expired:  ${c.red}${employmentContracts.modified}${c.reset}`,
        '',
        `${c.cyan}SCFHS License Exposure (read-only)${c.reset}`,
        `  expired:                   ${c.red}${saudiLicenseExposure?.expired ?? 0}${c.reset}`,
        `  expiring within 60 days:   ${c.yellow}${saudiLicenseExposure?.expiring_within_60d ?? 0}${c.reset}`,
        '',
      ].join('\n')
    );
  }

  const scfhsExpired = report.saudiLicenseExposure?.expired ?? 0;
  process.exit(scfhsExpired > 0 ? 1 : 0);
}

main().catch(err => {
  process.stderr.write(`[hr-credential-sync] ERROR: ${err.stack || err.message || err}\n`);
  process.exit(2);
});
