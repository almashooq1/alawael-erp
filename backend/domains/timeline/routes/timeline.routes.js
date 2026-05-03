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

let timelineService;
try {
  ({ timelineService } = require('../services/TimelineService'));
  // Ensure model is registered
  require('../models/CareTimeline');
} catch (_e) {
  timelineService = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireService = (req, res, next) => {
  if (!timelineService) {
    return res.status(503).json({ success: false, message: 'Timeline service unavailable' });
  }
  next();
};

/* ─── GET /timeline/beneficiary/:id — Full longitudinal timeline ──────────── */
router.get(
  '/beneficiary/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const { eventType, category, from, to, limit = 100, skip = 0 } = req.query;
    const { data, total } = await timelineService.getBeneficiaryTimeline(
      req.params.id,
      { eventType, category, from, to },
      { limit: Number(limit), skip: Number(skip) }
    );
    res.json({ success: true, data, total, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── GET /timeline/episode/:id — Timeline for an episode ────────────────── */
router.get(
  '/episode/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const { eventType, limit = 100, skip = 0 } = req.query;
    const { data, total } = await timelineService.getEpisodeTimeline(
      req.params.id,
      { eventType },
      { limit: Number(limit), skip: Number(skip) }
    );
    res.json({ success: true, data, total, skip: Number(skip), limit: Number(limit) });
  })
);

/* ─── POST /timeline — Add a timeline event ─────────────────────────────── */
router.post(
  '/',
  requireService,
  asyncHandler(async (req, res) => {
    const event = await timelineService.addEvent(req.body);
    res.status(201).json({ success: true, data: event });
  })
);

/* ─── GET /timeline/:id — Single event ───────────────────────────────────── */
router.get(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const event = await timelineService.getEventById(req.params.id);
    res.json({ success: true, data: event });
  })
);

module.exports = router;
