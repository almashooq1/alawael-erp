'use strict';

/**
 * care-plan.routes.js — Wave 42 (Care Planning Phase 2).
 *
 * HTTP surface for the Wave-41 care-plan engine. Every endpoint
 * gates on a `care-plan.*` permission code (registered in
 * governance.registry Wave 41 extension). Service layer enforces
 * the deeper checks (self-approval, readiness, escalation, amendment
 * lock, family-version requirement, etc.).
 *
 * Endpoints (mounted at /api/v1/care-plans behind authenticate):
 *
 *   POST   /                     — createDraft (therapist/teacher)
 *           body: { planId, planType, specialty?, beneficiaryId, branchId,
 *                   reasonForPlan?, baselineSummary?, goals?, programs?,
 *                   measures?, tests?, supportServices?, familyRole?,
 *                   barriers?, safetyFlags?, sessionsPerWeekCap?, reviewSchedule? }
 *
 *   POST   /:id/validate         — runValidation
 *           body: { beneficiaryAge?, branchSessionCap? }
 *
 *   POST   /:id/transitions      — generic state-machine driver
 *           body: { transitionId, nafathSignatureId?, metadata? }
 *
 *   POST   /:id/reject           — structured rejection capture
 *           body: { primaryReason, requiredFixes, rewriteGuidance?, urgency? }
 *
 *   POST   /:id/scorecard        — record review scorecard
 *           body: { scorecard: { quality, compliance, ... }, notes? }
 *
 *   POST   /:id/versions         — create new version (after rejection or revision)
 *           body: { reasonForRevision, changes }
 *
 *   POST   /:id/amendments       — controlled amendment (branch_manager only)
 *           body: { field, before, after, reason }
 *
 *   POST   /:id/family-version   — generate/preview family version
 *           body: { body, readabilityGrade }
 *
 *   GET    /:id                  — fetch a single version
 *
 *   GET    /plan/:planId/versions — version history for a plan
 *
 *   GET    /:id/allowed-transitions — UI helper
 *
 *   GET    /_health              — ops probe
 *
 * Status code map (reason → status):
 *
 *   ACTOR_REQUIRED                → 401
 *   PERMISSION_DENIED             → 403
 *   PLAN_NOT_FOUND                → 404
 *   UNKNOWN_TRANSITION            → 400
 *   INVALID_FROM_STATUS           → 409
 *   ACTOR_ROLE_NOT_ALLOWED        → 403
 *   SELF_APPROVAL_FORBIDDEN       → 403
 *   READINESS_TOO_LOW             → 412
 *   HARD_FAILURES_PRESENT         → 412
 *   VALIDATION_MISSING            → 412
 *   MUST_ESCALATE                 → 409
 *   REVIEW_SCORE_TOO_LOW          → 412
 *   IS_TERMINAL                   → 409
 *   AMENDMENT_FORBIDDEN           → 403
 *   FAMILY_VERSION_MISSING        → 412
 *   REJECTION_MISSING_REASON      → 400
 *   INVALID_PLAN_TYPE             → 400
 */

const express = require('express');
const safeError = require('../utils/safeError');
const reg = require('../intelligence/care-planning.registry');
const familyGenerator = require('../intelligence/family-version-generator.service');
const recommendationBuilder = require('../intelligence/care-plan-recommendation-builder.service');
const progressReviewer = require('../intelligence/care-plan-progress-reviewer.service');
const auditTrail = require('../intelligence/care-plan-audit-trail.service');
const programsLibrary = require('../intelligence/care-plan-programs-library.registry');
const groupPlanService = require('../intelligence/group-plan.service');
const reportGenerator = require('../intelligence/care-plan-report-generator.service');

const REASON_TO_STATUS = Object.freeze({
  ACTOR_REQUIRED: 401,
  PERMISSION_DENIED: 403,
  PLAN_NOT_FOUND: 404,
  UNKNOWN_TRANSITION: 400,
  INVALID_FROM_STATUS: 409,
  ACTOR_ROLE_NOT_ALLOWED: 403,
  SELF_APPROVAL_FORBIDDEN: 403,
  READINESS_TOO_LOW: 412,
  HARD_FAILURES_PRESENT: 412,
  VALIDATION_MISSING: 412,
  MUST_ESCALATE: 409,
  REVIEW_SCORE_TOO_LOW: 412,
  IS_TERMINAL: 409,
  AMENDMENT_FORBIDDEN: 403,
  FAMILY_VERSION_MISSING: 412,
  REJECTION_MISSING_REASON: 400,
  INVALID_PLAN_TYPE: 400,
  NOT_EDITABLE: 409,
  INVALID_CHANGES: 400,
  NO_MUTABLE_CHANGES: 400,
});

const TRANSITION_TO_PERMISSION = Object.freeze({
  submit_for_validation: 'care-plan.validation.run',
  mark_ready: 'care-plan.validation.run',
  submit_to_supervisor: 'care-plan.submit-to-supervisor',
  begin_review: 'care-plan.begin-review',
  request_revision: 'care-plan.request-revision',
  resubmit_after_revision: 'care-plan.submit-to-supervisor',
  escalate: 'care-plan.escalate',
  approve: 'care-plan.approve',
  reject: 'care-plan.reject',
  archive_rejected: 'care-plan.archive',
  save_to_record: 'care-plan.save-to-record',
  notify_family: 'care-plan.notify-family',
  supersede: 'care-plan.supersede',
});

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
    ip: req.ip,
  };
}

function respond(res, result) {
  if (result && result.ok) {
    return res.json({ success: true, data: result });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'CARE_PLAN_REJECTED',
    reason: result?.reason,
    ...(result?.detail ? { detail: result.detail } : {}),
    ...(result?.allowed ? { allowed: result.allowed } : {}),
    ...(result?.from ? { fromStatus: result.from } : {}),
    ...(result?.readinessScore !== undefined ? { readinessScore: result.readinessScore } : {}),
    ...(result?.required !== undefined ? { required: result.required } : {}),
    ...(result?.count !== undefined ? { hardFailureCount: result.count } : {}),
    ...(result?.overall !== undefined ? { reviewOverall: result.overall } : {}),
    ...(result?.status ? { currentStatus: result.status } : {}),
    ...(result?.field ? { field: result.field } : {}),
    ...(result?.planType ? { planType: result.planType } : {}),
    ...(result?.role ? { actorRole: result.role } : {}),
  });
}

/**
 * @param {object} opts
 *   - service     — Wave-41 care-plan service (createCarePlanService output)
 *   - governance  — Wave-26 governance service (hasPermission)
 *   - logger      — console-compatible
 */
function createCarePlanRouter({ service, governance, logger = console } = {}) {
  if (!service || typeof service.createDraft !== 'function') {
    throw new Error('care-plan.routes: care-plan service is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('care-plan.routes: governance service is required');
  }
  void logger;

  const router = express.Router();

  function ensurePermission(req, res, permissionCode) {
    const actor = actorFrom(req);
    if (!actor.userId) {
      res.status(401).json({
        success: false,
        message: 'ACTOR_REQUIRED',
        reason: 'ACTOR_REQUIRED',
      });
      return false;
    }
    if (!governance.hasPermission(actor.role, permissionCode)) {
      res.status(403).json({
        success: false,
        message: 'PERMISSION_DENIED',
        reason: 'PERMISSION_DENIED',
        requiredPermission: permissionCode,
      });
      return false;
    }
    return true;
  }

  // ─── GET /library/programs ─── browse programs library ───────
  router.get('/library/programs', (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.programs-library.read')) return;
      const { domain, age, indication } = req.query;
      const list = programsLibrary.listPrograms({
        domain,
        ageBand: age != null ? Number(age) : undefined,
        indication,
      });
      return res.json({ success: true, data: { programs: list, count: list.length } });
    } catch (err) {
      return safeError(res, err, 'care-plan.library.programs');
    }
  });

  // ─── GET /library/tests ─── browse tests/measures library ────
  router.get('/library/tests', (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.tests-library.read')) return;
      const { domain, age, indication } = req.query;
      const list = programsLibrary.listTests({
        domain,
        ageBand: age != null ? Number(age) : undefined,
        indication,
      });
      return res.json({ success: true, data: { tests: list, count: list.length } });
    } catch (err) {
      return safeError(res, err, 'care-plan.library.tests');
    }
  });

  // ─── POST /library/recommend-programs ─── ranked match ───────
  router.post('/library/recommend-programs', (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.programs-library.read')) return;
      const body = req.body || {};
      const programs = programsLibrary.recommendPrograms(
        {
          domain: body.domain,
          age: body.age != null ? Number(body.age) : undefined,
          indications: Array.isArray(body.indications) ? body.indications : [],
          safetyFlags: Array.isArray(body.safetyFlags) ? body.safetyFlags : [],
        },
        Number(body.k || 3)
      );
      const tests = programsLibrary.recommendTests(
        {
          domain: body.domain,
          age: body.age != null ? Number(body.age) : undefined,
          indications: Array.isArray(body.indications) ? body.indications : [],
        },
        Number(body.kTests || 2)
      );
      return res.json({ success: true, data: { programs, tests } });
    } catch (err) {
      return safeError(res, err, 'care-plan.library.recommend');
    }
  });

  // ─── POST /library/interpret-score ─── single-score interpretation ─
  router.post('/library/interpret-score', (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.tests-library.read')) return;
      const body = req.body || {};
      const result = programsLibrary.interpretTestScore(body.testId, Number(body.score));
      if (!result.ok)
        return res.status(400).json({ success: false, ...result, message: result.reason });
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'care-plan.library.interpret');
    }
  });

  // ─── POST /group-plans/build ─── build a group plan candidate ─
  router.post('/group-plans/build', (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.group-plan.build')) return;
      const result = groupPlanService.buildGroupPlan(req.body || {});
      if (!result.ok) {
        return res.status(422).json({
          success: false,
          message: result.reason || 'GROUP_PLAN_BUILD_FAILED',
          reason: result.reason,
          errors: result.errors || [],
          rejected: result.cohort?.rejected || result.rejectedCandidates || [],
        });
      }
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'care-plan.group-plan.build');
    }
  });

  // ─── POST /group-plans/validate ─── validate an existing group plan ─
  router.post('/group-plans/validate', (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.group-plan.validate')) return;
      const result = groupPlanService.validateGroupPlan(req.body?.groupPlan || {});
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'care-plan.group-plan.validate');
    }
  });

  // ─── POST /group-plans/cohort-suggest ─── propose cohort ─────
  router.post('/group-plans/cohort-suggest', (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.group-plan.build')) return;
      const body = req.body || {};
      const result = groupPlanService.suggestCohort({
        candidates: Array.isArray(body.candidates) ? body.candidates : [],
        cohortCriteria: body.cohortCriteria || {},
        capacity: Number(body.capacity) || undefined,
      });
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'care-plan.group-plan.cohort-suggest');
    }
  });

  // ─── POST /recommendations/build-prompt ─── pure prompt builder ──
  // MUST come BEFORE /:id/* routes — Express would otherwise bind
  // `:id = 'recommendations'`. Stateless: does NOT call an LLM.
  router.post('/recommendations/build-prompt', (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.recommendation.preview')) return;
      const bundle = recommendationBuilder.buildInputBundle(req.body || {});
      const prompt = recommendationBuilder.buildRecommendationPrompt(bundle, {
        language: req.body?.language || 'ar',
      });
      return res.json({
        success: true,
        data: {
          inputBundle: bundle,
          prompt,
        },
      });
    } catch (err) {
      return safeError(res, err, 'care-plan.recommendation.build-prompt');
    }
  });

  // ─── POST /recommendations/validate ─── validate an LLM proposal ─
  // MUST come BEFORE /:id/* routes.
  router.post('/recommendations/validate', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.recommendation.preview')) return;
      const body = req.body || {};
      if (!body.rawJson && !body.proposal) {
        return res.status(400).json({
          success: false,
          message: 'NO_PROPOSAL_PROVIDED',
          reason: 'NO_PROPOSAL_PROVIDED',
        });
      }
      const hooks = {
        constraints: body.constraints || null,
        hasRecentStandardizedAssessment: Boolean(body.hasRecentStandardizedAssessment),
        isGoalSmart:
          typeof service.isGoalSmart === 'function'
            ? service.isGoalSmart
            : typeof service.validator?.isGoalSmart === 'function'
              ? service.validator.isGoalSmart
              : undefined,
        resolveEvidenceRef:
          typeof service.resolveEvidenceRef === 'function' ? service.resolveEvidenceRef : undefined,
      };
      const result = await recommendationBuilder.validateProposal(
        body.rawJson || body.proposal,
        hooks
      );
      if (!result.ok) {
        return res.status(422).json({
          success: false,
          message: 'PROPOSAL_REJECTED',
          reason: 'PROPOSAL_REJECTED',
          errors: result.errors,
          warnings: result.warnings,
        });
      }
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'care-plan.recommendation.validate');
    }
  });

  // ─── GET / ─── list plans (paginated, filtered) ─────────────
  // Mounts BEFORE /:id so the root path matches list and not "id=''".
  router.get('/', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.list')) return;
      if (typeof service.listPlans !== 'function') {
        return res.status(501).json({
          success: false,
          message: 'LIST_NOT_WIRED',
          reason: 'LIST_NOT_WIRED',
        });
      }

      const actor = actorFrom(req);
      // Pick the actor's branch from the JWT/session if available so
      // branch-scope enforcement kicks in.
      const actorBranchId = req.user?.branchId || null;

      const result = await service.listPlans({
        filters: {
          status: req.query.status || undefined,
          statuses: Array.isArray(req.query.statuses)
            ? req.query.statuses
            : typeof req.query.statuses === 'string'
              ? req.query.statuses
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean)
              : undefined,
          planType: req.query.planType || undefined,
          branchId: req.query.branchId || undefined,
          beneficiaryId: req.query.beneficiaryId || undefined,
          authorId: req.query.authorId || undefined,
          reviewerId: req.query.reviewerId || undefined,
          search: req.query.search || undefined,
        },
        pagination: {
          page: req.query.page,
          limit: req.query.limit,
          sortBy: req.query.sortBy,
          sortDir: req.query.sortDir,
        },
        actor: { ...actor, branchId: actorBranchId },
      });

      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'care-plan.list');
    }
  });

  // ─── POST / ─── createDraft ────────────────────────────────
  router.post('/', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.draft.create')) return;
      const body = req.body || {};
      const actor = actorFrom(req);
      const result = await service.createDraft({
        planId: body.planId,
        planType: body.planType,
        specialty: body.specialty || null,
        beneficiaryId: body.beneficiaryId,
        branchId: body.branchId,
        authorId: actor.userId,
        actor,
        reasonForPlan: body.reasonForPlan || 'initial',
        baselineSummary: body.baselineSummary || undefined,
        goals: Array.isArray(body.goals) ? body.goals : [],
        programs: Array.isArray(body.programs) ? body.programs : [],
        measures: Array.isArray(body.measures) ? body.measures : [],
        tests: Array.isArray(body.tests) ? body.tests : [],
        supportServices: Array.isArray(body.supportServices) ? body.supportServices : [],
        familyRole: body.familyRole || {},
        barriers: Array.isArray(body.barriers) ? body.barriers : [],
        safetyFlags: Array.isArray(body.safetyFlags) ? body.safetyFlags : [],
        sessionsPerWeekCap: body.sessionsPerWeekCap,
        reviewSchedule: body.reviewSchedule || null,
        correlationId: body.correlationId || null,
        metadata: body.metadata || {},
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'care-plan.draft.create');
    }
  });

  // ─── PATCH /:id ─── update editable draft ──────────────────
  // Allowed in status ∈ {draft, revision_requested} for the original author only.
  router.patch('/:id', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.draft.edit-own')) return;
      if (typeof service.updateDraft !== 'function') {
        return res.status(501).json({
          success: false,
          message: 'UPDATE_NOT_WIRED',
          reason: 'UPDATE_NOT_WIRED',
        });
      }
      const result = await service.updateDraft({
        planVersionId: req.params.id,
        actor: actorFrom(req),
        changes: req.body || {},
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'care-plan.draft.update');
    }
  });

  // ─── POST /:id/validate ─── runValidation ──────────────────
  router.post('/:id/validate', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.validation.run')) return;
      const result = await service.runValidation({
        planVersionId: req.params.id,
        actor: actorFrom(req),
        options: {
          beneficiaryAge: req.body?.beneficiaryAge,
          branchSessionCap: req.body?.branchSessionCap,
        },
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'care-plan.validation.run');
    }
  });

  // ─── POST /:id/transitions ─── state-machine driver ───────
  router.post('/:id/transitions', async (req, res) => {
    try {
      const body = req.body || {};
      const { transitionId } = body;
      if (!transitionId || !reg.findTransition(transitionId)) {
        return res.status(400).json({
          success: false,
          message: 'UNKNOWN_TRANSITION',
          reason: 'UNKNOWN_TRANSITION',
        });
      }
      const permCode = TRANSITION_TO_PERMISSION[transitionId];
      if (!permCode) {
        return res.status(400).json({
          success: false,
          message: 'TRANSITION_NOT_MAPPED',
          reason: 'TRANSITION_NOT_MAPPED',
        });
      }
      if (!ensurePermission(req, res, permCode)) return;

      const result = await service.transition({
        planVersionId: req.params.id,
        transitionId,
        actor: actorFrom(req),
        nafathSignatureId: body.nafathSignatureId || null,
        metadata: body.metadata || {},
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'care-plan.transition');
    }
  });

  // ─── POST /:id/reject ─── structured rejection capture ────
  router.post('/:id/reject', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.reject')) return;
      const body = req.body || {};
      const result = await service.reject({
        planVersionId: req.params.id,
        actor: actorFrom(req),
        primaryReason: body.primaryReason,
        requiredFixes: Array.isArray(body.requiredFixes) ? body.requiredFixes : [],
        rewriteGuidance: body.rewriteGuidance || null,
        urgency: body.urgency || 'within_7_days',
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'care-plan.reject');
    }
  });

  // ─── POST /:id/scorecard ─── recordReviewScorecard ─────────
  router.post('/:id/scorecard', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.review.scorecard')) return;
      const body = req.body || {};
      const result = await service.recordReviewScorecard({
        planVersionId: req.params.id,
        actor: actorFrom(req),
        scorecard: body.scorecard || {},
        notes: Array.isArray(body.notes) ? body.notes : [],
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'care-plan.scorecard');
    }
  });

  // ─── POST /:id/versions ─── createNewVersion ───────────────
  router.post('/:id/versions', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.version.create')) return;
      const body = req.body || {};
      // Fetch the parent version first to derive planId without trusting client
      let parentPlanId = body.planId;
      if (!parentPlanId && typeof service.getPlanVersionById === 'function') {
        const parent = await service.getPlanVersionById(req.params.id);
        if (!parent) {
          return res.status(404).json({
            success: false,
            message: 'PLAN_NOT_FOUND',
            reason: 'PLAN_NOT_FOUND',
          });
        }
        parentPlanId = parent.planId;
      }
      const result = await service.createNewVersion({
        planId: parentPlanId,
        basedOnVersionId: req.params.id,
        author: actorFrom(req),
        reasonForRevision: body.reasonForRevision,
        changes: body.changes || {},
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'care-plan.version.create');
    }
  });

  // ─── POST /:id/amendments ─── applyAmendment ───────────────
  router.post('/:id/amendments', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.amendment.apply')) return;
      const body = req.body || {};
      const result = await service.applyAmendment({
        planVersionId: req.params.id,
        actor: actorFrom(req),
        field: body.field,
        before: body.before,
        after: body.after,
        reason: body.reason,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'care-plan.amendment');
    }
  });

  // ─── POST /:id/family-version ─── set family version body ─
  // Preview/upload generated family-friendly body. Validates redaction
  // limits (readabilityGrade, length) but does NOT trigger notify_family.
  router.post('/:id/family-version', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.family-version.preview')) return;
      const body = req.body || {};
      const text = body.body || '';
      const readabilityGrade = body.readabilityGrade != null ? Number(body.readabilityGrade) : null;

      if (!text || typeof text !== 'string' || text.length < 20) {
        return res.status(400).json({
          success: false,
          message: 'FAMILY_BODY_TOO_SHORT',
          reason: 'FAMILY_BODY_TOO_SHORT',
        });
      }
      const wordCount = text.trim().split(/\s+/).length;
      if (wordCount > reg.FAMILY_REDACTION.MAX_WORDS) {
        return res.status(400).json({
          success: false,
          message: 'FAMILY_BODY_TOO_LONG',
          reason: 'FAMILY_BODY_TOO_LONG',
          wordCount,
          maxWords: reg.FAMILY_REDACTION.MAX_WORDS,
        });
      }
      if (readabilityGrade != null && readabilityGrade > reg.FAMILY_REDACTION.MAX_GRADE_LEVEL) {
        return res.status(412).json({
          success: false,
          message: 'FAMILY_READABILITY_TOO_HIGH',
          reason: 'FAMILY_READABILITY_TOO_HIGH',
          readabilityGrade,
          maxGrade: reg.FAMILY_REDACTION.MAX_GRADE_LEVEL,
        });
      }

      if (typeof service.setFamilyVersion !== 'function') {
        return res.status(501).json({
          success: false,
          message: 'FAMILY_VERSION_NOT_WIRED',
          reason: 'FAMILY_VERSION_NOT_WIRED',
        });
      }
      const result = await service.setFamilyVersion({
        planVersionId: req.params.id,
        actor: actorFrom(req),
        body: text,
        readabilityGrade,
      });
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'care-plan.family-version');
    }
  });

  // ─── POST /:id/family-version/generate ─── auto-generate family copy ─
  // Runs the deterministic family-version generator against the plan
  // body and persists the markdown + readability via setFamilyVersion.
  // Refuses to persist if requiresRewrite is true.
  router.post('/:id/family-version/generate', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.family-version.preview')) return;
      if (typeof service.getPlanVersionById !== 'function') {
        return res.status(501).json({
          success: false,
          message: 'GET_BY_ID_NOT_WIRED',
          reason: 'GET_BY_ID_NOT_WIRED',
        });
      }
      const record = await service.getPlanVersionById(req.params.id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'PLAN_NOT_FOUND',
          reason: 'PLAN_NOT_FOUND',
        });
      }
      const body = typeof record.toObject === 'function' ? record.toObject() : record;
      const ctx = req.body || {};
      const result = familyGenerator.generate(body, {
        centerName: ctx.centerName || null,
        contactPhone: ctx.contactPhone || null,
        contactEmail: ctx.contactEmail || null,
        beneficiaryFirstName: ctx.beneficiaryFirstName || null,
        maxGoals: ctx.maxGoals,
      });

      if (result.requiresRewrite) {
        return res.status(412).json({
          success: false,
          message: 'FAMILY_VERSION_REQUIRES_REWRITE',
          reason: 'FAMILY_VERSION_REQUIRES_REWRITE',
          generation: {
            readabilityGrade: result.readability.grade,
            forbiddenTermsFound: result.forbiddenTermsFound,
            missingSections: result.missingSections,
            tooLong: result.tooLong,
            wordCount: result.wordCount,
          },
        });
      }

      // Caller may opt out of persisting (`persist: false`) — useful for preview
      const shouldPersist = ctx.persist !== false;
      if (shouldPersist) {
        if (typeof service.setFamilyVersion !== 'function') {
          return res.status(501).json({
            success: false,
            message: 'SET_FAMILY_VERSION_NOT_WIRED',
            reason: 'SET_FAMILY_VERSION_NOT_WIRED',
          });
        }
        const persisted = await service.setFamilyVersion({
          planVersionId: req.params.id,
          actor: actorFrom(req),
          body: result.markdown,
          readabilityGrade: result.readability.grade,
        });
        if (!persisted.ok) {
          return respond(res, persisted);
        }
      }

      return res.json({
        success: true,
        data: {
          markdown: result.markdown,
          readability: result.readability,
          redactedFields: result.redactedFields,
          wordCount: result.wordCount,
          sections: Object.keys(result.sections),
          persisted: shouldPersist,
          generatedAt: result.generatedAt,
        },
      });
    } catch (err) {
      return safeError(res, err, 'care-plan.family-version.generate');
    }
  });

  // ─── POST /:id/progress-review ─── deterministic progress review ─
  // Caller supplies goalSignals (or the route fetches them from the
  // service if a provider is wired). Returns per-goal verdicts +
  // holistic verdict + plan-modification triggers.
  router.post('/:id/progress-review', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.progress-review.run')) return;
      const body = req.body || {};
      let goalSignals = Array.isArray(body.goalSignals) ? body.goalSignals : null;

      // If caller didn't pass signals, try to derive them from the service
      if (!goalSignals && typeof service.collectProgressSignals === 'function') {
        const collected = await service.collectProgressSignals(req.params.id);
        goalSignals = Array.isArray(collected?.goalSignals) ? collected.goalSignals : [];
      }
      if (!goalSignals) {
        return res.status(400).json({
          success: false,
          message: 'NO_GOAL_SIGNALS',
          reason: 'NO_GOAL_SIGNALS',
        });
      }

      const result = progressReviewer.reviewPlan({
        goalSignals,
        planReviewDueAt: body.planReviewDueAt || null,
        aggregateAttendance: body.aggregateAttendance,
        now: body.now ? new Date(body.now) : undefined,
      });
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, 'care-plan.progress-review');
    }
  });

  // ─── POST /:id/reports/:kind ─── generate one of 6 internal reports ─
  router.post('/:id/reports/:kind', async (req, res) => {
    try {
      const { id, kind } = req.params;
      const validKinds = reportGenerator.listReportKinds();
      if (!validKinds.includes(kind)) {
        return res.status(400).json({
          success: false,
          message: 'UNKNOWN_REPORT_KIND',
          reason: 'UNKNOWN_REPORT_KIND',
          allowed: validKinds,
        });
      }
      const permCode = `care-plan.report.${kind}`;
      if (!ensurePermission(req, res, permCode)) return;
      if (typeof service.getPlanVersionById !== 'function') {
        return res.status(501).json({
          success: false,
          message: 'GET_BY_ID_NOT_WIRED',
          reason: 'GET_BY_ID_NOT_WIRED',
        });
      }
      const record = await service.getPlanVersionById(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'PLAN_NOT_FOUND',
          reason: 'PLAN_NOT_FOUND',
        });
      }
      const planBody = typeof record.toObject === 'function' ? record.toObject() : record;
      const ctx = req.body || {};
      const result = reportGenerator.generateReport(kind, planBody, {
        goalSignals: Array.isArray(ctx.goalSignals) ? ctx.goalSignals : [],
        aggregateAttendance: ctx.aggregateAttendance,
        now: ctx.now ? new Date(ctx.now) : undefined,
      });
      if (!result.ok) {
        return res.status(400).json({
          success: false,
          message: result.reason,
          reason: result.reason,
          kind,
        });
      }
      return res.json({ success: true, data: result });
    } catch (err) {
      return safeError(res, err, `care-plan.report.${req.params.kind}`);
    }
  });

  // ─── GET /:id/audit-trail ─── unified chronological audit stream ─
  // Returns lifecycle + signatures + amendments + family-send attempts
  // merged + sorted ascending. Honors role-based redaction.
  router.get('/:id/audit-trail', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.audit-trail.read')) return;
      if (typeof service.getPlanVersionById !== 'function') {
        return res.status(501).json({
          success: false,
          message: 'GET_BY_ID_NOT_WIRED',
          reason: 'GET_BY_ID_NOT_WIRED',
        });
      }
      const record = await service.getPlanVersionById(req.params.id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'PLAN_NOT_FOUND',
          reason: 'PLAN_NOT_FOUND',
        });
      }

      // The signature-hash recompute helper is optional. If the service
      // exposes it (real production wiring), we pass it down so the
      // audit trail can re-derive every hash and catch tampering. In
      // test / no-op environments we fall back to prevHash-chain
      // verification only — still catches the common attack of
      // splicing an entry into the chain.
      const computeSignatureHash =
        typeof service.computeSignatureHash === 'function'
          ? service.computeSignatureHash
          : undefined;

      const redactFor =
        req.query.redactFor === 'family' || req.query.redactFor === 'executive'
          ? req.query.redactFor
          : 'clinical';

      const trail = auditTrail.buildAuditTrail(record, {
        redactFor,
        computeSignatureHash,
      });

      return res.json({ success: true, data: trail });
    } catch (err) {
      return safeError(res, err, 'care-plan.audit-trail');
    }
  });

  // ─── GET /_health ─── must come BEFORE /:id to avoid being shadowed ─
  router.get('/_health', (_req, res) => {
    return res.json({
      success: true,
      data: {
        wave: 42,
        planTypes: reg.PLAN_TYPE_LIST.length,
        statuses: reg.STATUS_LIST.length,
        transitions: reg.TRANSITIONS.length,
        hardRules: [...reg.HARD_RULE_IDS].length,
        softRules: [...reg.SOFT_RULE_IDS].length,
      },
    });
  });

  // ─── GET /plan/:planId/versions ─── must come BEFORE /:id ──
  router.get('/plan/:planId/versions', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.list')) return;
      if (typeof service.getVersionHistory !== 'function') {
        return res.status(501).json({
          success: false,
          message: 'HISTORY_NOT_WIRED',
          reason: 'HISTORY_NOT_WIRED',
        });
      }
      const versions = await service.getVersionHistory(req.params.planId);
      return res.json({
        success: true,
        data: { versions, count: versions.length },
      });
    } catch (err) {
      return safeError(res, err, 'care-plan.history');
    }
  });

  // ─── GET /:id/allowed-transitions ─── must come BEFORE /:id ─
  router.get('/:id/allowed-transitions', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.read')) return;
      let currentStatus = req.query.currentStatus;
      if (!currentStatus && typeof service.getPlanVersionById === 'function') {
        const record = await service.getPlanVersionById(req.params.id);
        if (!record) {
          return res.status(404).json({
            success: false,
            message: 'PLAN_NOT_FOUND',
            reason: 'PLAN_NOT_FOUND',
          });
        }
        currentStatus = record.status;
      }
      if (!currentStatus || !reg.STATUS_LIST.includes(currentStatus)) {
        return res.status(400).json({
          success: false,
          message: 'INVALID_CURRENT_STATUS',
          reason: 'INVALID_CURRENT_STATUS',
          allowed: reg.STATUS_LIST,
        });
      }
      const transitions = reg.getAllowedTransitionsFrom(currentStatus);
      return res.json({
        success: true,
        data: { transitions, count: transitions.length, currentStatus },
      });
    } catch (err) {
      return safeError(res, err, 'care-plan.allowed-transitions');
    }
  });

  // ─── GET /:id ─── fetch single plan version ────────────────
  router.get('/:id', async (req, res) => {
    try {
      if (!ensurePermission(req, res, 'care-plan.read')) return;
      if (typeof service.getPlanVersionById !== 'function') {
        return res.status(501).json({
          success: false,
          message: 'GET_BY_ID_NOT_WIRED',
          reason: 'GET_BY_ID_NOT_WIRED',
        });
      }
      const record = await service.getPlanVersionById(req.params.id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'PLAN_NOT_FOUND',
          reason: 'PLAN_NOT_FOUND',
        });
      }
      return res.json({ success: true, data: { planVersion: record } });
    } catch (err) {
      return safeError(res, err, 'care-plan.get');
    }
  });

  return router;
}

module.exports = createCarePlanRouter;
module.exports.createCarePlanRouter = createCarePlanRouter;
module.exports.REASON_TO_STATUS = REASON_TO_STATUS;
module.exports.TRANSITION_TO_PERMISSION = TRANSITION_TO_PERMISSION;
