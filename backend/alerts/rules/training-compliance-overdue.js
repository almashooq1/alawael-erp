/**
 * Rule: a staff member's mandatory training is overdue.
 *
 * `category: 'compliance'` smart-alert rule (W1135). A `TrainingCompliance` record
 * that is still `pending` (or already flagged `overdue`) with a `dueDate` in the
 * past means a required course (fire-safety, infection-control, CPR, …) has
 * lapsed — a CBAHI / patient-safety compliance gap. Distinct from the
 * `credential-*` rules (professional licences) — this is recurring mandatory
 * training. Feeds the same `Alert` sink + /api/v1/dashboards/alerts (routed to
 * compliance recipients by category).
 *
 * Self-loading (no app.js model-loader edit): prefers the test-injectable
 * `ctx.models` entry, falls back to a direct `require`.
 */

'use strict';

const OPEN = ['pending', 'overdue']; // not completed / waived

function resolveModel(ctx) {
  const m = ctx.models && ctx.models.TrainingCompliance;
  if (m && typeof m.find === 'function') return m;
  try {
    return require('../../models/TrainingCompliance');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'training-compliance-overdue',
  severity: 'high',
  category: 'compliance',
  description: 'Staff mandatory training is overdue (past its due date, not completed)',

  async evaluate(ctx = {}) {
    const TC = resolveModel(ctx);
    if (!TC) return [];
    const now = ctx.now || new Date();
    const rows = await TC.find({ status: { $in: OPEN } });
    const findings = [];
    for (const tc of rows) {
      if (!tc.dueDate || new Date(tc.dueDate) >= now) continue;
      const due = new Date(tc.dueDate).toISOString().slice(0, 10);
      findings.push({
        key: `training-compliance-overdue:${tc._id}`,
        subject: { type: 'TrainingCompliance', id: tc._id },
        branchId: tc.branchId,
        message: `Mandatory training overdue since ${due} (user ${tc.userId || ''}, course ${tc.courseId || ''})`.trim(),
      });
    }
    return findings;
  },
};
