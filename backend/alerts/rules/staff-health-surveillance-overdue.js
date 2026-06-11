/**
 * Rule: staff occupational-health surveillance overdue.
 *
 * Operational smart-alert (W1126) linking the W1125 staff-health system into the
 * org `Alert` sink. A StaffHealthRecord with a `nextDueDate` in the past while
 * still actionable (status not closed) means a worker's required surveillance —
 * immunization booster, TB re-screen, annual respirator fit-test, or exposure
 * follow-up — is overdue (CBAHI/MOH occupational-health breach).
 *
 * Exposure-incident follow-ups + records already flagged restricted/
 * follow_up_required escalate the default `high` to `critical`.
 *
 * Self-loading (W1121 pattern): prefers ctx.models.X, falls back to a direct
 * require so it fires in prod with no app.js model-loader edit.
 */

'use strict';

const URGENT_TYPES = ['exposure_incident'];
const URGENT_STATUS = ['restricted', 'follow_up_required'];

function loadModel(ctx) {
  if (ctx && ctx.models && ctx.models.StaffHealthRecord) return ctx.models.StaffHealthRecord;
  try {
    return require('../../models/StaffHealthRecord');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'staff-health-surveillance-overdue',
  severity: 'high',
  category: 'operational',
  description: 'Staff occupational-health surveillance (immunization/TB/fit-test/exposure) overdue',

  async evaluate(ctx) {
    const Model = loadModel(ctx);
    if (!Model) return [];
    const now = ctx.now || new Date();
    const rows = await Model.find({
      status: { $nin: ['closed'] },
      deletedAt: null,
    });
    const nowMs = now instanceof Date ? now.getTime() : Date.now();
    const findings = [];
    for (const r of rows) {
      if (!r.nextDueDate || new Date(r.nextDueDate).getTime() >= nowMs) continue;
      const finding = {
        key: `staff-health-surveillance-overdue:${r._id}`,
        subject: { type: 'StaffHealthRecord', id: r._id },
        branchId: r.branchId,
        message: `Staff occ-health ${r.recordType} overdue for ${r.employeeName || r.employeeId} (${r.recordNumber || r._id})`,
      };
      if (URGENT_TYPES.includes(r.recordType) || URGENT_STATUS.includes(r.status)) {
        finding.severity = 'critical';
      }
      findings.push(finding);
    }
    return findings;
  },
};
