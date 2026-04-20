#!/usr/bin/env node
/**
 * revenue-digest.js — finance health snapshot.
 *
 * Exit codes:
 *   0 — AR healthy, no overdue-alarm, no >90d concentration
 *   1 — overdue-alarm tripped (>90d AR exceeds AR_OVERDUE_ALARM_PCT)
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'revenue-digest — Finance / AR health snapshot',
      '',
      'Exit codes:',
      '  0  AR healthy',
      '  1  overdue-alarm tripped (>90d AR concentration above threshold)',
      '  2  internal error',
      '',
      'Usage: node scripts/revenue-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI, AR_OVERDUE_ALARM_PCT (default 15),',
      '     AR_OVERDUE_ALARM_MIN_AMOUNT (default 5000 SAR floor)',
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

const fmt = n =>
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

async function main() {
  const mongoose = require('mongoose');
  const Invoice = require('../models/Invoice');
  const rev = require('../services/revenueService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const all = await Invoice.find({})
    .select('status totalAmount issueDate dueDate beneficiary')
    .lean();
  const summary = rev.summarize(all);
  const aging = rev.agingBuckets(all);
  const top = rev.topDebtors(all, 5);
  const alarm = rev.detectOverdueAlarm(aging);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          thresholds: {
            overdueAlarmPct: rev.THRESHOLDS.overdueAlarmPct,
            overdueAlarmMinAmount: rev.THRESHOLDS.overdueAlarmMinAmount,
          },
          overdueAlarm: alarm,
          summary,
          aging,
          topDebtors: top,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Revenue digest${c.reset}  ${c.dim}alarm threshold ${rev.THRESHOLDS.overdueAlarmPct}%${c.reset}\n`
    );
    console.log(
      `  ${c.dim}Gross: ${c.cyan}SAR ${fmt(summary.grossRevenue)}${c.reset}  ${c.dim}Paid: ${c.green}SAR ${fmt(summary.paidRevenue)}${c.reset}  ${c.dim}Outstanding: ${c.yellow}SAR ${fmt(summary.outstandingAmount)}${c.reset}`
    );
    console.log(
      `  ${c.dim}Collection rate: ${c.cyan}${summary.collectionRate ?? '—'}%${c.reset}  ${c.dim}Invoices: ${c.cyan}${summary.total}${c.reset}\n`
    );
    console.log(`  ${c.bold}AR aging:${c.reset}`);
    const rows = [
      ['Current', aging.current],
      ['0-30d late', aging.d0to30],
      ['31-60d late', aging.d31to60],
      ['61-90d late', aging.d61to90],
      ['>90d late', aging.over90],
    ];
    for (const [label, b] of rows) {
      const color =
        label === '>90d late' && alarm ? c.red : label.startsWith('Current') ? c.green : c.yellow;
      console.log(
        `    ${color}${label.padEnd(14)}${c.reset}  SAR ${fmt(b.amount)}  ${c.dim}(${b.count} inv)${c.reset}`
      );
    }
    console.log();
    if (top.length > 0) {
      console.log(`  ${c.bold}Top debtors:${c.reset}`);
      for (const [i, d] of top.entries()) {
        console.log(
          `    ${c.dim}#${i + 1}${c.reset}  ${c.cyan}${d.beneficiary.slice(-6)}${c.reset}  ${c.yellow}SAR ${fmt(d.outstandingAmount)}${c.reset}  ${c.dim}${d.invoiceCount} inv${c.reset}`
        );
      }
      console.log();
    }
    if (alarm) {
      const pct = aging.totalOutstanding
        ? Math.round((aging.over90.amount / aging.totalOutstanding) * 1000) / 10
        : 0;
      console.log(
        `  ${c.red}⚠ OVERDUE ALARM: >90d AR = ${pct}% of outstanding (threshold ${rev.THRESHOLDS.overdueAlarmPct}%)${c.reset}\n`
      );
    } else {
      console.log(`  ${c.green}✓ AR concentration within policy.${c.reset}\n`);
    }
  }
  return alarm ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}revenue-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
