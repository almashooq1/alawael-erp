/**
 * Rule: maintenance work order past its scheduled date and still open.
 *
 * Second `category: 'operational'` smart-alert rule (W1007), companion to
 * `facility-asset-ppm-overdue` (W1006). Feeds the same org-scoped `Alert` sink +
 * `/api/v1/dashboards/alerts` dashboard. A committed work order whose
 * `scheduledDate` is in the past and that has NOT reached a terminal/closed state
 * is surfaced to the maintenance/ops team — facilities falling behind on planned
 * work.
 *
 * Excluded states: `draft` (not committed) + the terminals `rejected` /
 * `completed` / `verified` / `closed` / `cancelled`. Critical-priority work
 * orders escalate the default `high` to `critical` (a per-finding `severity`
 * overrides the rule default via the engine's `...finding` spread).
 */

'use strict';

const EXCLUDED_STATES = ['draft', 'rejected', 'completed', 'verified', 'closed', 'cancelled'];

module.exports = {
  id: 'maintenance-work-order-overdue',
  severity: 'high',
  category: 'operational',
  description: 'Maintenance work order overdue (past scheduled date, still open)',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.MaintenanceWorkOrder) return [];
    const now = ctx.now || new Date();
    const rows = await ctx.models.MaintenanceWorkOrder.find({
      status: { $nin: EXCLUDED_STATES },
    });
    const findings = [];
    for (const wo of rows) {
      if (!wo.scheduledDate || new Date(wo.scheduledDate) >= now) continue;
      const due = new Date(wo.scheduledDate).toISOString().slice(0, 10);
      const finding = {
        key: `maintenance-wo-overdue:${wo._id}`,
        subject: { type: 'MaintenanceWorkOrder', id: wo._id },
        branchId: wo.branchId,
        message: `Work order ${wo.title || wo._id} overdue since ${due} (status: ${wo.status})`,
      };
      if (wo.priority === 'critical') finding.severity = 'critical';
      findings.push(finding);
    }
    return findings;
  },
};
