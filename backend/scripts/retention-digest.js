#!/usr/bin/env node
/**
 * retention-digest.js — beneficiary retention + churn snapshot.
 *
 * Exit codes:
 *   0 — retention healthy, no churn-spike
 *   1 — churn-spike tripped OR at-risk watchlist exceeds RETENTION_WATCHLIST_ALARM
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'retention-digest — Beneficiary retention analytics',
      '',
      'Exit codes:',
      '  0  retention healthy',
      '  1  churn-spike OR watchlist above threshold',
      '  2  internal error',
      '',
      'Usage: node scripts/retention-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI',
      '     RETENTION_ACTIVE_DAYS (default 30)',
      '     RETENTION_CHURN_DAYS (default 60)',
      '     RETENTION_CHURN_SPIKE_PCT (default 5)',
      '     RETENTION_WATCHLIST_ALARM (default 10)',
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

const WATCHLIST_ALARM = parseInt(process.env.RETENTION_WATCHLIST_ALARM, 10) || 10;

async function main() {
  const mongoose = require('mongoose');
  const Beneficiary = require('../models/Beneficiary');
  const TherapySession = require('../models/TherapySession');
  const ret = require('../services/retentionService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const cutoff = new Date(Date.now() - 90 * 86400000);
  const [benefs, sessions] = await Promise.all([
    Beneficiary.find({})
      .select(
        '_id firstName_ar lastName_ar firstName lastName status createdAt updatedAt enrolledPrograms'
      )
      .lean(),
    TherapySession.find({ date: { $gte: cutoff } })
      .select('beneficiary date')
      .lean(),
  ]);

  const summary = ret.summarize(benefs, sessions);
  const spike = ret.detectChurnSpike(benefs, sessions);
  const atRisk = ret.atRiskBeneficiaries(benefs, sessions, new Date(), 50);
  const byService = ret.churnByService(benefs);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          thresholds: {
            activeDays: ret.THRESHOLDS.activeDays,
            churnDays: ret.THRESHOLDS.churnDays,
            churnSpikePct: ret.THRESHOLDS.churnSpikePct,
            watchlistAlarm: WATCHLIST_ALARM,
          },
          summary,
          spike,
          atRiskCount: atRisk.length,
          atRisk: atRisk.slice(0, 20),
          byService,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Retention digest${c.reset}  ${c.dim}active ≤${ret.THRESHOLDS.activeDays}d · churn >${ret.THRESHOLDS.churnDays}d${c.reset}\n`
    );
    const retColor =
      summary.retentionRate == null
        ? c.dim
        : summary.retentionRate >= 85
          ? c.green
          : summary.retentionRate < 65
            ? c.red
            : c.yellow;
    console.log(
      `  ${c.dim}Active: ${c.green}${summary.active}${c.reset}  ${c.dim}At-risk: ${c.yellow}${summary.atRisk}${c.reset}  ${c.dim}Churned: ${c.red}${summary.churned}${c.reset}  ${c.dim}Retention: ${retColor}${summary.retentionRate ?? '—'}%${c.reset}`
    );
    console.log(
      `  ${c.dim}Avg tenure: ${c.cyan}${summary.avgTenureDays ? Math.round(summary.avgTenureDays) + ' days' : '—'}${c.reset}\n`
    );

    if (atRisk.length > 0) {
      console.log(
        `  ${c.bold}Watchlist (top ${Math.min(10, atRisk.length)} of ${atRisk.length}):${c.reset}`
      );
      for (const r of atRisk.slice(0, 10)) {
        const cls = r.classification === 'at_risk' ? c.red + 'AT-RISK' : c.yellow + 'DECLINING';
        console.log(
          `    ${cls}${c.reset}  ${c.cyan}${r.name}${c.reset}  ${c.dim}${r.daysSinceLastSession}d since last · ${r.sessionsLast30d}/${r.sessionsPrior30d} sessions${c.reset}`
        );
      }
      console.log();
    }

    if (byService.length > 0) {
      console.log(`  ${c.bold}Retention by program:${c.reset}`);
      for (const s of byService.slice(0, 6)) {
        const color =
          s.retentionRate == null
            ? c.dim
            : s.retentionRate >= 85
              ? c.green
              : s.retentionRate < 65
                ? c.red
                : c.yellow;
        console.log(
          `    ${c.cyan}${s.service.padEnd(20)}${c.reset}  ${color}${s.retentionRate ?? '—'}%${c.reset}  ${c.dim}${s.total} programs · ${s.dropped} dropped${c.reset}`
        );
      }
      console.log();
    }

    if (spike.active) {
      console.log(
        `  ${c.red}⚠ CHURN SPIKE: ${spike.churnedInMonth} churned in ${spike.latestMonth} — ${spike.churnPct}% of active base (threshold ${spike.threshold}%)${c.reset}\n`
      );
    } else if (atRisk.length >= WATCHLIST_ALARM) {
      console.log(
        `  ${c.yellow}⚠ WATCHLIST: ${atRisk.length} beneficiaries at risk (threshold ${WATCHLIST_ALARM}) — schedule outreach${c.reset}\n`
      );
    } else {
      console.log(`  ${c.green}✓ Retention stable.${c.reset}\n`);
    }
  }
  return spike.active || atRisk.length >= WATCHLIST_ALARM ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}retention-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
