'use strict';
/**
 * Student Rewards Store Routes — متجر المكافآت والنقاط للطلاب
 * ══════════════════════════════════════════════════════════════════════════
 * Gamification engine: points accumulation, rewards catalog, redemption,
 * badges, and leaderboard to motivate student engagement.
 *
 *   GET    /balance              current student's points balance
 *   GET    /history              points earn/spend history
 *   POST   /award                award points to student (staff only)
 *   GET    /catalog              list available rewards
 *   POST   /catalog              add reward to catalog (admin/manager)
 *   PUT    /catalog/:id          update reward (admin/manager)
 *   DELETE /catalog/:id          delete reward (admin/manager)
 *   POST   /redeem               redeem points for a reward
 *   GET    /redemptions          list redemption history
 *   GET    /badges               list earned badges
 *   POST   /badges/award         award a badge (staff only)
 *   GET    /leaderboard          branch leaderboard
 *   GET    /stats                store statistics
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const router = express.Router();
router.use(authenticate);
router.use(requireBranchAccess);

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

// ── GET /balance ───────────────────────────────────────────────────────────
router.get('/balance', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.json({ success: true, data: { balance: 0, totalEarned: 0, totalSpent: 0 } });
    const { beneficiaryId } = req.query;
    const targetId = beneficiaryId || req.user._id;
    const result = await StudentActivity.aggregate([
      {
        $match: {
          branchId: req.user.branchId,
          studentId: mongoose.Types.ObjectId.isValid(targetId)
            ? new mongoose.Types.ObjectId(targetId)
            : targetId,
          activityType: 'points',
        },
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: { $cond: [{ $gt: ['$points', 0] }, '$points', 0] } },
          totalSpent: { $sum: { $cond: [{ $lt: ['$points', 0] }, { $abs: '$points' }, 0] } },
        },
      },
    ]);
    const data = result[0] || { totalEarned: 0, totalSpent: 0 };
    data.balance = data.totalEarned - data.totalSpent;
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'get points balance');
  }
});

// ── GET /history ───────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [] });
    const { beneficiaryId, page = 1, limit = 20 } = req.query;
    const targetId = beneficiaryId || req.user._id;
    const filter = { branchId: req.user.branchId, studentId: targetId, activityType: 'points' };
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      StudentActivity.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
      StudentActivity.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'points history');
  }
});

// ── POST /award ────────────────────────────────────────────────────────────
router.post(
  '/award',
  requireRole('admin', 'manager', 'supervisor', 'clinician'),
  async (req, res) => {
    try {
      const { studentId, points, reason } = req.body;
      if (!studentId || !points || points <= 0)
        return res
          .status(400)
          .json({ success: false, message: 'studentId and positive points are required' });
      const StudentActivity = safeModel('StudentActivity');
      if (!StudentActivity)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await StudentActivity.create({
        studentId,
        activityType: 'points',
        points,
        reason,
        branchId: req.user.branchId,
        recordedBy: req.user._id,
        date: new Date(),
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'award points');
    }
  }
);

// ── GET /catalog ───────────────────────────────────────────────────────────
router.get('/catalog', async (req, res) => {
  try {
    const { category, available } = req.query;
    // Catalog stored as special StudentActivity records with activityType: 'reward_catalog'
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.json({
        success: true,
        data: [
          {
            _id: 'demo-1',
            name: 'شهادة تميز',
            pointsCost: 100,
            category: 'certificates',
            available: true,
          },
          {
            _id: 'demo-2',
            name: 'رحلة ترفيهية',
            pointsCost: 500,
            category: 'activities',
            available: true,
          },
        ],
      });
    const filter = { branchId: req.user.branchId, activityType: 'reward_catalog' };
    if (category) filter['data.category'] = category;
    if (available === 'true') filter['data.available'] = true;
    const data = await StudentActivity.find(filter).sort({ 'data.pointsCost': 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'get rewards catalog');
  }
});

// ── POST /catalog ──────────────────────────────────────────────────────────
router.post('/catalog', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, description, pointsCost, category, quantity, imageUrl } = req.body;
    if (!name || !pointsCost)
      return res.status(400).json({ success: false, message: 'name and pointsCost are required' });
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.create({
      activityType: 'reward_catalog',
      data: { name, description, pointsCost, category, quantity, imageUrl, available: true },
      branchId: req.user.branchId,
      recordedBy: req.user._id,
      date: new Date(),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create catalog item');
  }
});

// ── PUT /catalog/:id ───────────────────────────────────────────────────────
router.put('/catalog/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, activityType: 'reward_catalog' },
      { $set: { data: req.body } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Catalog item not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update catalog item');
  }
});

// ── DELETE /catalog/:id ────────────────────────────────────────────────────
router.delete('/catalog/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
      activityType: 'reward_catalog',
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Catalog item not found' });
    res.json({ success: true, message: 'Catalog item removed' });
  } catch (err) {
    safeError(res, err, 'delete catalog item');
  }
});

// ── POST /redeem ───────────────────────────────────────────────────────────
router.post('/redeem', async (req, res) => {
  try {
    const { studentId, rewardId, rewardName, pointsCost } = req.body;
    if (!studentId || !rewardId || !pointsCost)
      return res
        .status(400)
        .json({ success: false, message: 'studentId, rewardId, and pointsCost are required' });
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    // Check balance
    const balResult = await StudentActivity.aggregate([
      {
        $match: {
          branchId: req.user.branchId,
          studentId: mongoose.Types.ObjectId.isValid(studentId)
            ? new mongoose.Types.ObjectId(studentId)
            : studentId,
          activityType: 'points',
        },
      },
      { $group: { _id: null, balance: { $sum: '$points' } } },
    ]);
    const balance = balResult[0]?.balance || 0;
    if (balance < pointsCost)
      return res.status(400).json({
        success: false,
        message: `Insufficient points. Balance: ${balance}, Required: ${pointsCost}`,
      });
    const doc = await StudentActivity.create({
      studentId,
      activityType: 'points',
      points: -pointsCost,
      reason: `Redeemed: ${rewardName}`,
      data: { rewardId, rewardName, redemptionStatus: 'pending' },
      branchId: req.user.branchId,
      recordedBy: req.user._id,
      date: new Date(),
    });
    res.status(201).json({ success: true, data: doc, newBalance: balance - pointsCost });
  } catch (err) {
    safeError(res, err, 'redeem reward');
  }
});

// ── GET /redemptions ───────────────────────────────────────────────────────
router.get('/redemptions', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [] });
    const { beneficiaryId } = req.query;
    const filter = { branchId: req.user.branchId, activityType: 'points', points: { $lt: 0 } };
    if (beneficiaryId) filter.studentId = beneficiaryId;
    const data = await StudentActivity.find(filter).sort({ date: -1 }).limit(100).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'list redemptions');
  }
});

// ── GET /badges ────────────────────────────────────────────────────────────
router.get('/badges', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [] });
    const { beneficiaryId } = req.query;
    const filter = { branchId: req.user.branchId, activityType: 'badge' };
    if (beneficiaryId) filter.studentId = beneficiaryId;
    const data = await StudentActivity.find(filter).sort({ date: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'get badges');
  }
});

// ── POST /badges/award ─────────────────────────────────────────────────────
router.post(
  '/badges/award',
  requireRole('admin', 'manager', 'supervisor', 'clinician'),
  async (req, res) => {
    try {
      const { studentId, badgeName, badgeIcon, reason } = req.body;
      if (!studentId || !badgeName)
        return res
          .status(400)
          .json({ success: false, message: 'studentId and badgeName are required' });
      const StudentActivity = safeModel('StudentActivity');
      if (!StudentActivity)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await StudentActivity.create({
        studentId,
        activityType: 'badge',
        data: { badgeName, badgeIcon },
        reason,
        branchId: req.user.branchId,
        recordedBy: req.user._id,
        date: new Date(),
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'award badge');
    }
  }
);

// ── GET /leaderboard ───────────────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [] });
    const { limit = 10 } = req.query;
    const leaderboard = await StudentActivity.aggregate([
      { $match: { branchId: req.user.branchId, activityType: 'points' } },
      { $group: { _id: '$studentId', totalPoints: { $sum: '$points' } } },
      { $sort: { totalPoints: -1 } },
      { $limit: Number(limit) },
    ]);
    res.json({ success: true, data: leaderboard });
  } catch (err) {
    safeError(res, err, 'leaderboard');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.json({
        success: true,
        data: { totalPointsIssued: 0, totalRedemptions: 0, activeBadges: 0 },
      });
    const base = { branchId: req.user.branchId };
    const [issued, redemptions, badges] = await Promise.all([
      StudentActivity.aggregate([
        { $match: { ...base, activityType: 'points', points: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
      StudentActivity.countDocuments({ ...base, activityType: 'points', points: { $lt: 0 } }),
      StudentActivity.countDocuments({ ...base, activityType: 'badge' }),
    ]);
    res.json({
      success: true,
      data: {
        totalPointsIssued: issued[0]?.total || 0,
        totalRedemptions: redemptions,
        activeBadges: badges,
      },
    });
  } catch (err) {
    safeError(res, err, 'rewards store stats');
  }
});

module.exports = router;
