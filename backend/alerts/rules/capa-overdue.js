/**
 * Rule: CAPA (corrective / preventive action) overdue.
 *
 * An operational-category smart-alert (W1121). A CapaItem whose `dueDate` is in
 * the past while it is still in an actionable state (OPEN / IN_PROGRESS /
 * IMPLEMENTED — i.e. NOT yet VERIFIED, CLOSED, REJECTED or CANCELLED) is a
 * CBAHI quality-management breach: the corrective action was not completed on
 * time. Surfaced to the quality/ops team via the org-scoped `Alert` sink +
 * `/api/v1/dashboards/alerts` dashboard the other operational rules use.
 *
 * High-priority CAPAs escalate the default `high` to `critical` (the engine
 * spreads the per-finding fields over the rule defaults, so a finding `severity`
 * overrides the rule's).
 *
 * Self-loading: prefers the injected `ctx.models.CapaItem` (so the test harness
 * can inject a fake finder) but falls back to requiring the model directly, so
 * the rule fires in production without needing the app.js model-loader list
 * touched.
 */

'use strict';

// Actionable (not-yet-done) states. VERIFIED means the action was already
// verified effective; CLOSED/REJECTED/CANCELLED are terminal — none are "overdue".
const ACTIONABLE = ['OPEN', 'IN_PROGRESS', 'IMPLEMENTED'];

function loadModel(ctx) {
  if (ctx && ctx.models && ctx.models.CapaItem) return ctx.models.CapaItem;
  try {
    return require('../../models/quality/CapaItem.model');
  } catch (_) {
    return null;
  }
}

module.exports = {
  id: 'capa-overdue',
  severity: 'high',
  category: 'operational',
  description: 'CAPA (corrective/preventive action) past its due date and not yet completed',

  async evaluate(ctx) {
    const Model = loadModel(ctx);
    if (!Model) return [];
    const now = ctx.now || new Date();
    const rows = await Model.find({ status: { $in: ACTIONABLE }, dueDate: { $lt: now } });
    return rows.map(c => {
      const due = c.dueDate ? new Date(c.dueDate).toISOString().slice(0, 10) : '';
      const finding = {
        key: `capa-overdue:${c._id}`,
        subject: { type: 'CapaItem', id: c._id },
        branchId: c.branchId,
        message:
          `CAPA ${c.capaNumber || c._id} "${c.title || ''}" overdue${due ? ` (due ${due})` : ''}`.trim(),
      };
      // High / critical priority corrective actions escalate to critical.
      if (c.priority === 'critical' || c.priority === 'high') finding.severity = 'critical';
      return finding;
    });
  },
};
