#!/usr/bin/env node
/**
 * goal-progress-digest.js — stalled-goals digest.
 *
 * Exit codes:
 *   0 — no stalled goals
 *   1 — at least one stalled goal (therapist or supervisor needs to act)
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'goal-progress-digest — Stalled care-plan goals digest',
      '',
      'Reports goals with no progress update for GOAL_STALL_DAYS (default 30).',
      '',
      'Exit codes:',
      '  0  no stalled goals',
      '  1  at least one stalled goal',
      '  2  internal error',
      '',
      'Usage:',
      '  node scripts/goal-progress-digest.js [--json] [--quiet] [--help]',
      '',
      'Env:',
      '  MONGODB_URI, GOAL_STALL_DAYS',
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
  const GoalProgressEntry = require('../models/GoalProgressEntry');
  const gp = require('../services/goalProgressService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  // 6-month window is enough to catch stale goals without pulling all history.
  const sixMonths = new Date(Date.now() - 180 * 86400000);
  const items = await GoalProgressEntry.find({ recordedAt: { $gte: sixMonths } }).lean();
  const byGoal = gp.groupByGoal(items);
  const stalled = gp.detectStalled(byGoal);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        { checkedAt: new Date().toISOString(), stalled, totalGoalsTracked: byGoal.size },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Stalled goals digest${c.reset}  ${c.dim}${new Date().toISOString().slice(0, 10)}${c.reset}\n`
    );
    console.log(
      `  ${c.dim}Goals tracked (last 180d): ${byGoal.size} · Stalled: ${c.yellow}${stalled.length}${c.reset}\n`
    );
    if (stalled.length > 0) {
      for (const s of stalled) {
        console.log(
          `    ${c.cyan}goal ${s.goalId}${c.reset}  ${c.yellow}${s.daysSinceLast}d since update${c.reset}  ${c.dim}progress: ${s.lastProgress}%${c.reset}`
        );
      }
      console.log();
    } else {
      console.log(`  ${c.green}No stalled goals.${c.reset}\n`);
    }
  }

  return stalled.length > 0 ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}goal-progress-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
