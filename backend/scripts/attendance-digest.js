#!/usr/bin/env node
/**
 * attendance-digest.js — CLI snapshot of session attendance risk.
 *
 * Walks the SessionAttendance collection over the rolling 30-day
 * window and reports beneficiaries with ≥3 (attention) or ≥5
 * (critical) no-shows. Designed for cron + Slack alerting.
 *
 * Exit codes:
 *   0 — nobody in the attention/critical buckets
 *   1 — at least one beneficiary needs front-desk follow-up
 *   2 — internal error (DB unreachable, bad data)
 *
 * Usage:
 *   node scripts/attendance-digest.js           # colorized table
 *   node scripts/attendance-digest.js --json    # machine-readable JSON
 *   node scripts/attendance-digest.js --quiet   # exit code only
 *   node scripts/attendance-digest.js --help    # this message
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'attendance-digest — SessionAttendance no-show risk digest',
      '',
      'Walks the last 30 days of session attendance + buckets by risk.',
      'Exits with a status code suitable for cron + alerting:',
      '  0  no beneficiaries in attention/critical buckets',
      '  1  at least one beneficiary needs follow-up',
      '  2  internal error (DB unreachable, bad data)',
      '',
      'Usage:',
      '  node scripts/attendance-digest.js           colorized table',
      '  node scripts/attendance-digest.js --json    machine-readable JSON',
      '  node scripts/attendance-digest.js --quiet   exit-code only, no stdout',
      '  node scripts/attendance-digest.js --help    this message',
      '',
      'Env:',
      '  MONGODB_URI                                   (default localhost/alawael-erp)',
      '  ATTENDANCE_NOSHOW_ATTENTION                   default 3',
      '  ATTENDANCE_NOSHOW_CRITICAL                    default 5',
      '  ATTENDANCE_WINDOW_DAYS                        default 30',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = args.has('--json');
const QUIET = args.has('--quiet');

const useColor = !JSON_MODE && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
  gray: useColor ? '\x1b[90m' : '',
};

async function main() {
  const mongoose = require('mongoose');
  const SessionAttendance = require('../models/SessionAttendance');
  const Beneficiary = require('../models/Beneficiary');
  const svc = require('../services/sessionAttendanceService');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const windowStart = new Date(Date.now() - svc.THRESHOLDS.windowDays * 24 * 60 * 60 * 1000);
  const records = await SessionAttendance.find({ scheduledDate: { $gte: windowStart } }).lean();
  const summary = svc.summarize(records, { windowStart });
  const grouped = svc.groupByBeneficiary(records);
  const buckets = svc.bucketByNoShowRisk(grouped);

  // Hydrate names so the output is readable offline.
  const ids = [...buckets.attention, ...buckets.critical]
    .map(e => e.beneficiaryId)
    .filter(id => mongoose.isValidObjectId(id));
  const benefs = ids.length
    ? await Beneficiary.find({ _id: { $in: ids } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean()
    : [];
  const benefMap = new Map(benefs.map(b => [String(b._id), b]));
  const hydrate = entry => ({
    ...entry,
    name:
      [
        benefMap.get(entry.beneficiaryId)?.firstName_ar,
        benefMap.get(entry.beneficiaryId)?.lastName_ar,
      ]
        .filter(Boolean)
        .join(' ') || '—',
    beneficiaryNumber: benefMap.get(entry.beneficiaryId)?.beneficiaryNumber || null,
  });

  const attention = buckets.attention.map(hydrate);
  const critical = buckets.critical.map(hydrate);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          windowDays: svc.THRESHOLDS.windowDays,
          summary,
          attention,
          critical,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    const checkedAt = new Date().toLocaleString('en-US', { hour12: false });
    console.log(
      `\n${c.bold}Al-Awael — Session attendance digest${c.reset}  ${c.dim}${checkedAt}${c.reset}\n`
    );
    console.log(
      `  ${c.dim}Last ${svc.THRESHOLDS.windowDays}d: ${summary.total} sessions, ` +
        `${c.green}${summary.attendanceRate ?? 0}%${c.dim} attendance · ` +
        `${c.red}${summary.noShow}${c.dim} no-show · ` +
        `${c.yellow}${summary.absent}${c.dim} absent${c.reset}\n`
    );
    if (critical.length > 0) {
      console.log(`  ${c.bold}${c.red}Critical (≥5 no-shows):${c.reset}`);
      for (const r of critical) {
        console.log(
          `    ${c.cyan}${r.name}${c.reset} ${c.gray}(${r.beneficiaryNumber || '—'})${c.reset}` +
            `  ${c.red}${r.noShows} no-shows${c.reset}` +
            `  ${c.dim}last: ${r.lastNoShow ? new Date(r.lastNoShow).toISOString().slice(0, 10) : '—'}${c.reset}`
        );
      }
      console.log();
    }
    if (attention.length > 0) {
      console.log(`  ${c.bold}${c.yellow}Attention (3-4 no-shows):${c.reset}`);
      for (const r of attention) {
        console.log(
          `    ${c.cyan}${r.name}${c.reset} ${c.gray}(${r.beneficiaryNumber || '—'})${c.reset}` +
            `  ${c.yellow}${r.noShows} no-shows${c.reset}` +
            `  ${c.dim}last: ${r.lastNoShow ? new Date(r.lastNoShow).toISOString().slice(0, 10) : '—'}${c.reset}`
        );
      }
      console.log();
    }
    if (attention.length === 0 && critical.length === 0) {
      console.log(`  ${c.green}No beneficiaries in risk buckets — keep it up.${c.reset}\n`);
    }
  }

  return attention.length > 0 || critical.length > 0 ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) {
      console.error(`${c.red}attendance-digest failed:${c.reset} ${err.message}`);
      if (!QUIET) {
        console.error(`${c.dim}Run with --help for usage + expected env vars.${c.reset}`);
      }
    } else {
      process.stdout.write(
        JSON.stringify({ error: err.message, checkedAt: new Date().toISOString() }) + '\n'
      );
    }
    process.exit(2);
  });
