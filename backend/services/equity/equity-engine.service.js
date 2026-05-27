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
 *
 * Owner resolution order (W504):
 *   1. alert.assignedTo                    — supervisor pre-assigned the alert
 *   2. User with role=quality_lead in branch — best-fit production default
 *   3. User with role=admin in branch       — escalation fallback
 *   4. alert.branchId                       — last-resort placeholder marker
 *      that surfaces in the CAPA queue with an obviously-wrong owner,
 *      forcing supervisor reassignment.
 */
async function _resolveCapaOwner(alert) {
  if (alert.assignedTo) return alert.assignedTo;
  // Try to find a default owner for the branch
  try {
    const UserModel = mongoose.model('User');
    const filter = { branchId: alert.branchId, status: { $ne: 'inactive' } };
    const lead = await UserModel.findOne({ ...filter, role: 'quality_lead' })
      .select('_id')
      .lean();
    if (lead) return lead._id;
    const admin = await UserModel.findOne({ ...filter, role: 'admin' })
      .select('_id')
      .lean();
    if (admin) return admin._id;
  } catch {
    // User model unavailable — fall through to branchId placeholder
  }
  return alert.branchId;
}

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

  const ownerUserId = await _resolveCapaOwner(alert);

  return svc.createCapaItem({
    source: {
      module: 'equity',
      refId: alert._id,
      collection: 'equity_disparity_alerts',
    },
    type: 'corrective',
    title,
    description,
    ownerUserId,
    dueDate,
    branchId: alert.branchId,
    priority: 'high',
    createdBy: ownerUserId,
  });
}

/**
 * W504 — ensure a CAPA exists for an alert. Used by the retry endpoint
 * and any backfill path for alerts created before W503.
 *
 *   - If alert already has capaItemId AND that CAPA exists → return existing
 *   - Else if alert.overallSeverity is 'major' → create a new CAPA
 *   - Else (moderate/minor) → return null with reason NOT_MAJOR
 */
async function ensureCapaForAlert(alertId) {
  const AlertModel = mongoose.model('EquityDisparityAlert');
  const alert = await AlertModel.findById(alertId);
  if (!alert) {
    const err = new Error('Alert not found');
    err.code = 'ALERT_NOT_FOUND';
    throw err;
  }

  if (alert.overallSeverity !== 'major') {
    return { capaItem: null, alert, skipped: true, reason: 'NOT_MAJOR' };
  }

  // If already linked, verify the CAPA still exists; if not, treat as orphan
  // and create fresh.
  if (alert.capaItemId) {
    try {
      const CapaModel = mongoose.model('CapaItem');
      const existing = await CapaModel.findById(alert.capaItemId).lean();
      if (existing) {
        return { capaItem: existing, alert, skipped: true, reason: 'ALREADY_LINKED' };
      }
    } catch {
      /* CapaItem model not registered — fall through to create */
    }
  }

  // Build a synthetic `audit` object from the persisted findings for the
  // title/description template.
  const audit = {
    findings: alert.findings || [],
    flaggedCount: alert.flaggedCount,
    overallSeverity: alert.overallSeverity,
  };
  const capaItem = await _autoCreateCapaForAlert({ alert, audit });
  if (capaItem) {
    alert.capaItemId = capaItem._id;
    await alert.save();
  }
  return { capaItem, alert, skipped: false, reason: 'CREATED' };
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
  ensureCapaForAlert,
  computeSignature,
  BINARY_METRICS,
};
