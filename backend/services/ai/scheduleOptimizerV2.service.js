'use strict';

/**
 * scheduleOptimizerV2.service.js — Wave 117 / P3.5.
 *
 * Risk-aware extension of `scheduleOptimizer.service.js` (v1). Closes
 * P3.5 from blueprint/09-roadmap.md §5 by integrating Wave-115
 * No-Show Prediction into the weekly schedule generation.
 *
 * Architecture:
 *   - V1 produces a base greedy + constraint-satisfaction schedule.
 *   - V2 enriches each scheduled appointment with a no-show risk
 *     score derived from the SAME pure feature extractor used by
 *     the No-Show Prediction service (Wave 115). No new model, no
 *     external dependency.
 *   - V2 emits aggregate "expected attended" metrics + identifies
 *     potential swaps where two scheduled beneficiaries would
 *     benefit from trading slots (high-risk → safer therapist /
 *     time-of-day, low-risk → vacated scarce slot).
 *
 * Pure functions wherever possible — the public entry takes already-
 * loaded data (beneficiaries / specialists / history map) plus the
 * raw v1 result, then enriches purely.
 *
 * Public API:
 *   enrichScheduleWithRisk({ v1Result, historyByBeneficiary,
 *                            noShowService, now? })
 *     → { v2Result, comparison: { v1Score, v2RiskAwareScore,
 *                                 expectedAttended, ... },
 *         swapSuggestions: [] }
 *
 *   optimizeWeeklyScheduleV2({...same params as v1...})
 *     → Same shape as v1 result PLUS enrichment fields.
 */

const v1 = require('./scheduleOptimizer.service');

// Severity weights — how much risk reduces the slot score (max 30
// points off a 100-point base). Calibrated so a CRITICAL band
// (score≥0.75) costs ~25 points, MEDIUM ~12, LOW ~0.
function _riskPenalty(noShowScore) {
  const s = Math.max(0, Math.min(1, Number(noShowScore) || 0));
  return Math.round(s * 30);
}

// Time-of-day "stability" — historically, mid-morning (9-11) has
// the lowest no-show rate; very early (<8) + late-afternoon (16+)
// have the highest. Bonus is small (max 8 points) so it's a
// tiebreaker, not the dominant signal.
function _slotStabilityBonus(hour) {
  if (typeof hour !== 'number' || Number.isNaN(hour)) return 0;
  if (hour >= 9 && hour < 12) return 8;
  if (hour >= 12 && hour < 14) return 5;
  if (hour >= 14 && hour < 16) return 3;
  return 0; // before 9 or 16+
}

function _parseHour(startTime) {
  if (!startTime) return null;
  const m = /^(\d{1,2}):/.exec(String(startTime));
  if (!m) return null;
  const h = parseInt(m[1], 10);
  return Number.isFinite(h) ? h : null;
}

function _bandFor(score) {
  const s = Number(score) || 0;
  if (s >= 0.75) return 'critical';
  if (s >= 0.55) return 'high';
  if (s >= 0.3) return 'medium';
  return 'low';
}

function _interventionsFor(band) {
  if (band === 'critical') {
    return [
      'standard_reminder',
      'sms_24h_before',
      'sms_2h_before',
      'phone_call_required',
      'therapist_alert',
    ];
  }
  if (band === 'high') {
    return ['standard_reminder', 'sms_24h_before', 'sms_2h_before', 'phone_call_task'];
  }
  if (band === 'medium') {
    return ['standard_reminder', 'sms_24h_before'];
  }
  return ['standard_reminder'];
}

/**
 * Compute risk score for ONE scheduled slot. Pure.
 *
 *   - slot: a v1 schedule entry of type 'appointment'
 *   - history: array of past appointments for this beneficiary
 *   - noShowService: { extractFeatures, scoreFromFeatures } (Wave 115)
 *
 * Returns { score, band, interventions } or null if the
 * dependencies aren't usable.
 */
function _scoreSlotRisk({ slot, history, noShowService, now }) {
  if (!noShowService || typeof noShowService.extractFeatures !== 'function') return null;
  // Build a hypothetical appointment object the extractor can read.
  // Fields it consults: date, startTime, statusHistory (default []),
  // insuranceApprovalStatus (unknown for proposed slots).
  const hyp = {
    _id: null, // proposed slot — no id yet
    date:
      slot.date && slot.start_time
        ? new Date(`${slot.date}T${slot.start_time}:00.000Z`)
        : new Date(slot.date),
    startTime: slot.start_time,
    statusHistory: [],
    insuranceApprovalStatus: null,
  };
  let features;
  try {
    features = noShowService.extractFeatures(hyp, history || [], null);
  } catch {
    return null;
  }
  let score = 0;
  try {
    score = noShowService.scoreFromFeatures(features);
  } catch {
    return null;
  }
  // Clamp + classify.
  score = Math.max(0, Math.min(1, Number(score) || 0));
  const band = _bandFor(score);
  const interventions = _interventionsFor(band);
  void now;
  return { score: Number(score.toFixed(3)), band, interventions, features };
}

/**
 * Risk-aware re-scoring of v1's optimization_score. Pure.
 *
 *   v2RiskAwareScore = mean across appointments of:
 *     v1_slot_score - riskPenalty + stabilityBonus
 *   normalized back to 0..1.
 */
function _computeComparison({ v1Result, enriched }) {
  const appts = enriched.filter(e => e.type === 'appointment');
  const v1Score = v1Result.optimization_score || 0;
  if (appts.length === 0) {
    return {
      v1Score: Number(v1Score.toFixed(3)),
      v2RiskAwareScore: Number(v1Score.toFixed(3)),
      expectedAttended: 0,
      expectedLost: 0,
      avgNoShowRisk: 0,
      highRiskCount: 0,
      criticalRiskCount: 0,
    };
  }
  let totalAdjusted = 0;
  let totalExpectedAttended = 0;
  let highRisk = 0;
  let criticalRisk = 0;
  let sumRisk = 0;
  for (const a of appts) {
    const base = Number(a.score) || 50;
    const penalty = _riskPenalty(a.no_show_score);
    const hour = _parseHour(a.start_time);
    const bonus = _slotStabilityBonus(hour);
    const adjusted = Math.max(0, Math.min(100, base - penalty + bonus));
    totalAdjusted += adjusted;
    totalExpectedAttended += 1 - (Number(a.no_show_score) || 0);
    sumRisk += Number(a.no_show_score) || 0;
    if (a.no_show_band === 'high') highRisk += 1;
    if (a.no_show_band === 'critical') criticalRisk += 1;
  }
  const v2Raw = totalAdjusted / appts.length / 100;
  return {
    v1Score: Number(v1Score.toFixed(3)),
    v2RiskAwareScore: Number(v2Raw.toFixed(3)),
    expectedAttended: Number(totalExpectedAttended.toFixed(2)),
    expectedLost: Number((appts.length - totalExpectedAttended).toFixed(2)),
    avgNoShowRisk: Number((sumRisk / appts.length).toFixed(3)),
    highRiskCount: highRisk,
    criticalRiskCount: criticalRisk,
    totalScheduled: appts.length,
  };
}

/**
 * Identify potential SWAPS that would improve aggregate expected
 * attendance. Logic: if a high-risk appointment is in a stable slot
 * (mid-morning) AND a low-risk appointment is in an unstable slot
 * (early or late), swapping the two would reduce the expected loss
 * because the low-risk patient is robust to a worse slot and the
 * high-risk patient benefits from a stable slot.
 *
 * Returns up to `maxSuggestions` (default 5) swap proposals.
 */
function _findSwapSuggestions({ enriched, maxSuggestions = 5 }) {
  const appts = enriched
    .filter(e => e.type === 'appointment')
    .map(a => ({
      ...a,
      _hour: _parseHour(a.start_time),
    }));
  // Candidates for "giving up a stable slot": high+critical risk in
  // mid-morning slots.
  const giveUp = appts.filter(
    a =>
      (a.no_show_band === 'high' || a.no_show_band === 'critical') &&
      typeof a._hour === 'number' &&
      a._hour >= 9 &&
      a._hour < 12
  );
  // Candidates to receive a stable slot: low-risk in early/late.
  const eligibleReceiver = appts.filter(
    a => a.no_show_band === 'low' && typeof a._hour === 'number' && (a._hour < 9 || a._hour >= 14)
  );
  const swaps = [];
  for (const giver of giveUp) {
    for (const receiver of eligibleReceiver) {
      if (giver.beneficiary_id === receiver.beneficiary_id) continue;
      // Must be the same day to swap easily (no cross-day shuffle in v2).
      if (giver.date !== receiver.date) continue;
      swaps.push({
        from: {
          beneficiary_id: giver.beneficiary_id,
          beneficiary_name: giver.beneficiary_name,
          start_time: giver.start_time,
          no_show_score: giver.no_show_score,
          no_show_band: giver.no_show_band,
        },
        to: {
          beneficiary_id: receiver.beneficiary_id,
          beneficiary_name: receiver.beneficiary_name,
          start_time: receiver.start_time,
          no_show_score: receiver.no_show_score,
          no_show_band: receiver.no_show_band,
        },
        date: giver.date,
        rationale:
          'high-risk بنفس اليوم في slot مستقر — منحه فترة منخفضة الخطر يحسّن الحضور المتوقَّع',
        expectedDelta: Number(((giver.no_show_score - receiver.no_show_score) * 0.5).toFixed(3)),
      });
      if (swaps.length >= maxSuggestions) return swaps;
    }
    if (swaps.length >= maxSuggestions) break;
  }
  return swaps;
}

/**
 * MAIN entry. Risk-enriches a v1 result + emits comparison + swap
 * suggestions. Side-effect-free (just reads from the history map +
 * the injected no-show service).
 */
function enrichScheduleWithRisk({
  v1Result = null,
  historyByBeneficiary = {}, // { beneficiaryId: appointment[] }
  noShowService = null,
  maxSuggestions = 5,
  now = new Date(),
} = {}) {
  if (!v1Result || !Array.isArray(v1Result.schedule)) {
    return {
      ok: false,
      reason: 'V1_RESULT_REQUIRED',
      v2Result: null,
    };
  }
  const enriched = [];
  for (const item of v1Result.schedule) {
    if (item.type !== 'appointment') {
      enriched.push(item);
      continue;
    }
    const history = historyByBeneficiary[String(item.beneficiary_id)] || [];
    const risk = _scoreSlotRisk({
      slot: item,
      history,
      noShowService,
      now,
    });
    if (risk) {
      enriched.push({
        ...item,
        no_show_score: risk.score,
        no_show_band: risk.band,
        recommended_interventions: risk.interventions,
      });
    } else {
      enriched.push({
        ...item,
        no_show_score: null,
        no_show_band: 'unknown',
        recommended_interventions: [],
      });
    }
  }
  const comparison = _computeComparison({ v1Result, enriched });
  const swapSuggestions = _findSwapSuggestions({ enriched, maxSuggestions });
  return {
    ok: true,
    v2Result: {
      ...v1Result,
      schedule: enriched,
      risk_aware_optimization_score: comparison.v2RiskAwareScore,
      expected_attended: comparison.expectedAttended,
      expected_lost: comparison.expectedLost,
      high_risk_count: comparison.highRiskCount,
      critical_risk_count: comparison.criticalRiskCount,
    },
    comparison,
    swapSuggestions,
  };
}

/**
 * Convenience wrapper that runs v1 + enrichment in one call.
 * Takes the same inputs as v1 plus a `historyByBeneficiary` map
 * + a `noShowService` reference.
 */
function optimizeWeeklyScheduleV2(params = {}) {
  const v1Result = v1.optimizeWeeklySchedule(params);
  return enrichScheduleWithRisk({
    v1Result,
    historyByBeneficiary: params.historyByBeneficiary || {},
    noShowService: params.noShowService || null,
    maxSuggestions: params.maxSuggestions || 5,
    now: params.now || new Date(),
  });
}

module.exports = {
  optimizeWeeklyScheduleV2,
  enrichScheduleWithRisk,
  // exposed for tests:
  _scoreSlotRisk,
  _computeComparison,
  _findSwapSuggestions,
  _riskPenalty,
  _slotStabilityBonus,
};
