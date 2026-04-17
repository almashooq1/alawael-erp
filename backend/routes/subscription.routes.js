/**
 * Subscription Routes — مسارات الاشتراكات
 * Manage subscription plans and user subscriptions
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');
const logger = require('../utils/logger');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// ══════════════════════════════════════════════════════════════════
// PLANS — إدارة خطط الاشتراك
// ══════════════════════════════════════════════════════════════════

/** GET /api/subscriptions/plans — list all plans */
router.get('/plans', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { active } = req.query;
    const filter =
      active !== undefined
        ? { isActive: active === 'true', ...branchFilter(req) }
        : { ...branchFilter(req) };
    const plans = await SubscriptionPlan.find(filter).sort({ 'price.monthly': 1 });
    res.json({ success: true, data: plans, count: plans.length });
  } catch (err) {
    safeError(res, err, 'subscription plans list error');
  }
});

/** GET /api/subscriptions/plans/:id — get one plan */
router.get('/plans/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, data: plan });
  } catch (err) {
    safeError(res, err, 'subscription plan get error');
  }
});

/** POST /api/subscriptions/plans — create plan (admin) */
router.post(
  '/plans',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const body = stripUpdateMeta(req.body);
      if (req.branchScope && req.branchScope.branchId) {
        body.branchId = req.branchScope.branchId;
      }
      const plan = await SubscriptionPlan.create(body);
      res.status(201).json({ success: true, data: plan });
    } catch (err) {
      logger.error('subscription plan create error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** PUT /api/subscriptions/plans/:id — update plan (admin) */
router.put(
  '/plans/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const plan = await SubscriptionPlan.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        stripUpdateMeta(req.body),
        {
          new: true,
          runValidators: true,
        }
      );
      if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
      res.json({ success: true, data: plan });
    } catch (err) {
      logger.error('subscription plan update error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** DELETE /api/subscriptions/plans/:id — delete plan (admin) */
router.delete(
  '/plans/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const activeUsers = await UserSubscription.countDocuments({
        planId: req.params.id,
        status: 'active',
      });
      if (activeUsers > 0) {
        return res
          .status(400)
          .json({ success: false, message: `Cannot delete: ${activeUsers} active subscribers` });
      }
      const plan = await SubscriptionPlan.findOneAndDelete({
        _id: req.params.id,
        ...branchFilter(req),
      });
      if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
      res.json({ success: true, message: 'Plan deleted' });
    } catch (err) {
      safeError(res, err, 'subscription plan delete error');
    }
  }
);

// ══════════════════════════════════════════════════════════════════
// USER SUBSCRIPTIONS — اشتراكات المستخدمين
// ══════════════════════════════════════════════════════════════════

/** GET /api/subscriptions — list subscriptions (admin: all, user: own) */
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    const filter = { ...branchFilter(req) };
    if (req.user.role !== 'admin') filter.userId = req.user._id;
    if (status) filter.status = status;

    const [subs, total] = await Promise.all([
      UserSubscription.find(filter)
        .populate('planId', 'name price')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(+limit),
      UserSubscription.countDocuments(filter),
    ]);
    res.json({ success: true, data: subs, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    safeError(res, err, 'subscriptions list error');
  }
});

/** GET /api/subscriptions/my — get current user subscription */
router.get('/my', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const sub = await UserSubscription.findOne({ userId: req.user._id, status: 'active' }).populate(
      'planId'
    );
    res.json({ success: true, data: sub });
  } catch (err) {
    safeError(res, err, 'my subscription error');
  }
});

/** POST /api/subscriptions — subscribe user to a plan */
router.post('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { planId, subscriptionType = 'monthly', paymentMethod } = req.body;
    const plan = await SubscriptionPlan.findOne({ _id: planId, ...branchFilter(req) });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    if (!plan.isActive)
      return res.status(400).json({ success: false, message: 'Plan is not active' });

    // Check for existing active subscription
    const existing = await UserSubscription.findOne({ userId: req.user._id, status: 'active' });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: 'Already subscribed. Cancel or upgrade first.' });

    const price = subscriptionType === 'annual' ? plan.price.annual : plan.price.monthly;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (subscriptionType === 'annual' ? 12 : 1));

    const sub = await UserSubscription.create({
      userId: req.user._id,
      planId,
      status: 'active',
      subscriptionType,
      startDate,
      endDate,
      autoRenew: true,
      price: { original: price, discountedPrice: price, currency: 'SAR' },
      paymentMethod: paymentMethod || 'manual',
      ...(req.branchScope && req.branchScope.branchId
        ? { branchId: req.branchScope.branchId }
        : {}),
    });
    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    logger.error('subscription create error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/subscriptions/:id/upgrade — upgrade plan */
router.put('/:id/upgrade', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const sub = await UserSubscription.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
    const { newPlanId } = req.body;
    const newPlan = await SubscriptionPlan.findOne({ _id: newPlanId, ...branchFilter(req) });
    if (!newPlan) return res.status(404).json({ success: false, message: 'New plan not found' });
    const price = sub.subscriptionType === 'annual' ? newPlan.price.annual : newPlan.price.monthly;
    await sub.upgradePlan(newPlanId, price);
    res.json({ success: true, data: sub });
  } catch (err) {
    logger.error('subscription upgrade error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/subscriptions/:id/cancel — cancel subscription */
router.put('/:id/cancel', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const sub = await UserSubscription.findOne({ _id: req.params.id, ...branchFilter(req) });
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
    await sub.cancelSubscription(req.body.reason || 'User requested');
    res.json({ success: true, data: sub });
  } catch (err) {
    logger.error('subscription cancel error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/subscriptions/expiring — subscriptions expiring soon (admin) */
router.get(
  '/expiring',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const subs = await UserSubscription.getExpiringSubscriptions(+days);
      res.json({ success: true, data: subs, count: subs.length });
    } catch (err) {
      safeError(res, err, 'expiring subscriptions error');
    }
  }
);

/** GET /api/subscriptions/stats — subscription statistics (admin) */
router.get('/stats', requireAuth, requireBranchAccess, requireRole(['admin']), async (req, res) => {
  try {
    const [total, active, cancelled, expired, byPlan] = await Promise.all([
      UserSubscription.countDocuments(),
      UserSubscription.countDocuments({ status: 'active' }),
      UserSubscription.countDocuments({ status: 'cancelled' }),
      UserSubscription.countDocuments({ status: 'expired' }),
      UserSubscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$planId', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'subscriptionplans',
            localField: '_id',
            foreignField: '_id',
            as: 'plan',
          },
        },
        { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
        { $project: { planName: '$plan.name', count: 1 } },
      ]),
    ]);
    res.json({ success: true, data: { total, active, cancelled, expired, byPlan } });
  } catch (err) {
    safeError(res, err, 'subscription stats error');
  }
});

module.exports = router;
