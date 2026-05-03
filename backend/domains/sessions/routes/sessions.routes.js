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

let ClinicalSession;
try {
  ({ ClinicalSession } = require('../models/ClinicalSession'));
} catch (_e) {
  ClinicalSession = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireModel = (req, res, next) => {
  if (!ClinicalSession) {
    return res.status(503).json({ success: false, message: 'Session model unavailable' });
  }
  next();
};

/* ─── POST /sessions — Schedule a session ────────────────────────────────── */
router.post(
  '/',
  requireModel,
  asyncHandler(async (req, res) => {
    const { beneficiaryId, episodeId, therapistId, carePlanId, scheduledDate, type, modality } =
      req.body;
    if (!beneficiaryId || !scheduledDate) {
      return res
        .status(400)
        .json({ success: false, message: 'beneficiaryId and scheduledDate are required' });
    }
    const session = await ClinicalSession.create({
      beneficiaryId,
      episodeId,
      therapistId,
      carePlanId,
      scheduledDate,
      type: type || 'individual',
      modality: modality || 'in_person',
      status: 'scheduled',
    });
    res.status(201).json({ success: true, data: session });
  })
);

/* ─── GET /sessions — List sessions ─────────────────────────────────────── */
router.get(
  '/',
  requireModel,
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
    const filter = {};
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (episodeId) filter.episodeId = episodeId;
    if (therapistId) filter.therapistId = therapistId;
    if (status) filter.status = status;
    if (from || to) {
      filter.scheduledDate = {};
      if (from) filter.scheduledDate.$gte = new Date(from);
      if (to) filter.scheduledDate.$lte = new Date(to);
    }
    const [data, total] = await Promise.all([
      ClinicalSession.find(filter)
        .sort({ scheduledDate: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      ClinicalSession.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── GET /sessions/dashboard — Summary stats ───────────────────────────── */
router.get(
  '/dashboard',
  requireModel,
  asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from || to) {
      dateFilter.scheduledDate = {};
      if (from) dateFilter.scheduledDate.$gte = new Date(from);
      if (to) dateFilter.scheduledDate.$lte = new Date(to);
    }
    const [total, byStatus, byModality, todaySessions] = await Promise.all([
      ClinicalSession.countDocuments(dateFilter),
      ClinicalSession.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ClinicalSession.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$modality', count: { $sum: 1 } } },
      ]),
      ClinicalSession.countDocuments({
        scheduledDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);
    res.json({
      success: true,
      data: {
        total,
        todaySessions,
        byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
        byModality: Object.fromEntries(byModality.map(r => [r._id, r.count])),
      },
    });
  })
);

/* ─── GET /sessions/beneficiary/:id ─────────────────────────────────────── */
router.get(
  '/beneficiary/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const { limit = 50, skip = 0 } = req.query;
    const data = await ClinicalSession.find({ beneficiaryId: req.params.id })
      .sort({ scheduledDate: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, total: data.length });
  })
);

/* ─── GET /sessions/therapist/:id ───────────────────────────────────────── */
router.get(
  '/therapist/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const { from, to, limit = 50, skip = 0 } = req.query;
    const filter = { therapistId: req.params.id };
    if (from || to) {
      filter.scheduledDate = {};
      if (from) filter.scheduledDate.$gte = new Date(from);
      if (to) filter.scheduledDate.$lte = new Date(to);
    }
    const data = await ClinicalSession.find(filter)
      .sort({ scheduledDate: 1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, total: data.length });
  })
);

/* ─── GET /sessions/:id ─────────────────────────────────────────────────── */
router.get(
  '/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const session = await ClinicalSession.findById(req.params.id).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, data: session });
  })
);

/* ─── PUT /sessions/:id — Update session ────────────────────────────────── */
router.put(
  '/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const session = await ClinicalSession.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, data: session });
  })
);

/* ─── PUT /sessions/:id/complete — Complete session with documentation ───── */
router.put(
  '/:id/complete',
  requireModel,
  asyncHandler(async (req, res) => {
    const { duration, attendanceStatus, goalProgress, notes, vitalSigns, activities } = req.body;
    const session = await ClinicalSession.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'completed',
          actualDate: new Date(),
          duration,
          attendanceStatus: attendanceStatus || 'attended',
          goalProgress: goalProgress || [],
          notes,
          vitalSigns,
          activities: activities || [],
        },
      },
      { new: true, runValidators: true }
    ).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, data: session });
  })
);

/* ─── PUT /sessions/:id/cancel — Cancel session ─────────────────────────── */
router.put(
  '/:id/cancel',
  requireModel,
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const session = await ClinicalSession.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'cancelled', cancellationReason: reason } },
      { new: true }
    ).lean();
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    res.json({ success: true, data: session });
  })
);

module.exports = router;
