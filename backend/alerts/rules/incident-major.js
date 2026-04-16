/**
 * Rule: a major or catastrophic incident that is still open.
 */

'use strict';

module.exports = {
  id: 'incident-major',
  severity: 'critical',
  category: 'quality',
  description: 'Open major/catastrophic quality incident',

  async evaluate(ctx) {
    if (!ctx.models || !ctx.models.Incident) return [];
    const rows = await ctx.models.Incident.find({
      severity: { $in: ['major', 'catastrophic'] },
      status: { $nin: ['closed'] },
    });
    return rows.map(inc => ({
      key: `incident:${inc._id}`,
      subject: { type: 'Incident', id: inc._id },
      branchId: inc.branchId,
      message: `${inc.severity.toUpperCase()} incident ${inc.incidentNumber || inc._id} is open`,
    }));
  },
};
