#!/usr/bin/env node
/**
 * doc-expiry-digest.js — consolidated document/contract expiry radar.
 *
 * Exit codes:
 *   0 — no expired items, no critical alerts
 *   1 — any expired items OR critical count above threshold OR surge
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'doc-expiry-digest — Consolidated expiry radar',
      '',
      'Exit codes:',
      '  0  no expired items, no critical alerts',
      '  1  expired items OR critical above threshold OR surge',
      '  2  internal error',
      '',
      'Usage: node scripts/doc-expiry-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI',
      '     DOC_EXPIRY_CRITICAL_DAYS (default 30)',
      '     DOC_EXPIRY_WARNING_DAYS (default 90)',
      '     DOC_EXPIRY_SURGE_PCT (default 50)',
      '     DOC_EXPIRY_CRITICAL_ALARM_COUNT (default 3)',
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

const CRITICAL_ALARM = parseInt(process.env.DOC_EXPIRY_CRITICAL_ALARM_COUNT, 10) || 3;

async function main() {
  const mongoose = require('mongoose');
  const Document = require('../models/Document');
  const EmploymentContract = require('../models/EmploymentContract');
  const rad = require('../services/documentExpiryRadarService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const [docs, contracts] = await Promise.all([
    Document.find({ expiryDate: { $ne: null } })
      .select('title category expiryDate')
      .lean(),
    EmploymentContract.find({ endDate: { $ne: null }, status: { $in: ['active', 'renewed'] } })
      .select('employee endDate contractType status')
      .lean(),
  ]);

  const items = [];
  for (const d of docs) {
    items.push({
      _id: d._id,
      source: 'document',
      category: d.category || 'أخرى',
      title: d.title || '',
      expiryDate: d.expiryDate,
    });
  }
  for (const cr of contracts) {
    items.push({
      _id: cr._id,
      source: 'employment',
      category: `عقد ${cr.contractType || 'عمل'}`,
      title: 'عقد موظف',
      expiryDate: cr.endDate,
      status: cr.status,
    });
  }

  const summary = rad.summarize(items);
  const radar = rad.radarList(items, new Date(), 30);
  const surge = rad.detectSurge(items);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          thresholds: {
            criticalDays: rad.THRESHOLDS.criticalDays,
            warningDays: rad.THRESHOLDS.warningDays,
            surgePct: rad.THRESHOLDS.surgePct,
            criticalAlarm: CRITICAL_ALARM,
          },
          summary,
          surge,
          topItems: radar.slice(0, 10),
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Document expiry radar${c.reset}  ${c.dim}critical ≤${rad.THRESHOLDS.criticalDays}d · warning ≤${rad.THRESHOLDS.warningDays}d${c.reset}\n`
    );
    console.log(
      `  ${c.dim}Total: ${c.cyan}${summary.total}${c.reset}  ${c.dim}Expired: ${c.red}${summary.expired}${c.reset}  ${c.dim}Critical: ${c.yellow}${summary.critical}${c.reset}  ${c.dim}Warning: ${c.cyan}${summary.warning}${c.reset}  ${c.dim}OK: ${c.green}${summary.ok}${c.reset}\n`
    );

    if (radar.length > 0) {
      console.log(`  ${c.bold}Top items (top 10 of ${radar.length}):${c.reset}`);
      for (const r of radar.slice(0, 10)) {
        const wc = r.window === 'expired' ? c.red : r.window === 'critical' ? c.yellow : c.cyan;
        const daysLabel =
          r.daysUntilExpiry < 0 ? `${Math.abs(r.daysUntilExpiry)}d AGO` : `${r.daysUntilExpiry}d`;
        console.log(
          `    ${wc}${daysLabel.padStart(10)}${c.reset}  ${c.cyan}[${r.source}]${c.reset}  ${c.dim}${(r.title || '(no title)').slice(0, 40)}${c.reset}`
        );
      }
      console.log();
    }

    if (surge.active) {
      console.log(
        `  ${c.yellow}⚠ SURGE: ${surge.current} items in next 30d (+${surge.jumpPct}% vs baseline ${surge.baselineAvg})${c.reset}\n`
      );
    }

    if (summary.expired > 0) {
      console.log(
        `  ${c.red}⚠ EXPIRED: ${summary.expired} item(s) need immediate renewal${c.reset}\n`
      );
    } else if (summary.critical >= CRITICAL_ALARM) {
      console.log(
        `  ${c.yellow}⚠ CRITICAL: ${summary.critical} item(s) within ${rad.THRESHOLDS.criticalDays}d (threshold ${CRITICAL_ALARM})${c.reset}\n`
      );
    } else if (!surge.active) {
      console.log(`  ${c.green}✓ No urgent expirations.${c.reset}\n`);
    }
  }
  const unhealthy = summary.expired > 0 || summary.critical >= CRITICAL_ALARM || surge.active;
  return unhealthy ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}doc-expiry-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
