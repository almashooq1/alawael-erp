#!/usr/bin/env node
/**
 * forecast-digest.js — short-horizon cashflow forecast.
 *
 * Exit codes:
 *   0 — projection healthy, no cashflow-risk signal
 *   1 — cashflow-risk tripped (latest month down ≥ FORECAST_RISK_DROP_PCT)
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'forecast-digest — Short-horizon cashflow forecast',
      '',
      'Exit codes:',
      '  0  projection healthy',
      '  1  cashflow-risk alarm (latest month drop ≥ threshold)',
      '  2  internal error',
      '',
      'Usage: node scripts/forecast-digest.js [--json] [--quiet] [--months=N] [--help]',
      'Env: MONGODB_URI',
      '     FORECAST_TRAILING_MONTHS (default 6)',
      '     FORECAST_RISK_DROP_PCT (default 20)',
      '     FORECAST_MIN_HISTORY_MONTHS (default 3)',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = args.has('--json');
const QUIET = args.has('--quiet');
const MONTHS_ARG = [...args].find(a => a.startsWith('--months='));
const MONTHS = MONTHS_ARG ? Math.max(1, Math.min(12, parseInt(MONTHS_ARG.split('=')[1], 10))) : 3;

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

const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');

async function main() {
  const mongoose = require('mongoose');
  const Invoice = require('../models/Invoice');
  const fc = require('../services/revenueForecastService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const all = await Invoice.find({})
    .select('status totalAmount issueDate updatedAt insurance')
    .lean();
  const projection = fc.projectMonths(all, MONTHS);
  const dso = fc.dso(all);
  const risk = fc.detectCashflowRisk(all);
  const velocity = fc.velocityByInsurer(all).slice(0, 5);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          thresholds: {
            trailingMonths: fc.THRESHOLDS.trailingMonths,
            riskDropPct: fc.THRESHOLDS.riskDropPct,
            minHistoryMonths: fc.THRESHOLDS.minHistoryMonths,
          },
          dso,
          risk,
          projection,
          slowestInsurers: velocity,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Forecast digest${c.reset}  ${c.dim}${MONTHS} months ahead · trailing ${fc.THRESHOLDS.trailingMonths}m${c.reset}\n`
    );

    if (projection.insufficient) {
      console.log(
        `  ${c.yellow}⚠ Insufficient history:${c.reset} ${projection.monthsObserved} months observed (need ${projection.required}). Skipping projection.\n`
      );
    } else {
      const t = projection.trailing;
      console.log(
        `  ${c.dim}Trailing avg issued: ${c.cyan}SAR ${fmt(t.issuedAvg)}/mo${c.reset}  ${c.dim}paid: ${c.green}SAR ${fmt(t.paidAvg)}/mo${c.reset}  ${c.dim}collection: ${c.cyan}${t.collectionRate ?? '—'}%${c.reset}`
      );
      const dsoColor = dso == null ? c.dim : dso <= 45 ? c.green : dso > 90 ? c.red : c.yellow;
      console.log(`  ${c.dim}DSO: ${dsoColor}${dso ?? '—'} days${c.reset}\n`);

      console.log(`  ${c.bold}Projection:${c.reset}`);
      for (const p of projection.projections) {
        const confColor = p.confidence >= 0.8 ? c.green : p.confidence >= 0.5 ? c.yellow : c.dim;
        console.log(
          `    ${c.cyan}${p.month}${c.reset}  ${c.dim}issued:${c.reset} SAR ${fmt(p.projectedIssued)}  ${c.dim}collected:${c.reset} ${c.green}SAR ${fmt(p.projectedCollected)}${c.reset}  ${confColor}(${Math.round(p.confidence * 100)}% conf)${c.reset}`
        );
      }
      console.log();
    }

    if (velocity.length > 0) {
      console.log(`  ${c.bold}Slowest payers (top 5):${c.reset}`);
      for (const v of velocity) {
        const daysColor = v.avgDaysToPaid <= 45 ? c.green : v.avgDaysToPaid > 90 ? c.red : c.yellow;
        console.log(
          `    ${c.cyan}${v.insurer.slice(-8)}${c.reset}  ${daysColor}${v.avgDaysToPaid}d avg${c.reset}  ${c.dim}${v.paidCount} paid invoices${c.reset}`
        );
      }
      console.log();
    }

    if (risk.active) {
      console.log(
        `  ${c.red}⚠ CASHFLOW RISK: ${risk.latestMonth} issued ${fmt(risk.latestIssued)} — ${risk.dropPct}% below trailing ${fmt(risk.trailingAvg)} (threshold ${risk.threshold}%)${c.reset}\n`
      );
    } else if (risk.reason === 'insufficient_history') {
      console.log(
        `  ${c.dim}Risk alarm: insufficient history (${risk.monthsObserved} months).${c.reset}\n`
      );
    } else {
      console.log(`  ${c.green}✓ Cashflow trend stable.${c.reset}\n`);
    }
  }
  return risk.active ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}forecast-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
