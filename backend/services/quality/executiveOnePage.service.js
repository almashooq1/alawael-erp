'use strict';

/**
 * executiveOnePage.service.js — W353 (Phase 9 dashboard composite).
 *
 * Single-page executive summary that composes:
 *   - Beneficiary KPIs (active count, weekly intake, status breakdown)
 *   - Branch quality summary (reuses W350+W351 heatmap)
 *   - Therapist workload summary (reuses W352)
 *   - Top-attention list (worst N branches + worst N therapists)
 *
 * Composes existing services rather than re-aggregating from raw collections,
 * so per-source thresholds + classification stay single-source-of-truth in their
 * own files (W350/W351/W352).
 *
 * Public surface:
 *   createExecutiveOnePageService({ logger, heatmapService?, workloadService?, beneficiaryModel? })
 *
 *   build({ branchIds?, now?, topN? })
 *     - branchIds optional (limits all downstream queries)
 *     - now defaults to new Date()
 *     - topN defaults to 5 (length of top-attention list per axis)
 *
 *   returns: {
 *     generatedAt,
 *     kpis: {
 *       beneficiaries: { active, statusBreakdown: {status:count}, intakeLast7Days },
 *       quality:       { totalBranches, criticalBranches, warningBranches, okBranches },
 *       workload:      { totalTherapists, criticalTherapists, warningTherapists, okTherapists },
 *     },
 *     topAttention: {
 *       branches:    [{ branchId, severity, worstMetric }],     // top N by severity
 *       therapists:  [{ therapistId, severity, worstMetric }],  // top N by severity
 *     },
 *   }
 *
 * Failure isolation: every composed call is in its own try/catch (W350 pattern).
 * If beneficiary aggregation fails, KPIs.beneficiaries is {error:'...'}; the
 * rest of the page still renders.
 */

const SEVERITY_RANK = Object.freeze({ ok: 0, warning: 1, critical: 2 });

// W373 — Safety-relevant heatmap cells that roll up into the executive safety KPI.
// These are the subset of heatmap metrics where ANY non-zero value is a clinical or
// operational-safety signal worth surfacing at the executive level.
const SAFETY_CELL_KEYS = Object.freeze([
  'seizures.openEvents', // W371 (W356 bridge)
  'safeguarding.openConcerns', // W371 (W357 bridge)
  'assistiveDevice.maintenanceOverdue', // W372 (W359 bridge)
  'capa.critical', // W350 (CAPA criticals are operational-safety risks)
]);

function _severityRank(s) {
  return SEVERITY_RANK[s] ?? 0;
}

// W373 — Compute aggregate safety KPIs from heatmap branches[]
function _safetyKpis(branches) {
  let totalEvents = 0; // sum across all safety cells in all branches
  const perMetric = {}; // metric → total
  for (const k of SAFETY_CELL_KEYS) perMetric[k] = 0;
  let branchesWithSafetyWarning = 0;

  for (const b of branches || []) {
    let branchHasSafetyWarning = false;
    for (const k of SAFETY_CELL_KEYS) {
      const cell = b.cells?.[k];
      if (cell && Number.isFinite(cell.value) && cell.value > 0) {
        perMetric[k] += cell.value;
        totalEvents += cell.value;
        if (cell.severity !== 'ok') branchHasSafetyWarning = true;
      }
    }
    if (branchHasSafetyWarning) branchesWithSafetyWarning += 1;
  }

  return {
    totalEvents,
    perMetric,
    branchesWithSafetyWarning,
    branchesScanned: (branches || []).length,
  };
}

function _worstMetricInCells(cells) {
  let worstKey = null;
  let worstRank = -1;
  for (const [key, cell] of Object.entries(cells)) {
    if (!cell) continue;
    const r = _severityRank(cell.severity);
    if (r > worstRank) {
      worstRank = r;
      worstKey = key;
    }
  }
  return worstKey;
}

function _topAttention(items, idField, topN) {
  // Sort by severity rank descending, then take topN.
  return [...items]
    .filter(i => _severityRank(i.severity) > 0) // only warning/critical
    .sort((a, b) => _severityRank(b.severity) - _severityRank(a.severity))
    .slice(0, topN)
    .map(i => ({
      [idField]: i[idField],
      severity: i.severity,
      worstMetric: _worstMetricInCells(i.cells || {}),
    }));
}

function createExecutiveOnePageService(opts = {}) {
  const { logger = console } = opts;

  function _HeatmapService() {
    if (opts.heatmapService) return opts.heatmapService;
    const { createBranchQualityHeatmapService } = require('./branchQualityHeatmap.service');
    return createBranchQualityHeatmapService({ logger });
  }

  function _WorkloadService() {
    if (opts.workloadService) return opts.workloadService;
    const { createTherapistWorkloadService } = require('./therapistWorkload.service');
    return createTherapistWorkloadService({ logger });
  }

  function _BeneficiaryModel() {
    if (opts.beneficiaryModel) return opts.beneficiaryModel;
    const mongoose = require('mongoose');
    try {
      return mongoose.model('Beneficiary');
    } catch {
      require('../../models/Beneficiary');
      return mongoose.model('Beneficiary');
    }
  }

  async function _beneficiaryKpis({ branchIds, now }) {
    const Beneficiary = _BeneficiaryModel();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const match = {};
    if (branchIds?.length) match.branchId = { $in: branchIds };

    const [statusRows, intakeCount] = await Promise.all([
      Beneficiary.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Beneficiary.countDocuments({
        ...match,
        registrationDate: { $gte: sevenDaysAgo, $lte: now },
      }),
    ]);

    const statusBreakdown = {};
    let active = 0;
    for (const r of statusRows) {
      statusBreakdown[r._id || 'unknown'] = r.count;
      if (r._id === 'active') active = r.count;
    }
    return { active, statusBreakdown, intakeLast7Days: intakeCount };
  }

  async function build({ branchIds = null, now = new Date(), topN = 5 } = {}) {
    const out = {
      generatedAt: new Date(now).toISOString(),
      kpis: {
        beneficiaries: null,
        quality: null,
        workload: null,
        // W373 — derived from heatmap.branches[] without a separate aggregation call
        safety: null,
      },
      topAttention: { branches: [], therapists: [] },
    };

    // 3 independent calls — partial failures still produce a useful page.
    const beneficiaryPromise = (async () => {
      try {
        out.kpis.beneficiaries = await _beneficiaryKpis({ branchIds, now });
      } catch (err) {
        logger.warn?.(`[executiveOnePage] beneficiary aggregation failed: ${err.message}`);
        out.kpis.beneficiaries = { error: err.message };
      }
    })();

    const heatmapPromise = (async () => {
      try {
        const heatmap = await _HeatmapService().buildHeatmap({ branchIds, now });
        out.kpis.quality = heatmap.summary;
        out.topAttention.branches = _topAttention(heatmap.branches, 'branchId', topN);
        // W373 — derive safety roll-up from the same branches[] (no extra DB call)
        out.kpis.safety = _safetyKpis(heatmap.branches);
      } catch (err) {
        logger.warn?.(`[executiveOnePage] heatmap composition failed: ${err.message}`);
        out.kpis.quality = { error: err.message };
        out.kpis.safety = { error: err.message };
      }
    })();

    const workloadPromise = (async () => {
      try {
        const workload = await _WorkloadService().buildWorkload({ branchIds, now });
        out.kpis.workload = workload.summary;
        out.topAttention.therapists = _topAttention(workload.therapists, 'therapistId', topN);
      } catch (err) {
        logger.warn?.(`[executiveOnePage] workload composition failed: ${err.message}`);
        out.kpis.workload = { error: err.message };
      }
    })();

    await Promise.all([beneficiaryPromise, heatmapPromise, workloadPromise]);
    return out;
  }

  return {
    build,
    _internals: {
      _severityRank,
      _worstMetricInCells,
      _topAttention,
      _safetyKpis,
      SAFETY_CELL_KEYS,
    },
  };
}

module.exports = {
  createExecutiveOnePageService,
};
