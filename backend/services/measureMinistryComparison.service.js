'use strict';

/**
 * measureMinistryComparison.service.js — Wave 250
 *
 * Cross-branch ministry rollup. Where W242 generates ONE branch's
 * monthly report, this service runs W242 in parallel across N branches
 * and returns a side-by-side comparison shape: per-branch outcome
 * numbers, organization-wide totals, plus a ranked leaderboard.
 *
 * Answers the director's question that W242 alone can't: "which of
 * my 8 branches is dragging down the organization?" — not by guessing
 * from monthly reports, but by reading a single ranked table.
 *
 * Architecture-doc reference:
 *   block 14 (Clinical & Family-friendly Reporting → Ministry tier)
 *   — the multi-branch variant deferred when W242 shipped.
 *
 * Public API:
 *   compareBranches({branchIds[], year, month})
 *     → structured comparison report:
 *     {
 *       reportType: 'MOHRSD_MONTHLY_COMPARISON',
 *       reportVersion: '1.0.0',
 *       period: {year, month, monthName_ar, from, to},
 *       branches: [{
 *         branchId, branchName, branchName_ar,
 *         outcomes: {pairsAnalysed, mcidAchievedCount, mcidAchievementRate},
 *         administrations: {total, byPurpose},
 *         alerts: {total, regression, plateau, mcidNotMet},
 *         goals: {total, active, achieved, achievedRate},
 *         beneficiaries: {administeredInMonth},
 *         error?: 'models_unavailable',   // per-branch — others can still report
 *       }],
 *       organizationTotals: {
 *         beneficiariesWithAdmin, administrationsTotal,
 *         pairsAnalysed, mcidAchievedCount, mcidAchievementRate,
 *         alertsTotal, goalsAchieved, goalsAchievedRate,
 *       },
 *       leaderboard: {
 *         byMcidRate: [{rank, branchId, branchName_ar, rate, pairsAnalysed}],
 *         byActiveAlerts: [{rank, branchId, branchName_ar, alerts}],  // ascending
 *         byGoalsAchievedRate: [{rank, branchId, branchName_ar, rate, achieved}],
 *       },
 *       signOff: { ... },              // org-level director slot
 *     }
 *
 * Read-only. No DB writes. Pure orchestration above W242.
 *
 * Parallelism: branches scanned via Promise.all (typically ≤20 branches
 * per org — well under any sensible parallel-fetch limit).
 *
 * Per-branch failures don't fail the whole report — they land in the
 * branches[] array with `error: '...'` so the director sees which
 * branch couldn't report and why.
 */

const mongoose = require('mongoose');

const REPORT_TYPE = 'MOHRSD_MONTHLY_COMPARISON';
const REPORT_VERSION = '1.0.0';

// ─── Pure helpers ──────────────────────────────────────────────────

function _rankByDesc(branches, valueOf) {
  return branches
    .filter(b => !b.error)
    .map(b => ({ branchId: b.branchId, branchName_ar: b.branchName_ar, value: valueOf(b) }))
    .sort((a, b) => b.value - a.value)
    .map((row, i) => ({ rank: i + 1, ...row }));
}

function _rankByAsc(branches, valueOf) {
  return branches
    .filter(b => !b.error)
    .map(b => ({ branchId: b.branchId, branchName_ar: b.branchName_ar, value: valueOf(b) }))
    .sort((a, b) => a.value - b.value)
    .map((row, i) => ({ rank: i + 1, ...row }));
}

function _orgTotals(branches) {
  const errored = branches.filter(b => b.error);
  const reporting = branches.filter(b => !b.error);

  let beneficiariesWithAdmin = 0;
  let administrationsTotal = 0;
  let pairsAnalysed = 0;
  let mcidAchievedCount = 0;
  let alertsTotal = 0;
  let goalsTotal = 0;
  let goalsAchieved = 0;

  for (const b of reporting) {
    beneficiariesWithAdmin += b.beneficiaries?.administeredInMonth || 0;
    administrationsTotal += b.administrations?.total || 0;
    pairsAnalysed += b.outcomes?.pairsAnalysed || 0;
    mcidAchievedCount += b.outcomes?.mcidAchievedCount || 0;
    alertsTotal += b.alerts?.total || 0;
    goalsTotal += b.goals?.total || 0;
    goalsAchieved += b.goals?.achieved || 0;
  }

  return {
    beneficiariesWithAdmin,
    administrationsTotal,
    pairsAnalysed,
    mcidAchievedCount,
    mcidAchievementRate: pairsAnalysed
      ? Math.round((mcidAchievedCount / pairsAnalysed) * 1000) / 1000
      : 0,
    alertsTotal,
    goalsTotal,
    goalsAchieved,
    goalsAchievedRate: goalsTotal ? Math.round((goalsAchieved / goalsTotal) * 1000) / 1000 : 0,
    branchesReporting: reporting.length,
    branchesErrored: errored.length,
  };
}

// ─── Service ───────────────────────────────────────────────────────

class MeasureMinistryComparisonSvc {
  /**
   * Run W242 across multiple branches and return a comparison shape.
   *
   * @param {Object} input
   * @param {Array<string|ObjectId>} input.branchIds — required, ≥1
   * @param {number} input.year
   * @param {number} input.month
   */
  async compareBranches(input = {}) {
    const { branchIds, year, month } = input;
    if (!Array.isArray(branchIds) || branchIds.length === 0) {
      throw new Error('compareBranches: branchIds array (≥1) required');
    }

    // Validate period via the W242 service (single source of truth).
    const ministry = require('./measureMinistryReport.service');
    // _validatePeriod throws on bad input — let it bubble.
    const period = ministry._validatePeriod({ year, month });

    // Generate per-branch in parallel. Per-branch errors are caught
    // and surfaced — they don't abort the whole report.
    const branches = await Promise.all(
      branchIds.map(async branchId => {
        try {
          const r = await ministry.generate(branchId, period);
          if (r && r.error) {
            return {
              branchId: String(branchId),
              branchName: null,
              branchName_ar: null,
              error: r.error,
            };
          }
          // Flatten into the comparison-row shape.
          return {
            branchId: r.branchId,
            branchName: r.branchName,
            branchName_ar: r.branchName_ar,
            beneficiaries: r.beneficiaries,
            administrations: r.administrations,
            outcomes: r.outcomes,
            alerts: r.alerts,
            goals: r.goals,
          };
        } catch (err) {
          return {
            branchId: String(branchId),
            branchName: null,
            branchName_ar: null,
            error: err && err.message ? err.message : 'generate_failed',
          };
        }
      })
    );

    // ─── Period framing (lifted from the first reporting branch) ──
    const first = branches.find(b => !b.error);
    const firstReport = first
      ? await ministry.generate(first.branchId, period).catch(() => null)
      : null;
    const periodBlock =
      firstReport?.period ||
      (() => {
        const { from, to } = ministry._periodBounds(period.year, period.month);
        return {
          year: period.year,
          month: period.month,
          monthName_ar: ministry.MONTH_NAMES_AR[period.month - 1],
          from,
          to,
        };
      })();

    return {
      reportType: REPORT_TYPE,
      reportVersion: REPORT_VERSION,
      generatedAt: new Date(),
      reportLanguage: 'ar',
      period: periodBlock,
      branches,
      organizationTotals: _orgTotals(branches),
      leaderboard: {
        byMcidRate: _rankByDesc(branches, b => b.outcomes?.mcidAchievementRate || 0).map(r => ({
          rank: r.rank,
          branchId: r.branchId,
          branchName_ar: r.branchName_ar,
          rate: r.value,
          pairsAnalysed:
            branches.find(b => b.branchId === r.branchId)?.outcomes?.pairsAnalysed || 0,
        })),
        byActiveAlerts: _rankByAsc(branches, b => b.alerts?.total || 0).map(r => ({
          rank: r.rank,
          branchId: r.branchId,
          branchName_ar: r.branchName_ar,
          alerts: r.value,
        })),
        byGoalsAchievedRate: _rankByDesc(branches, b => b.goals?.achievedRate || 0).map(r => ({
          rank: r.rank,
          branchId: r.branchId,
          branchName_ar: r.branchName_ar,
          rate: r.value,
          achieved: branches.find(b => b.branchId === r.branchId)?.goals?.achieved || 0,
        })),
      },
      signOff: this._composeSignOff(),
    };
  }

  _composeSignOff() {
    return {
      requiresSignature: true,
      signatureFields: [
        { role_ar: 'المدير التنفيذي', signedName: null, signedAt: null },
        { role_ar: 'مدير ضمان الجودة', signedName: null, signedAt: null },
      ],
      note_ar:
        'تقرير مقارن متعدد الفروع — يُقدَّم شهريًا للإدارة التنفيذية ووزارة الموارد البشرية والتنمية الاجتماعية',
    };
  }

  // ─── Pure helpers exposed for tests ───────────────────────────────
  _rankByDesc(branches, valueOf) {
    return _rankByDesc(branches, valueOf);
  }
  _rankByAsc(branches, valueOf) {
    return _rankByAsc(branches, valueOf);
  }
  _orgTotals(branches) {
    return _orgTotals(branches);
  }
}

const svc = new MeasureMinistryComparisonSvc();
module.exports = svc;
module.exports.REPORT_TYPE = REPORT_TYPE;
module.exports.REPORT_VERSION = REPORT_VERSION;

void mongoose;
