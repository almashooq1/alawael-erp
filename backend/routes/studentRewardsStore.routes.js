/**
 * Student Rewards Store Routes
 * مسارات متجر المكافآت للطلاب
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// ─── Reward Item Schema ──────────────────────────────────────────────────────
const rewardItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameEn: String,
    description: String,
    category: {
      type: String,
      enum: ['ألعاب', 'أدوات مدرسية', 'إلكترونيات', 'كتب', 'رحلات', 'تجارب', 'امتيازات', 'هدايا'],
      required: true,
    },
    pointsCost: { type: Number, required: true, min: 1 },
    image: String,
    icon: String,
    stock: { type: Number, default: -1 }, // -1 = unlimited
    isActive: { type: Boolean, default: true },
    isVirtual: { type: Boolean, default: false }, // مكافأة افتراضية أم مادية
    minAge: Number,
    maxAge: Number,
    tags: [String],
  },
  { timestamps: true }
);

let RewardItem;
try {
  RewardItem = mongoose.model('RewardItem');
} catch {
  RewardItem = mongoose.model('RewardItem', rewardItemSchema);
}

// ─── Reward Transaction Schema ───────────────────────────────────────────────
const rewardTransactionSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['كسب', 'استبدال', 'مكافأة', 'خصم', 'تعديل'], required: true },
    points: { type: Number, required: true }, // موجب للكسب، سالب للاستبدال
    reason: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'حضور',
        'سلوك',
        'أكاديمي',
        'مشاركة',
        'تحدي',
        'إنجاز',
        'استبدال مكافأة',
        'مكافأة إدارية',
        'خصم سلوكي',
        'تعديل يدوي',
      ],
    },
    rewardItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardItem' },
    rewardItemName: String,
    status: {
      type: String,
      enum: ['مكتمل', 'قيد المعالجة', 'ملغي', 'قيد التسليم', 'تم التسليم'],
      default: 'مكتمل',
    },
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    awardedByName: String,
    balanceAfter: Number,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

rewardTransactionSchema.index({ studentId: 1, createdAt: -1 });

let RewardTransaction;
try {
  RewardTransaction = mongoose.model('RewardTransaction');
} catch {
  RewardTransaction = mongoose.model('RewardTransaction', rewardTransactionSchema);
}

// ─── Badge Schema ────────────────────────────────────────────────────────────
const badgeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameEn: String,
    description: String,
    icon: String,
    image: String,
    category: {
      type: String,
      enum: ['أكاديمي', 'سلوكي', 'حضور', 'اجتماعي', 'رياضي', 'إبداعي', 'خاص'],
    },
    criteria: String,
    pointsRequired: Number,
    rarity: { type: String, enum: ['عادي', 'نادر', 'نادر جداً', 'أسطوري'], default: 'عادي' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

let Badge;
try {
  Badge = mongoose.model('StudentBadge');
} catch {
  Badge = mongoose.model('StudentBadge', badgeSchema);
}

// ─── Student Badge Earned Schema ─────────────────────────────────────────────
const studentBadgeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  badgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentBadge', required: true },
  earnedAt: { type: Date, default: Date.now },
  awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: String,
});

let StudentBadgeEarned;
try {
  StudentBadgeEarned = mongoose.model('StudentBadgeEarned');
} catch {
  StudentBadgeEarned = mongoose.model('StudentBadgeEarned', studentBadgeSchema);
}

// ─── Helper: Get Balance ─────────────────────────────────────────────────────
async function getBalance(studentId) {
  const result = await RewardTransaction.aggregate([
    { $match: { studentId: new mongoose.Types.ObjectId(studentId), status: { $ne: 'ملغي' } } },
    { $group: { _id: null, total: { $sum: '$points' } } },
  ]);
  return result[0]?.total || 0;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /balance — رصيد النقاط
router.get('/:studentId/balance', async (req, res) => {
  try {
    const balance = await getBalance(req.params.studentId);
    const studentId = new mongoose.Types.ObjectId(req.params.studentId);

    const [earnedTotal, spentTotal, badgeCount] = await Promise.all([
      RewardTransaction.aggregate([
        { $match: { studentId, points: { $gt: 0 }, status: { $ne: 'ملغي' } } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
      RewardTransaction.aggregate([
        { $match: { studentId, points: { $lt: 0 }, status: { $ne: 'ملغي' } } },
        { $group: { _id: null, total: { $sum: '$points' } } },
      ]),
      StudentBadgeEarned.countDocuments({ studentId }),
    ]);

    res.json({
      success: true,
      data: {
        balance,
        totalEarned: earnedTotal[0]?.total || 0,
        totalSpent: Math.abs(spentTotal[0]?.total || 0),
        badgeCount,
        level:
          balance >= 1000 ? 'ذهبي' : balance >= 500 ? 'فضي' : balance >= 200 ? 'برونزي' : 'مبتدئ',
        nextLevelPoints:
          balance >= 1000
            ? 0
            : balance >= 500
              ? 1000 - balance
              : balance >= 200
                ? 500 - balance
                : 200 - balance,
      },
    });
  } catch (err) {
    logger.error('Rewards balance error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب رصيد النقاط' });
  }
});

// GET /store — عرض المتجر (المكافآت المتاحة)
router.get('/:studentId/store', async (req, res) => {
  try {
    const { category, minPoints, maxPoints, search } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (minPoints || maxPoints) {
      filter.pointsCost = {};
      if (minPoints) filter.pointsCost.$gte = parseInt(minPoints);
      if (maxPoints) filter.pointsCost.$lte = parseInt(maxPoints);
    }
    if (search) filter.name = { $regex: search, $options: 'i' };

    const items = await RewardItem.find(filter).sort({ pointsCost: 1 }).lean();
    const balance = await getBalance(req.params.studentId);

    // إضافة حالة "يمكن الشراء" لكل عنصر
    const enriched = items.map(item => ({
      ...item,
      canRedeem: balance >= item.pointsCost && (item.stock === -1 || item.stock > 0),
    }));

    const categories = await RewardItem.distinct('category', { isActive: true });
    res.json({ success: true, data: enriched, balance, categories });
  } catch (err) {
    logger.error('Rewards store error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب متجر المكافآت' });
  }
});

// POST /redeem — استبدال نقاط بمكافأة
router.post('/:studentId/redeem', async (req, res) => {
  try {
    const { rewardItemId } = req.body;
    const item = await RewardItem.findById(rewardItemId);
    if (!item || !item.isActive)
      return res.status(404).json({ success: false, message: 'المكافأة غير متوفرة' });
    if (item.stock === 0)
      return res.status(400).json({ success: false, message: 'المكافأة نفدت من المخزون' });

    const balance = await getBalance(req.params.studentId);
    if (balance < item.pointsCost) {
      return res
        .status(400)
        .json({
          success: false,
          message: `رصيدك (${balance}) غير كافٍ. تحتاج ${item.pointsCost} نقطة`,
        });
    }

    const newBalance = balance - item.pointsCost;
    const transaction = new RewardTransaction({
      studentId: req.params.studentId,
      type: 'استبدال',
      points: -item.pointsCost,
      reason: `استبدال: ${item.name}`,
      category: 'استبدال مكافأة',
      rewardItemId: item._id,
      rewardItemName: item.name,
      status: item.isVirtual ? 'مكتمل' : 'قيد التسليم',
      balanceAfter: newBalance,
    });
    await transaction.save();

    // تحديث المخزون
    if (item.stock > 0) {
      item.stock -= 1;
      await item.save();
    }

    res.status(201).json({
      success: true,
      data: transaction,
      balance: newBalance,
      message: `تم استبدال ${item.pointsCost} نقطة بـ "${item.name}" بنجاح!`,
    });
  } catch (err) {
    logger.error('Rewards redeem error:', err);
    res.status(500).json({ success: false, message: 'خطأ في استبدال المكافأة' });
  }
});

// GET /transactions — سجل المعاملات
router.get('/:studentId/transactions', async (req, res) => {
  try {
    const { type, category, page = 1, limit = 20 } = req.query;
    const filter = { studentId: req.params.studentId };
    if (type) filter.type = type;
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      RewardTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      RewardTransaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('Rewards transactions error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب سجل المعاملات' });
  }
});

// GET /badges — شارات الطالب
router.get('/:studentId/badges', async (req, res) => {
  try {
    const earnedBadges = await StudentBadgeEarned.find({ studentId: req.params.studentId })
      .populate('badgeId')
      .sort({ earnedAt: -1 })
      .lean();

    const allBadges = await Badge.find({ isActive: true }).lean();
    const earnedIds = new Set(earnedBadges.map(b => b.badgeId?._id?.toString()));

    const badgesWithStatus = allBadges.map(badge => ({
      ...badge,
      earned: earnedIds.has(badge._id.toString()),
      earnedAt: earnedBadges.find(e => e.badgeId?._id?.toString() === badge._id.toString())
        ?.earnedAt,
    }));

    res.json({
      success: true,
      data: {
        earned: badgesWithStatus.filter(b => b.earned),
        available: badgesWithStatus.filter(b => !b.earned),
        totalEarned: earnedBadges.length,
        totalAvailable: allBadges.length,
      },
    });
  } catch (err) {
    logger.error('Rewards badges error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الشارات' });
  }
});

// GET /leaderboard — لوحة المتصدرين
router.get('/:studentId/leaderboard', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    let dateFilter = {};
    const now = new Date();
    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { createdAt: { $gte: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { createdAt: { $gte: monthAgo } };
    }

    const leaderboard = await RewardTransaction.aggregate([
      { $match: { points: { $gt: 0 }, status: { $ne: 'ملغي' }, ...dateFilter } },
      {
        $group: { _id: '$studentId', totalPoints: { $sum: '$points' }, transactions: { $sum: 1 } },
      },
      { $sort: { totalPoints: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          studentId: '$_id',
          studentName: { $ifNull: ['$student.fullName', 'طالب'] },
          totalPoints: 1,
          transactions: 1,
        },
      },
    ]);

    // إيجاد ترتيب الطالب الحالي
    const myRank = leaderboard.findIndex(l => l.studentId.toString() === req.params.studentId) + 1;

    res.json({
      success: true,
      data: {
        leaderboard,
        myRank: myRank || 'غير مصنف',
        period,
      },
    });
  } catch (err) {
    logger.error('Rewards leaderboard error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب لوحة المتصدرين' });
  }
});

// POST /award — منح نقاط (للمعلمين/الإدارة)
router.post('/:studentId/award', async (req, res) => {
  try {
    const { points, reason, category } = req.body;
    if (!points || points <= 0)
      return res.status(400).json({ success: false, message: 'يجب تحديد عدد النقاط' });

    const balance = await getBalance(req.params.studentId);
    const newBalance = balance + points;

    const transaction = new RewardTransaction({
      studentId: req.params.studentId,
      type: 'مكافأة',
      points,
      reason,
      category: category || 'مكافأة إدارية',
      awardedBy: req.user?._id,
      awardedByName: req.user?.fullName,
      balanceAfter: newBalance,
    });
    await transaction.save();

    res.status(201).json({
      success: true,
      data: transaction,
      balance: newBalance,
      message: `تم منح ${points} نقطة بنجاح`,
    });
  } catch (err) {
    logger.error('Rewards award error:', err);
    res.status(500).json({ success: false, message: 'خطأ في منح النقاط' });
  }
});

module.exports = router;
