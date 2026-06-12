'use strict';

/**
 * beneficiary-journey.routes.js — W1247 (رحلة المستفيد 360).
 *
 * READ-ONLY aggregator that answers one question in a single call:
 * "أين يقف المستفيد في رحلته التأهيلية الآن؟"
 *
 * AUDIT FINDING (2026-06-12): the beneficiary lifecycle ALREADY exists in
 * two complementary layers — do NOT build a third state machine:
 *   1. ADMINISTRATIVE — intelligence/beneficiary-lifecycle.registry.js (W39/
 *      W581): 11 states (draft→waitlisted→active→…→discharged/deceased/
 *      archived/deleted) + approval workflow on Beneficiary.status.
 *   2. CLINICAL — domains/episodes EpisodeOfCare.currentPhase: 12 phases
 *      (referral→intake→triage→initial_assessment→mdt_review→
 *      care_plan_approval→active_treatment→reassessment→outcome_review→
 *      discharge_planning→discharge→post_discharge_followup).
 *
 * This surface STITCHES those layers (plus CarePlanVersion, TransitionPlan,
 * PostRehabCase) into one composite snapshot. Zero writes; every sub-fetch
 * degrades gracefully when its model is not registered (W348 pattern).
 *
 * Endpoints:
 *   GET /by-beneficiary/:beneficiaryId — full journey snapshot (W269 Layer B)
 *   GET /stats                         — branch-scoped stage distribution
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { enforceBeneficiaryBranch } = require('../middleware/assertBranchMatch');

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
  'teacher',
  'social_worker',
  'parent',
  'guardian',
  'quality',
];

/** Lazy model lookup — returns null when the model is not registered. */
function tryModel(name) {
  try {
    return mongoose.model(name);
  } catch (_e) {
    return null;
  }
}

/** Arabic labels for the EpisodeOfCare clinical phases (display aid). */
const PHASE_LABELS_AR = Object.freeze({
  referral: 'الإحالة',
  intake: 'الاستقبال والتسجيل',
  triage: 'الفرز الأولي',
  initial_assessment: 'التقييم الشامل الأولي',
  mdt_review: 'مراجعة الفريق متعدد التخصصات',
  care_plan_approval: 'اعتماد الخطة الفردية',
  active_treatment: 'التدخل العلاجي النشط',
  reassessment: 'إعادة التقييم الدوري',
  outcome_review: 'مراجعة النتائج',
  discharge_planning: 'التخطيط للخروج',
  discharge: 'الخروج',
  post_discharge_followup: 'المتابعة بعد الخروج',
});

/** Arabic labels for the administrative lifecycle states (W39/W581). */
const LIFECYCLE_LABELS_AR = Object.freeze({
  draft: 'مسودة (ما قبل القبول)',
  waitlisted: 'على قائمة الانتظار',
  active: 'نشط (يتلقى الخدمات)',
  suspended: 'موقوف مؤقتاً',
  'transferred-pending': 'نقل قيد الاعتماد',
  transferred: 'منقول لفرع آخر',
  discharged: 'مُخرَّج',
  deceased: 'متوفى',
  archived: 'مؤرشف',
  'deletion-pending': 'حذف قيد الاعتماد',
  deleted: 'محذوف',
});

/**
 * Derive the composite journey stage shown to staff/family: the
 * administrative state wins for every non-active state; while ACTIVE,
 * the clinical episode phase is the meaningful stage.
 */
function deriveJourneyStage(lifecycleStatus, episodePhase) {
  if (lifecycleStatus !== 'active') {
    return {
      key: lifecycleStatus || 'unknown',
      labelAr: LIFECYCLE_LABELS_AR[lifecycleStatus] || 'غير معروف',
      layer: 'administrative',
    };
  }
  if (episodePhase && PHASE_LABELS_AR[episodePhase]) {
    return { key: episodePhase, labelAr: PHASE_LABELS_AR[episodePhase], layer: 'clinical' };
  }
  return { key: 'active', labelAr: LIFECYCLE_LABELS_AR.active, layer: 'administrative' };
}

// ── GET /stats — branch-scoped stage distribution ────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const bFilter = branchFilter(req);
    const Beneficiary = tryModel('Beneficiary');
    const Episode = tryModel('EpisodeOfCare');

    const [lifecycleAgg, phaseAgg] = await Promise.all([
      Beneficiary
        ? Beneficiary.aggregate([
            { $match: { ...bFilter } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ])
        : [],
      Episode
        ? Episode.aggregate([
            { $match: { ...bFilter, status: { $nin: ['closed', 'cancelled'] } } },
            { $group: { _id: '$currentPhase', count: { $sum: 1 } } },
          ])
        : [],
    ]);

    const byLifecycle = {};
    for (const row of lifecycleAgg) {
      if (!row._id) continue;
      byLifecycle[row._id] = { count: row.count, labelAr: LIFECYCLE_LABELS_AR[row._id] || row._id };
    }
    const byClinicalPhase = {};
    for (const row of phaseAgg) {
      if (!row._id) continue;
      byClinicalPhase[row._id] = { count: row.count, labelAr: PHASE_LABELS_AR[row._id] || row._id };
    }

    return res.json({ success: true, data: { byLifecycle, byClinicalPhase } });
  } catch (err) {
    return res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── GET /by-beneficiary/:beneficiaryId — full journey snapshot ───────
router.get('/by-beneficiary/:beneficiaryId', requireRole(READ_ROLES), async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!mongoose.isValidObjectId(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'معرّف المستفيد غير صالح' });
    }

    // W269 Layer B — throws 403/404 on cross-branch mismatch (guard only;
    // returns undefined for unrestricted callers, so load the doc ourselves).
    await enforceBeneficiaryBranch(req, beneficiaryId);

    const Beneficiary = tryModel('Beneficiary');
    const beneficiary = Beneficiary
      ? await Beneficiary.findById(beneficiaryId).select('status branchId').lean()
      : null;
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }

    const Transition = tryModel('BeneficiaryLifecycleTransition');
    const Episode = tryModel('EpisodeOfCare');
    // W1277 — the canonical UnifiedCarePlan FIRST (ADR-041); the legacy
    // CarePlanVersion stays as fallback during the retirement window.
    const UnifiedPlan = tryModel('UnifiedCarePlan');
    const CarePlan = tryModel('CarePlanVersion');
    const TransitionPlan = tryModel('TransitionPlan');
    const PostRehabCase = tryModel('PostRehabCase');

    const settled = await Promise.allSettled([
      Transition
        ? Transition.find({ beneficiaryId }).sort({ requestedAt: -1 }).limit(10).lean()
        : Promise.resolve(null),
      Episode
        ? Episode.findOne({ beneficiaryId }).sort({ createdAt: -1 }).lean()
        : Promise.resolve(null),
      // W1277: unified first, legacy fallback inside one settled slot
      (async () => {
        if (UnifiedPlan) {
          const u = await UnifiedPlan.findOne({
            beneficiaryId,
            isDeleted: { $ne: true },
            status: { $in: ['draft', 'pending_approval', 'active', 'under_review'] },
          })
            .sort({ createdAt: -1 })
            .lean();
          if (u) return { ...u, __source: 'unified' };
        }
        if (!CarePlan) return null;
        const legacy = await CarePlan.findOne({ beneficiaryId }).sort({ createdAt: -1 }).lean();
        return legacy ? { ...legacy, __source: 'legacy' } : null;
      })(),
      TransitionPlan
        ? TransitionPlan.findOne({ beneficiaryId }).sort({ createdAt: -1 }).lean()
        : Promise.resolve(null),
      PostRehabCase
        ? PostRehabCase.findOne({ beneficiary: beneficiaryId }).sort({ createdAt: -1 }).lean()
        : Promise.resolve(null),
    ]);

    const [transitions, episode, carePlan, transitionPlan, postRehab] = settled.map(s =>
      s.status === 'fulfilled' ? s.value : null
    );

    const lifecycleStatus = beneficiary.status || null;
    const journeyStage = deriveJourneyStage(lifecycleStatus, episode && episode.currentPhase);

    return res.json({
      success: true,
      data: {
        beneficiaryId,
        journeyStage,
        lifecycle: {
          status: lifecycleStatus,
          labelAr: LIFECYCLE_LABELS_AR[lifecycleStatus] || null,
          recentTransitions: Array.isArray(transitions)
            ? transitions.map(t => ({
                id: t._id,
                transitionId: t.transitionId || t.type || null,
                status: t.status || null,
                requestedAt: t.requestedAt || t.createdAt || null,
              }))
            : [],
        },
        clinicalEpisode: episode
          ? {
              id: episode._id,
              status: episode.status || null,
              currentPhase: episode.currentPhase || null,
              currentPhaseLabelAr: PHASE_LABELS_AR[episode.currentPhase] || null,
              phaseCount: Array.isArray(episode.phases) ? episode.phases.length : 0,
              completedPhases: Array.isArray(episode.phases)
                ? episode.phases.filter(p => p.status === 'completed').length
                : 0,
            }
          : null,
        carePlan: carePlan
          ? {
              id: carePlan._id,
              status: carePlan.status || null,
              version: carePlan.version || carePlan.versionNumber || null,
              updatedAt: carePlan.updatedAt || null,
              source: carePlan.__source || 'legacy', // W1277
              titleAr: carePlan.title_ar || null,
              // W1259 family version — staff preview of what the family sees
              familyVersion: (carePlan.familyVersion && carePlan.familyVersion.body) || null,
            }
          : null,
        transitionPlan: transitionPlan
          ? {
              id: transitionPlan._id,
              transitionType: transitionPlan.transitionType || null,
              status: transitionPlan.status || null,
              compositeScore:
                transitionPlan.compositeScore != null ? transitionPlan.compositeScore : null,
            }
          : null,
        postRehab: postRehab ? { id: postRehab._id, status: postRehab.status || null } : null,
      },
    });
  } catch (err) {
    if (err && (err.statusCode === 403 || err.status === 403)) {
      return res
        .status(403)
        .json({ success: false, message: 'لا تملك صلاحية على فرع هذا المستفيد' });
    }
    if (err && (err.statusCode === 404 || err.status === 404)) {
      return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    }
    return res.status(500).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
