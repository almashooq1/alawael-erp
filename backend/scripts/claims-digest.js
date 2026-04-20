#!/usr/bin/env node
/**
 * claims-digest.js — NPHIES claims health snapshot.
 *
 * Exit codes:
 *   0 — approval rate healthy, no rejection spike
 *   1 — rejection spike detected (>CLAIMS_REJECTION_ALARM_PCT over window)
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'claims-digest — NPHIES claims analytics snapshot',
      '',
      'Exit codes:',
      '  0  claims healthy',
      '  1  rejection-rate spike detected',
      '  2  internal error',
      '',
      'Usage: node scripts/claims-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI',
      '     CLAIMS_REJECTION_ALARM_PCT (default 20)',
      '     CLAIMS_ALARM_WINDOW_DAYS (default 30)',
      '     CLAIMS_ALARM_MIN_SAMPLE (default 10)',
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
};

async function main() {
  const mongoose = require('mongoose');
  const NphiesClaim = require('../models/NphiesClaim');
  const ca = require('../services/claimsAnalyticsService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const all = await NphiesClaim.find({}).lean();
  const summary = ca.summarize(all);
  const reasons = ca.rejectionReasons(all, 5);
  const byIns = ca.byInsurer(all);
  const spike = ca.detectRejectionSpike(all);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          thresholds: {
            rejectionAlarmPct: ca.THRESHOLDS.rejectionAlarmPct,
            alarmWindowDays: ca.THRESHOLDS.alarmWindowDays,
            alarmMinSample: ca.THRESHOLDS.alarmMinSample,
          },
          spike,
          summary,
          topRejectionReasons: reasons,
          byInsurer: byIns,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Claims digest${c.reset}  ${c.dim}alarm ${ca.THRESHOLDS.rejectionAlarmPct}% over ${ca.THRESHOLDS.alarmWindowDays}d${c.reset}\n`
    );
    console.log(
      `  ${c.dim}Total: ${c.cyan}${summary.total}${c.reset}  ${c.dim}Approved: ${c.green}${summary.approvedCount}${c.reset}  ${c.dim}Rejected: ${c.red}${summary.rejectedCount}${c.reset}  ${c.dim}Pending: ${c.yellow}${summary.pendingCount}${c.reset}`
    );
    console.log(
      `  ${c.dim}Approval rate: ${c.cyan}${summary.approvalRate ?? '—'}%${c.reset}  ${c.dim}Rejected value: ${c.red}SAR ${summary.rejectedAmount.toLocaleString()}${c.reset}\n`
    );

    if (reasons.length > 0) {
      console.log(`  ${c.bold}Top rejection reasons:${c.reset}`);
      for (const [i, r] of reasons.entries()) {
        console.log(
          `    ${c.dim}#${i + 1}${c.reset}  ${c.yellow}${r.count}${c.reset}  ${c.cyan}${r.reason}${c.reset}  ${c.dim}SAR ${r.amount.toLocaleString()}${c.reset}`
        );
      }
      console.log();
    }

    if (byIns.length > 0) {
      console.log(`  ${c.bold}Per insurer (top 5 by volume):${c.reset}`);
      for (const ins of byIns.slice(0, 5)) {
        const rateColor =
          ins.approvalRate == null
            ? c.dim
            : ins.approvalRate >= 85
              ? c.green
              : ins.approvalRate < 60
                ? c.red
                : c.yellow;
        console.log(
          `    ${c.cyan}${ins.insurer}${c.reset}  ${c.dim}${ins.total} claims${c.reset}  ${rateColor}${ins.approvalRate ?? '—'}%${c.reset}  ${c.dim}${ins.approved}✓/${ins.rejected}✗${c.reset}`
        );
      }
      console.log();
    }

    if (spike.active) {
      console.log(
        `  ${c.red}⚠ REJECTION SPIKE: ${spike.rejectionRate}% in last ${spike.windowDays}d (threshold ${spike.threshold}%, sample ${spike.settled})${c.reset}\n`
      );
    } else if (spike.settled < ca.THRESHOLDS.alarmMinSample) {
      console.log(
        `  ${c.dim}Spike alarm: insufficient sample (${spike.settled} < ${ca.THRESHOLDS.alarmMinSample}).${c.reset}\n`
      );
    } else {
      console.log(`  ${c.green}✓ Rejection rate within policy.${c.reset}\n`);
    }
  }
  return spike.active ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}claims-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
