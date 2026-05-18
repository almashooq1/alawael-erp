'use strict';

/**
 * no-show-prediction.service.js — Wave 115 / P3.4.
 *
 * Heuristic no-show risk scorer for appointments. Closes the P3.4 gap
 * in blueprint/09-roadmap.md §5.
 *
 * Design notes:
 *   • No external ML dependency. A rule-based weighted score over
 *     readily-available signals (beneficiary 90-day history +
 *     appointment metadata + branch baseline) is accurate enough to
 *     drive intervention tiering and cheap enough to run on every
 *     upcoming appointment in a daily batch.
 *   • Reuses the existing AiPrediction model — its prediction_type
 *     enum already includes 'attendance'. No schema migration.
 *   • All scoring functions are pure (no I/O) so they're trivially
 *     unit-testable + tunable.
 *
 * Public API:
 *   extractFeatures(appointment, history?, branchStats?)   pure
 *   scoreFromFeatures(features)                            pure
 *   deriveContributions(features)                          pure
 *   predictForAppointment(appointmentId, opts?)
 *     → { ok, prediction, score, band, features, contributions,
 *         interventions, appointmentId }
 *     | { ok:false, reason, ... }
 *   predictBatch({ branchId?, horizonHours?, dryRun? })
 *     → { ok, generatedAt, branchId, horizonHours, dryRun, total,
 *         byBand, predictions[] }
 *   summarizeByBranch({ branchId?, since? })
 *     → { ok, branchId, since, total, byBand, accuracy?, validatedCount }
 */

const reg = require('./no-show-prediction.registry');

const ATTENDED_STATUSES = new Set(['COMPLETED', 'CHECKED_IN', 'IN_PROGRESS']);
const DAY_MS = 24 * 3600 * 1000;

function createNoShowPredictionService({
  appointmentModel = null,
  predictionModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!appointmentModel || !predictionModel) {
    throw new Error('no-show-prediction: appointmentModel + predictionModel required');
  }

  // ─── Pure features ───────────────────────────────────────────────

  /**
   * Extracts a feature vector from an upcoming appointment + the
   * beneficiary's recent appointment history + the branch baseline.
   *
   * `history` should be pre-filtered to past appointments (date < now)
   * for the same beneficiary; the function tolerates unfiltered input
   * by re-applying the date predicate.
   */
  function extractFeatures(appointment, history = [], branchStats = null) {
    const apDate = appointment && appointment.date ? new Date(appointment.date) : null;
    const cutoff = new Date(now().getTime() - 90 * DAY_MS);

    const past = (Array.isArray(history) ? history : [])
      .filter(a => {
        const d = a && a.date ? new Date(a.date) : null;
        if (!d) return false;
        if (apDate && d.getTime() >= apDate.getTime()) return false;
        return d.getTime() >= cutoff.getTime();
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const total = past.length;
    const noShowCount = past.filter(a => a.status === 'NO_SHOW').length;
    const cancelledCount = past.filter(a => a.status === 'CANCELLED').length;
    const noShowRate90d = total > 0 ? noShowCount / total : 0;
    const cancellationRate90d = total > 0 ? cancelledCount / total : 0;

    const lastFive = past.slice(-5);
    const lastFiveNoShows = lastFive.filter(a => a.status === 'NO_SHOW').length;
    // Always divide by 5 to keep contribution comparable across short
    // and full streaks (a 1/1 no-show is signal but not equivalent to
    // 5/5 — that's what NO_SHOW_RATE_90D is for).
    const recentStreak = lastFive.length > 0 ? lastFiveNoShows / 5 : 0;

    const attended = past.filter(a => ATTENDED_STATUSES.has(a.status));
    const lastAttended =
      attended.length > 0
        ? new Date(Math.max(...attended.map(a => new Date(a.date).getTime())))
        : null;
    const daysSinceLastAttended = lastAttended
      ? (now().getTime() - lastAttended.getTime()) / DAY_MS
      : null;
    // Normalized to [0,1]: ≥30 days since last attended → 1.
    // Never attended in window → 1 (treat as a far-back attendance).
    const daysSinceLastAttendedNorm =
      daysSinceLastAttended === null ? 1 : Math.min(1, Math.max(0, daysSinceLastAttended / 30));

    const statusHistory = Array.isArray(appointment.statusHistory) ? appointment.statusHistory : [];
    // Count distinct reschedule events on this appointment.
    const rescheduleCount = statusHistory.filter(
      s => s && (s.from === 'RESCHEDULED' || s.to === 'RESCHEDULED')
    ).length;
    const rescheduleCountNorm = Math.min(1, rescheduleCount / 3);

    const isFirstAppointment = past.length === 0;

    const hourRaw = String(appointment.startTime || '12:00').split(':')[0];
    const hour = Number.isFinite(parseInt(hourRaw, 10)) ? parseInt(hourRaw, 10) : 12;
    const earlyOrLateHour = hour < 9 || hour >= 16 ? 1 : 0;

    const hasInsuranceApproval = appointment.insuranceApprovalStatus === 'approved';

    const branchBaseline =
      branchStats && Number.isFinite(branchStats.noShowRate90d)
        ? Math.max(0, Math.min(1, branchStats.noShowRate90d))
        : 0;

    return {
      noShowRate90d: round4(noShowRate90d),
      cancellationRate90d: round4(cancellationRate90d),
      recentStreak: round4(recentStreak),
      daysSinceLastAttended:
        daysSinceLastAttended === null ? null : Math.round(daysSinceLastAttended * 10) / 10,
      daysSinceLastAttendedNorm: round4(daysSinceLastAttendedNorm),
      rescheduleCount,
      rescheduleCountNorm: round4(rescheduleCountNorm),
      isFirstAppointment,
      hour,
      earlyOrLateHour,
      hasInsuranceApproval,
      branchBaseline: round4(branchBaseline),
      totalHistoricalAppointments: total,
    };
  }

  function scoreFromFeatures(f) {
    if (!f) return 0;
    const w = reg.FEATURE_WEIGHTS;
    let score = 0;
    score += (f.noShowRate90d || 0) * w.NO_SHOW_RATE_90D;
    score += (f.cancellationRate90d || 0) * w.CANCELLATION_RATE_90D;
    score += (f.recentStreak || 0) * w.RECENT_STREAK;
    score += (f.daysSinceLastAttendedNorm || 0) * w.DAYS_SINCE_LAST_ATTENDED;
    score += (f.rescheduleCountNorm || 0) * w.RESCHEDULE_COUNT;
    if (f.isFirstAppointment) score += w.FIRST_APPOINTMENT;
    if (f.earlyOrLateHour) score += w.EARLY_OR_LATE_HOUR;
    if (!f.hasInsuranceApproval) score += w.NO_INSURANCE_APPROVAL;
    score += (f.branchBaseline || 0) * w.BRANCH_BASELINE;
    return round4(Math.max(0, Math.min(1, score)));
  }

  function deriveContributions(f) {
    const w = reg.FEATURE_WEIGHTS;
    return {
      noShowRate90d: round4((f.noShowRate90d || 0) * w.NO_SHOW_RATE_90D),
      cancellationRate90d: round4((f.cancellationRate90d || 0) * w.CANCELLATION_RATE_90D),
      recentStreak: round4((f.recentStreak || 0) * w.RECENT_STREAK),
      daysSinceLastAttended: round4(
        (f.daysSinceLastAttendedNorm || 0) * w.DAYS_SINCE_LAST_ATTENDED
      ),
      rescheduleCount: round4((f.rescheduleCountNorm || 0) * w.RESCHEDULE_COUNT),
      firstAppointment: f.isFirstAppointment ? w.FIRST_APPOINTMENT : 0,
      earlyOrLateHour: f.earlyOrLateHour ? w.EARLY_OR_LATE_HOUR : 0,
      noInsuranceApproval: !f.hasInsuranceApproval ? w.NO_INSURANCE_APPROVAL : 0,
      branchBaseline: round4((f.branchBaseline || 0) * w.BRANCH_BASELINE),
    };
  }

  // ─── History / branch-stats loaders ──────────────────────────────

  async function _loadHistory(beneficiaryId) {
    const since = new Date(now().getTime() - 90 * DAY_MS);
    try {
      const cursor = appointmentModel.find({
        beneficiary: beneficiaryId,
        date: { $gte: since },
      });
      const items = await _resolveCursor(cursor, { sort: { date: 1 } });
      return Array.isArray(items) ? items : [];
    } catch (err) {
      logger.warn(`[no-show] history load failed: ${err.message}`);
      return [];
    }
  }

  async function _loadBranchStats(branchId) {
    if (!branchId) return { noShowRate90d: 0, total: 0, noShows: 0 };
    const since = new Date(now().getTime() - 90 * DAY_MS);
    try {
      const cursor = appointmentModel.find({ branchId, date: { $gte: since } });
      const items = await _resolveCursor(cursor);
      const arr = Array.isArray(items) ? items : [];
      const total = arr.length;
      const noShows = arr.filter(a => a.status === 'NO_SHOW').length;
      return {
        noShowRate90d: total > 0 ? noShows / total : 0,
        total,
        noShows,
      };
    } catch (err) {
      logger.warn(`[no-show] branch-stats load failed: ${err.message}`);
      return { noShowRate90d: 0, total: 0, noShows: 0 };
    }
  }

  // ─── Public: predictForAppointment ───────────────────────────────

  async function predictForAppointment(appointmentId, opts = {}) {
    if (!appointmentId) {
      return { ok: false, reason: reg.REASON.NO_SHOW_APPOINTMENT_NOT_FOUND };
    }

    let appointment;
    try {
      const q = appointmentModel.findById(appointmentId);
      appointment = await (q && typeof q.lean === 'function' ? q.lean() : q);
    } catch (err) {
      logger.warn(`[no-show] findById failed: ${err.message}`);
      return {
        ok: false,
        reason: reg.REASON.NO_SHOW_PREDICTION_UNAVAILABLE,
        message: err.message,
      };
    }
    if (!appointment) {
      return { ok: false, reason: reg.REASON.NO_SHOW_APPOINTMENT_NOT_FOUND };
    }

    if (!reg.PREDICTABLE_STATUSES.includes(appointment.status)) {
      return {
        ok: false,
        reason: reg.REASON.NO_SHOW_APPOINTMENT_INVALID_STATUS,
        details: {
          currentStatus: appointment.status,
          predictable: reg.PREDICTABLE_STATUSES,
        },
      };
    }

    if (!appointment.beneficiary) {
      return { ok: false, reason: reg.REASON.NO_SHOW_BENEFICIARY_REQUIRED };
    }

    const history = await _loadHistory(appointment.beneficiary);
    const branchStats = await _loadBranchStats(appointment.branchId);

    const features = extractFeatures(appointment, history, branchStats);
    const score = scoreFromFeatures(features);
    const band = reg.bandForScore(score);
    const contributions = deriveContributions(features);
    const interventions = reg.interventionsForBand(band);

    const predictionDate = now();
    const targetDate = appointment.date ? new Date(appointment.date) : predictionDate;

    const doc = new predictionModel({
      beneficiary_id: appointment.beneficiary,
      prediction_type: 'attendance',
      prediction_scope: 'weekly',
      predicted_value: score,
      confidence: reg.BASELINE_CONFIDENCE,
      features_used: features,
      prediction_details: {
        band,
        appointment_id: String(appointmentId),
        contributions,
        interventions: Array.from(interventions),
      },
      model_version: reg.MODEL_VERSION,
      status: 'active',
      prediction_date: predictionDate,
      target_date: targetDate,
      branch_id: appointment.branchId,
    });

    if (!opts.dryRun) {
      try {
        await doc.save();
      } catch (err) {
        logger.warn(`[no-show] save failed: ${err.message}`);
        return {
          ok: false,
          reason: reg.REASON.NO_SHOW_PERSIST_FAILED,
          message: err.message,
        };
      }
    }

    return {
      ok: true,
      prediction: doc,
      score,
      band,
      features,
      contributions,
      interventions: Array.from(interventions),
      appointmentId: String(appointmentId),
    };
  }

  // ─── Public: predictBatch ────────────────────────────────────────

  async function predictBatch({
    branchId = null,
    horizonHours = reg.DEFAULT_BATCH_HORIZON_HOURS,
    dryRun = false,
  } = {}) {
    const startedAt = now();
    const endTime = new Date(startedAt.getTime() + Number(horizonHours) * 3600 * 1000);
    const q = {
      status: { $in: reg.PREDICTABLE_STATUSES },
      date: { $gte: startedAt, $lte: endTime },
    };
    if (branchId) q.branchId = branchId;

    let appointments;
    try {
      const cursor = appointmentModel.find(q);
      appointments = await _resolveCursor(cursor);
    } catch (err) {
      logger.warn(`[no-show] batch load failed: ${err.message}`);
      return {
        ok: false,
        reason: reg.REASON.NO_SHOW_PREDICTION_UNAVAILABLE,
        message: err.message,
      };
    }
    appointments = Array.isArray(appointments) ? appointments : [];

    const byBand = _zeroByBand();
    const results = [];
    let skipped = 0;

    for (const ap of appointments) {
      const r = await predictForAppointment(ap._id, { dryRun });
      if (r.ok) {
        byBand[r.band] = (byBand[r.band] || 0) + 1;
        results.push({
          appointmentId: r.appointmentId,
          beneficiary: ap.beneficiary != null ? String(ap.beneficiary) : null,
          date: ap.date,
          score: r.score,
          band: r.band,
          interventions: r.interventions,
        });
      } else {
        skipped++;
      }
    }

    return {
      ok: true,
      generatedAt: startedAt.toISOString(),
      branchId: branchId ? String(branchId) : null,
      horizonHours: Number(horizonHours),
      dryRun: Boolean(dryRun),
      total: results.length,
      skipped,
      byBand,
      predictions: results,
    };
  }

  // ─── Public: summarizeByBranch ───────────────────────────────────

  async function summarizeByBranch({ branchId = null, since = null } = {}) {
    const sinceDate = since ? new Date(since) : new Date(now().getTime() - 7 * DAY_MS);
    const q = {
      prediction_type: 'attendance',
      prediction_date: { $gte: sinceDate },
    };
    if (branchId) q.branch_id = branchId;

    let preds;
    try {
      const cursor = predictionModel.find(q);
      preds = await _resolveCursor(cursor);
    } catch (err) {
      logger.warn(`[no-show] summary load failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.NO_SHOW_PREDICTION_UNAVAILABLE };
    }
    preds = Array.isArray(preds) ? preds : [];

    const byBand = _zeroByBand();
    let validated = 0;
    let accurate = 0;
    for (const p of preds) {
      const band =
        (p.prediction_details && p.prediction_details.band) || reg.bandForScore(p.predicted_value);
      byBand[band] = (byBand[band] || 0) + 1;
      if (p.actual_value !== null && p.actual_value !== undefined) {
        validated++;
        if (Math.abs((p.actual_value || 0) - (p.predicted_value || 0)) <= reg.ACCURACY_TOLERANCE) {
          accurate++;
        }
      }
    }

    return {
      ok: true,
      branchId: branchId ? String(branchId) : null,
      since: sinceDate.toISOString(),
      total: preds.length,
      byBand,
      accuracy: validated > 0 ? round4(accurate / validated) : null,
      validatedCount: validated,
    };
  }

  return {
    extractFeatures,
    scoreFromFeatures,
    deriveContributions,
    predictForAppointment,
    predictBatch,
    summarizeByBranch,
  };
}

// ─── Internal helpers ──────────────────────────────────────────────

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function _zeroByBand() {
  return {
    [reg.RISK_BAND.LOW]: 0,
    [reg.RISK_BAND.MEDIUM]: 0,
    [reg.RISK_BAND.HIGH]: 0,
    [reg.RISK_BAND.CRITICAL]: 0,
  };
}

// Resolves a Mongoose-style cursor that may or may not support
// chaining (real Model.find()) — also accommodates test mocks that
// return arrays directly.
async function _resolveCursor(cursor, opts = {}) {
  if (cursor == null) return [];
  if (Array.isArray(cursor)) return cursor;
  let c = cursor;
  if (opts.sort && c && typeof c.sort === 'function') {
    c = c.sort(opts.sort);
  }
  if (c && typeof c.lean === 'function') return c.lean();
  return c;
}

module.exports = { createNoShowPredictionService };
