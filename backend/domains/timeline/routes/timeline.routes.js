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
const mongoose = require('mongoose');
const { validateAddEvent, validate } = require('../validators/timeline.validator');
// W1138 — cross-branch isolation (W269 doctrine Layer B). The unified
// timeline is the highest-density PHI surface in the system (every
// clinical/operational milestone per beneficiary) — every read MUST
// verify ownership for restricted callers.
const {
  assertBranchMatch,
  enforceBeneficiaryBranch,
} = require('../../../middleware/assertBranchMatch');

let timelineService;
try {
  ({ timelineService } = require('../services/TimelineService'));
  // Ensure model is registered
  require('../models/CareTimeline');
} catch (_e) {
  timelineService = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// W1138 — map guard errors (err.status from assertBranchMatch /
// enforceBeneficiaryBranch) + service errors (err.statusCode) to HTTP.
function guardError(res, err) {
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({ success: false, message: err.message });
}

// W1138 — episode-keyed ownership check: restricted callers may only read
// an episode timeline when the episode belongs to their branch (direct
// branchId match, falling back to the owning beneficiary's branch for
// legacy episodes without a denormalized branchId).
async function enforceEpisodeBranch(req, episodeId) {
  if (!req || !req.branchScope || !req.branchScope.restricted) return;
  let Episode;
  try {
    Episode = mongoose.model('EpisodeOfCare');
  } catch (_e) {
    const err = new Error('EpisodeOfCare model unavailable — refusing for safety (fail-closed)');
    err.status = 503;
    throw err;
  }
  const episode = await Episode.findById(episodeId).select('branchId beneficiaryId').lean();
  if (!episode) {
    const err = new Error('episode not found');
    err.status = 404;
    throw err;
  }
  if (episode.branchId) {
    assertBranchMatch(req, episode.branchId, 'episode');
  } else {
    await enforceBeneficiaryBranch(req, episode.beneficiaryId);
  }
}

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
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف المستفيد غير صالح' });
    }
    try {
      // W1138 — ownership check before exposing the full PHI history.
      await enforceBeneficiaryBranch(req, req.params.id);
    } catch (err) {
      return guardError(res, err);
    }
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
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف الحلقة غير صالح' });
    }
    try {
      // W1138 — episode ownership check (branch direct or via beneficiary).
      await enforceEpisodeBranch(req, req.params.id);
    } catch (err) {
      return guardError(res, err);
    }
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
  validate(validateAddEvent),
  asyncHandler(async (req, res) => {
    try {
      // W1138 — restricted callers may only write events for beneficiaries
      // in their own branch, and may not spoof a foreign branchId.
      await enforceBeneficiaryBranch(req, req.body.beneficiaryId);
    } catch (err) {
      return guardError(res, err);
    }
    if (req.branchScope && req.branchScope.restricted) {
      req.body.branchId = req.branchScope.branchId;
    }
    const event = await timelineService.addEvent(req.body);
    res.status(201).json({ success: true, data: event });
  })
);

/* ─── GET /timeline/:id — Single event ───────────────────────────────── */
router.get(
  '/:id',
  requireService,
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرف الحدث غير صالح' });
    }
    const event = await timelineService.getEventById(req.params.id);
    try {
      // W1138 — single-event ownership: direct branchId match, falling
      // back to the owning beneficiary's branch for un-tagged rows.
      if (req.branchScope && req.branchScope.restricted) {
        if (event.branchId) {
          assertBranchMatch(req, event.branchId, 'timeline event');
        } else {
          await enforceBeneficiaryBranch(req, event.beneficiaryId);
        }
      }
    } catch (err) {
      return guardError(res, err);
    }
    res.json({ success: true, data: event });
  })
);

module.exports = router;
