#!/usr/bin/env node
/**
 * referrals-digest.js — referral-network health snapshot.
 *
 * Exit codes:
 *   0 — close-loop clean, no outgoing referrals past threshold
 *   1 — at least one outgoing referral past REFERRAL_CLOSE_LOOP_DAYS (default 30)
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'referrals-digest — Referral-network health snapshot',
      '',
      'Exit codes:',
      '  0  no close-loop gaps',
      '  1  outgoing referrals past REFERRAL_CLOSE_LOOP_DAYS',
      '  2  internal error',
      '',
      'Usage: node scripts/referrals-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI, REFERRAL_CLOSE_LOOP_DAYS (default 30), REFERRAL_RANK_MIN (default 2)',
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
  const ReferralTracking = require('../models/ReferralTracking');
  const ref = require('../services/referralTrackingService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const all = await ReferralTracking.find({}).lean();
  const both = ref.summarize(all);
  const incoming = ref.summarize(all, 'incoming');
  const outgoing = ref.summarize(all, 'outgoing');
  const top = ref.topReferrers(all, 5);
  const gaps = ref.closeLoopGaps(all);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          closeLoopDaysThreshold: ref.THRESHOLDS.closeLoopDays,
          summary: { both, incoming, outgoing },
          topReferrers: top,
          closeLoopGaps: gaps,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Referrals digest${c.reset}  ${c.dim}close-loop threshold ${ref.THRESHOLDS.closeLoopDays}d${c.reset}\n`
    );
    console.log(
      `  ${c.dim}Total: ${c.cyan}${both.total}${c.reset}  ${c.dim}Incoming: ${c.cyan}${incoming.total}${c.reset} (${incoming.conversionRate ?? '—'}% conv)  ${c.dim}Outgoing: ${c.cyan}${outgoing.total}${c.reset} (${outgoing.conversionRate ?? '—'}% conv)`
    );
    console.log();
    if (top.length > 0) {
      console.log(`  ${c.bold}Top referrers:${c.reset}`);
      for (const [i, t] of top.entries()) {
        console.log(
          `    ${c.dim}#${i + 1}${c.reset}  ${c.cyan}${t.displayName}${c.reset}  ${c.dim}${t.wins}/${t.total}${c.reset}  ${c.yellow}${t.conversionRate ?? '—'}%${c.reset}`
        );
      }
      console.log();
    }
    if (gaps.length > 0) {
      console.log(`  ${c.red}Close-loop gaps (${gaps.length}):${c.reset}`);
      for (const g of gaps.slice(0, 20)) {
        const name = g.prospectName || `(beneficiary ${g.beneficiaryId?.slice(-6) || '—'})`;
        console.log(
          `    ${c.yellow}${g.daysOpen}d${c.reset}  ${c.cyan}${name}${c.reset}  ${c.dim}→ ${g.destinationOrg || '?'}${c.reset}`
        );
      }
      if (gaps.length > 20) {
        console.log(`    ${c.dim}... and ${gaps.length - 20} more${c.reset}`);
      }
      console.log();
    } else {
      console.log(`  ${c.green}No close-loop gaps — network healthy.${c.reset}\n`);
    }
  }
  return gaps.length > 0 ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}referrals-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
