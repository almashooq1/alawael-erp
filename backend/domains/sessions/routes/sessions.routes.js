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
      { beneficiaryId, episodeId, therapistId, status, from, to },
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
    const data = await sessionsService.getDashboard({ from, to });
    res.json({ success: true, data });
  })
);

/* ─── GET /sessions/beneficiary/:id ─────────────────────────────────────── */
router.get(
  '/beneficiary/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const { limit = 50, skip = 0 } = req.query;
    const { data, total } = await sessionsService.getBeneficiarySessions(req.params.id, {
      limit,
      skip,
    });
    res.json({ success: true, data, total });
  })
);

/* ─── GET /sessions/therapist/:id ───────────────────────────────────────── */
router.get(
  '/therapist/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const { from, to, limit = 50, skip = 0 } = req.query;
    const { data, total } = await sessionsService.getTherapistSessions(
      req.params.id,
      { from, to },
      { limit, skip }
    );
    res.json({ success: true, data, total });
  })
);

/* ─── GET /sessions/:id ─────────────────────────────────────────────────── */
router.get(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await sessionsService.getSessionById(req.params.id);
    res.json({ success: true, data: session });
  })
);

/* ─── PUT /sessions/:id — Update session ────────────────────────────────── */
router.put(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await sessionsService.updateSession(req.params.id, req.body);
    res.json({ success: true, data: session });
  })
);

/* ─── PUT /sessions/:id/complete — Complete session with documentation ───── */
router.put(
  '/:id/complete',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await sessionsService.completeSession(req.params.id, req.body);
    res.json({ success: true, data: session });
  })
);

/* ─── PUT /sessions/:id/cancel — Cancel session ─────────────────────────── */
router.put(
  '/:id/cancel',
  requireService,
  asyncHandler(async (req, res) => {
    const session = await sessionsService.cancelSession(req.params.id, req.body.reason);
    res.json({ success: true, data: session });
  })
);

module.exports = router;
