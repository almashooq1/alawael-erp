/**
 * Feedback Routes — مسارات ملاحظات الجلسات
 * Session feedback, NPS scores, ratings, and follow-up management
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const Feedback = require('../models/Feedback');
const logger = require('../utils/logger');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

/** GET /api/feedback — list feedback (filter by beneficiary, therapist, sentiment, followUp) */
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const {
      beneficiary,
      therapist,
      sentiment,
      requiresFollowUp,
      followUpStatus,
      page = 1,
      limit = 25,
    } = req.query;
    const filter = { ...branchFilter(req) };
    if (beneficiary) filter.beneficiary = beneficiary;
    if (therapist) filter.therapist = therapist;
    if (sentiment) filter.sentiment = sentiment;
    if (requiresFollowUp !== undefined) filter.requiresFollowUp = requiresFollowUp === 'true';
    if (followUpStatus) filter.followUpStatus = followUpStatus;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Feedback.find(filter)
        .populate('session', 'date status')
        .populate('beneficiary', 'name fileNumber')
        .populate('therapist', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Feedback.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    safeError(res, err, 'feedback list error');
  }
});

/** GET /api/feedback/stats — NPS and rating statistics */
router.get('/stats', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { therapist, startDate, endDate } = req.query;
    const match = { ...branchFilter(req) };
    if (therapist) match.therapist = require('mongoose').Types.ObjectId(therapist);
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const stats = await Feedback.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          avgNPS: { $avg: '$npsScore' },
          avgTherapistSkill: { $avg: '$ratings.therapistSkill' },
          avgCleanliness: { $avg: '$ratings.facilityCleanliness' },
          avgFriendliness: { $avg: '$ratings.staffFriendliness' },
          promoters: { $sum: { $cond: [{ $gte: ['$npsScore', 9] }, 1, 0] } },
          passives: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$npsScore', 7] }, { $lt: ['$npsScore', 9] }] }, 1, 0],
            },
          },
          detractors: { $sum: { $cond: [{ $lt: ['$npsScore', 7] }, 1, 0] } },
          positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'POSITIVE'] }, 1, 0] } },
          neutral: { $sum: { $cond: [{ $eq: ['$sentiment', 'NEUTRAL'] }, 1, 0] } },
          negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'NEGATIVE'] }, 1, 0] } },
          pendingFollowUp: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$requiresFollowUp', true] },
                    { $eq: ['$followUpStatus', 'OPEN'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const s = stats[0] || {};
    const npsScore = s.totalFeedback
      ? Math.round(((s.promoters - s.detractors) / s.totalFeedback) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        totalFeedback: s.totalFeedback || 0,
        npsScore,
        avgRatings: {
          therapistSkill: Number((s.avgTherapistSkill || 0).toFixed(2)),
          facilityCleanliness: Number((s.avgCleanliness || 0).toFixed(2)),
          staffFriendliness: Number((s.avgFriendliness || 0).toFixed(2)),
        },
        sentimentBreakdown: {
          positive: s.positive || 0,
          neutral: s.neutral || 0,
          negative: s.negative || 0,
        },
        pendingFollowUp: s.pendingFollowUp || 0,
      },
    });
  } catch (err) {
    safeError(res, err, 'feedback stats error');
  }
});

/** GET /api/feedback/:id — get single feedback */
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const feedback = await Feedback.findOne({ _id: req.params.id, ...branchFilter(req) })
      .populate('session')
      .populate('beneficiary', 'name fileNumber')
      .populate('therapist', 'name');
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, data: feedback });
  } catch (err) {
    safeError(res, err, 'feedback get error');
  }
});

/** POST /api/feedback — create feedback */
router.post('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const body = { ...stripUpdateMeta(req.body) };
    if (req.branchScope && req.branchScope.branchId) {
      body.branchId = req.branchScope.branchId;
    }
    const feedback = await Feedback.create(body);
    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    logger.error('feedback create error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/feedback/:id — update feedback */
router.put('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const feedback = await Feedback.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripUpdateMeta(req.body),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, data: feedback });
  } catch (err) {
    logger.error('feedback update error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** DELETE /api/feedback/:id — delete feedback (admin) */
router.delete(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const feedback = await Feedback.findOneAndDelete({
        _id: req.params.id,
        ...branchFilter(req),
      });
      if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
      res.json({ success: true, message: 'Feedback deleted' });
    } catch (err) {
      safeError(res, err, 'feedback delete error');
    }
  }
);

/** PATCH /api/feedback/:id/follow-up — resolve follow-up */
router.patch('/:id/follow-up', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { followUpStatus, followUpNotes } = req.body;
    const feedback = await Feedback.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      { followUpStatus, followUpNotes },
      { new: true, runValidators: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, data: feedback });
  } catch (err) {
    logger.error('feedback followUp error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
