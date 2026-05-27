'use strict';

/**
 * equity-engine.service.js — W487 (Phase G: Equity Engine).
 *
 * Service layer that runs the disparity-detection lib (W484) against
 * branch observations and persists EquityDisparityAlert records (W485)
 * when moderate or major disparities are detected. Idempotent via
 * sha256(branch + dim + metric + periodStart + periodEnd) signature.
 *
 * Called by:
 *   • equity-engine.cron (W487 cron sweeper) — quarterly default
 *   • POST /api/equity/audit (manual_audit / ad_hoc_query)
 *
 * Per v3 §6 Innovation 8.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const disparityLib = require('../../intelligence/disparity-detection.lib');

const BINARY_METRICS = new Set(['complaint_rate']);

function computeSignature({ branchId, dimension, metricKind, periodStart, periodEnd }) {
  const raw = [
    String(branchId),
    dimension,
    metricKind,
    new Date(periodStart).toISOString(),
    new Date(periodEnd).toISOString(),
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 64);
}

/**
 * Run audit for a (branch x dimension x metricKind x period) tuple,
 * persist alert if moderate/major severity detected.
 *
 * @param {Object} options
 * @param {Object} options.branchId
 * @param {string} options.dimension
 * @param {string} options.metricKind
 * @param {Array}  options.observations — [{ [dimension]: value, metricValue }]
 * @param {Date}   options.periodStart
 * @param {Date}   options.periodEnd
 * @param {string} [options.periodKind] — defaults 'quarterly'
 * @param {string} [options.generatedBy] — defaults 'equity_engine_cron'
 * @returns {Promise<{ alert: Object|null, audit: Object, skipped: boolean, reason: string }>}
 */
async function runAuditAndPersist({
  branchId,
  dimension,
  metricKind,
  observations,
  periodStart,
  periodEnd,
  periodKind = 'quarterly',
  generatedBy = 'equity_engine_cron',
} = {}) {
  if (!branchId) throw new Error('branchId is required');
  if (!periodStart || !periodEnd) throw new Error('periodStart + periodEnd required');

  const isBinary = BINARY_METRICS.has(metricKind);
  const audit = disparityLib.auditDimension({
    observations,
    dimension,
    metricKind,
    isBinary,
  });

  if (audit.error) {
    return { alert: null, audit, skipped: true, reason: audit.error };
  }
  // Only persist moderate + major disparities
  if (audit.overallSeverity === 'none' || audit.overallSeverity === 'minor') {
    return { alert: null, audit, skipped: true, reason: 'NO_DISPARITY' };
  }

  const signatureHash = computeSignature({
    branchId,
    dimension,
    metricKind,
    periodStart,
    periodEnd,
  });

  const AlertModel = mongoose.model('EquityDisparityAlert');

  // Idempotent: same signature → return existing
  const existing = await AlertModel.findOne({ signatureHash }).lean();
  if (existing) {
    return { alert: existing, audit, skipped: true, reason: 'IDEMPOTENT_EXISTING' };
  }

  const alert = await AlertModel.create({
    branchId,
    dimension,
    metricKind,
    periodStart,
    periodEnd,
    periodKind,
    findings: audit.findings,
    overallSeverity: audit.overallSeverity,
    flaggedCount: audit.flaggedCount,
    signatureHash,
    status: 'open',
    generatedBy,
  });

  // W503 — auto-create CAPA for major-severity disparities. Wires the
  // Phase G triage queue to the existing CAPA lifecycle (W337+W344+W345).
  // Best-effort: a CAPA creation failure doesn't roll back the alert.
  let capaItem = null;
  if (audit.overallSeverity === 'major') {
    try {
      capaItem = await _autoCreateCapaForAlert({ alert, audit });
      if (capaItem) {
        alert.capaItemId = capaItem._id;
        await alert.save();
      }
    } catch (err) {
      // Don't fail the audit just because CAPA wiring is unavailable.
      // The alert is still persisted; capa can be manually attached later.
    }
  }

  return { alert, audit, skipped: false, reason: 'PERSISTED', capaItem };
}

/**
 * W503 — auto-create a CAPA item for a major-severity equity alert.
 * Returns null if the CAPA service / CAPA model is not available
 * (test environments, partial bootstraps).
 */
async function _autoCreateCapaForAlert({ alert, audit }) {
  let createCapaService;
  try {
    createCapaService = require('../quality/capa.service').createCapaService;
  } catch {
    return null;
  }
  // Verify CapaItem model is registered
  try {
    mongoose.model('CapaItem');
  } catch {
    return null;
  }

  const svc = createCapaService({ enforceMfa: false });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // 30-day default SLA

  // Build a human-readable title + description from the audit findings
  const flaggedCohorts = (audit.findings || [])
    .filter(f => f.vsReference?.flagged)
    .map(f => f.cohort)
    .slice(0, 3)
    .join(', ');

  const title = `Equity remediation: ${alert.dimension} / ${alert.metricKind} (${alert.overallSeverity})`;
  const description = [
    `Equity audit flagged ${audit.flaggedCount} cohort(s) on dimension="${alert.dimension}" for metric="${alert.metricKind}".`,
    flaggedCohorts ? `Most-affected cohorts: ${flaggedCohorts}.` : '',
    `Period: ${new Date(alert.periodStart).toISOString().slice(0, 10)} to ${new Date(alert.periodEnd).toISOString().slice(0, 10)}.`,
    `Source EquityDisparityAlert: ${alert._id}.`,
  ]
    .filter(Boolean)
    .join(' ');

  return svc.createCapaItem({
    source: {
      module: 'equity',
      refId: alert._id,
      collection: 'equity_disparity_alerts',
    },
    type: 'corrective',
    title,
    description,
    ownerUserId: alert.assignedTo || alert.branchId, // best-effort; supervisor reassigns
    dueDate,
    branchId: alert.branchId,
    priority: 'high',
    createdBy: alert.assignedTo || alert.branchId,
  });
}

/**
 * Run audits across all dimensions × all metrics for one branch + period.
 */
async function runBranchSweep({
  branchId,
  observationsByMetric,
  periodStart,
  periodEnd,
  periodKind = 'quarterly',
  dimensions,
} = {}) {
  const targetDimensions =
    Array.isArray(dimensions) && dimensions.length ? dimensions : disparityLib.DISPARITY_DIMENSIONS;
  const results = [];
  for (const [metricKind, observations] of Object.entries(observationsByMetric || {})) {
    for (const dimension of targetDimensions) {
      try {
        const r = await runAuditAndPersist({
          branchId,
          dimension,
          metricKind,
          observations,
          periodStart,
          periodEnd,
          periodKind,
        });
        results.push({ dimension, metricKind, ...r });
      } catch (err) {
        results.push({
          dimension,
          metricKind,
          alert: null,
          audit: null,
          skipped: true,
          reason: `ERROR: ${err.message}`,
        });
      }
    }
  }
  return {
    branchId,
    periodStart,
    periodEnd,
    auditsRun: results.length,
    alertsCreated: results.filter(r => !r.skipped).length,
    alertsExisting: results.filter(r => r.reason === 'IDEMPOTENT_EXISTING').length,
    results,
  };
}

module.exports = {
  runAuditAndPersist,
  runBranchSweep,
  computeSignature,
  BINARY_METRICS,
};
