#!/usr/bin/env node
/**
 * complaints-digest.js — complaints pipeline health snapshot.
 *
 * Exit codes:
 *   0 — no spike, no SLA breach, no backlog beyond threshold
 *   1 — spike OR SLA breaches present OR backlog above threshold
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'complaints-digest — Complaints pipeline analytics',
      '',
      'Exit codes:',
      '  0  pipeline healthy',
      '  1  spike OR SLA breaches OR backlog above threshold',
      '  2  internal error',
      '',
      'Usage: node scripts/complaints-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI',
      '     COMPLAINT_SLA_{CRITICAL,HIGH,MEDIUM,LOW}_HOURS',
      '     COMPLAINT_BACKLOG_DAYS (default 14)',
      '     COMPLAINT_SPIKE_PCT (default 40)',
      '     COMPLAINT_BACKLOG_ALARM_COUNT (default 5)',
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

const BACKLOG_ALARM = parseInt(process.env.COMPLAINT_BACKLOG_ALARM_COUNT, 10) || 5;

async function main() {
  const mongoose = require('mongoose');
  const Complaint = require('../models/Complaint');
  const ca = require('../services/complaintsAnalyticsService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const all = await Complaint.find({}).lean();
  const summary = ca.summarize(all);
  const spike = ca.detectSpike(all);
  const slaList = ca.slaBreaches(all);
  const backlog = ca.openBacklog(all, new Date(), 50);
  const byCategory = ca.byCategory(all).slice(0, 5);

  await mongoose.disconnect();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          thresholds: {
            sla: ca.THRESHOLDS.sla,
            backlogDays: ca.THRESHOLDS.backlogDays,
            spikePct: ca.THRESHOLDS.spikePct,
            backlogAlarm: BACKLOG_ALARM,
          },
          summary,
          spike,
          slaBreachCount: slaList.length,
          backlogCount: backlog.length,
          topCategories: byCategory,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(
      `\n${c.bold}Al-Awael — Complaints digest${c.reset}  ${c.dim}backlog >${ca.THRESHOLDS.backlogDays}d · spike ≥${ca.THRESHOLDS.spikePct}% MoM${c.reset}\n`
    );
    const resColor =
      summary.resolutionRate == null
        ? c.dim
        : summary.resolutionRate >= 85
          ? c.green
          : summary.resolutionRate < 60
            ? c.red
            : c.yellow;
    console.log(
      `  ${c.dim}Total: ${c.cyan}${summary.total}${c.reset}  ${c.dim}Open: ${c.yellow}${summary.open}${c.reset}  ${c.dim}Resolved: ${c.green}${summary.resolved}${c.reset}  ${c.dim}Rate: ${resColor}${summary.resolutionRate ?? '—'}%${c.reset}`
    );
    console.log(
      `  ${c.dim}Critical: ${c.red}${summary.byPriority?.critical || 0}${c.reset}  ${c.dim}Avg resolution: ${c.cyan}${summary.avgResolutionHours ? Math.round(summary.avgResolutionHours) + 'h' : '—'}${c.reset}\n`
    );

    if (byCategory.length > 0) {
      console.log(`  ${c.bold}Top categories:${c.reset}`);
      for (const cat of byCategory) {
        const color =
          cat.resolutionRate == null
            ? c.dim
            : cat.resolutionRate >= 85
              ? c.green
              : cat.resolutionRate < 60
                ? c.red
                : c.yellow;
        console.log(
          `    ${c.cyan}${cat.category.padEnd(22)}${c.reset}  ${color}${cat.resolutionRate ?? '—'}%${c.reset}  ${c.dim}${cat.total} total · ${cat.open} open${c.reset}`
        );
      }
      console.log();
    }

    if (slaList.length > 0) {
      console.log(`  ${c.bold}SLA breaches (top 5):${c.reset}`);
      for (const b of slaList.slice(0, 5)) {
        console.log(
          `    ${c.red}+${Math.round(b.breachedBy)}h${c.reset}  ${c.cyan}[${b.priority}]${c.reset}  ${c.dim}${(b.subject || '').slice(0, 50)}${c.reset}`
        );
      }
      console.log();
    }

    if (backlog.length > 0) {
      console.log(`  ${c.bold}Backlog (top 5 of ${backlog.length}):${c.reset}`);
      for (const b of backlog.slice(0, 5)) {
        console.log(
          `    ${c.yellow}${b.daysOpen}d${c.reset}  ${c.cyan}[${b.priority}]${c.reset}  ${c.dim}${(b.subject || '').slice(0, 50)}${c.reset}`
        );
      }
      console.log();
    }

    if (spike.active) {
      console.log(
        `  ${c.red}⚠ SPIKE: +${spike.jumpPct}% MoM (${spike.prior} → ${spike.current})${c.reset}\n`
      );
    } else if (slaList.length > 0) {
      console.log(`  ${c.red}⚠ ${slaList.length} SLA breach(es) — needs attention${c.reset}\n`);
    } else if (backlog.length >= BACKLOG_ALARM) {
      console.log(
        `  ${c.yellow}⚠ BACKLOG: ${backlog.length} open (threshold ${BACKLOG_ALARM})${c.reset}\n`
      );
    } else {
      console.log(`  ${c.green}✓ Pipeline healthy.${c.reset}\n`);
    }
  }
  const unhealthy = spike.active || slaList.length > 0 || backlog.length >= BACKLOG_ALARM;
  return unhealthy ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}complaints-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
