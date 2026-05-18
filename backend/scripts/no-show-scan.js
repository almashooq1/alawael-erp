#!/usr/bin/env node
/**
 * no-show-scan.js — Wave 116 / P3.4 operationalization.
 *
 * Daily-cron entry point: runs `dailyScanAllBranches` to produce
 * fresh no-show predictions for every PENDING/CONFIRMED appointment
 * in the next 48 hours (configurable).
 *
 * Exit codes:
 *   0  scan ran (regardless of how many predictions were emitted)
 *   1  internal error (DB unreachable, service threw)
 *
 * Usage:
 *   node scripts/no-show-scan.js                 colorized table
 *   node scripts/no-show-scan.js --json          machine-readable JSON
 *   node scripts/no-show-scan.js --quiet         exit-code only
 *   node scripts/no-show-scan.js --dry-run       run heuristic, do not persist
 *   node scripts/no-show-scan.js --horizon=72    look-ahead window (hours, default 48)
 *   node scripts/no-show-scan.js --branch=ID     restrict to a single branch
 *   node scripts/no-show-scan.js --help          this message
 *
 * Env:
 *   MONGODB_URI                                  default mongodb://localhost:27017/alawael-erp
 */

'use strict';

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const valueOf = name => {
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith('-')) return args[idx + 1];
  return null;
};

if (flag('--help') || flag('-h')) {
  process.stdout.write(
    [
      'no-show-scan — daily no-show prediction scan',
      '',
      'Runs the heuristic risk scorer over every PENDING/CONFIRMED',
      'appointment in the look-ahead window and persists results as',
      'AiPrediction documents with prediction_type=attendance.',
      '',
      'Exit codes:',
      '  0  scan ran',
      '  1  internal error (DB unreachable, service threw)',
      '',
      'Usage:',
      '  node scripts/no-show-scan.js                colorized table',
      '  node scripts/no-show-scan.js --json         machine-readable JSON',
      '  node scripts/no-show-scan.js --quiet        exit-code only',
      '  node scripts/no-show-scan.js --dry-run      do not persist',
      '  node scripts/no-show-scan.js --horizon=72   hours look-ahead (default 48)',
      '  node scripts/no-show-scan.js --branch=ID    restrict to one branch',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = flag('--json');
const QUIET = flag('--quiet');
const DRY_RUN = flag('--dry-run');
const HORIZON = Number(valueOf('--horizon')) || 48;
const BRANCH = valueOf('--branch') || null;

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
  const Appointment = require('../models/Appointment');
  const AiPrediction = require('../models/AiPrediction');
  const { createNoShowPredictionService } = require('../intelligence/no-show-prediction.service');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const svc = createNoShowPredictionService({
    appointmentModel: Appointment,
    predictionModel: AiPrediction,
    logger: console,
  });

  const result = BRANCH
    ? await svc.predictBatch({ branchId: BRANCH, horizonHours: HORIZON, dryRun: DRY_RUN })
    : await svc.dailyScanAllBranches({ horizonHours: HORIZON, dryRun: DRY_RUN });

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          scannedAt: new Date().toISOString(),
          horizonHours: HORIZON,
          branchId: BRANCH,
          dryRun: DRY_RUN,
          result,
        },
        null,
        2
      ) + '\n'
    );
    return 0;
  }

  if (QUIET) return 0;

  if (!result.ok) {
    console.log(
      `${c.red}${c.bold}No-show scan failed:${c.reset} ${result.reason || 'unknown'}` +
        (result.message ? ` — ${result.message}` : '')
    );
    return 1;
  }

  const b = result.byBand || {};
  const now = new Date().toLocaleString('en-US', { hour12: false });
  console.log(
    `\n${c.bold}Al-Awael — No-show prediction scan${c.reset}  ${c.dim}${now}${c.reset}\n`
  );
  console.log(
    `  ${c.dim}Horizon: ${HORIZON}h · ` +
      `Branch: ${BRANCH || 'ALL'} · ` +
      `dryRun: ${DRY_RUN ? 'yes' : 'no'}${c.reset}\n`
  );
  console.log(
    `  ${c.bold}${result.total}${c.reset} predictions emitted: ` +
      `${c.gray}low ${b.low || 0}${c.reset} · ` +
      `${c.yellow}medium ${b.medium || 0}${c.reset} · ` +
      `${c.red}high ${b.high || 0}${c.reset} · ` +
      `${c.red}${c.bold}critical ${b.critical || 0}${c.reset}\n`
  );

  if ((b.high || 0) + (b.critical || 0) > 0) {
    console.log(`  ${c.bold}${c.red}Top-risk appointments:${c.reset}`);
    const topRisk = (result.predictions || [])
      .filter(p => p.band === 'high' || p.band === 'critical')
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
    for (const p of topRisk) {
      const dateStr = p.date ? new Date(p.date).toISOString().slice(0, 16).replace('T', ' ') : '—';
      console.log(
        `   ${c.dim}•${c.reset} ${dateStr}  ` +
          `${c.bold}${p.score.toFixed(2)}${c.reset} (${p.band})  ` +
          `${c.gray}apt=${p.appointmentId.slice(-8)}  ben=${(p.beneficiary || '').slice(-8)}${c.reset}`
      );
    }
    console.log('');
  }

  return 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    process.stderr.write(`[no-show-scan] ${err.stack || err.message}\n`);
    process.exit(1);
  });
