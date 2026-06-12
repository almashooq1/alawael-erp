'use strict';

/**
 * review-cadence.routes.js — W1249 (لوحة المراجعات الدورية المستحقة).
 *
 * AUDIT FINDING (2026-06-12): the review-cadence ENFORCEMENT already exists —
 * CarePlanVersion.reviewSchedule { nextReviewAt, cadenceWeeks } + the W50
 * overdue scanner (intelligence/care-plan-overdue-review.scanner.js) which
 * emits escalating notifications per care-planning.registry NOTIFICATION_SLA.
 * What was MISSING is a manager-facing API: "which plans are due/overdue for
 * review in MY branch, how badly, and what is the cadence health overall?"
 *
 * This surface is the read-only board over the same source of truth:
 *   GET /due    — plans due within a horizon (+ already overdue), severity-
 *                 classified with the SAME thresholds the W50 scanner uses
 *                 (info 0–1d, warning 2–13d, critical 14d+).
 *   GET /stats  — branch-scoped cadence health: counts by severity bucket,
 *                 due-soon pipeline, and plans with no schedule at all.
 *
 * READ-ONLY by design: scheduling mutations belong to the care-planning
 * surface; notification side-effects belong to the W50 scanner.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const reg = require('../intelligence/care-planning.registry');

router.use(authenticateToken);
router.use(requireBranchAccess);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'therapist',
  'quality',
];

/** Mirrors the W50 scanner's eligibility set (plans in live, reviewable states). */
const ELIGIBLE_STATUSES = Object.freeze([
  'approved',
  'saved_to_record',
  'family_notification_sent',
]);

const DAY_MS = 24 * 3600 * 1000;

/** Lazy model lookup — returns null when the model is not registered. */
function tryModel(name) {
  try {
    return mongoose.model(name);
  } catch (_e) {
    return null;
  }
}

/**
 * Severity classification — SAME thresholds as the W50 scanner
 * (care-planning.registry NOTIFICATION_SLA), kept in sync by the W1249
 * drift guard:
 *   daysOverdue < OVERDUE_REVIEW_DAYS           → 'info'
 *   daysOverdue < OVERDUE_REVIEW_CRITICAL_DAYS  → 'warning'
 *   otherwise                                   → 'critical'
 */
function classifySeverity(daysOverdue) {
  if (daysOverdue < 0) return 'upcoming';
  if (daysOverdue < reg.NOTIFICATION_SLA.OVERDUE_REVIEW_DAYS) return 'info';
  if (daysOverdue < reg.NOTIFICATION_SLA.OVERDUE_REVIEW_CRITICAL_DAYS) return 'warning';
  return 'critical';
}

const SEVERITY_LABELS_AR = Object.freeze({
  upcoming: 'قادمة خلال الأفق',
  info: 'مستحقة اليوم',
  warning: 'متأخرة (٢–١٣ يوماً)',
  critical: 'متأخرة حرجة (١٤+ يوماً)',
});

// ── GET /due — review board (due within horizon + already overdue) ──
router.get('/due', requireRole(READ_ROLES), async (req, res) => {
  try {
    const CarePlanVersion = tryModel('CarePlanVersion');
    if (!CarePlanVersion) {
      return res.status(503).json({ success: false, message: 'CarePlanVersion model unavailable' });
    }

    const horizonDays = Math.min(
      Math.max(parseInt(String(req.query.horizonDays ?? '14'), 10) || 14, 0),
      90
    );
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '200'), 10) || 200, 1), 500);
    const now = Date.now();
    const horizonEnd = new Date(now + horizonDays * DAY_MS);

    const rows = await CarePlanVersion.find({
      ...branchFilter(req),
      status: { $in: ELIGIBLE_STATUSES },
      'reviewSchedule.nextReviewAt': { $ne: null, $lte: horizonEnd },
    })
      .select('beneficiaryId branchId status reviewSchedule version createdAt')
      .sort({ 'reviewSchedule.nextReviewAt': 1 })
      .limit(limit)
      .populate('beneficiaryId', 'nameAr nameEn nationalId')
      .lean();

    const items = rows.map(p => {
      const nextAt = p.reviewSchedule && p.reviewSchedule.nextReviewAt;
      const daysOverdue = nextAt ? Math.floor((now - new Date(nextAt).getTime()) / DAY_MS) : null;
      const severity = daysOverdue == null ? 'upcoming' : classifySeverity(daysOverdue);
      const ben = p.beneficiaryId && typeof p.beneficiaryId === 'object' ? p.beneficiaryId : null;
      return {
        planVersionId: p._id,
        beneficiaryId: ben ? ben._id : p.beneficiaryId,
        beneficiaryNameAr: ben ? ben.nameAr || null : null,
        planStatus: p.status,
        planVersion: p.version != null ? p.version : null,
        nextReviewAt: nextAt || null,
        cadenceWeeks: (p.reviewSchedule && p.reviewSchedule.cadenceWeeks) || null,
        daysOverdue,
        severity,
        severityLabelAr: SEVERITY_LABELS_AR[severity] || severity,
      };
    });

    return res.json({ success: true, data: { horizonDays, count: items.length, items } });
  } catch (err) {
    return res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── GET /stats — branch-scoped cadence health ────────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const CarePlanVersion = tryModel('CarePlanVersion');
    if (!CarePlanVersion) {
      return res.status(503).json({ success: false, message: 'CarePlanVersion model unavailable' });
    }

    const bFilter = branchFilter(req);
    const now = new Date();
    const infoEnd = new Date(now.getTime() - reg.NOTIFICATION_SLA.OVERDUE_REVIEW_DAYS * DAY_MS);
    const criticalEnd = new Date(
      now.getTime() - reg.NOTIFICATION_SLA.OVERDUE_REVIEW_CRITICAL_DAYS * DAY_MS
    );
    const dueSoonEnd = new Date(now.getTime() + 14 * DAY_MS);
    const eligible = { ...bFilter, status: { $in: ELIGIBLE_STATUSES } };

    const [eligibleTotal, unscheduled, dueSoon, overdueInfo, overdueWarning, overdueCritical] =
      await Promise.all([
        CarePlanVersion.countDocuments(eligible),
        CarePlanVersion.countDocuments({ ...eligible, 'reviewSchedule.nextReviewAt': null }),
        CarePlanVersion.countDocuments({
          ...eligible,
          'reviewSchedule.nextReviewAt': { $gt: now, $lte: dueSoonEnd },
        }),
        CarePlanVersion.countDocuments({
          ...eligible,
          'reviewSchedule.nextReviewAt': { $lte: now, $gt: infoEnd },
        }),
        CarePlanVersion.countDocuments({
          ...eligible,
          'reviewSchedule.nextReviewAt': { $lte: infoEnd, $gt: criticalEnd },
        }),
        CarePlanVersion.countDocuments({
          ...eligible,
          'reviewSchedule.nextReviewAt': { $lte: criticalEnd },
        }),
      ]);

    const overdueTotal = overdueInfo + overdueWarning + overdueCritical;
    const scheduled = eligibleTotal - unscheduled;
    const onSchedulePct =
      scheduled > 0 ? Math.round(((scheduled - overdueTotal) / scheduled) * 100) : null;

    return res.json({
      success: true,
      data: {
        eligibleTotal,
        unscheduled,
        dueSoon14d: dueSoon,
        overdue: {
          info: overdueInfo,
          warning: overdueWarning,
          critical: overdueCritical,
          total: overdueTotal,
        },
        onSchedulePct,
        sla: {
          infoDays: reg.NOTIFICATION_SLA.OVERDUE_REVIEW_DAYS,
          criticalDays: reg.NOTIFICATION_SLA.OVERDUE_REVIEW_CRITICAL_DAYS,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
