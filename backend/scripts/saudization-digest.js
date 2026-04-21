#!/usr/bin/env node
/**
 * saudization-digest.js — MOL Nitaqat band + runway snapshot.
 *
 * Exit codes:
 *   0 — green/platinum band AND runway > NITAQAT_ALARM_MONTHS
 *   1 — red band OR runway ≤ threshold (HR action required)
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'saudization-digest — MOL Nitaqat compliance snapshot',
      '',
      'Exit codes:',
      '  0  band is green/platinum and runway to red is safe',
      '  1  red band OR short runway to red (HR intervention required)',
      '  2  internal error',
      '',
      'Usage: node scripts/saudization-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI',
      '     NITAQAT_ALARM_MONTHS (default 3)',
      '     NITAQAT_PROJECTION_MIN_SNAPSHOTS (default 3)',
      '     NITAQAT_DECLINING_THRESHOLD_PCT (default 0.5)',
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
  magenta: useColor ? '\x1b[35m' : '',
};

function bandColor(band) {
  if (band === 'red') return c.red;
  if (band === 'platinum') return c.magenta;
  if (band === 'high_green' || band === 'mid_green') return c.green;
  return c.yellow;
}

async function main() {
  const mongoose = require('mongoose');
  const { NitaqatCalculation } = require('../models/nitaqat.models');
  const sa = require('../services/saudizationAnalyticsService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const snapshots = await NitaqatCalculation.find({}).sort({ calculationDate: 1 }).lean();
  const status = sa.currentStatus(snapshots);
  const runway = sa.runwayProjection(snapshots);
  const alarm = sa.detectRiskAlarm(snapshots);
  const history = sa.bandHistory(snapshots).slice(-5);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          thresholds: {
            alarmMonths: sa.THRESHOLDS.alarmMonths,
            projectionMinSnapshots: sa.THRESHOLDS.projectionMinSnapshots,
            decliningPctPerMonth: sa.THRESHOLDS.decliningPctPerMonth,
          },
          status,
          runway,
          alarm,
          recentEvents: history,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(`\n${c.bold}Al-Awael — Saudization (Nitaqat) digest${c.reset}\n`);
    if (!status.hasData) {
      console.log(
        `  ${c.yellow}⚠ No Nitaqat snapshots yet. Run the calculator first.${c.reset}\n`
      );
    } else {
      const bc = bandColor(status.currentBand);
      console.log(
        `  ${c.bold}Current band:${c.reset} ${bc}${status.currentBand}${c.reset}  ${c.dim}(${status.saudizationPercentage?.toFixed(1)}% Saudization)${c.reset}`
      );
      console.log(
        `  ${c.dim}Employees: ${c.cyan}${status.totalEmployees}${c.reset}  ${c.dim}Saudi: ${c.cyan}${status.saudiEmployees}${c.reset}  ${c.dim}Expat: ${c.cyan}${status.expatEmployees}${c.reset}  ${c.dim}Weighted: ${c.cyan}${status.weightedSaudiCount}${c.reset}`
      );
      if (status.saudisNeededForNextBand > 0) {
        console.log(
          `  ${c.yellow}→ Need ${status.saudisNeededForNextBand} more Saudi(s) to reach ${status.nextBand || 'next band'}${c.reset}`
        );
      }
      console.log();

      // Runway
      if (runway.runwayMonths === 0) {
        console.log(`  ${c.red}Runway: already in red band${c.reset}`);
      } else if (runway.runwayMonths != null) {
        const rc = runway.runwayMonths <= sa.THRESHOLDS.alarmMonths ? c.red : c.yellow;
        console.log(
          `  ${c.bold}Runway to red:${c.reset} ${rc}${runway.runwayMonths} months${c.reset}  ${c.dim}(slope ${runway.slopePctPerMonth}%/mo)${c.reset}`
        );
      } else if (runway.reason === 'stable_or_improving') {
        console.log(`  ${c.green}Trajectory stable or improving.${c.reset}`);
      } else if (runway.reason === 'insufficient_history') {
        console.log(
          `  ${c.dim}Runway: insufficient history (${runway.monthsObserved}/${runway.required} months).${c.reset}`
        );
      }
      console.log();

      // Recent events
      if (history.length > 0) {
        console.log(`  ${c.bold}Recent band changes:${c.reset}`);
        for (const ev of history) {
          const dir =
            ev.direction === 'improved'
              ? c.green + '↑'
              : ev.direction === 'declined'
                ? c.red + '↓'
                : c.dim + '→';
          const day = new Date(ev.date).toISOString().slice(0, 10);
          const bc = bandColor(ev.band);
          console.log(
            `    ${c.dim}${day}${c.reset}  ${dir}${c.reset}  ${bc}${ev.band}${c.reset}  ${c.dim}(${ev.saudizationPercentage?.toFixed(1)}%)${c.reset}`
          );
        }
        console.log();
      }

      // Alarm verdict
      if (alarm.active && alarm.reason === 'already_red') {
        console.log(
          `  ${c.red}⚠ CRITICAL: in the red band — visa issuance frozen + hiring restricted. Hire ${alarm.saudisNeededForNextBand} Saudi(s) to exit.${c.reset}\n`
        );
      } else if (alarm.active && alarm.reason === 'runway_short') {
        console.log(
          `  ${c.red}⚠ ALARM: ${alarm.runwayMonths} months to red (threshold ${alarm.threshold}). Hire ${alarm.saudisNeededForNextBand} Saudi(s) now.${c.reset}\n`
        );
      } else {
        console.log(`  ${c.green}✓ Band + runway within policy.${c.reset}\n`);
      }
    }
  }
  return alarm.active ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}saudization-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
