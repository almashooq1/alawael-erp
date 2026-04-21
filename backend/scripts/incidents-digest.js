#!/usr/bin/env node
/**
 * incidents-digest.js — safety/CBAHI incidents pipeline health.
 *
 * Exit codes:
 *   0 — no open critical incidents, no SLA breaches, no surge
 *   1 — open CRITICAL OR SLA breaches OR surge OR regulatory > 0
 *   2 — internal error
 */

'use strict';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(
    [
      'incidents-digest — Safety / CBAHI incidents analytics',
      '',
      'Exit codes:',
      '  0  pipeline healthy',
      '  1  open CRITICAL OR SLA breaches OR surge OR regulatory flagged',
      '  2  internal error',
      '',
      'Usage: node scripts/incidents-digest.js [--json] [--quiet] [--help]',
      'Env: MONGODB_URI',
      '     INCIDENT_SLA_{CRITICAL,HIGH,MEDIUM,LOW}_HOURS',
      '     INCIDENT_SURGE_PCT (default 50)',
      '     INCIDENT_SURGE_MIN_PRIOR (default 3)',
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

const hoursText = h => (h == null ? '—' : h < 24 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);

async function main() {
  const mongoose = require('mongoose');
  const Incident = require('../models/Incident');
  const ia = require('../services/incidentsAnalyticsService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const all = await Incident.find({}).lean();
  const summary = ia.summarize(all);
  const surge = ia.detectSurge(all);
  const bySev = ia.bySeverity(all);
  const backlog = ia.openBacklog(all, new Date(), 50);
  const slaBreach = backlog.filter(b => b.overSla);
  const rootCauses = ia.rootCauseTopN(all, 5);

  await mongoose.disconnect();

  const openCritical = summary.bySeverity?.CRITICAL || 0;
  const unhealthy =
    (openCritical > 0 && summary.open > 0) ||
    slaBreach.length > 0 ||
    surge.active ||
    summary.regulatoryCount > 0;

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          thresholds: {
            sla: ia.THRESHOLDS.sla,
            surgePct: ia.THRESHOLDS.surgePct,
          },
          summary,
          surge,
          slaBreachCount: slaBreach.length,
          backlogCount: backlog.length,
          topBreaches: slaBreach.slice(0, 5),
          topRootCauses: rootCauses,
        },
        null,
        2
      ) + '\n'
    );
  } else if (!QUIET) {
    console.log(`\n${c.bold}Al-Awael — Incidents digest${c.reset}\n`);
    console.log(
      `  ${c.dim}Total: ${c.cyan}${summary.total}${c.reset}  ${c.dim}Open: ${c.yellow}${summary.open}${c.reset}  ${c.dim}Resolved: ${c.green}${summary.resolved}${c.reset}  ${c.dim}MTTR: ${c.cyan}${hoursText(summary.avgTtrHours)}${c.reset}`
    );
    console.log(
      `  ${c.dim}CRITICAL: ${c.red}${summary.bySeverity?.CRITICAL || 0}${c.reset}  ${c.dim}Regulatory: ${c.red}${summary.regulatoryCount || 0}${c.reset}  ${c.dim}Escalated: ${c.yellow}${summary.escalatedCount || 0}${c.reset}\n`
    );

    if (bySev.length > 0) {
      console.log(`  ${c.bold}SLA by severity:${c.reset}`);
      for (const r of bySev) {
        const wc = r.severity === 'CRITICAL' ? c.red : r.severity === 'HIGH' ? c.yellow : c.cyan;
        const metColor = r.slaMet == null ? c.dim : r.slaMet ? c.green : c.red;
        const metLabel = r.slaMet == null ? '—' : r.slaMet ? '✓' : '✗';
        console.log(
          `    ${wc}${r.severity.padEnd(8)}${c.reset}  ${c.dim}MTTR:${c.reset} ${hoursText(r.avgTtrHours)} / SLA ${r.slaHours}h  ${metColor}${metLabel}${c.reset}  ${c.dim}(${r.resolved}/${r.total})${c.reset}`
        );
      }
      console.log();
    }

    if (slaBreach.length > 0) {
      console.log(`  ${c.bold}SLA breaches (top 5 of ${slaBreach.length}):${c.reset}`);
      for (const b of slaBreach.slice(0, 5)) {
        console.log(
          `    ${c.red}+${hoursText(b.breachedBy)}${c.reset}  ${c.cyan}[${b.severity}]${c.reset}  ${c.dim}${(b.title || '(no title)').slice(0, 48)}${c.reset}`
        );
      }
      console.log();
    }

    if (rootCauses.length > 0) {
      console.log(`  ${c.bold}Top root causes:${c.reset}`);
      for (const rc of rootCauses) {
        const color =
          rc.permanentFixRate == null
            ? c.dim
            : rc.permanentFixRate >= 70
              ? c.green
              : rc.permanentFixRate < 30
                ? c.red
                : c.yellow;
        console.log(
          `    ${c.cyan}${(rc.rootCause || '').slice(0, 30).padEnd(30)}${c.reset}  ${c.dim}x${rc.count}${c.reset}  ${color}${rc.permanentFixRate ?? '—'}% permanent${c.reset}`
        );
      }
      console.log();
    }

    if (surge.active) {
      console.log(
        `  ${c.red}⚠ SURGE: +${surge.jumpPct}% MoM (${surge.prior} → ${surge.current})${c.reset}`
      );
    }
    if (openCritical > 0 && summary.open > 0) {
      console.log(
        `  ${c.red}⚠ ${openCritical} open CRITICAL — CBAHI requires response within ${ia.THRESHOLDS.sla.CRITICAL}h${c.reset}`
      );
    }
    if (summary.regulatoryCount > 0) {
      console.log(
        `  ${c.yellow}⚠ ${summary.regulatoryCount} regulatory-flagged incidents — formal reporting required${c.reset}`
      );
    }
    if (!unhealthy) {
      console.log(`  ${c.green}✓ Pipeline healthy.${c.reset}`);
    }
    console.log();
  }
  return unhealthy ? 1 : 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    if (!JSON_MODE) console.error(`${c.red}incidents-digest failed:${c.reset} ${err.message}`);
    else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
    process.exit(2);
  });
