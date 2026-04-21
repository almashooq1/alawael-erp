#!/usr/bin/env node
/**
 * parent-report-digest.js — monthly Progress-Report-PDF digest to
 * guardians.
 *
 * For each active beneficiary, assemble the progress report from the
 * same data the /api/parent-v2 routes expose, render it via
 * parentReportService.renderPdf, and email the PDF to the linked
 * guardians.
 *
 * Default mode: DRY RUN — prints the plan (one line per
 * beneficiary/guardian pair) without sending anything. Writes happen
 * only with `--execute` + `--confirm=SEND-MONTHLY-REPORTS`.
 *
 * Exit codes:
 *   0 — dry run clean OR execution completed with every send succeeded
 *   1 — execution completed but ≥1 send failed (partial success)
 *   2 — internal error
 *
 * Usage:
 *   node scripts/parent-report-digest.js                              # dry run
 *   node scripts/parent-report-digest.js --json                       # dry run + JSON
 *   node scripts/parent-report-digest.js --limit=5                    # first 5 only
 *   node scripts/parent-report-digest.js --execute \\
 *     --confirm=SEND-MONTHLY-REPORTS                                  # actually send
 *
 * Env:
 *   MONGODB_URI
 *   SMTP_HOST/PORT/USER/PASS/FROM (via utils/emailService) —
 *     when transporter isn't configured, send is skipped and reported.
 */

'use strict';

const args = process.argv.slice(2);
const argSet = new Set(args);

if (argSet.has('--help') || argSet.has('-h')) {
  process.stdout.write(
    [
      'parent-report-digest — email monthly progress PDFs to guardians',
      '',
      'Default: DRY RUN (read-only, reports plan).',
      '',
      'Exit codes:',
      '  0  dry-run clean OR every send succeeded',
      '  1  one or more sends failed (partial success)',
      '  2  internal error',
      '',
      'Usage:',
      '  node scripts/parent-report-digest.js',
      '  node scripts/parent-report-digest.js --json',
      '  node scripts/parent-report-digest.js --limit=N',
      '  node scripts/parent-report-digest.js --execute \\',
      '      --confirm=SEND-MONTHLY-REPORTS',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const JSON_MODE = argSet.has('--json');
const QUIET = argSet.has('--quiet');
const EXECUTE = argSet.has('--execute');
const confirmFlag = args.find(a => a.startsWith('--confirm='));
const limitFlag = args.find(a => a.startsWith('--limit='));
const LIMIT = limitFlag ? parseInt(limitFlag.split('=')[1], 10) || 0 : 0;
const CONFIRM_REQUIRED = 'SEND-MONTHLY-REPORTS';

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

/**
 * Build the flat plan (child + recipients[]) from lightweight
 * projections. Pure-ish — takes already-fetched beneficiaries and a
 * guardiansById map. Exported for unit testing.
 */
function buildPlan(beneficiaries, guardiansById, limit = 0) {
  const plan = [];
  for (const b of beneficiaries) {
    const recipients = [];
    for (const gid of b.guardians || []) {
      const g = guardiansById.get(String(gid));
      if (!g) continue;
      if (!g.email) continue;
      recipients.push({
        guardianId: String(g._id),
        email: g.email,
        name: g.firstName_ar || g.firstName_en || '',
      });
    }
    if (recipients.length === 0) continue;
    plan.push({
      childId: String(b._id),
      childName: b.firstName_ar || b.firstName || '—',
      beneficiaryNumber: b.beneficiaryNumber || null,
      recipients,
    });
    if (limit > 0 && plan.length >= limit) break;
  }
  return plan;
}

async function assembleTreeFor(childId, deps) {
  const { TherapySession, CarePlan, ClinicalAssessment, parentReportService, Beneficiary } = deps;
  const child = await Beneficiary.findById(childId).lean();
  if (!child) return null;

  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [
    sessionsTotal,
    sessionsUpcoming,
    plansActive,
    assessmentsTotal,
    plan,
    assessments,
    attSessions,
  ] = await Promise.all([
    TherapySession.countDocuments({ beneficiary: childId }),
    TherapySession.countDocuments({
      beneficiary: childId,
      date: { $gte: now, $lte: weekAhead },
      status: { $in: ['SCHEDULED', 'CONFIRMED'] },
    }),
    CarePlan.countDocuments({ beneficiary: childId, status: 'ACTIVE' }),
    ClinicalAssessment.countDocuments({ beneficiary: childId }),
    CarePlan.findOne({ beneficiary: childId, status: 'ACTIVE' }).sort({ startDate: -1 }).lean(),
    ClinicalAssessment.find({ beneficiary: childId, status: { $ne: 'archived' } })
      .sort({ assessmentDate: -1 })
      .limit(10)
      .select('tool assessmentDate score interpretation')
      .lean(),
    TherapySession.find({ beneficiary: childId, date: { $gte: since } })
      .select('date status attendance')
      .lean(),
  ]);

  const flatGoals = [];
  if (plan) {
    for (const section of ['educational', 'therapeutic', 'lifeSkills']) {
      const sec = plan[section];
      if (!sec?.enabled || !sec.domains) continue;
      for (const dom of Object.values(sec.domains)) {
        if (!dom?.goals?.length) continue;
        for (const g of dom.goals) flatGoals.push({ status: g.status });
      }
    }
  }

  return parentReportService.assembleReport({
    child,
    overview: {
      sessionCount: sessionsTotal,
      upcomingCount: sessionsUpcoming,
      activeCarePlansCount: plansActive,
      assessmentsCount: assessmentsTotal,
    },
    attendance: {
      completed: attSessions.filter(s => s.status === 'COMPLETED').length,
      noShow: attSessions.filter(s => s.status === 'NO_SHOW').length,
      cancelled: attSessions.filter(s =>
        ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'].includes(s.status)
      ).length,
      lateArrival: attSessions.filter(s => (s.attendance?.lateMinutes || 0) > 0).length,
    },
    carePlan: plan ? { title: plan.planNumber, status: plan.status, goals: flatGoals } : null,
    assessments: {
      items: assessments.map(a => ({
        tool: a.tool,
        date: a.assessmentDate,
        score: a.score,
        interpretation: a.interpretation,
      })),
    },
  });
}

async function main() {
  const mongoose = require('mongoose');
  const Beneficiary = require('../models/Beneficiary');
  const Guardian = require('../models/Guardian');
  const TherapySession = require('../models/TherapySession');
  const CarePlan = require('../models/CarePlan');
  const ClinicalAssessment = require('../models/ClinicalAssessment');
  const parentReportService = require('../services/parentReportService');
  const emailService = require('../services/emailService');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp', {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  const beneficiaries = await Beneficiary.find({ status: { $in: ['active', 'ACTIVE'] } })
    .select('firstName firstName_ar lastName beneficiaryNumber guardians status')
    .lean();

  const guardianIds = new Set();
  for (const b of beneficiaries) for (const g of b.guardians || []) guardianIds.add(String(g));

  const guardians = await Guardian.find({ _id: { $in: [...guardianIds] } })
    .select('firstName_ar firstName_en email')
    .lean();
  const guardiansById = new Map(guardians.map(g => [String(g._id), g]));

  const plan = buildPlan(beneficiaries, guardiansById, LIMIT);

  let executed = null;
  if (EXECUTE) {
    if (!confirmFlag || confirmFlag.split('=')[1] !== CONFIRM_REQUIRED) {
      await mongoose.disconnect();
      const msg = `refusing to execute — pass --confirm=${CONFIRM_REQUIRED}`;
      if (JSON_MODE) process.stdout.write(JSON.stringify({ error: msg }) + '\n');
      else console.error(`${c.red}${msg}${c.reset}`);
      process.exit(2);
    }

    const deps = { TherapySession, CarePlan, ClinicalAssessment, parentReportService, Beneficiary };
    const results = [];
    for (const row of plan) {
      try {
        const tree = await assembleTreeFor(row.childId, deps);
        if (!tree) {
          results.push({ childId: row.childId, status: 'skipped', reason: 'no_child_row' });
          continue;
        }
        const buf = await parentReportService.renderPdf(tree);
        const filename = `progress-report-${row.beneficiaryNumber || row.childId}-${new Date().toISOString().slice(0, 10)}.pdf`;
        for (const rec of row.recipients) {
          const sendRes = await emailService.sendEmail({
            to: rec.email,
            subject: `تقرير تقدّم الطفل — ${row.childName}`,
            text: `هذا تقرير شهري تلقائي لتقدّم ${row.childName}. مرفق PDF.`,
            attachments: [{ filename, content: buf, contentType: 'application/pdf' }],
          });
          results.push({
            childId: row.childId,
            email: rec.email,
            status: sendRes.success ? 'sent' : sendRes.skipped ? 'skipped' : 'failed',
            ...(sendRes.reason ? { reason: sendRes.reason } : {}),
            ...(sendRes.error ? { error: sendRes.error } : {}),
          });
        }
      } catch (err) {
        results.push({ childId: row.childId, status: 'failed', error: err.message });
      }
    }
    executed = {
      sent: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
      details: results,
    };
  }

  await mongoose.disconnect();

  const payload = {
    checkedAt: new Date().toISOString(),
    dryRun: !EXECUTE,
    beneficiariesActive: beneficiaries.length,
    guardiansLinked: guardianIds.size,
    planCount: plan.length,
    recipientCount: plan.reduce((n, r) => n + r.recipients.length, 0),
    planSample: plan.slice(0, 10),
    executed,
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  } else if (!QUIET) {
    console.log(`\n${c.bold}parent-report-digest — ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}${c.reset}\n`);
    console.log(
      `  ${c.dim}Active children: ${c.cyan}${beneficiaries.length}${c.reset}   ${c.dim}Linked guardians: ${c.cyan}${guardianIds.size}${c.reset}`
    );
    console.log(
      `  ${c.dim}Plan: ${c.cyan}${plan.length}${c.reset} child(ren), ${c.cyan}${payload.recipientCount}${c.reset} recipient(s)\n`
    );
    if (plan.length > 0) {
      console.log(`  ${c.bold}Sample (first 5):${c.reset}`);
      for (const p of plan.slice(0, 5)) {
        console.log(
          `    ${c.yellow}${p.childName}${c.reset} ${c.dim}(${p.beneficiaryNumber || p.childId})${c.reset} → ${p.recipients.map(r => r.email).join(', ')}`
        );
      }
      console.log();
    }
    if (executed) {
      console.log(
        `  ${c.green}✓ sent${c.reset} ${executed.sent}   ${c.yellow}skipped${c.reset} ${executed.skipped}   ${c.red}failed${c.reset} ${executed.failed}\n`
      );
    } else {
      console.log(
        `  ${c.dim}Dry run only. Re-run with --execute --confirm=${CONFIRM_REQUIRED} to send.${c.reset}\n`
      );
    }
  }

  if (executed && executed.failed > 0) return 1;
  return 0;
}

module.exports = { buildPlan };

if (require.main === module) {
  main()
    .then(code => process.exit(code))
    .catch(err => {
      if (!JSON_MODE)
        console.error(`${c.red}parent-report-digest failed:${c.reset} ${err.message}`);
      else process.stdout.write(JSON.stringify({ error: err.message }) + '\n');
      process.exit(2);
    });
}
