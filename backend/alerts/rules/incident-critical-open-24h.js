/**
 * Rule: critical/catastrophic incident still open after 24 hours.
 *
 * Complements `incident-major` which fires the moment a major
 * incident is logged. This rule is the escalation tier — once
 * 24h pass without closure, route the alert one level up
 * (HEAD_OFFICE_ADMIN / regional director / CEO).
 */

'use strict';

const ESCALATE_HOURS = 24;

module.exports = {
  id: 'incident-critical-open-24h',
  severity: 'critical',
  category: 'quality',
  description: 'Critical/catastrophic incident open more than 24 hours',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Incident) return [];
    const now = ctx.now || new Date();
    const cutoff = new Date(now.getTime() - ESCALATE_HOURS * 60 * 60 * 1000);
    const rows = await ctx.models.Incident.find({
      severity: { $in: ['major', 'catastrophic'] },
      status: { $nin: ['closed'] },
      createdAt: { $lte: cutoff },
    });
    return rows.map(inc => ({
      key: `incident-24h:${inc._id}`,
      subject: { type: 'Incident', id: inc._id },
      branchId: inc.branchId,
      message: `${inc.severity.toUpperCase()} incident ${inc.incidentNumber || inc._id} open > 24h — escalate`,
    }));
  },
};
