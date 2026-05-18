#!/usr/bin/env node
/**
 * no-show-validate.js — Wave 116 / P3.4 operationalization.
 *
 * End-of-day cron entry point: sweeps active no-show predictions whose
 * target_date is in the past and writes `actual_value` based on the
 * appointment's terminal status (COMPLETED / NO_SHOW / CANCELLED /
 * CHECKED_IN / IN_PROGRESS). RESCHEDULED is intentionally NOT terminal
 * — the outcome moved to a new appointment.
 *
 * Exit codes:
 *   0  sweep ran
 *   1  internal error (DB unreachable, service threw)
 *
 * Usage:
 *   node scripts/no-show-validate.js                colorized summary
 *   node scripts/no-show-validate.js --json         machine-readable JSON
 *   node scripts/no-show-validate.js --quiet        exit-code only
 *   node scripts/no-show-validate.js --since=ISO    look-back start (default 30d ago)
 *   node scripts/no-show-validate.js --limit=N      max predictions per sweep (default 500)
 *   node scripts/no-show-validate.js --help         this message
 *
 * Env:
 *   MONGODB_URI                                     default mongodb://localhost:27017/alawael-erp
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
      'no-show-validate — sweep pending no-show predictions',
      '',
      'Looks up each active attendance prediction whose target_date is',
      'in the past, finds the appointment, and writes actual_value if',
      'the appointment reached a terminal state. Computes accuracy.',
      '',
      'Exit codes:',
      '  0  sweep ran',
      '  1  internal error',
      '',
      'Usage:',
      '  node scripts/no-show-validate.js                colorized summary',
      '  node scripts/no-show-validate.js --json         machine-readable JSON',
      '  node scripts/no-show-validate.js --quiet        exit-code only',
      '  node scripts/no-show-validate.js --since=ISO    look-back start',
      '  node scripts/no-show-validate.js --limit=N      max per sweep (default 500)',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = flag('--json');
const QUIET = flag('--quiet');
const SINCE = valueOf('--since') || null;
const LIMIT = Number(valueOf('--limit')) || 500;

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

  const result = await svc.validatePending({ since: SINCE, limit: LIMIT });

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          ranAt: new Date().toISOString(),
          since: SINCE,
          limit: LIMIT,
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
      `${c.red}${c.bold}Validation sweep failed:${c.reset} ${result.reason || 'unknown'}`
    );
    return 1;
  }

  const s = result.stats || {};
  const now = new Date().toLocaleString('en-US', { hour12: false });
  console.log(
    `\n${c.bold}Al-Awael — No-show validation sweep${c.reset}  ${c.dim}${now}${c.reset}\n`
  );
  console.log(
    `  ${c.dim}Scanned ${s.total || 0} pending predictions since ` +
      `${(result.since || '').slice(0, 10)} (limit ${LIMIT})${c.reset}\n`
  );
  console.log(
    `  ${c.green}${s.validated || 0}${c.reset} validated · ` +
      `${c.green}${s.accurate || 0}${c.reset} within tolerance · ` +
      `${c.yellow}${s.skippedNotTerminal || 0}${c.reset} still pending · ` +
      `${c.gray}${s.skippedAppointmentMissing || 0}${c.reset} orphaned · ` +
      `${c.red}${s.failed || 0}${c.reset} failed`
  );
  if (result.accuracy !== null && result.accuracy !== undefined) {
    const accStr = (result.accuracy * 100).toFixed(1);
    const color = result.accuracy >= 0.75 ? c.green : result.accuracy >= 0.5 ? c.yellow : c.red;
    console.log(`  ${c.bold}Accuracy: ${color}${accStr}%${c.reset}\n`);
  } else {
    console.log(`  ${c.dim}Accuracy: n/a (no predictions validated this run)${c.reset}\n`);
  }
  return 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    process.stderr.write(`[no-show-validate] ${err.stack || err.message}\n`);
    process.exit(1);
  });
