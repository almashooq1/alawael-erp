#!/usr/bin/env node
/**
 * approval-escalate-digest.js — scan for approval requests whose
 * current step has blown past its SLA and report them so someone can
 * escalate.
 *
 * Pipeline-friendly: exits 0 when every open request is within SLA,
 * 1 when at least one is breached or nearing breach (so it can be
 * wired into Slack / cron with a simple `|| notify-ops`).
 *
 * Output:
 *   • default — colored human summary to stdout
 *   • --json  — machine-readable { breaches, pendingNearBreach, stats }
 *   • --quiet — stderr-only on alarm (cron-safe)
 *
 * Env:
 *   MONGODB_URI
 *   APPROVAL_ESCALATE_WARN_HOURS (default: 4)    — threshold for
 *     "near-breach" (still in SLA but less than N hours left)
 *
 * Exit codes:
 *   0  all open requests within SLA (with buffer) — no action needed
 *   1  ≥1 SLA breach OR ≥1 near-breach
 *   2  internal error
 */

'use strict';

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const QUIET = args.includes('--quiet');
const WARN_HOURS = parseInt(process.env.APPROVAL_ESCALATE_WARN_HOURS, 10) || 4;

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    [
      'approval-escalate-digest — Phase-7 SLA monitor for approval chains',
      '',
      'Exit codes:',
      '  0  no breaches, no near-breaches',
      '  1  ≥1 breach OR ≥1 near-breach (action required)',
      '  2  internal error',
      '',
      'Usage:',
      '  node scripts/approval-escalate-digest.js',
      '  node scripts/approval-escalate-digest.js --json',
      '  node scripts/approval-escalate-digest.js --quiet',
      '',
      'Env:',
      '  APPROVAL_ESCALATE_WARN_HOURS (default 4)',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const useColor = !JSON_MODE && !QUIET && process.stdout.isTTY;
const c = {
  reset: useColor ? '\x1b[0m' : '',
  bold: useColor ? '\x1b[1m' : '',
  dim: useColor ? '\x1b[2m' : '',
  red: useColor ? '\x1b[31m' : '',
  green: useColor ? '\x1b[32m' : '',
  yellow: useColor ? '\x1b[33m' : '',
  cyan: useColor ? '\x1b[36m' : '',
};

/**
 * Pure function — classify a list of open approval requests into
 * { breaches, nearBreach, healthy } buckets given a `now` timestamp
 * and warn-hours threshold. Exported for unit testing.
 */
function buildEscalationPlan(requests, now = new Date(), warnHours = WARN_HOURS) {
  const plan = { breaches: [], nearBreach: [], healthy: [] };
  const warnMs = warnHours * 60 * 60 * 1000;
  for (const r of requests) {
    const deadline = r.slaDeadline ? new Date(r.slaDeadline).getTime() : null;
    const nowMs = now.getTime();
    const currentRole = r.steps?.[r.currentStep]?.role || '(unknown)';
    const ageHours = r.openedAt
      ? Math.round((nowMs - new Date(r.openedAt).getTime()) / 3_600_000)
      : null;
    const entry = {
      id: String(r._id || r.id),
      chainId: r.chainId,
      resourceType: r.resourceType,
      resourceId: String(r.resourceId),
      currentStep: r.currentStep,
      currentRole,
      ageHours,
      slaDeadline: r.slaDeadline,
    };
    if (!deadline) {
      plan.healthy.push(entry);
      continue;
    }
    if (deadline < nowMs) {
      plan.breaches.push({ ...entry, overdueHours: Math.round((nowMs - deadline) / 3_600_000) });
    } else if (deadline - nowMs <= warnMs) {
      plan.nearBreach.push({
        ...entry,
        hoursLeft: Math.round((deadline - nowMs) / 3_600_000),
      });
    } else {
      plan.healthy.push(entry);
    }
  }
  return plan;
}

async function main() {
  const mongoose = require('mongoose');
  const ApprovalRequest = require('../authorization/approvals/approval-request.model');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const open = await ApprovalRequest.find({ status: 'pending_approval' }).lean();
  const plan = buildEscalationPlan(open);

  await mongoose.disconnect();

  const payload = {
    checkedAt: new Date().toISOString(),
    warnHours: WARN_HOURS,
    stats: {
      totalOpen: open.length,
      breaches: plan.breaches.length,
      nearBreach: plan.nearBreach.length,
      healthy: plan.healthy.length,
    },
    breaches: plan.breaches,
    nearBreach: plan.nearBreach,
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else if (!QUIET) {
    console.log(`\n${c.bold}approval-escalate-digest${c.reset}\n`);
    console.log(
      `  ${c.dim}Open: ${c.cyan}${open.length}${c.reset}  ${c.dim}warn-hours: ${WARN_HOURS}${c.reset}`
    );
    console.log(
      `  ${c.red}breaches${c.reset}      ${plan.breaches.length}` +
        `  ${c.yellow}near-breach${c.reset}    ${plan.nearBreach.length}` +
        `  ${c.green}healthy${c.reset}        ${plan.healthy.length}\n`
    );
    if (plan.breaches.length > 0) {
      console.log(`  ${c.red}SLA breaches (top 10):${c.reset}`);
      for (const b of plan.breaches.slice(0, 10)) {
        console.log(
          `    ${c.red}✗${c.reset} ${b.chainId} ${c.dim}${b.resourceType}/${b.resourceId.slice(0, 8)}${c.reset}` +
            ` step ${b.currentStep} (${b.currentRole}) ${c.red}overdue ${b.overdueHours}h${c.reset}`
        );
      }
      console.log();
    }
    if (plan.nearBreach.length > 0) {
      console.log(`  ${c.yellow}Near SLA (top 10):${c.reset}`);
      for (const n of plan.nearBreach.slice(0, 10)) {
        console.log(
          `    ${c.yellow}⚠${c.reset} ${n.chainId} ${c.dim}${n.resourceType}/${n.resourceId.slice(0, 8)}${c.reset}` +
            ` step ${n.currentStep} (${n.currentRole}) ${c.yellow}${n.hoursLeft}h left${c.reset}`
        );
      }
      console.log();
    }
  } else if (plan.breaches.length || plan.nearBreach.length) {
    // QUIET mode: stderr-only summary on alarm
    process.stderr.write(
      `approval-escalate: ${plan.breaches.length} breach(es), ${plan.nearBreach.length} near-breach(es)\n`
    );
  }

  return plan.breaches.length > 0 || plan.nearBreach.length > 0 ? 1 : 0;
}

module.exports = { buildEscalationPlan };

if (require.main === module) {
  main()
    .then(code => process.exit(code))
    .catch(err => {
      if (!JSON_MODE)
        console.error(`${c.red}approval-escalate-digest failed:${c.reset} ${err.message}`);
      else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
      process.exit(2);
    });
}
