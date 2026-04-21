#!/usr/bin/env node
/**
 * onboarding-digest.js — new-hire checklist health snapshot.
 *
 * Exit codes:
 *   0 — no stalled onboardings past threshold
 *   1 — stalled count ≥ ONBOARDING_OVERDUE_ALARM_COUNT
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'onboarding-digest — New-hire checklist health snapshot',
      '',
      'Exit codes:',
      '  0  no stalled onboardings',
      '  1  stalled count above threshold',
      '  2  internal error',
      '',
      'Usage: node scripts/onboarding-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI',
      '     ONBOARDING_OVERDUE_ALARM_COUNT (default 3)',
      '     ONBOARDING_GRACE_DAYS (default 3)',
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
  const OnboardingChecklist = require('../models/OnboardingChecklist');
  const oa = require('../services/onboardingAnalyticsService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const all = await OnboardingChecklist.find({}).lean();
  const summary = oa.summarize(all);
  const alarm = oa.detectOverdueAlarm(all);
  const stalled = oa.stalledChecklists(all, new Date(), 10);
  const bottlenecks = oa.taskCompletion(all).slice(0, 5);
  const byResp = oa.byResponsible(all);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          thresholds: oa.THRESHOLDS,
          summary,
          alarm,
          topStalled: stalled,
          bottlenecks,
          byResponsible: byResp,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(`\n${c.bold}Al-Awael — Onboarding digest${c.reset}\n`);
    console.log(
      `  ${c.dim}Total: ${c.cyan}${summary.total}${c.reset}  ${c.dim}In-progress: ${c.cyan}${summary.byStatus?.in_progress || 0}${c.reset}  ${c.dim}Completed: ${c.green}${summary.byStatus?.completed || 0}${c.reset}`
    );
    const stColor = summary.stalledCount > 0 ? c.red : c.green;
    console.log(
      `  ${c.dim}Stalled: ${stColor}${summary.stalledCount}${c.reset}  ${c.dim}Avg completion: ${c.cyan}${summary.avgCompletionDays ?? '—'} days${c.reset}\n`
    );

    if (bottlenecks.length > 0) {
      console.log(`  ${c.bold}Bottleneck tasks (worst 5):${c.reset}`);
      for (const b of bottlenecks) {
        const rc = b.completionRate >= 85 ? c.green : b.completionRate < 50 ? c.red : c.yellow;
        console.log(
          `    ${rc}${(b.completionRate ?? '—') + '%'}${c.reset}  ${c.cyan}${(b.title || '').slice(0, 35).padEnd(35)}${c.reset}  ${c.dim}${b.completed}/${b.total}${c.reset}`
        );
      }
      console.log();
    }

    if (byResp.length > 0) {
      console.log(`  ${c.bold}By responsible:${c.reset}`);
      for (const r of byResp) {
        if (r.total === 0) continue;
        const rc = r.completionRate >= 85 ? c.green : r.completionRate < 50 ? c.red : c.yellow;
        console.log(
          `    ${c.cyan}${r.responsible.padEnd(10)}${c.reset}  ${rc}${(r.completionRate ?? '—') + '%'}${c.reset}  ${c.dim}${r.completed}/${r.total}${c.reset}`
        );
      }
      console.log();
    }

    if (stalled.length > 0) {
      console.log(`  ${c.bold}Stalled (top 10 of ${summary.stalledCount}):${c.reset}`);
      for (const s of stalled) {
        console.log(
          `    ${c.red}+${s.daysLate}d${c.reset}  ${c.cyan}${(s.uuid || '').slice(0, 8) || s._id?.toString().slice(-6)}${c.reset}  ${c.dim}${s.completedTasks}/${s.totalTasks} tasks${c.reset}`
        );
      }
      console.log();
    }

    if (alarm.active) {
      console.log(
        `  ${c.red}⚠ ALARM: ${alarm.stalledCount} stalled checklist(s), threshold ${alarm.threshold}${c.reset}\n`
      );
    } else {
      console.log(`  ${c.green}✓ Onboarding pipeline healthy.${c.reset}\n`);
    }
  }
  return alarm.active ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}onboarding-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
