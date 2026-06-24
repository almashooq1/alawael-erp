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
// W1204 — Blueprint 43 R3 interface gate: "لا جلسة بلا هدف". Completion (not
// scheduling) is the enforcement point — a session may be scheduled during
// intake before goals exist, but COMPLETING it without documenting progress
// on at least one goal breaks the golden thread. Env-gated
// (GOLDEN_THREAD_ENFORCEMENT=off|warn|enforce, default off).
const goldenThreadGate = require('../../../intelligence/golden-thread-enforcement.lib');
const sessionCenterSvc = require('../../../services/sessionCenter.service');

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

/* ─── GET /sessions/stats — alias for /dashboard (therapy-sessions compat) */
router.get(
  '/stats',
  requireService,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const data = await sessionsService.getDashboard({
      from,
      to,
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/today — today's sessions (inline DDD router compat) */
router.get(
  '/today',
  requireService,
  asyncHandler(async (req, res) => {
    const ClinicalSession = require('../models/ClinicalSession');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = {
      scheduledDate: { $gte: today, $lt: tomorrow },
      isDeleted: { $ne: true },
      status: { $nin: ['cancelled'] },
    };
    const branchId = effectiveBranchScope(req);
    if (branchId) filter.branchId = branchId;

    const data = await ClinicalSession.find(filter)
      .populate('beneficiaryId', 'firstName lastName fullNameArabic mrn')
      .populate('therapistId', 'firstName lastName')
      .sort({ scheduledDate: 1 })
      .lean({ virtuals: true });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/statistics — aggregate statistics (inline DDD router compat) */
router.get(
  '/statistics',
  requireService,
  asyncHandler(async (req, res) => {
    const ClinicalSession = require('../models/ClinicalSession');
    const branchId = effectiveBranchScope(req);
    const filter = { isDeleted: { $ne: true } };
    if (branchId) filter.branchId = branchId;

    const [total, byStatus, byType] = await Promise.all([
      ClinicalSession.countDocuments(filter),
      ClinicalSession.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ClinicalSession.aggregate([
        { $match: filter },
        { $group: { _id: '$sessionType', count: { $sum: 1 } } },
      ]),
    ]);
    res.json({ success: true, data: { total, byStatus, byType } });
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

/* ─── GET /sessions/availability/:therapistId ───────────────────────── */
router.get(
  '/availability/:therapistId',
  requireService,
  asyncHandler(async (req, res) => {
    const ClinicalSession = require('../models/ClinicalSession');
    const { therapistId } = req.params;
    const { from, to } = req.query;

    const q = {
      therapistId,
      isDeleted: { $ne: true },
      status: { $nin: ['cancelled'] },
    };
    const branchId = effectiveBranchScope(req);
    if (branchId) q.branchId = branchId;
    if (from || to) {
      q.scheduledDate = {};
      if (from) q.scheduledDate.$gte = new Date(from);
      if (to) q.scheduledDate.$lte = new Date(to);
    }

    const data = await ClinicalSession.find(q)
      .select('scheduledDate duration status')
      .sort({ scheduledDate: 1 })
      .lean();
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/upcoming/:beneficiaryId ─────────────────────────── */
router.get(
  '/upcoming/:beneficiaryId',
  requireService,
  asyncHandler(async (req, res) => {
    const ClinicalSession = require('../models/ClinicalSession');
    const { beneficiaryId } = req.params;
    const { limit = 10 } = req.query;

    const q = {
      beneficiaryId,
      isDeleted: { $ne: true },
      scheduledDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] },
    };
    const branchId = effectiveBranchScope(req);
    if (branchId) q.branchId = branchId;

    const data = await ClinicalSession.find(q)
      .sort({ scheduledDate: 1 })
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/episode/:episodeId ─────────────────────────────── */
router.get(
  '/episode/:episodeId',
  requireService,
  asyncHandler(async (req, res) => {
    const ClinicalSession = require('../models/ClinicalSession');
    const { episodeId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const filter = { episodeId, isDeleted: { $ne: true } };
    const branchId = effectiveBranchScope(req);
    if (branchId) filter.branchId = branchId;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      ClinicalSession.find(filter)
        .populate('therapistId', 'firstName lastName')
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean({ virtuals: true }),
      ClinicalSession.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
  })
);

/* ─── GET /sessions/therapist/:therapistId/schedule ─────────────────── */
router.get(
  '/therapist/:therapistId/schedule',
  requireService,
  asyncHandler(async (req, res) => {
    const ClinicalSession = require('../models/ClinicalSession');
    const { therapistId } = req.params;
    const { from, to } = req.query;

    const filter = { therapistId, isDeleted: { $ne: true } };
    const branchId = effectiveBranchScope(req);
    if (branchId) filter.branchId = branchId;
    if (from || to) {
      filter.scheduledDate = {};
      if (from) filter.scheduledDate.$gte = new Date(from);
      if (to) filter.scheduledDate.$lte = new Date(to);
    }

    const data = await ClinicalSession.find(filter)
      .select('scheduledDate duration status beneficiaryId')
      .sort({ scheduledDate: 1 })
      .lean();
    res.json({ success: true, data });
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
    // W1204 — R3 gate: completing a session without at least one
    // goalProgress[].goalId entry is rejected (enforce) or flagged (warn).
    const gate = goldenThreadGate.evaluateGate(
      goldenThreadGate.checkSessionCompletionPayload(req.body)
    );
    if (gate.action === 'reject') {
      return res.status(422).json(goldenThreadGate.rejectionEnvelope(gate.violations));
    }
    const session = await sessionsService.completeSession(req.params.sessionId, req.body);
    res.json({
      success: true,
      data: session,
      ...(gate.action === 'warn'
        ? { goldenThread: { mode: gate.mode, warnings: gate.violations } }
        : {}),
    });
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

/* ─── PATCH /sessions/:sessionId/status — generic status transition (compat) */
router.patch(
  '/:sessionId/status',
  requireService,
  asyncHandler(async (req, res) => {
    const { status, reason } = req.body || {};
    let session;
    if (status === 'completed') {
      session = await sessionsService.completeSession(req.params.sessionId, req.body);
    } else if (status === 'cancelled') {
      session = await sessionsService.cancelSession(req.params.sessionId, reason);
    } else {
      session = await sessionsService.updateSession(req.params.sessionId, { status });
    }
    res.json({ success: true, data: session });
  })
);

/* ─── POST /sessions/:sessionId/attend — mark in-progress / attended */
router.post(
  '/:sessionId/attend',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await sessionsService.updateSession(req.params.sessionId, {
      status: 'in_progress',
      checkInTime: new Date(),
      attendanceStatus: 'attended',
      ...req.body,
    });
    res.json({ success: true, data: session });
  })
);

/* ─── POST /sessions/:sessionId/start — alias for attend */
router.post(
  '/:sessionId/start',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await sessionsService.updateSession(req.params.sessionId, {
      status: 'in_progress',
      checkInTime: new Date(),
      attendanceStatus: 'attended',
      ...req.body,
    });
    res.json({ success: true, data: session });
  })
);

/* ─── POST /sessions/:sessionId/no-show */
router.post(
  '/:sessionId/no-show',
  requireService,
  asyncHandler(async (req, res) => {
    const { reason } = req.body || {};
    const session = await sessionsService.updateSession(req.params.sessionId, {
      status: 'no_show',
      attendanceStatus: 'no_show',
      'cancellation.reason': reason,
    });
    res.json({ success: true, data: session });
  })
);

/* ─── PATCH /sessions/:sessionId/reschedule */
router.patch(
  '/:sessionId/reschedule',
  requireService,
  asyncHandler(async (req, res) => {
    const { date, newDate, startTime, endTime, reason } = req.body || {};
    const payload = {
      scheduledDate: newDate || date,
      status: 'scheduled',
      rescheduleReason: reason,
    };
    if (startTime !== undefined) payload.scheduledStartTime = startTime;
    if (endTime !== undefined) payload.scheduledEndTime = endTime;

    const session = await sessionsService.updateSession(req.params.sessionId, payload);
    res.json({ success: true, data: session });
  })
);

/* ─── DELETE /sessions/:sessionId — soft delete */
router.delete(
  '/:sessionId',
  requireService,
  asyncHandler(async (req, res) => {
    const ClinicalSession = require('../models/ClinicalSession');
    await ClinicalSession.findByIdAndUpdate(req.params.sessionId, {
      $set: { isDeleted: true, deletedAt: new Date() },
    });
    res.json({ success: true, message: 'تم أرشفة الجلسة بنجاح' });
  })
);

/* ─── GET /sessions/:sessionId/documentation — SOAP notes */
router.get(
  '/:sessionId/documentation',
  requireService,
  asyncHandler(async (req, res) => {
    const ClinicalSession = require('../models/ClinicalSession');
    const session = await ClinicalSession.findById(req.params.sessionId)
      .select('subjective objective assessment plan soapNotes notes documentation documentedAt')
      .lean();
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    res.json({
      success: true,
      data: {
        subjective: session.subjective ?? null,
        objective: session.objective ?? null,
        assessment: session.assessment ?? null,
        plan: session.plan ?? null,
        soapNotes: session.soapNotes ?? session.documentation ?? session.notes ?? null,
        documentedAt: session.documentedAt ?? null,
      },
    });
  })
);

/* ─── PUT /sessions/:sessionId/documentation — save SOAP notes */
router.put(
  '/:sessionId/documentation',
  requireService,
  asyncHandler(async (req, res) => {
    const ClinicalSession = require('../models/ClinicalSession');
    const body = req.body || {};
    const $set = { documentedAt: new Date() };
    for (const f of ['subjective', 'objective', 'assessment', 'plan', 'soapNotes']) {
      if (body[f] !== undefined && body[f] !== null) $set[f] = String(body[f]);
    }
    const session = await ClinicalSession.findByIdAndUpdate(
      req.params.sessionId,
      { $set },
      { returnDocument: 'after' }
    ).lean();
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    res.json({
      success: true,
      data: {
        subjective: session.subjective ?? null,
        objective: session.objective ?? null,
        assessment: session.assessment ?? null,
        plan: session.plan ?? null,
        soapNotes: session.soapNotes ?? null,
        documentedAt: session.documentedAt ?? null,
      },
    });
  })
);

/* ─── POST /sessions/bulk-reschedule */
router.post(
  '/bulk-reschedule',
  requireService,
  asyncHandler(async (req, res) => {
    const ClinicalSession = require('../models/ClinicalSession');
    const { sessionIds = [], newDates = [], reason } = req.body || {};
    if (!sessionIds.length) {
      return res.status(400).json({ success: false, message: 'sessionIds مطلوبة' });
    }

    const results = await Promise.allSettled(
      sessionIds.map((id, i) =>
        ClinicalSession.findByIdAndUpdate(
          id,
          {
            $set: {
              scheduledDate: newDates[i] || undefined,
              status: 'scheduled',
              rescheduleReason: reason,
            },
          },
          { returnDocument: 'after' }
        )
      )
    );

    const updated = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected' || !r.value).length;
    res.json({ success: true, data: { updated: updated.length, failed } });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════════
 * Session Center analytics — توافق /api/v1/session-center
 * ═══════════════════════════════════════════════════════════════════════════════ */

/* ─── GET /sessions/session-center/dashboard ───────────────────────────── */
router.get(
  '/session-center/dashboard',
  requireService,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const data = await sessionCenterSvc.getDashboard({
      from,
      to,
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/session-center/calendar ────────────────────────────── */
router.get(
  '/session-center/calendar',
  requireService,
  asyncHandler(async (req, res) => {
    const { year, month, therapistId, beneficiaryId } = req.query;
    const data = await sessionCenterSvc.getCalendarSlots({
      year,
      month,
      therapistId,
      beneficiaryId,
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/session-center/therapist-load ──────────────────────── */
router.get(
  '/session-center/therapist-load',
  requireService,
  asyncHandler(async (req, res) => {
    const { from, to, therapistId } = req.query;
    const data = await sessionCenterSvc.getTherapistLoad({
      from,
      to,
      therapistId,
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/session-center/attendance ──────────────────────────── */
router.get(
  '/session-center/attendance',
  requireService,
  asyncHandler(async (req, res) => {
    const { from, to, beneficiaryId, therapistId } = req.query;
    const data = await sessionCenterSvc.getAttendanceReport({
      from,
      to,
      beneficiaryId,
      therapistId,
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/session-center/episode/:episodeId ──────────────────── */
router.get(
  '/session-center/episode/:episodeId',
  requireService,
  asyncHandler(async (req, res) => {
    const data = await sessionCenterSvc.getEpisodeSessions(req.params.episodeId, {
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/session-center/beneficiary/:beneficiaryId ──────────── */
router.get(
  '/session-center/beneficiary/:beneficiaryId',
  requireService,
  asyncHandler(async (req, res) => {
    const { from, to, limit = 50 } = req.query;
    const data = await sessionCenterSvc.getBeneficiarySessions(req.params.beneficiaryId, {
      from,
      to,
      limit: Number(limit),
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/session-center/goals/:episodeId ────────────────────── */
router.get(
  '/session-center/goals/:episodeId',
  requireService,
  asyncHandler(async (req, res) => {
    const data = await sessionCenterSvc.getGoalsProgress(req.params.episodeId, {
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/session-center/soap/:sessionId ─────────────────────── */
router.get(
  '/session-center/soap/:sessionId',
  requireService,
  asyncHandler(async (req, res) => {
    const data = await sessionCenterSvc.getSOAPSummary(req.params.sessionId, {
      branchId: effectiveBranchScope(req),
    });
    res.json({ success: true, data });
  })
);

module.exports = router;
