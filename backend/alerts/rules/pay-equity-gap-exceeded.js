/**
 * Rule: latest pay-equity snapshot breaches the equity-score floor or a
 * REPORTABLE demographic gap ceiling (W1197).
 *
 * Closes the W1194 monitoring loop: the monthly sweeper persists a
 * PayEquitySnapshot per branch; this rule surfaces a breach on the latest
 * snapshot to the smart-alerts dashboard (the W1006 operational-alert path)
 * instead of only logging a warning. One alert per snapshot (keyed by _id), so
 * a monthly cadence yields ~1 alert per branch per month.
 *
 * PRIVACY: only `reportable` gaps trigger — a privacy-suppressed small-group gap
 * (the lib's MIN_GROUP rule) is never alerted on. Thresholds match the sweeper's
 * env so the two layers stay consistent.
 */

'use strict';

const SCORE_FLOOR = Number(process.env.PAY_EQUITY_SCORE_FLOOR) || 70;
const GAP_CEILING = Number(process.env.PAY_EQUITY_GAP_CEILING) || 15;
const WINDOW_DAYS = 45; // a monthly snapshot is always inside this window

function lazySnapModel() {
  const mongoose = require('mongoose');
  try {
    return mongoose.model('PayEquitySnapshot');
  } catch {
    try {
      require('../../models/HR/PayEquitySnapshot');
      return mongoose.model('PayEquitySnapshot');
    } catch {
      return null;
    }
  }
}

function breachesOf(snap) {
  const out = [];
  if (typeof snap.equityScore === 'number' && snap.equityScore < SCORE_FLOOR) {
    out.push(`equity score ${snap.equityScore} < floor ${SCORE_FLOOR}`);
  }
  for (const [dim, g] of [
    ['gender', snap.genderGap],
    ['nationality', snap.nationalityGap],
  ]) {
    if (g && g.reportable && typeof g.medianGapPct === 'number' && g.medianGapPct > GAP_CEILING) {
      out.push(
        `${dim} median gap ${g.medianGapPct}% > ceiling ${GAP_CEILING}% (${g.direction} disadvantaged)`
      );
    }
  }
  return out;
}

module.exports = {
  id: 'pay-equity-gap-exceeded',
  severity: 'warning',
  category: 'hr',
  description:
    'Latest pay-equity snapshot breaches the equity-score floor or a reportable gap ceiling',

  // exposed for the drift guard
  _breachesOf: breachesOf,

  async evaluate(ctx) {
    const Model = (ctx.models && ctx.models.PayEquitySnapshot) || lazySnapModel();
    if (!Model) return [];
    const now = ctx.now || new Date();
    const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const rows = await Model.find({ computedAt: { $gte: since } }).lean();
    if (!Array.isArray(rows) || !rows.length) return [];

    // newest-first, then keep only the latest snapshot per (branch, dept-scope)
    rows.sort((a, b) => new Date(b.computedAt).getTime() - new Date(a.computedAt).getTime());
    const seen = new Set();
    const alerts = [];
    for (const s of rows) {
      const dept = (s.scope && s.scope.department) || '';
      const k = `${s.branchId}|${dept}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const breaches = breachesOf(s);
      if (!breaches.length) continue;
      alerts.push({
        key: `pay-equity-gap:${s._id}`, // idempotent — one alert per snapshot
        subject: { type: 'PayEquitySnapshot', id: s._id },
        branchId: s.branchId,
        message: `Pay-equity breach (branch ${s.branchId}${dept ? '/' + dept : ''}): ${breaches.join('; ')}`,
      });
    }
    return alerts;
  },
};
