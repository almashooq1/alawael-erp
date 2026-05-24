'use strict';

/**
 * branchQualityHeatmap.service.js — W350 (Phase 9 dashboard backend).
 *
 * Aggregates per-branch quality metrics into a single heatmap-ready data
 * structure. Cells are color-coded (ok / warning / critical) per metric so
 * the front-end can render a traffic-light grid without business logic.
 *
 * Data sources (data-ready from W337-W349 + W324-W347 drift work):
 *   - CapaItem        (open / overdue / critical-priority counts per branch)
 *   - AuditOccurrence (open / in-progress / overdue-by-plannedFor counts per branch)
 *
 * NOT yet aggregated (future passes):
 *   - RcaInvestigation severity distribution
 *   - FmeaWorksheet active count
 *   - Risk register tier distribution
 *
 * Public surface:
 *   createBranchQualityHeatmapService({ logger, capaModel?, auditModel? })
 *     - factory; capaModel + auditModel optional (lazy-loaded if absent)
 *
 *   buildHeatmap({ branchIds?, now? })
 *     - returns { generatedAt, branches: [{ branchId, cells: { metricKey: { value, severity, threshold } } }],
 *                  summary: { totalBranches, criticalBranches, warningBranches } }
 *     - branchIds optional (default: aggregate ALL branches with any data)
 *
 * Severity thresholds (per metric, all configurable):
 *   capa.open:        ok ≤20  / warning ≤50 / critical >50
 *   capa.overdue:     ok 0    / warning ≤10 / critical >10
 *   capa.critical:    ok 0    / warning ≤3  / critical >3
 *   audit.open:       ok ≤5   / warning ≤15 / critical >15
 *   audit.overdue:    ok 0    / warning ≤3  / critical >3
 *
 * Branch-level severity = MAX of its cells. So one critical cell → critical branch.
 */

const THRESHOLDS = Object.freeze({
  'capa.open': { warning: 20, critical: 50 },
  'capa.overdue': { warning: 0, critical: 10 }, // strict: any overdue is warning
  'capa.critical': { warning: 0, critical: 3 }, // strict: any critical-priority is warning
  'audit.open': { warning: 5, critical: 15 },
  'audit.overdue': { warning: 0, critical: 3 },
});

const SEVERITY_RANK = Object.freeze({ ok: 0, warning: 1, critical: 2 });

function _severityFor(metricKey, value) {
  const t = THRESHOLDS[metricKey];
  if (!t) return 'ok';
  if (value > t.critical) return 'critical';
  if (value > t.warning) return 'warning';
  return 'ok';
}

function _maxSeverity(severities) {
  let max = 'ok';
  for (const s of severities) {
    if (SEVERITY_RANK[s] > SEVERITY_RANK[max]) max = s;
  }
  return max;
}

function createBranchQualityHeatmapService(opts = {}) {
  const { logger = console } = opts;

  function _CapaModel() {
    if (opts.capaModel) return opts.capaModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('CapaItem');
    } catch {
      require('../../models/quality/CapaItem.model');
      return mongoose.model('CapaItem');
    }
  }

  function _AuditModel() {
    if (opts.auditModel) return opts.auditModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('AuditOccurrence');
    } catch {
      require('../../models/quality/AuditOccurrence.model');
      return mongoose.model('AuditOccurrence');
    }
  }

  async function _capaMetricsByBranch({ branchIds, now }) {
    const Capa = _CapaModel();
    const match = { deleted_at: null };
    if (branchIds?.length) match.branchId = { $in: branchIds };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$branchId',
          openCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['OPEN', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED']] },
                1,
                0,
              ],
            },
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['OPEN', 'IN_PROGRESS', 'IMPLEMENTED']] },
                    { $lt: ['$dueDate', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          criticalCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$priority', 'critical'] },
                    { $in: ['$status', ['OPEN', 'IN_PROGRESS', 'IMPLEMENTED']] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];
    return Capa.aggregate(pipeline);
  }

  async function _auditMetricsByBranch({ branchIds, now }) {
    const Audit = _AuditModel();
    const match = { deleted_at: null };
    if (branchIds?.length) match.branchId = { $in: branchIds };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$branchId',
          openCount: {
            $sum: { $cond: [{ $in: ['$status', ['planned', 'in_progress']] }, 1, 0] },
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['planned', 'in_progress']] },
                    { $lt: ['$plannedFor', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];
    return Audit.aggregate(pipeline);
  }

  async function buildHeatmap({ branchIds = null, now = new Date() } = {}) {
    let capaRows = [];
    let auditRows = [];
    try {
      capaRows = await _capaMetricsByBranch({ branchIds, now });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] capa aggregation failed: ${err.message}`);
    }
    try {
      auditRows = await _auditMetricsByBranch({ branchIds, now });
    } catch (err) {
      logger.warn?.(`[branchQualityHeatmap] audit aggregation failed: ${err.message}`);
    }

    // Merge by branchId
    const byBranch = new Map();
    function _ensure(bid) {
      const key = String(bid);
      if (!byBranch.has(key)) {
        byBranch.set(key, {
          branchId: bid,
          cells: {
            'capa.open': null,
            'capa.overdue': null,
            'capa.critical': null,
            'audit.open': null,
            'audit.overdue': null,
          },
        });
      }
      return byBranch.get(key);
    }

    for (const r of capaRows) {
      const b = _ensure(r._id);
      b.cells['capa.open'] = _cell('capa.open', r.openCount);
      b.cells['capa.overdue'] = _cell('capa.overdue', r.overdueCount);
      b.cells['capa.critical'] = _cell('capa.critical', r.criticalCount);
    }
    for (const r of auditRows) {
      const b = _ensure(r._id);
      b.cells['audit.open'] = _cell('audit.open', r.openCount);
      b.cells['audit.overdue'] = _cell('audit.overdue', r.overdueCount);
    }

    // Compute branch-level severity + tally
    const branches = [];
    let critical = 0;
    let warning = 0;
    for (const b of byBranch.values()) {
      const cellSeverities = Object.values(b.cells)
        .filter(c => c)
        .map(c => c.severity);
      const branchSeverity = _maxSeverity(cellSeverities);
      branches.push({ ...b, severity: branchSeverity });
      if (branchSeverity === 'critical') critical++;
      else if (branchSeverity === 'warning') warning++;
    }

    return {
      generatedAt: new Date(now).toISOString(),
      thresholds: THRESHOLDS,
      branches,
      summary: {
        totalBranches: branches.length,
        criticalBranches: critical,
        warningBranches: warning,
        okBranches: branches.length - critical - warning,
      },
    };
  }

  function _cell(metricKey, value) {
    return {
      value: value || 0,
      severity: _severityFor(metricKey, value || 0),
      threshold: THRESHOLDS[metricKey],
    };
  }

  return {
    buildHeatmap,
    // expose for tests
    _internals: { THRESHOLDS, _severityFor, _maxSeverity, _cell },
  };
}

module.exports = {
  createBranchQualityHeatmapService,
  THRESHOLDS,
};
