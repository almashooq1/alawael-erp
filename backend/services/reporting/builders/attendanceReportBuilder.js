/**
 * attendanceReportBuilder.js — real builder for `ben.attendance.weekly`
 * (and any other catalog entry that names
 * `attendanceReportBuilder.buildAdherence`).
 *
 * Phase 10 Commit 7a.
 *
 * Queries the SessionAttendance model (session-keyed clinical
 * attendance, not the HR day-school one) scoped by beneficiary +
 * period, and returns a structured JSON document the renderer's
 * family-update-style templates can consume.
 *
 * Contract follows the engine's builder contract:
 *
 *   buildAdherence({ report, periodKey, scopeKey, ctx }) → Promise<doc>
 *
 *   ctx = { models?, now?, loadBeneficiary? }
 *
 *   - models.SessionAttendance (Mongoose proxy) is the primary source.
 *   - ctx.loadBeneficiary(id) — optional hook to populate the doc's
 *     beneficiary block; if absent we read the Beneficiary model from
 *     ctx.models.Beneficiary, and if that's missing too we return a
 *     minimal `{ id }` stub (the renderer is null-safe).
 *
 * Output shape is stable across beneficiary-attendance templates:
 *
 *   {
 *     reportType,
 *     periodKey,
 *     scopeKey,
 *     generatedAt,
 *     beneficiary: { id, fullName, branchId? } | null,
 *     range: { start, end },
 *     totals: { scheduled, present, late, absent, no_show, cancelled },
 *     rate:  number | null     (present + late) / (present + late + absent + no_show)
 *     highlights: string[],
 *     concerns:   string[],
 *     overallTrend: 'improving' | 'stable' | 'declining',
 *   }
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');

const TRACKED_STATUSES = Object.freeze(['present', 'late', 'absent', 'no_show', 'cancelled']);

function emptyTotals() {
  return { scheduled: 0, present: 0, late: 0, absent: 0, no_show: 0, cancelled: 0 };
}

function computeRate(totals) {
  const denom =
    (totals.present || 0) + (totals.late || 0) + (totals.absent || 0) + (totals.no_show || 0);
  if (denom <= 0) return null;
  return ((totals.present || 0) + (totals.late || 0)) / denom;
}

function derive(trendCurrent, trendPrior) {
  if (trendPrior == null || trendCurrent == null) return 'stable';
  if (trendCurrent - trendPrior >= 0.05) return 'improving';
  if (trendPrior - trendCurrent >= 0.05) return 'declining';
  return 'stable';
}

function formatPercent(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n * 1000) / 10}%`;
}

function highlightsAndConcerns(totals, rate) {
  const highlights = [];
  const concerns = [];
  if (rate != null && rate >= 0.9) {
    highlights.push(`Excellent attendance this period — ${formatPercent(rate)} adherence.`);
  }
  if ((totals.present || 0) > 0) {
    highlights.push(`Attended ${totals.present} of ${totals.scheduled} scheduled sessions.`);
  }
  if ((totals.late || 0) >= 2) {
    concerns.push(`Late arrivals recorded ${totals.late} times — please review arrival routine.`);
  }
  if ((totals.no_show || 0) >= 1) {
    concerns.push(
      `${totals.no_show} no-show${totals.no_show > 1 ? 's' : ''} — these may be billable per policy.`
    );
  }
  if (rate != null && rate < 0.7) {
    concerns.push(
      `Adherence below 70% (${formatPercent(rate)}) — clinical team has been notified.`
    );
  }
  return { highlights, concerns };
}

/**
 * Safely resolve the SessionAttendance query chain for `find`.
 * Mongoose's `.find()` returns a Query; our fake in tests returns a
 * plain object — both are awaited directly.
 */
async function listAttendance(Model, { beneficiaryId, start, end }) {
  if (!Model) return [];
  try {
    return (
      (await Model.find({
        beneficiaryId,
        scheduledDate: { $gte: start, $lt: end },
      })) || []
    );
  } catch (_err) {
    return [];
  }
}

async function loadBeneficiary(ctx, id) {
  if (!id) return null;
  if (typeof ctx.loadBeneficiary === 'function') {
    try {
      return (await ctx.loadBeneficiary(id)) || null;
    } catch (_) {
      /* fallthrough */
    }
  }
  const Bene = ctx.models && (ctx.models.Beneficiary?.model || ctx.models.Beneficiary);
  if (!Bene || typeof Bene.findById !== 'function') return { id };
  try {
    const b = await Bene.findById(id);
    if (!b) return { id };
    return {
      id: String(b._id || b.id || id),
      fullName: b.fullName || b.name || null,
      branchId: b.branchId || null,
    };
  } catch (_) {
    return { id };
  }
}

function rollupTotals(rows) {
  const totals = emptyTotals();
  for (const r of rows) {
    totals.scheduled += 1;
    if (r && TRACKED_STATUSES.includes(r.status)) {
      totals[r.status] = (totals[r.status] || 0) + 1;
    }
  }
  return totals;
}

/**
 * Build a beneficiary attendance adherence report for a given period.
 */
async function buildAdherence({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = {
    reportType: (report && report.id) || 'ben.attendance.weekly',
    periodKey,
    scopeKey: scopeKey || null,
    generatedAt: new Date().toISOString(),
    beneficiary: null,
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
    totals: emptyTotals(),
    rate: null,
    highlights: [],
    concerns: [],
    overallTrend: 'stable',
  };

  if (!range) {
    result.concerns.push(`Unrecognised periodKey '${periodKey}' — report built empty.`);
    return result;
  }
  if (!scope || scope.type !== 'beneficiary' || !scope.id) {
    result.concerns.push('scopeKey must be `beneficiary:<id>` for attendance reports.');
    return result;
  }

  const Model = ctx.models && (ctx.models.SessionAttendance?.model || ctx.models.SessionAttendance);
  const rows = await listAttendance(Model, {
    beneficiaryId: scope.id,
    start: range.start,
    end: range.end,
  });
  result.totals = rollupTotals(rows);
  result.rate = computeRate(result.totals);

  // Prior-period trend: one period back (same kind / length).
  const priorRange = {
    start: new Date(range.start.getTime() - (range.end.getTime() - range.start.getTime())),
    end: range.start,
  };
  const priorRows = await listAttendance(Model, {
    beneficiaryId: scope.id,
    start: priorRange.start,
    end: priorRange.end,
  });
  const priorRate = computeRate(rollupTotals(priorRows));
  result.overallTrend = derive(result.rate, priorRate);

  result.beneficiary = await loadBeneficiary(ctx, scope.id);

  const hc = highlightsAndConcerns(result.totals, result.rate);
  result.highlights = hc.highlights;
  // Append concerns (not replace — we may already have a noted warning).
  result.concerns = result.concerns.concat(hc.concerns);

  return result;
}

module.exports = {
  buildAdherence,
  // Exposed for unit tests:
  computeRate,
  rollupTotals,
  highlightsAndConcerns,
  TRACKED_STATUSES,
};
