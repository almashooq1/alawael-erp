'use strict';

/**
 * assessmentRecommendation.routes.js — Wave 206
 *
 * Endpoints for the assessment→program smart engine:
 *
 *   POST /recommend         — dry-run: returns the recommendation
 *                             bundle without writing anything
 *   POST /recommend/accept  — creates SmartGoal docs + CarePlan
 *                             from a previously-generated bundle
 *
 * Both routes are authenticated upstream via dualMountAuth in
 * routes/_registry.js. They touch beneficiary clinical data and
 * must never run unauthenticated.
 *
 * The engine is deterministic; the LLM refiner is opt-in (env
 * ASSESSMENT_LLM_ENABLED=true + a bound Anthropic client at app
 * startup). When disabled, /recommend returns the raw engine output.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const engine = require('../services/assessmentRecommendationEngine.service');
const llmModule = require('../services/assessmentRecommendationLlm.service');
const createReassessmentSweeper = require('../services/assessmentReassessmentSweeper.service');
const createBundleAnalytics = require('../services/assessmentBundleAnalytics.service');
const createBundleOutcomes = require('../services/assessmentBundleOutcomes.service');
const {
  enforceBeneficiaryBranch,
  effectiveBranchScope,
  bodyScopedBeneficiaryGuard,
} = require('../middleware/assertBranchMatch');
// W442: router-level defense-in-depth — the per-callsite
// enforceBeneficiaryBranch calls on /accept (line 236) + the 3 below
// stay as primary guards; this one auto-fires when a future endpoint
// reads req.body.beneficiaryId (or any of the 3 canonical FK forms)
// without a per-callsite call. No-op for the dry-run /recommend which
// passes `beneficiary` as a context object (auto-skipped by ObjectId
// regex check inside the guard).
router.use(bodyScopedBeneficiaryGuard);
const safeError = require('../utils/safeError');

// Register the bundle model so `mongoose.model('AssessmentRecommendationBundle')`
// resolves regardless of which path first touches the route.
require('../models/AssessmentRecommendationBundle');

// Lazy-built sweeper — needs models registered, which happens by the
// time the first request fires.
let cachedSweeper = null;
function getSweeper() {
  if (cachedSweeper) return cachedSweeper;
  try {
    cachedSweeper = createReassessmentSweeper({
      SmartGoal: mongoose.model('SmartGoal'),
      AssessmentRecommendationBundle: mongoose.model('AssessmentRecommendationBundle'),
    });
    return cachedSweeper;
  } catch {
    return null;
  }
}

let cachedAnalytics = null;
function getAnalytics() {
  if (cachedAnalytics) return cachedAnalytics;
  try {
    cachedAnalytics = createBundleAnalytics({
      AssessmentRecommendationBundle: mongoose.model('AssessmentRecommendationBundle'),
    });
    return cachedAnalytics;
  } catch {
    return null;
  }
}

let cachedOutcomes = null;
function getOutcomes() {
  if (cachedOutcomes) return cachedOutcomes;
  try {
    cachedOutcomes = createBundleOutcomes({
      AssessmentRecommendationBundle: mongoose.model('AssessmentRecommendationBundle'),
    });
    return cachedOutcomes;
  } catch {
    return null;
  }
}

// LLM refiner is bound once at module load. If no Anthropic client
// has been registered on the global app context, the factory returns
// null and we serve deterministic-only output.
let cachedRefiner = null;
function getRefiner() {
  if (cachedRefiner !== null) return cachedRefiner;
  // Look up the client from a known mount point — apps wire this at
  // boot via `app.locals.anthropicClient = ...`. Fall back to null.
  const client = router.__anthropicClient || null;
  if (!client) {
    cachedRefiner = false; // sentinel: tried, no client available
    return null;
  }
  cachedRefiner = llmModule.buildLlmRefiner({ anthropicClient: client });
  return cachedRefiner || null;
}

/**
 * Test hook — allow integration tests to inject a mock client.
 * Not used in production code.
 */
router.__setAnthropicClient = function (client) {
  router.__anthropicClient = client;
  cachedRefiner = null;
};

// ─── Validation helpers ────────────────────────────────────────

const ALLOWED_MEASURE_KEYS = new Set([
  'GMFCS',
  'FIM',
  'WeeFIM',
  'MACS',
  'BergBalance',
  'CFCS',
  'SCQ',
  'CARS2',
  'Vineland3',
  'PedsQL',
  'CSI',
]);

function validateBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return { ok: false, errors: ['body_required'] };
  }
  const beneficiary = body.beneficiary || {};
  const scores = Array.isArray(body.scores) ? body.scores : [];

  if (typeof beneficiary.age !== 'number' || beneficiary.age < 0 || beneficiary.age > 120) {
    errors.push('beneficiary.age must be a number between 0 and 120');
  }
  if (!Array.isArray(scores) || scores.length === 0) {
    errors.push('scores must be a non-empty array');
  }
  for (const [i, s] of scores.entries()) {
    if (!s || typeof s !== 'object') {
      errors.push(`scores[${i}] must be an object`);
      continue;
    }
    if (!ALLOWED_MEASURE_KEYS.has(s.measureKey)) {
      errors.push(`scores[${i}].measureKey "${s.measureKey}" not supported`);
    }
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

// ─── POST /recommend (dry-run) ────────────────────────────────

router.post('/recommend', async (req, res) => {
  try {
    const v = validateBody(req.body);
    if (!v.ok) {
      return res.status(400).json({
        success: false,
        message: 'invalid_input',
        details: v.errors,
      });
    }

    const bundle = engine.recommend({
      beneficiary: req.body.beneficiary,
      scores: req.body.scores,
    });

    // Optionally polish Arabic phrasing through Claude Haiku
    const refiner = getRefiner();
    if (refiner && bundle.suggestedGoals.length > 0 && req.body.refine !== false) {
      try {
        bundle.suggestedGoals = await refiner.refineGoals(bundle.suggestedGoals);
        bundle.refinedByLlm = true;
      } catch (err) {
        // Fail-open — refiner never throws but be paranoid
        bundle.refinedByLlm = false;
        bundle.refinerError = err.message;
      }
    } else {
      bundle.refinedByLlm = false;
    }

    return res.json({ success: true, data: bundle });
  } catch (err) {
    return safeError(res, err, 'assessment_recommend_failed');
  }
});

// ─── POST /recommend/accept (materialise into SmartGoal + CarePlan) ──

/**
 * Accepts a recommendation bundle + a beneficiaryId. Persists:
 *
 *   1. One SmartGoal doc per accepted goal (status='active')
 *   2. One CarePlan doc with goals grouped into therapeutic domains
 *
 * The bundle is NOT re-generated server-side — the client passes
 * back the bundle they saw, possibly after pruning some goals.
 * This preserves user agency: therapist reviews + selects, never
 * a black-box auto-apply.
 *
 * Body shape:
 *   {
 *     beneficiaryId: "...",
 *     therapistId:   "...",     // optional — defaults to req.user
 *     acceptedGoals: [...],     // subset of bundle.suggestedGoals
 *     acceptedPrograms: [...],  // subset of bundle.suggestedPrograms
 *     planNumber:    "...",     // optional; auto-generated otherwise
 *     branchId:      "..."
 *   }
 */
router.post('/recommend/accept', async (req, res) => {
  try {
    const {
      beneficiaryId,
      therapistId,
      acceptedGoals = [],
      acceptedPrograms = [],
      planNumber,
      branchId,
    } = req.body || {};

    if (!beneficiaryId || !mongoose.Types.ObjectId.isValid(beneficiaryId)) {
      return res.status(400).json({ success: false, message: 'beneficiaryId required (ObjectId)' });
    }
    if (!Array.isArray(acceptedGoals) || acceptedGoals.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'acceptedGoals must be a non-empty array' });
    }

    // W269f: enforce branch ownership before creating SmartGoal +
    // CarePlan tagged to the supplied beneficiaryId.
    try {
      await enforceBeneficiaryBranch(req, beneficiaryId);
    } catch (err) {
      if (err.status === 403) {
        return res.status(403).json({ success: false, message: err.message });
      }
      if (err.status === 404) {
        return res.status(404).json({ success: false, message: err.message });
      }
      throw err;
    }

    const SmartGoal = mongoose.model('SmartGoal');
    const CarePlan = mongoose.model('CarePlan');

    const effectiveTherapist =
      therapistId && mongoose.Types.ObjectId.isValid(therapistId)
        ? new mongoose.Types.ObjectId(therapistId)
        : req.user && req.user._id
          ? req.user._id
          : null;

    // 1. Create one SmartGoal per accepted goal
    const goalDocs = acceptedGoals.map(g => ({
      therapist: effectiveTherapist,
      beneficiary: new mongoose.Types.ObjectId(beneficiaryId),
      branch:
        branchId && mongoose.Types.ObjectId.isValid(branchId)
          ? new mongoose.Types.ObjectId(branchId)
          : null,
      title: g.title,
      specific: g.specific,
      measurable: g.measurable,
      achievable: g.achievable,
      relevant: g.relevant,
      timeBoundDate: g.timeBoundDays
        ? new Date(Date.now() + g.timeBoundDays * 24 * 60 * 60 * 1000)
        : null,
      status: 'active',
    }));
    const createdGoals = await SmartGoal.insertMany(goalDocs);

    // 2. Build a CarePlan grouping the goals by domain → therapeutic section
    const domainToSection = {
      motor: 'physical',
      self_care: 'occupational',
      communication: 'speech',
      cognitive: 'psychological',
      behavior: 'behavioral',
      social: 'psychological',
      adaptive: 'occupational',
    };

    const therapeuticDomains = {};
    for (const g of acceptedGoals) {
      const section = domainToSection[g.domain] || 'psychological';
      if (!therapeuticDomains[section]) {
        therapeuticDomains[section] = {
          assessments: g.evidence ? [...new Set(g.evidence.map(e => e.measureKey))] : [],
          goals: [],
          frequency: null,
          notes: null,
        };
      }
      therapeuticDomains[section].goals.push({
        title: g.title,
        description: `${g.specific}\n${g.measurable}`,
        type: mapDomainToCarePlanGoalType(g.domain),
        baseline: g.baseline,
        target: g.specific,
        criteria: g.measurable,
        startDate: new Date(),
        targetDate: g.timeBoundDays
          ? new Date(Date.now() + g.timeBoundDays * 24 * 60 * 60 * 1000)
          : null,
        status: 'IN_PROGRESS',
        progress: 0,
      });
    }

    // Attach session frequencies from accepted programs by modality
    const modalityToSection = {
      pt: 'physical',
      ot: 'occupational',
      slp: 'speech',
      aba: 'behavioral',
      psych: 'psychological',
      aac: 'speech',
      group: 'psychological',
      parent_training: 'psychological',
    };
    for (const p of acceptedPrograms) {
      const section = modalityToSection[p.modality] || 'psychological';
      if (therapeuticDomains[section]) {
        const sessions = p.recommendedSessionsPerWeek;
        therapeuticDomains[section].frequency = therapeuticDomains[section].frequency
          ? `${therapeuticDomains[section].frequency} + ${sessions}/أسبوع (${p.nameAr})`
          : `${sessions} جلسات/أسبوع — ${p.nameAr}`;
      }
    }

    const carePlanDoc = new CarePlan({
      beneficiary: new mongoose.Types.ObjectId(beneficiaryId),
      planNumber: planNumber || `CP-W206-${Date.now()}`,
      startDate: new Date(),
      reviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'DRAFT',
      requiresSignature: true,
      therapeutic: {
        enabled: true,
        domains: therapeuticDomains,
      },
    });
    await carePlanDoc.save();

    // W206d — persist the bundle for history view (best-effort, never blocks)
    let bundleId = null;
    try {
      const BundleModel = mongoose.model('AssessmentRecommendationBundle');
      const bundleDoc = await BundleModel.create({
        beneficiary: new mongoose.Types.ObjectId(beneficiaryId),
        therapist: effectiveTherapist,
        branch:
          branchId && mongoose.Types.ObjectId.isValid(branchId)
            ? new mongoose.Types.ObjectId(branchId)
            : null,
        scoresInput: req.body.scoresInput || null,
        beneficiaryContext: req.body.beneficiaryContext || null,
        bundle: req.body.bundle || {
          acceptedGoals,
          acceptedPrograms,
        },
        acceptedGoalCount: createdGoals.length,
        acceptedProgramCount: acceptedPrograms.length,
        createdGoalIds: createdGoals.map(g => g._id),
        carePlan: carePlanDoc._id,
        engineVersion: req.body.engineVersion || 'w206.1',
        refinedByLlm: Boolean(req.body.refinedByLlm),
        overallConfidence: req.body.overallConfidence || 'needs_therapist_review',
      });
      bundleId = bundleDoc._id;
    } catch (bundleErr) {
      // History is convenience, not core — log + continue
      if (req.log && req.log.warn) {
        req.log.warn(`[w206d] bundle persistence failed: ${bundleErr.message}`);
      }
    }

    return res.json({
      success: true,
      data: {
        createdGoalIds: createdGoals.map(g => g._id),
        carePlanId: carePlanDoc._id,
        carePlanNumber: carePlanDoc.planNumber,
        goalCount: createdGoals.length,
        bundleId,
      },
    });
  } catch (err) {
    return safeError(res, err, 'assessment_recommend_accept_failed');
  }
});

// ─── GET /history/:beneficiaryId — Wave 206d ──────────────────

router.get('/history/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    const { limit = 20, skip = 0 } = req.query;
    if (!mongoose.Types.ObjectId.isValid(beneficiaryId)) {
      return res
        .status(400)
        .json({ success: false, message: 'beneficiaryId must be a valid ObjectId' });
    }
    // W269f
    try {
      await enforceBeneficiaryBranch(req, beneficiaryId);
    } catch (err) {
      if (err.status === 403) {
        return res.status(403).json({ success: false, message: err.message });
      }
      if (err.status === 404) {
        return res.status(404).json({ success: false, message: err.message });
      }
      throw err;
    }
    const BundleModel = mongoose.model('AssessmentRecommendationBundle');
    const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skp = Math.max(Number(skip) || 0, 0);

    const [items, total] = await Promise.all([
      BundleModel.find({ beneficiary: beneficiaryId })
        .sort({ createdAt: -1 })
        .limit(lim)
        .skip(skp)
        .lean(),
      BundleModel.countDocuments({ beneficiary: beneficiaryId }),
    ]);

    return res.json({
      success: true,
      data: {
        items: items.map(b => ({
          _id: b._id,
          createdAt: b.createdAt,
          therapist: b.therapist,
          acceptedGoalCount: b.acceptedGoalCount,
          acceptedProgramCount: b.acceptedProgramCount,
          carePlan: b.carePlan,
          createdGoalIds: b.createdGoalIds,
          engineVersion: b.engineVersion,
          refinedByLlm: b.refinedByLlm,
          overallConfidence: b.overallConfidence,
          scoresInput: b.scoresInput,
          // bundle is large — only include on detail fetch
        })),
        total,
        limit: lim,
        skip: skp,
      },
    });
  } catch (err) {
    return safeError(res, err, 'assessment_history_failed');
  }
});

// ─── GET /analytics — Wave 206f ───────────────────────────────
//
// Aggregations over persisted bundles. Supports ?from + ?to ISO
// dates, ?therapistId, ?branchId filters. Defaults to last 30 days.

router.get('/analytics', async (req, res) => {
  try {
    const analytics = getAnalytics();
    if (!analytics) {
      return res.status(503).json({ success: false, message: 'analytics_unavailable' });
    }
    const opts = {};
    if (req.query.from) opts.from = req.query.from;
    if (req.query.to) opts.to = req.query.to;
    if (req.query.therapistId && mongoose.Types.ObjectId.isValid(req.query.therapistId)) {
      opts.therapistId = new mongoose.Types.ObjectId(req.query.therapistId);
    }
    // W269f: force branchId to caller's own when restricted, ignoring
    // user-supplied query input. Cross-branch role honours the query.
    const callerBranch = effectiveBranchScope(req);
    if (callerBranch && mongoose.Types.ObjectId.isValid(callerBranch)) {
      opts.branchId = new mongoose.Types.ObjectId(callerBranch);
    } else if (req.query.branchId && mongoose.Types.ObjectId.isValid(req.query.branchId)) {
      opts.branchId = new mongoose.Types.ObjectId(req.query.branchId);
    }
    const report = await analytics.getReport(opts);
    return res.json({ success: true, data: report });
  } catch (err) {
    return safeError(res, err, 'assessment_analytics_failed');
  }
});

// ─── GET /outcomes/:beneficiaryId — Wave 207 ──────────────────
//
// Returns per-measure timelines + first→latest deltas computed
// from this beneficiary's persisted bundle history. Answers "did
// the engine's interventions move the measure?" — complementary
// to W206f analytics ("did therapists accept the suggestions?").

router.get('/outcomes/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(beneficiaryId)) {
      return res
        .status(400)
        .json({ success: false, message: 'beneficiaryId must be a valid ObjectId' });
    }
    // W269f
    try {
      await enforceBeneficiaryBranch(req, beneficiaryId);
    } catch (err) {
      if (err.status === 403) {
        return res.status(403).json({ success: false, message: err.message });
      }
      if (err.status === 404) {
        return res.status(404).json({ success: false, message: err.message });
      }
      throw err;
    }
    const outcomes = getOutcomes();
    if (!outcomes) {
      return res.status(503).json({ success: false, message: 'outcomes_unavailable' });
    }
    const report = await outcomes.getOutcomeReport(beneficiaryId);
    return res.json({ success: true, data: report });
  } catch (err) {
    return safeError(res, err, 'assessment_outcomes_failed');
  }
});

// ─── GET /reassessment-due/count — Wave 206g ──────────────────
//
// Lightweight summary-only endpoint for sidebar badges. Returns
// just the counts; no per-beneficiary detail. Use when polling
// frequently from a UI widget.

router.get('/reassessment-due/count', async (req, res) => {
  try {
    const sweeper = getSweeper();
    if (!sweeper) {
      return res.status(503).json({ success: false, message: 'reassessment_sweeper_unavailable' });
    }
    const result = await sweeper.runOnce({ now: new Date() });
    return res.json({ success: true, data: result.summary });
  } catch (err) {
    return safeError(res, err, 'reassessment_count_failed');
  }
});

// ─── GET /reassessment-due — Wave 206e ────────────────────────
//
// Returns the live list of beneficiaries whose goals have passed
// their timeBoundDate without completion (and/or whose last
// recommendation bundle is older than 90 days). Read-only;
// idempotent; safe for repeated calls from a dashboard badge.

router.get('/reassessment-due', async (req, res) => {
  try {
    const sweeper = getSweeper();
    if (!sweeper) {
      return res.status(503).json({ success: false, message: 'reassessment_sweeper_unavailable' });
    }
    const result = await sweeper.runOnce({ now: new Date() });
    return res.json({
      success: true,
      data: {
        summary: result.summary,
        findingsByBeneficiary: result.findingsByBeneficiary,
      },
    });
  } catch (err) {
    return safeError(res, err, 'reassessment_due_failed');
  }
});

// ─── GET /history/bundle/:bundleId — single bundle detail ─────

router.get('/history/bundle/:bundleId', async (req, res) => {
  try {
    const { bundleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(bundleId)) {
      return res.status(400).json({ success: false, message: 'bundleId must be a valid ObjectId' });
    }
    const BundleModel = mongoose.model('AssessmentRecommendationBundle');
    const doc = await BundleModel.findById(bundleId).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'bundle_not_found' });
    }
    // W269f: bundle carries a beneficiary FK — enforce branch on the
    // beneficiary, not on a (non-existent) branchId on the bundle.
    try {
      await enforceBeneficiaryBranch(req, String(doc.beneficiary));
    } catch (err) {
      if (err.status === 403) {
        return res.status(403).json({ success: false, message: err.message });
      }
      if (err.status === 404) {
        // The bundle exists but its beneficiary doesn't — treat as
        // not-found to avoid leaking the existence of the bundle.
        return res.status(404).json({ success: false, message: 'bundle_not_found' });
      }
      throw err;
    }
    return res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'assessment_history_detail_failed');
  }
});

function mapDomainToCarePlanGoalType(domain) {
  const map = {
    motor: 'MOTOR',
    self_care: 'LIFE_SKILL',
    communication: 'COMMUNICATION',
    cognitive: 'ACADEMIC',
    behavior: 'BEHAVIORAL',
    social: 'SOCIAL',
    adaptive: 'LIFE_SKILL',
  };
  return map[domain] || 'OTHER';
}

module.exports = router;
