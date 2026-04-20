#!/usr/bin/env node
/**
 * waitlist-digest.js — stale-waiter watchlist + queue health snapshot.
 *
 * Exit codes:
 *   0 — queue healthy, no stale waiters
 *   1 — at least one waiter past WAITLIST_STALE_DAYS (default 60)
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'waitlist-digest — Waiting-list queue health snapshot',
      '',
      'Exit codes:',
      '  0  no stale waiters',
      '  1  stale waiters present (past WAITLIST_STALE_DAYS)',
      '  2  internal error',
      '',
      'Usage: node scripts/waitlist-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI, WAITLIST_STALE_DAYS (default 60)',
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
  const WaitingListEntry = require('../models/WaitingListEntry');
  const wl = require('../services/waitingListService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const all = await WaitingListEntry.find({}).lean();
  const summary = wl.summarize(all);
  const waiters = all.filter(e => e.status === 'waiting');
  const stale = wl.detectStale(waiters);
  const estimateDays = wl.estimateWaitDays(all);
  const byType = wl.groupByServiceType(all);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          staleDaysThreshold: wl.THRESHOLDS.staleDays,
          summary,
          estimateDays,
          staleWaiters: stale,
          byServiceType: byType,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Waitlist digest${c.reset}  ${c.dim}stale threshold ${wl.THRESHOLDS.staleDays}d${c.reset}\n`
    );
    console.log(
      `  ${c.dim}Waiting: ${c.cyan}${summary.waiting}${c.reset}  ${c.dim}Offered: ${c.cyan}${summary.offered}${c.reset}  ${c.dim}Avg wait: ${c.cyan}${summary.avgWaitDays ?? '—'}${c.reset}d  ${c.dim}Est: ${c.cyan}${estimateDays ?? '—'}${c.reset}d`
    );
    if (summary.oldestWaiterDays != null) {
      console.log(`  ${c.dim}Oldest waiter: ${c.yellow}${summary.oldestWaiterDays}${c.reset}d`);
    }
    console.log();
    if (stale.length > 0) {
      console.log(`  ${c.red}Stale waiters (${stale.length}):${c.reset}`);
      for (const s of stale.slice(0, 20)) {
        const name = s.prospectName || `(beneficiary ${s.beneficiaryId?.slice(-6) || '—'})`;
        console.log(
          `    ${c.yellow}${s.daysWaiting}d${c.reset}  ${c.cyan}${name}${c.reset}  ${c.dim}${s.serviceType} · priority ${s.priority}${c.reset}`
        );
      }
      if (stale.length > 20) {
        console.log(`    ${c.dim}... and ${stale.length - 20} more${c.reset}`);
      }
      console.log();
    } else {
      console.log(`  ${c.green}No stale waiters — queue is healthy.${c.reset}\n`);
    }
  }
  return stale.length > 0 ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}waitlist-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
