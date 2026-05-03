/**
 * Timeline Routes — مسارات API للخط الزمني الطولي الموحد
 *
 * الهدف السريري: تمكين الأخصائي والإدارة من رؤية الرحلة الكاملة
 * للمستفيد عبر الزمن بكل أحداثها السريرية والتشغيلية.
 *
 * @module domains/timeline/routes/timeline.routes
 */

const express = require('express');
const router = express.Router();

let CareTimeline;
try {
  ({ CareTimeline } = require('../models/CareTimeline'));
} catch (_e) {
  CareTimeline = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireModel = (req, res, next) => {
  if (!CareTimeline) {
    return res.status(503).json({ success: false, message: 'Timeline model unavailable' });
  }
  next();
};

/* ─── GET /timeline/beneficiary/:id — Full longitudinal timeline ──────────── */
router.get(
  '/beneficiary/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const { eventType, from, to, limit = 100, skip = 0 } = req.query;
    const filter = { beneficiaryId: req.params.id };
    if (eventType) filter.eventType = eventType;
    if (from || to) {
      filter.eventDate = {};
      if (from) filter.eventDate.$gte = new Date(from);
      if (to) filter.eventDate.$lte = new Date(to);
    }
    const [data, total] = await Promise.all([
      CareTimeline.find(filter)
        .sort({ eventDate: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      CareTimeline.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── GET /timeline/episode/:id — Timeline for an episode ────────────────── */
router.get(
  '/episode/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const { eventType, limit = 100, skip = 0 } = req.query;
    const filter = { episodeId: req.params.id };
    if (eventType) filter.eventType = eventType;
    const [data, total] = await Promise.all([
      CareTimeline.find(filter)
        .sort({ eventDate: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      CareTimeline.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── POST /timeline — Add a timeline event ─────────────────────────────── */
router.post(
  '/',
  requireModel,
  asyncHandler(async (req, res) => {
    const { beneficiaryId, episodeId, eventType, title, description, metadata, eventDate } =
      req.body;
    if (!beneficiaryId || !eventType) {
      return res
        .status(400)
        .json({ success: false, message: 'beneficiaryId and eventType are required' });
    }
    const event = await CareTimeline.create({
      beneficiaryId,
      episodeId,
      eventType,
      title,
      description,
      metadata: metadata || {},
      eventDate: eventDate ? new Date(eventDate) : new Date(),
    });
    res.status(201).json({ success: true, data: event });
  })
);

/* ─── GET /timeline/:id — Single event ───────────────────────────────────── */
router.get(
  '/:id',
  requireModel,
  asyncHandler(async (req, res) => {
    const event = await CareTimeline.findById(req.params.id).lean();
    if (!event) {
      return res.status(404).json({ success: false, message: 'Timeline event not found' });
    }
    res.json({ success: true, data: event });
  })
);

module.exports = router;
