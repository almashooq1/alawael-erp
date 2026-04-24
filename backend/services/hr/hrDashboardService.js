/**
 * hrDashboardService.js — Phase 11 Commit 4 (4.0.21).
 *
 * Single-endpoint aggregation over the HR surfaces that Phase 11
 * C1-C3 hardened. Produces the JSON payload consumed by the HR
 * Executive Dashboard UI (not yet built) — until the UI ships,
 * operators curl the endpoint for a single-pane-of-glass view.
 *
 * What this aggregates:
 *
 *   1. Credential health — Certification status counts, EmploymentContract
 *      status counts, employees with expiring SCFHS within 60 days,
 *      employees with expired SCFHS.
 *
 *   2. Workforce integrity — current-year LeaveBalance overflow count
 *      (annual_remaining + carried_over > 45), employees past probation
 *      without a finalized probation review, employees without a
 *      finalized non-probation review in the last 365 days.
 *
 *   3. Active red-flags — rollup of the seven Phase-11 HR flag ids
 *      raised against the state store. Gives the dashboard a direct
 *      link from "how many overflows?" to "which beneficiaries are
 *      affected?"
 *
 * Design decisions:
 *
 *   1. Pure aggregation, read-only. Every field is derived from
 *      indexed queries on the existing collections — no heavy
 *      iteration in Node memory. For a 500-employee org the whole
 *      payload fits in a sub-second response.
 *
 *   2. All models are DEPENDENCY-INJECTED. No module-level requires.
 *      Tests substitute plain stubs; production wires via bootstrap.
 *      Missing models degrade gracefully to `null` per-section —
 *      partial availability is better than 500.
 *
 *   3. Branch scoping is OPTIONAL. Passing `branchId` narrows every
 *      query via `$match: { branch_id }`. Unscoped = cross-branch
 *      totals (HQ HR role). The route layer enforces who may call
 *      which scope.
 *
 *   4. Clock is injected via `now()` to make "last 60 days" windows
 *      testable.
 *
 *   5. Zero-fills all buckets so the UI can render a consistent table
 *      without per-row null checks. An empty database still returns
 *      every section with count: 0.
 */

'use strict';

const MS_PER_DAY = 24 * 3600 * 1000;

// The 7 Phase-11 HR flag ids. Listed here (not derived from the
// registry) so the dashboard's "HR flags" section stays stable even
// if other domains add flags later. Update this list as new HR flags
// ship.
const HR_FLAG_IDS = [
  'operational.therapist.license.expired',
  'operational.therapist.mandatory_cert.expired',
  'operational.employment_contract.expiring.45d',
  'operational.leave_balance.overflow_45d',
  'operational.performance_review.overdue_365d',
  'operational.probation_review.overdue_7d',
  'operational.shift.unassigned_therapist',
];

function createHrDashboardService(deps = {}) {
  const Certification = deps.certificationModel || null;
  const EmploymentContract = deps.employmentContractModel || null;
  const Employee = deps.employeeModel || null;
  const LeaveBalance = deps.leaveBalanceModel || null;
  const PerformanceReview = deps.performanceReviewModel || null;
  const RedFlagState = deps.redFlagStateModel || null;
  const HrChangeRequest = deps.changeRequestModel || null;
  // Phase 11 C20 — anomalies section reads from AuditLog (optional).
  const AuditLog = deps.auditLogModel || null;
  const nowFn = deps.now || (() => new Date());

  function scopedFilter({ branchId, extra }) {
    const filter = { ...(extra || {}) };
    if (branchId) filter.branch_id = branchId;
    return filter;
  }

  async function certificationSection({ branchId, now }) {
    if (Certification == null) return null;
    const [valid, expiringSoon, expired, mandatoryExpired] = await Promise.all([
      Certification.countDocuments(
        scopedFilter({ branchId, extra: { deleted_at: null, status: 'valid' } })
      ),
      Certification.countDocuments(
        scopedFilter({ branchId, extra: { deleted_at: null, status: 'expiring_soon' } })
      ),
      Certification.countDocuments(
        scopedFilter({ branchId, extra: { deleted_at: null, status: 'expired' } })
      ),
      Certification.countDocuments(
        scopedFilter({
          branchId,
          extra: {
            deleted_at: null,
            is_mandatory: true,
            expiry_date: { $lt: now },
          },
        })
      ),
    ]);
    return { valid, expiring_soon: expiringSoon, expired, mandatory_expired: mandatoryExpired };
  }

  async function employmentContractSection({ branchId, now }) {
    if (EmploymentContract == null) return null;
    const horizon45 = new Date(now.getTime() + 45 * MS_PER_DAY);
    const [active, expired, terminated, draft, expiringWithin45d] = await Promise.all([
      EmploymentContract.countDocuments(
        scopedFilter({ branchId, extra: { deleted_at: null, status: 'active' } })
      ),
      EmploymentContract.countDocuments(
        scopedFilter({ branchId, extra: { deleted_at: null, status: 'expired' } })
      ),
      EmploymentContract.countDocuments(
        scopedFilter({ branchId, extra: { deleted_at: null, status: 'terminated' } })
      ),
      EmploymentContract.countDocuments(
        scopedFilter({ branchId, extra: { deleted_at: null, status: 'draft' } })
      ),
      EmploymentContract.countDocuments(
        scopedFilter({
          branchId,
          extra: {
            deleted_at: null,
            status: 'active',
            end_date: { $gte: now, $lte: horizon45, $ne: null },
          },
        })
      ),
    ]);
    return { active, expired, terminated, draft, expiring_within_45d: expiringWithin45d };
  }

  async function scfhsLicenseSection({ branchId, now }) {
    if (Employee == null) return null;
    const horizon60 = new Date(now.getTime() + 60 * MS_PER_DAY);
    const [expired, expiringWithin60d] = await Promise.all([
      Employee.countDocuments(
        scopedFilter({
          branchId,
          extra: { scfhs_expiry: { $lt: now, $ne: null } },
        })
      ),
      Employee.countDocuments(
        scopedFilter({
          branchId,
          extra: {
            scfhs_expiry: { $ne: null, $gte: now, $lte: horizon60 },
          },
        })
      ),
    ]);
    return { expired, expiring_within_60d: expiringWithin60d };
  }

  async function leaveBalanceSection({ branchId, now, overflowThresholdDays = 45 }) {
    if (LeaveBalance == null) return null;
    const year = now.getFullYear();
    // branch_id isn't on LeaveBalance; we'd need to join via employee_id.
    // For now return cross-branch totals (the document doesn't carry a
    // branch scope). If branchId is provided the caller is expected to
    // know this limitation — the returned count is still useful as a
    // global trend indicator.
    const balances = await LeaveBalance.find(
      { year, deleted_at: null },
      'employee_id annual_remaining carried_over_from_last_year'
    ).lean();

    let overflow = 0;
    for (const b of balances) {
      const total = (b.annual_remaining || 0) + (b.carried_over_from_last_year || 0);
      if (total > overflowThresholdDays) overflow += 1;
    }
    return {
      year,
      total_balances: balances.length,
      overflow_count: overflow,
      threshold_days: overflowThresholdDays,
      branch_scoped: false,
    };
  }

  async function probationSection({ branchId, now }) {
    if (Employee == null || PerformanceReview == null) return null;
    const cutoff = new Date(now.getTime() - 7 * MS_PER_DAY);

    const pastProbation = await Employee.find(
      scopedFilter({
        branchId,
        extra: { probation_end_date: { $ne: null, $lte: cutoff } },
      }),
      '_id probation_end_date'
    ).lean();

    if (pastProbation.length === 0) {
      return { past_probation_count: 0, review_overdue_count: 0 };
    }

    let overdue = 0;
    for (const emp of pastProbation) {
      const windowStart = new Date(new Date(emp.probation_end_date).getTime() - 30 * MS_PER_DAY);
      const windowEnd = new Date(new Date(emp.probation_end_date).getTime() + 30 * MS_PER_DAY);
      const found = await PerformanceReview.findOne({
        employee_id: emp._id,
        review_type: 'probation',
        status: 'finalized',
        review_period_end: { $gte: windowStart, $lte: windowEnd },
        deleted_at: null,
      }).lean();
      if (!found) overdue += 1;
    }
    return {
      past_probation_count: pastProbation.length,
      review_overdue_count: overdue,
    };
  }

  async function annualReviewSection({ branchId, now }) {
    if (Employee == null || PerformanceReview == null) return null;
    const freshCutoff = new Date(now.getTime() - 365 * MS_PER_DAY);

    // Population: active employees in scope.
    const activeEmployees = await Employee.distinct(
      '_id',
      scopedFilter({ branchId, extra: { status: { $ne: 'terminated' } } })
    );
    if (activeEmployees.length === 0) {
      return { active_employees: 0, with_fresh_review: 0, overdue: 0 };
    }

    const withFresh = await PerformanceReview.distinct('employee_id', {
      employee_id: { $in: activeEmployees },
      status: 'finalized',
      review_type: { $ne: 'probation' },
      review_period_end: { $gte: freshCutoff },
      deleted_at: null,
    });

    return {
      active_employees: activeEmployees.length,
      with_fresh_review: withFresh.length,
      overdue: activeEmployees.length - withFresh.length,
    };
  }

  async function redFlagsSection({ now }) {
    if (RedFlagState == null) return null;
    const agg = await RedFlagState.aggregate([
      { $match: { status: 'active', flagId: { $in: HR_FLAG_IDS } } },
      { $group: { _id: '$flagId', count: { $sum: 1 } } },
    ]);

    const perFlag = {};
    for (const id of HR_FLAG_IDS) perFlag[id] = 0;
    for (const row of agg) perFlag[row._id] = row.count;

    const total = Object.values(perFlag).reduce((a, b) => a + b, 0);
    return {
      generated_at: now.toISOString(),
      total_active: total,
      per_flag: perFlag,
    };
  }

  /**
   * Change-request analytics (Phase 11 C13).
   *
   *   pending                    active pending-approval count
   *   applied_last_30d           how many approved+applied in window
   *   rejected_last_30d          rejections in window
   *   cancelled_last_30d         requestor-cancelled in window
   *   turnaround_days            P50/P90 for applied-requests in
   *                              window (createdAt → applied_at)
   *   top_rules                  top 5 rule-ids triggered in window
   *                              with their counts
   *
   * Branch scope applies consistently with other sections — sub-HQ
   * callers pass `branchId` and the counts narrow.
   */
  async function changeRequestsSection({ branchId, now }) {
    if (HrChangeRequest == null) return null;
    const since30 = new Date(now.getTime() - 30 * MS_PER_DAY);
    const baseScope = scopedFilter({ branchId, extra: { deleted_at: null } });

    const [pending, applied, rejected, cancelled, topRulesAgg, turnaroundDocs] = await Promise.all([
      HrChangeRequest.countDocuments({ ...baseScope, status: 'pending' }),
      HrChangeRequest.countDocuments({
        ...baseScope,
        status: 'applied',
        applied_at: { $gte: since30 },
      }),
      HrChangeRequest.countDocuments({
        ...baseScope,
        status: 'rejected',
        rejected_at: { $gte: since30 },
      }),
      HrChangeRequest.countDocuments({
        ...baseScope,
        status: 'cancelled',
        updatedAt: { $gte: since30 },
      }),
      HrChangeRequest.aggregate([
        {
          $match: {
            ...baseScope,
            createdAt: { $gte: since30 },
            rules_triggered: { $exists: true, $ne: [] },
          },
        },
        { $unwind: '$rules_triggered' },
        { $group: { _id: '$rules_triggered', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      HrChangeRequest.find(
        {
          ...baseScope,
          status: 'applied',
          applied_at: { $gte: since30, $ne: null },
        },
        'createdAt applied_at'
      ).lean(),
    ]);

    const turnaroundMs = turnaroundDocs
      .map(d => {
        const created = d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt);
        const applied = d.applied_at instanceof Date ? d.applied_at : new Date(d.applied_at);
        if (
          Number.isNaN(created.getTime()) ||
          Number.isNaN(applied.getTime()) ||
          applied < created
        ) {
          return null;
        }
        return applied.getTime() - created.getTime();
      })
      .filter(v => v != null)
      .sort((a, b) => a - b);

    const p50Ms = percentile(turnaroundMs, 0.5);
    const p90Ms = percentile(turnaroundMs, 0.9);

    return {
      pending,
      applied_last_30d: applied,
      rejected_last_30d: rejected,
      cancelled_last_30d: cancelled,
      turnaround_days: {
        count: turnaroundMs.length,
        p50: p50Ms == null ? null : round1(p50Ms / MS_PER_DAY),
        p90: p90Ms == null ? null : round1(p90Ms / MS_PER_DAY),
      },
      top_rules: topRulesAgg.map(r => ({ rule_id: r._id, count: r.count })),
    };
  }

  /**
   * Anomalies section (Phase 11 C20).
   *
   *   recent_count_7d         how many security.suspicious_activity
   *                           events (tagged hr:anomaly) fired in
   *                           the last 7 days
   *   pending_review_count    events with flags.requiresReview still
   *                           truthy (no `reviewed_at`/`reviewResolution`
   *                           marked yet on the doc)
   *   by_reason               { excessive_reads, excessive_exports,
   *                             ... } bucket counts over 7 days
   *   top_flagged_users       top 5 userIds with count + role + reason(s)
   *                           over 7 days
   *   window                  fixed: 7 days, ISO since/until
   *   branch_scoped           false — anomalies are org-wide
   *                           (AuditLog carries no branch_id column)
   */
  async function anomaliesSection({ now }) {
    if (AuditLog == null) return null;
    const since7 = new Date(now.getTime() - 7 * MS_PER_DAY);
    const since30 = new Date(now.getTime() - 30 * MS_PER_DAY);

    const base = {
      eventType: 'security.suspicious_activity',
      tags: { $in: ['hr:anomaly'] },
      createdAt: { $gte: since7 },
    };
    const base30 = { ...base, createdAt: { $gte: since30 } };

    try {
      const [recentCount, pending, byReasonAgg, topAgg, outcomesAgg, turnaroundDocs, reviewerAgg] =
        await Promise.all([
          AuditLog.countDocuments(base),
          AuditLog.countDocuments({
            ...base,
            'flags.requiresReview': true,
          }),
          AuditLog.aggregate([
            { $match: base },
            { $group: { _id: '$metadata.custom.reason', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
          AuditLog.aggregate([
            { $match: base },
            {
              $group: {
                _id: '$userId',
                count: { $sum: 1 },
                userRole: { $last: '$userRole' },
                reasons: { $addToSet: '$metadata.custom.reason' },
                lastSeenAt: { $max: '$createdAt' },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ]),
          // Phase-11 C22 — 30-day outcome breakdown. Looser window than
          // the 7d visibility rollup because ops decisions need enough
          // history to detect threshold-tuning patterns.
          AuditLog.aggregate([
            { $match: base30 },
            {
              $group: {
                _id: {
                  $ifNull: ['$metadata.custom.review.outcome', '__unreviewed__'],
                },
                count: { $sum: 1 },
              },
            },
          ]),
          // Turnaround — only on reviewed rows in the 30d window.
          AuditLog.find(
            {
              ...base30,
              'metadata.custom.review.reviewedAt': { $exists: true, $ne: null },
            },
            'createdAt metadata.custom.review.reviewedAt'
          ).lean(),
          // Phase-11 C25 — per-reviewer 30d breakdown. Groups reviewed
          // rows by `metadata.custom.review.reviewerUserId`, counts
          // total + per-outcome tally + role + last review time. Top 5
          // returned (descending by total).
          AuditLog.aggregate([
            {
              $match: {
                ...base30,
                'metadata.custom.review.reviewerUserId': { $exists: true, $ne: null },
              },
            },
            {
              $group: {
                _id: '$metadata.custom.review.reviewerUserId',
                count: { $sum: 1 },
                reviewerRole: { $last: '$metadata.custom.review.reviewerRole' },
                lastReviewedAt: { $max: '$metadata.custom.review.reviewedAt' },
                confirmedBreach: {
                  $sum: {
                    $cond: [{ $eq: ['$metadata.custom.review.outcome', 'confirmed_breach'] }, 1, 0],
                  },
                },
                falsePositive: {
                  $sum: {
                    $cond: [{ $eq: ['$metadata.custom.review.outcome', 'false_positive'] }, 1, 0],
                  },
                },
                needsInvestigation: {
                  $sum: {
                    $cond: [
                      { $eq: ['$metadata.custom.review.outcome', 'needs_investigation'] },
                      1,
                      0,
                    ],
                  },
                },
                policyException: {
                  $sum: {
                    $cond: [{ $eq: ['$metadata.custom.review.outcome', 'policy_exception'] }, 1, 0],
                  },
                },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ]),
        ]);

      const byReason = {};
      for (const row of byReasonAgg) {
        if (!row._id) continue;
        byReason[row._id] = row.count;
      }

      // Review outcomes — always include all 4 + unreviewed key so UI
      // shape is stable.
      const outcomes = {
        confirmed_breach: 0,
        false_positive: 0,
        needs_investigation: 0,
        policy_exception: 0,
        unreviewed: 0,
      };
      for (const row of outcomesAgg) {
        const key = row._id === '__unreviewed__' ? 'unreviewed' : row._id;
        if (key in outcomes) outcomes[key] = row.count;
      }

      // False-positive rate tuning signal: how often are we flagging
      // legitimate activity? Denominator is decided flags only
      // (unreviewed + needs_investigation + policy_exception excluded).
      const decided = outcomes.confirmed_breach + outcomes.false_positive;
      const falsePositiveRatePct =
        decided > 0 ? round1((outcomes.false_positive / decided) * 100) : null;

      // Avg turnaround hours — createdAt → review.reviewedAt.
      const turnaroundMs = turnaroundDocs
        .map(d => {
          const created = d.createdAt instanceof Date ? d.createdAt : new Date(d.createdAt);
          const reviewed = new Date(d.metadata.custom.review.reviewedAt);
          if (
            Number.isNaN(created.getTime()) ||
            Number.isNaN(reviewed.getTime()) ||
            reviewed < created
          ) {
            return null;
          }
          return reviewed.getTime() - created.getTime();
        })
        .filter(v => v != null);

      const avgTurnaroundHours =
        turnaroundMs.length > 0
          ? round1(turnaroundMs.reduce((a, b) => a + b, 0) / turnaroundMs.length / (60 * 60 * 1000))
          : null;

      const topReviewers = reviewerAgg.map(r => {
        const outcomesBreakdown = {
          confirmed_breach: r.confirmedBreach || 0,
          false_positive: r.falsePositive || 0,
          needs_investigation: r.needsInvestigation || 0,
          policy_exception: r.policyException || 0,
        };
        // Per-reviewer FP rate = FP / (confirmed + FP). Surfaces
        // reviewers whose decision mix drifts from the org baseline.
        // null when no decisive outcomes (parking-only reviewer).
        const decided = outcomesBreakdown.confirmed_breach + outcomesBreakdown.false_positive;
        const fpRate =
          decided > 0 ? round1((outcomesBreakdown.false_positive / decided) * 100) : null;
        return {
          reviewer_user_id: r._id ? String(r._id) : null,
          reviewer_role: r.reviewerRole || null,
          count: r.count,
          outcomes: outcomesBreakdown,
          false_positive_rate_pct: fpRate,
          last_reviewed_at: r.lastReviewedAt || null,
        };
      });

      return {
        window: {
          days: 7,
          since: since7.toISOString(),
          until: now.toISOString(),
        },
        recent_count_7d: recentCount,
        pending_review_count: pending,
        by_reason: byReason,
        top_flagged_users: topAgg.map(u => ({
          user_id: u._id ? String(u._id) : null,
          user_role: u.userRole || null,
          count: u.count,
          reasons: Array.isArray(u.reasons) ? u.reasons.filter(Boolean) : [],
          last_seen_at: u.lastSeenAt || null,
        })),
        review_outcomes_30d: outcomes,
        false_positive_rate_pct: falsePositiveRatePct,
        avg_turnaround_hours: avgTurnaroundHours,
        turnaround_sample_size: turnaroundMs.length,
        top_reviewers_30d: topReviewers,
        branch_scoped: false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Build the full dashboard payload. Every section is independent;
   * a single missing model degrades that section to `null` without
   * breaking the rest.
   */
  async function buildDashboard({ branchId, overflowThresholdDays = 45 } = {}) {
    const now = nowFn();
    const [
      certifications,
      employmentContracts,
      scfhs,
      leaveBalance,
      probation,
      annualReview,
      redFlags,
      changeRequests,
      anomalies,
    ] = await Promise.all([
      certificationSection({ branchId, now }).catch(() => null),
      employmentContractSection({ branchId, now }).catch(() => null),
      scfhsLicenseSection({ branchId, now }).catch(() => null),
      leaveBalanceSection({ branchId, now, overflowThresholdDays }).catch(() => null),
      probationSection({ branchId, now }).catch(() => null),
      annualReviewSection({ branchId, now }).catch(() => null),
      redFlagsSection({ now }).catch(() => null),
      changeRequestsSection({ branchId, now }).catch(() => null),
      anomaliesSection({ now }).catch(() => null),
    ]);

    return {
      generated_at: now.toISOString(),
      scope: branchId ? { branchId: String(branchId) } : { branchId: null },
      sections: {
        certifications,
        employment_contracts: employmentContracts,
        scfhs_licenses: scfhs,
        leave_balance: leaveBalance,
        probation,
        annual_review: annualReview,
        red_flags: redFlags,
        change_requests: changeRequests,
        anomalies,
      },
    };
  }

  return Object.freeze({ buildDashboard, HR_FLAG_IDS });
}

// Percentile on a SORTED-ascending array of numbers. Linear
// interpolation between neighbors. Returns null for empty input.
function percentile(sorted, p) {
  if (!Array.isArray(sorted) || sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

module.exports = { createHrDashboardService, HR_FLAG_IDS };
