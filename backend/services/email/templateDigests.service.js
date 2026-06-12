'use strict';

/**
 * templateDigests.service.js — W1246 (مولّد رسائل NBA والملخص الأسبوعي)
 *
 * Builds (and optionally sends) the two operational emails that close the
 * W1242 follow-ups:
 *
 *   buildBaselineDueEmails({branchId})
 *     NBA caseload → CAPTURE_BASELINE actions → grouped PER ASSIGNED
 *     THERAPIST → one BASELINE_DUE email each. Refuse-to-fabricate: goals
 *     with no assigned therapist (or therapist without an email) are
 *     COUNTED + reported, never guessed.
 *
 *   buildWeeklySupervisorDigest({branchId})
 *     operations-health snapshot (W1195) + NBA caseload summary → one
 *     WEEKLY_SUPERVISOR_DIGEST email per clinical_supervisor User of the
 *     branch. No supervisors with email → skipped (reported).
 *
 * build* functions are READ-ONLY (DB reads + render); sendDigests() pipes
 * rendered payloads through services/emailService.sendEmail (mock-safe).
 * Models via lazy mongoose.model() (W340 doctrine).
 */

const mongoose = require('mongoose');
const { renderTemplate } = require('./templateRenderer.service');

const model = name => mongoose.model(name);

const APP_URL = () => process.env.FRONTEND_URL || 'https://alaweal.org';

/* ─────────────────────── baseline-due (per therapist) ─────────────────────── */

async function buildBaselineDueEmails({ branchId }) {
  const nba = require('../nextBestAction.service');
  const Beneficiary = model('Beneficiary');
  const beneficiaries = await Beneficiary.find({ branchId, isDeleted: { $ne: true } })
    .select('_id firstName lastName')
    .limit(300)
    .lean();

  // therapistId -> { beneficiaryName -> [goalTitle] }
  const byTherapist = new Map();
  let unassignedGoals = 0;

  for (const ben of beneficiaries) {
    const result = await nba.computeForBeneficiary(ben._id);
    const baselineActions = result.actions.filter(a => a.code === 'CAPTURE_BASELINE');
    if (!baselineActions.length) continue;

    const goalIds = baselineActions.map(a => a.evidence && a.evidence.goalId).filter(Boolean);
    const goals = await model('TherapeuticGoal')
      .find({ _id: { $in: goalIds } })
      .select('title assignedTo')
      .lean();

    const benName = [ben.firstName, ben.lastName].filter(Boolean).join(' ') || String(ben._id);
    for (const g of goals) {
      if (!g.assignedTo) {
        unassignedGoals += 1;
        continue;
      }
      const key = String(g.assignedTo);
      if (!byTherapist.has(key)) byTherapist.set(key, new Map());
      const perBen = byTherapist.get(key);
      if (!perBen.has(benName)) perBen.set(benName, []);
      perBen.get(benName).push(g.title);
    }
  }

  const emails = [];
  let therapistsWithoutEmail = 0;

  for (const [therapistId, perBen] of byTherapist) {
    const user = await model('User').findById(therapistId).select('name fullName email').lean();
    if (!user || !user.email) {
      therapistsWithoutEmail += 1;
      continue;
    }
    for (const [benName, goalTitles] of perBen) {
      const rendered = renderTemplate('BASELINE_DUE', {
        therapistName: user.fullName || user.name || 'الأخصائي',
        beneficiaryName: benName,
        goalCount: String(goalTitles.length),
        goalsList: goalTitles.join(' — '),
        nbaUrl: `${APP_URL()}/next-best-action`,
      });
      emails.push({ to: user.email, ...rendered, meta: { therapistId, beneficiary: benName } });
    }
  }

  return {
    branchId: String(branchId),
    emails,
    skipped: { unassignedGoals, therapistsWithoutEmail },
  };
}

/* ─────────────────────── weekly supervisor digest ─────────────────────────── */

async function buildWeeklySupervisorDigest({ branchId }) {
  const ops = require('../operationsHealth.service');
  const nba = require('../nextBestAction.service');

  const health = await ops.gatherBranchHealth(mongoose, { branchId, sinceDays: 7 });

  const Beneficiary = model('Beneficiary');
  const ids = (
    await Beneficiary.find({ branchId, isDeleted: { $ne: true } })
      .select('_id')
      .limit(300)
      .lean()
  ).map(b => b._id);
  const caseload = await nba.computeForCaseload(ids);
  const top = caseload.rows[0];

  const supervisors = await model('User')
    .find({ branchId, role: 'clinical_supervisor', email: { $exists: true, $ne: '' } })
    .select('name fullName email')
    .lean();

  const branch = await model('Branch')
    .findById(branchId)
    .select('name nameAr')
    .lean()
    .catch(() => null);
  const branchName = (branch && (branch.nameAr || branch.name)) || String(branchId);

  const vars = {
    branchName,
    sessionsCount: String(
      (health && health.productivity && health.productivity.completedSessions) ??
        (health && health.documentation && health.documentation.completed) ??
        '0'
    ),
    docPct: String((health && health.scores && health.scores.documentation) ?? '—'),
    alertsCount: String(caseload.summary.totalActions),
    healthGrade: String((health && health.grade) || 'NO_DATA'),
    topAttention: top
      ? `${top.topAction.titleAr} (${top.actionCount} إجراء لمستفيد ${String(top.beneficiaryId).slice(-6)})`
      : 'لا شيء — كل الحالات على المسار',
    opsUrl: `${APP_URL()}/supervisor-ops`,
  };

  const emails = supervisors.map(s => ({
    to: s.email,
    ...renderTemplate('WEEKLY_SUPERVISOR_DIGEST', {
      ...vars,
      supervisorName: s.fullName || s.name || 'المشرف',
    }),
    meta: { supervisorId: String(s._id) },
  }));

  return {
    branchId: String(branchId),
    emails,
    skipped: { supervisorsFound: supervisors.length },
  };
}

/* ─────────────────────────── send pipeline ────────────────────────────────── */

async function sendDigests(emails, { logger = console } = {}) {
  const { sendEmail } = require('../emailService');
  const outcomes = [];
  for (const e of emails) {
    try {
      const result = await sendEmail({ to: e.to, subject: e.subject, html: e.html, text: e.text });
      outcomes.push({ to: e.to, key: e.key, ok: result && result.success !== false, result });
    } catch (err) {
      logger.warn(`[email-digests] send failed to ${e.to}: ${err.message}`);
      outcomes.push({ to: e.to, key: e.key, ok: false, error: err.message });
    }
  }
  return outcomes;
}

module.exports = { buildBaselineDueEmails, buildWeeklySupervisorDigest, sendDigests };
