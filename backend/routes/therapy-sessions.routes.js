/**
 * therapy-sessions.routes.js
 * ══════════════════════════════════════════════════════════════════
 * مسارات الجلسات العلاجية — Therapy Sessions API
 *
 * Extends the sessions domain with additional endpoints needed by
 * the frontend therapySessions.service.js:
 *   - Standard CRUD (delegates to sessions domain)
 *   - Stats summary
 *   - Therapist availability
 *   - Upcoming sessions for a beneficiary
 *   - Bulk reschedule
 *   - Attend / no-show / reschedule transitions
 *   - Session documentation (SOAP notes)
 *
 * Mounted at: /api/v1/therapy-sessions
 * Auth: requiresAuthentication (injected by app.js global middleware)
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// W1148 (W269-class): ownership check for :beneficiaryId params + body refs.
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
} = require('../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.use(bodyScopedBeneficiaryGuard);

// ── Service (lazy, so missing model doesn't crash app boot) ─────────────────
let _service;
function getService() {
  if (!_service) {
    try {
      ({ sessionsService: _service } = require('../domains/sessions/services/SessionsService'));
    } catch (_e) {
      _service = null;
    }
  }
  return _service;
}

// ── Model (lazy) ─────────────────────────────────────────────────────────────
function Session() {
  try {
    return mongoose.model('ClinicalSession');
  } catch (_e) {
    try {
      require('../domains/sessions/models/ClinicalSession');
      return mongoose.model('ClinicalSession');
    } catch (_e2) {
      return null;
    }
  }
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireService = (_req, res, next) => {
  if (!getService()) {
    return res.status(503).json({ success: false, message: 'Session service unavailable' });
  }
  next();
};

/* ══════════════════════ STANDARD CRUD ══════════════════════════════════════ */

// POST /therapy-sessions — create/schedule
router.post(
  '/',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await getService().scheduleSession(req.body);
    res.status(201).json({ success: true, data: session });
  })
);

// GET /therapy-sessions — list with filters
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
    const { data, total } = await getService().listSessions(
      { beneficiaryId, episodeId, therapistId, status, from, to },
      { limit: Number(limit), skip: Number(skip) }
    );
    res.json({ success: true, data, total, skip: Number(skip), limit: Number(limit) });
  })
);

// GET /therapy-sessions/stats — summary counts
router.get(
  '/stats',
  requireService,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const dashboard = await getService().getDashboard({ from, to });
    res.json({ success: true, data: dashboard });
  })
);

// GET /therapy-sessions/availability/:therapistId — therapist free slots
router.get(
  '/availability/:therapistId',
  asyncHandler(async (req, res) => {
    const { therapistId } = req.params;
    const { from, to } = req.query;
    const S = Session();
    if (!S) return res.json({ success: true, data: [] });

    const q = {
      therapistId,
      isDeleted: { $ne: true },
      status: { $nin: ['cancelled'] },
    };
    if (from || to) {
      q.scheduledDate = {};
      if (from) q.scheduledDate.$gte = new Date(from);
      if (to) q.scheduledDate.$lte = new Date(to);
    }
    const sessions = await S.find(q)
      .select('scheduledDate duration status')
      .sort({ scheduledDate: 1 })
      .lean();
    res.json({ success: true, data: sessions });
  })
);

// GET /therapy-sessions/upcoming/:beneficiaryId — next sessions
router.get(
  '/upcoming/:beneficiaryId',
  asyncHandler(async (req, res) => {
    const { beneficiaryId } = req.params;
    const { limit = 10 } = req.query;
    const S = Session();
    if (!S) return res.json({ success: true, data: [] });

    const sessions = await S.find({
      beneficiaryId,
      isDeleted: { $ne: true },
      scheduledDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'confirmed'] },
    })
      .sort({ scheduledDate: 1 })
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data: sessions });
  })
);

// GET /therapy-sessions/:id — get one
router.get(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await getService().getSessionById(req.params.id);
    res.json({ success: true, data: session });
  })
);

// PUT /therapy-sessions/:id — update
router.put(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await getService().updateSession(req.params.id, req.body);
    res.json({ success: true, data: session });
  })
);

// PATCH /therapy-sessions/:id/status — change status
router.patch(
  '/:id/status',
  requireService,
  asyncHandler(async (req, res) => {
    const { status, reason } = req.body || {};
    let session;
    if (status === 'completed') {
      session = await getService().completeSession(req.params.id, req.body);
    } else if (status === 'cancelled') {
      session = await getService().cancelSession(req.params.id, reason);
    } else {
      session = await getService().updateSession(req.params.id, { status });
    }
    res.json({ success: true, data: session });
  })
);

// POST /therapy-sessions/:id/cancel — cancel
router.post(
  '/:id/cancel',
  requireService,
  asyncHandler(async (req, res) => {
    const { reason } = req.body || {};
    const session = await getService().cancelSession(req.params.id, reason || 'unspecified');
    res.json({ success: true, data: session });
  })
);

// POST /therapy-sessions/:id/attend — mark attended
router.post(
  '/:id/attend',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await getService().updateSession(req.params.id, {
      status: 'in_progress',
      checkInTime: new Date(),
      attendanceStatus: 'attended',
      ...req.body,
    });
    res.json({ success: true, data: session });
  })
);

// POST /therapy-sessions/:id/no-show — mark no-show
router.post(
  '/:id/no-show',
  requireService,
  asyncHandler(async (req, res) => {
    const { reason } = req.body || {};
    const session = await getService().updateSession(req.params.id, {
      status: 'no_show',
      attendanceStatus: 'no_show',
      'cancellation.reason': reason,
    });
    res.json({ success: true, data: session });
  })
);

// PATCH /therapy-sessions/:id/reschedule — reschedule
router.patch(
  '/:id/reschedule',
  requireService,
  asyncHandler(async (req, res) => {
    const { newDate, reason } = req.body || {};
    const session = await getService().updateSession(req.params.id, {
      scheduledDate: newDate,
      status: 'scheduled',
      rescheduleReason: reason,
    });
    res.json({ success: true, data: session });
  })
);

// DELETE /therapy-sessions/:id — soft delete
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Model unavailable' });
    await S.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true, deletedAt: new Date() } });
    res.json({ success: true });
  })
);

/* ══════════════════════ DOCUMENTATION (SOAP NOTES) ═════════════════════════ */

// GET /therapy-sessions/:sessionId/documentation — get SOAP notes
router.get(
  '/:sessionId/documentation',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.json({ success: true, data: null });
    const session = await S.findById(req.params.sessionId)
      .select('subjective objective assessment plan soapNotes notes documentation documentedAt')
      .lean();
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
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

// POST /therapy-sessions/:sessionId/documentation — save SOAP notes
// W1380: ClinicalSession stores SOAP as four top-level String fields
// (subjective/objective/assessment/plan) + a combined `soapNotes`. The route
// previously assigned the WHOLE request object to the String soapNotes field
// → Mongoose CastError (400 INVALID_ID) → SOAP could never be saved. Map each
// field explicitly instead.
router.post(
  '/:sessionId/documentation',
  asyncHandler(async (req, res) => {
    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Model unavailable' });
    const body = req.body || {};
    const $set = { documentedAt: new Date() };
    for (const f of ['subjective', 'objective', 'assessment', 'plan', 'soapNotes']) {
      if (body[f] !== undefined && body[f] !== null) $set[f] = String(body[f]);
    }
    const session = await S.findByIdAndUpdate(
      req.params.sessionId,
      { $set },
      { returnDocument: 'after' }
    ).lean();
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
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

/* ══════════════════════ BULK OPERATIONS ════════════════════════════════════ */

// POST /therapy-sessions/bulk-reschedule — reschedule multiple sessions
router.post(
  '/bulk-reschedule',
  requireService,
  asyncHandler(async (req, res) => {
    const { sessionIds = [], newDates = [], reason } = req.body || {};
    if (!sessionIds.length) {
      return res.status(400).json({ success: false, message: 'sessionIds required' });
    }

    const S = Session();
    if (!S) return res.status(503).json({ success: false, message: 'Model unavailable' });

    const results = await Promise.allSettled(
      sessionIds.map((id, i) =>
        S.findByIdAndUpdate(
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

module.exports = router;
