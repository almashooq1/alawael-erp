'use strict';

/**
 * measureAlertEngine.service.js — Wave 220
 *
 * Turns longitudinal data into actionable clinical signals. Consumes:
 *   - W219 trend classifications  (regression / plateau / oscillation)
 *   - W211b frozen mcidAtAdministration snapshots
 *   - W215 totalRawScore series from MeasureApplication
 *
 * Three rules fire today:
 *   1. REGRESSION_DETECTED
 *      Source: W219 trend.classification='regression'
 *      Severity: high (CI excludes 0 in the bad direction is a strong
 *                signal — escalate immediately)
 *
 *   2. PLATEAU_DETECTED
 *      Source: W219 trend.classification='plateau' AND spanDays >= 90
 *      Severity: medium (need to modify the plan, not urgent)
 *
 *   3. MCID_NOT_MET
 *      Source: ≥3 admins with frozen MCID established/provisional,
 *              no admin's |delta vs baseline| reached MCID
 *      Severity: medium
 *
 * Public API:
 *   scanBeneficiary(beneficiaryId)         — one pass over all measures
 *   scanBeneficiaryMeasure(benId, measureRef) — single (ben, measure)
 *   acknowledge(alertId, actorId)
 *   resolve(alertId, {actorId, mode})
 *   dismiss(alertId, {actorId, reason})
 *   listOpen(filter)
 *
 * Idempotency: upsert on (benId, measureId, alertType, status='open')
 * via the partial unique index. Concurrent scans cannot double-emit.
 *
 * Off-switch: process.env.MEASURE_ALERT_ENGINE='off' disables scan().
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const M = {
  Measure: () => {
    try {
      return mongoose.model('Measure');
    } catch {
      try {
        require('../domains/goals/models/Measure');
        return mongoose.model('Measure');
      } catch {
        return null;
      }
    }
  },
  MeasureApplication: () => {
    try {
      return mongoose.model('MeasureApplication');
    } catch {
      try {
        require('../domains/goals/models/MeasureApplication');
        return mongoose.model('MeasureApplication');
      } catch {
        return null;
      }
    }
  },
  MeasureAlert: () => {
    try {
      return mongoose.model('MeasureAlert');
    } catch {
      try {
        require('../domains/goals/models/MeasureAlert');
        return mongoose.model('MeasureAlert');
      } catch {
        return null;
      }
    }
  },
};

function _isEnabled() {
  const flag = (process.env.MEASURE_ALERT_ENGINE || '').toLowerCase();
  return flag !== 'off' && flag !== '0' && flag !== 'false';
}

// ─── Rule implementations ──────────────────────────────────────────

/**
 * Pure: given a trend block (from W219) decide which alert(s) fire.
 * Returns an array of {alertType, severity, evidence} envelopes.
 */
function _rulesFromTrend(trend, admins, measure) {
  const findings = [];
  if (!trend) return findings;

  if (trend.classification === 'regression') {
    findings.push({
      alertType: 'REGRESSION_DETECTED',
      severity: 'high',
      evidence: {
        n: trend.n,
        spanDays: trend.spanDays,
        firstScore: trend.firstScore,
        lastScore: trend.lastScore,
        slopePerMonth: trend.slopePerMonth,
        r2: trend.r2,
        classification: trend.classification,
        message_ar: trend.message_ar || 'تراجع موثوق إحصائياً',
      },
    });
  }

  if (trend.classification === 'plateau' && (trend.spanDays || 0) >= 90) {
    findings.push({
      alertType: 'PLATEAU_DETECTED',
      severity: 'medium',
      evidence: {
        n: trend.n,
        spanDays: trend.spanDays,
        firstScore: trend.firstScore,
        lastScore: trend.lastScore,
        slopePerMonth: trend.slopePerMonth,
        r2: trend.r2,
        classification: trend.classification,
        message_ar: trend.message_ar || 'ثبات لمدة طويلة دون تقدّم',
      },
    });
  }

  // MCID_NOT_MET — requires admins[] context.
  const mcidFinding = _ruleMcidNotMet(admins, measure);
  if (mcidFinding) findings.push(mcidFinding);

  return findings;
}

function _ruleMcidNotMet(admins, measure) {
  if (!Array.isArray(admins) || admins.length < 3) return null;
  // Use frozen MCID from the LATEST admin (W211b pinned it at the time);
  // fall back to the measure's current MCID if no snapshot exists.
  const latest = admins[admins.length - 1];
  const frozen = latest && latest.mcidAtAdministration;
  const mcidValue = frozen?.value ?? measure.interpretation?.mcid?.value;
  const mcidStatus = frozen?.status ?? measure.interpretation?.mcid?.status;
  if (!Number.isFinite(mcidValue) || mcidValue <= 0) return null;
  if (mcidStatus !== 'established' && mcidStatus !== 'provisional') return null;

  const baselineScore = admins[0].totalRawScore;
  if (!Number.isFinite(baselineScore)) return null;

  const direction = measure.scoringDirection === 'lower_better' ? -1 : 1;
  let bestDelta = 0;
  for (let i = 1; i < admins.length; i++) {
    const cur = admins[i].totalRawScore;
    if (!Number.isFinite(cur)) continue;
    const improved = (cur - baselineScore) * direction;
    if (improved > bestDelta) bestDelta = improved;
  }
  if (bestDelta >= mcidValue) return null; // MCID achieved — no alert

  return {
    alertType: 'MCID_NOT_MET',
    severity: 'medium',
    evidence: {
      n: admins.length,
      spanDays: Math.round(
        (new Date(latest.applicationDate) - new Date(admins[0].applicationDate)) / 86400000
      ),
      firstScore: baselineScore,
      lastScore: latest.totalRawScore,
      mcidValue,
      mcidStatus,
      bestAchievedDelta: bestDelta,
      classification: 'mcid_pending',
      message_ar: `لم يصل التحسّن إلى الحد الأدنى ذو المعنى السريري (${bestDelta.toFixed(1)} مقابل MCID=${mcidValue})`,
    },
  };
}

// ─── Service ───────────────────────────────────────────────────────

class MeasureAlertEngineSvc {
  /**
   * Run alert rules for a single (beneficiary, measure) pair.
   * Returns the array of alerts that are currently open (created or
   * updated by this call).
   */
  async scanBeneficiaryMeasure(beneficiaryId, measureRef) {
    if (!_isEnabled()) return { disabled: true, alerts: [] };

    const Measure = M.Measure();
    const MeasureApplication = M.MeasureApplication();
    const MeasureAlert = M.MeasureAlert();
    if (!Measure || !MeasureApplication || !MeasureAlert) {
      throw new Error('alert engine: required models unavailable');
    }

    const measure = mongoose.Types.ObjectId.isValid(measureRef)
      ? await Measure.findById(measureRef).lean()
      : await Measure.findOne({ code: measureRef }).lean();
    if (!measure || measure.status !== 'active') {
      return { alerts: [], skipped: 'measure_inactive' };
    }

    // Fetch admins (chronological)
    const admins = await MeasureApplication.find({
      beneficiaryId,
      measureId: measure._id,
      status: { $in: ['completed', 'locked'] },
    })
      .sort({ applicationDate: 1 })
      .select('_id applicationDate totalRawScore mcidAtAdministration scoredWithMeasureVersion')
      .lean();

    if (admins.length < 3) return { alerts: [], skipped: 'insufficient_admins' };

    // Get trend (W219). Lazy-load to avoid module-init coupling.
    const trendEngine = require('./measureTrendEngine.service');
    const trend = await trendEngine.analyze(beneficiaryId, measure);

    const findings = _rulesFromTrend(trend, admins, measure);

    const upserted = [];
    for (const f of findings) {
      const upsert = await this._upsertAlert(beneficiaryId, measure, f, admins);
      if (upsert) upserted.push(upsert);
    }

    // Auto-resolve open alerts whose triggering condition no longer fires.
    const stillFiringTypes = new Set(findings.map(f => f.alertType));
    const autoResolved = await this._autoResolveCleared(
      beneficiaryId,
      measure._id,
      stillFiringTypes
    );

    return { alerts: upserted, autoResolved, trend };
  }

  /**
   * Scan every active measure that has admin history for this
   * beneficiary. Useful as a cron tick.
   */
  async scanBeneficiary(beneficiaryId) {
    if (!_isEnabled()) return { disabled: true, scanned: 0, alerts: [] };
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) throw new Error('alert engine: models unavailable');

    const distinct = await MeasureApplication.distinct('measureId', {
      beneficiaryId,
      status: { $in: ['completed', 'locked'] },
    });

    const allAlerts = [];
    const allAutoResolved = [];
    for (const measureId of distinct) {
      try {
        const r = await this.scanBeneficiaryMeasure(beneficiaryId, measureId);
        if (r.alerts) allAlerts.push(...r.alerts);
        if (r.autoResolved) allAutoResolved.push(...r.autoResolved);
      } catch (err) {
        logger.warn(
          '[MeasureAlertEngine] scan failed for ben=%s measure=%s: %s',
          beneficiaryId,
          measureId,
          err.message
        );
      }
    }
    return { scanned: distinct.length, alerts: allAlerts, autoResolved: allAutoResolved };
  }

  async _upsertAlert(beneficiaryId, measure, finding, admins) {
    const MeasureAlert = M.MeasureAlert();
    const existing = await MeasureAlert.findOne({
      beneficiaryId,
      measureId: measure._id,
      alertType: finding.alertType,
      status: 'open',
    });
    if (existing) {
      // Refresh evidence + lastEvaluatedAt; don't touch firstSeenAt.
      existing.evidence = {
        ...(existing.evidence?.toObject?.() ?? existing.evidence ?? {}),
        ...finding.evidence,
      };
      existing.lastEvaluatedAt = new Date();
      existing.severity = finding.severity;
      await existing.save();
      return existing.toObject();
    }
    try {
      const doc = await MeasureAlert.create({
        beneficiaryId,
        measureId: measure._id,
        measureCode: measure.code,
        alertType: finding.alertType,
        severity: finding.severity,
        status: 'open',
        evidence: finding.evidence,
        assigneeId: admins[admins.length - 1]?.assessorId,
        firstSeenAt: new Date(),
        lastEvaluatedAt: new Date(),
      });
      return doc.toObject();
    } catch (err) {
      if (err && err.code === 11000) {
        // Concurrent race produced a duplicate — re-fetch and refresh.
        const found = await MeasureAlert.findOne({
          beneficiaryId,
          measureId: measure._id,
          alertType: finding.alertType,
          status: 'open',
        }).lean();
        return found;
      }
      throw err;
    }
  }

  /**
   * Resolve previously-open alerts whose condition no longer fires.
   * E.g. a previously-regressing patient who's now improving — the
   * REGRESSION_DETECTED alert auto-resolves.
   */
  async _autoResolveCleared(beneficiaryId, measureId, stillFiringTypes) {
    const MeasureAlert = M.MeasureAlert();
    const openOnes = await MeasureAlert.find({
      beneficiaryId,
      measureId,
      status: 'open',
    });
    const resolved = [];
    for (const a of openOnes) {
      if (stillFiringTypes.has(a.alertType)) continue;
      a.status = 'resolved';
      a.resolvedAt = new Date();
      a.resolutionMode = 'auto';
      try {
        await a.save();
        resolved.push(a.toObject());
      } catch (err) {
        logger.warn('[MeasureAlertEngine] auto-resolve failed for %s: %s', a._id, err.message);
      }
    }
    return resolved;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  async acknowledge(alertId, actorId) {
    const MeasureAlert = M.MeasureAlert();
    const a = await MeasureAlert.findById(alertId);
    if (!a) return null;
    if (a.status !== 'open') throw new Error(`cannot acknowledge from status=${a.status}`);
    a.status = 'acknowledged';
    a.acknowledgedAt = new Date();
    a.acknowledgedBy = actorId || null;
    await a.save();
    return a.toObject();
  }

  async resolve(alertId, { actorId, mode = 'manual' } = {}) {
    const MeasureAlert = M.MeasureAlert();
    const a = await MeasureAlert.findById(alertId);
    if (!a) return null;
    if (a.status === 'resolved' || a.status === 'dismissed') return a.toObject();
    a.status = 'resolved';
    a.resolvedAt = new Date();
    a.resolvedBy = actorId || null;
    a.resolutionMode = mode;
    await a.save();
    return a.toObject();
  }

  async dismiss(alertId, { actorId, reason } = {}) {
    if (!reason || !String(reason).trim()) {
      throw new Error('dismissalReason is required');
    }
    const MeasureAlert = M.MeasureAlert();
    const a = await MeasureAlert.findById(alertId);
    if (!a) return null;
    if (a.status === 'resolved' || a.status === 'dismissed') {
      throw new Error(`cannot dismiss from status=${a.status}`);
    }
    a.status = 'dismissed';
    a.dismissedAt = new Date();
    a.dismissedBy = actorId || null;
    a.dismissalReason = reason;
    await a.save();
    return a.toObject();
  }

  async listOpen(filter = {}) {
    const MeasureAlert = M.MeasureAlert();
    if (!MeasureAlert) return [];
    return MeasureAlert.listOpenFor(filter);
  }

  // Pure rule export for tests
  _rulesFromTrend(trend, admins, measure) {
    return _rulesFromTrend(trend, admins, measure);
  }
}

module.exports = new MeasureAlertEngineSvc();
