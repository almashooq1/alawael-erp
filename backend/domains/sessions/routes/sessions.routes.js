/**
 * Sessions Routes — مسارات API للجلسات السريرية
 *
 * الهدف السريري: إدارة الجلسات الفردية والجماعية المرتبطة
 * بالمستفيد والأخصائي وخطة الرعاية.
 *
 * @module domains/sessions/routes/sessions.routes
 */

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
// W1152 — session-keyed ownership: every :sessionId param loads the session's
// own branchId and asserts it for restricted callers; list endpoints scope
// through effectiveBranchScope() so ?branchId= spoofing/omission is closed.
const {
  branchScopedBeneficiaryParam,
  branchScopedResourceParam,
  bodyScopedBeneficiaryGuard,
  effectiveBranchScope,
} = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.param(
  'sessionId',
  branchScopedResourceParam({
    modelName: 'ClinicalSession',
    label: 'session',
    loadModel: () => require('../models/ClinicalSession'),
  })
);
router.use(bodyScopedBeneficiaryGuard);
const {
  validateCreateSession,
  validateUpdateSession,
  validate,
} = require('../validators/sessions.validator');

// Load model (registers it with Mongoose for the service layer)
try {
  require('../models/ClinicalSession');
} catch (_e) {
  // model registration failed — service will return 503 on first call
}

let sessionsService;
try {
  ({ sessionsService } = require('../services/SessionsService'));
} catch (_e) {
  sessionsService = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireService = (req, res, next) => {
  if (!sessionsService) {
    return res.status(503).json({ success: false, message: 'Session service unavailable' });
  }
  next();
};

/* ─── POST /sessions — Schedule a session ────────────────────────────────── */
router.post(
  '/',
  requireService,
  validate(validateCreateSession),
  asyncHandler(async (req, res) => {
    const session = await sessionsService.scheduleSession(req.body);
    res.status(201).json({ success: true, data: session });
  })
);

/* ─── GET /sessions — List sessions ─────────────────────────────────────── */
router.get(
  '/',
  requireService,
  asyncHandler(async (req, res) => {
    const {
      beneficiaryId,
      episodeId,
      therapistId,
      status,
      from,
      to,
      limit = 20,
      skip = 0,
    } = req.query;
    const { data, total } = await sessionsService.listSessions(
      // W1152 — restricted callers are pinned to their own branch
      {
        beneficiaryId,
        episodeId,
        therapistId,
        status,
        from,
        to,
        branchId: effectiveBranchScope(req),
      },
      { limit, skip }
    );
    res.json({ success: true, data, total, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── GET /sessions/dashboard — Summary stats ───────────────────────────── */
router.get(
  '/dashboard',
  requireService,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    // W1152 — dashboard counts scoped to the caller's branch when restricted
    const data = await sessionsService.getDashboard({
      from,
      to,
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/beneficiary/:beneficiaryId ─────────────────────── */
router.get(
  '/beneficiary/:beneficiaryId',
  requireService,
  asyncHandler(async (req, res) => {
    const { limit = 50, skip = 0 } = req.query;
    const { data, total } = await sessionsService.getBeneficiarySessions(req.params.beneficiaryId, {
      limit,
      skip,
    });
    res.json({ success: true, data, total });
  })
);

/* ─── GET /sessions/therapist/:therapistId ───────────────────────── */
router.get(
  '/therapist/:therapistId',
  requireService,
  asyncHandler(async (req, res) => {
    const { from, to, limit = 50, skip = 0 } = req.query;
    const { data, total } = await sessionsService.getTherapistSessions(
      req.params.therapistId,
      // W1152 — restricted callers only see their own branch's sessions
      { from, to, branchId: effectiveBranchScope(req) },
      { limit, skip }
    );
    res.json({ success: true, data, total });
  })
);

/* ─── GET /sessions/:sessionId ──────────────────────────────────────────── */
router.get(
  '/:sessionId',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await sessionsService.getSessionById(req.params.sessionId);
    res.json({ success: true, data: session });
  })
);

/* ─── PUT /sessions/:sessionId — Update session ─────────────────────────── */
router.put(
  '/:sessionId',
  requireService,
  validate(validateUpdateSession),
  asyncHandler(async (req, res) => {
    const session = await sessionsService.updateSession(req.params.sessionId, req.body);
    res.json({ success: true, data: session });
  })
);

/* ─── PUT /sessions/:sessionId/complete — Complete session with docs ─────── */
router.put(
  '/:sessionId/complete',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await sessionsService.completeSession(req.params.sessionId, req.body);
    res.json({ success: true, data: session });
  })
);

/* ─── PUT /sessions/:sessionId/cancel — Cancel session ─────────────────── */
router.put(
  '/:sessionId/cancel',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await sessionsService.cancelSession(req.params.sessionId, req.body.reason);
    res.json({ success: true, data: session });
  })
);

module.exports = router;
