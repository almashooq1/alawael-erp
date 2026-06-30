'use strict';

const router = require('express').Router();
const walletService = require('../services/digitalWallet.service');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
const escapeRegex = require('../utils/escapeRegex');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Ownership guard — ensures the authenticated user owns the wallet (or is admin/finance).
 * Must run AFTER authenticate and BEFORE the route handler.
 */
const requireWalletAccess = wrap(async (req, res, next) => {
  const DigitalWallet = require('../models/DigitalWallet');
  const wallet = await DigitalWallet.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!wallet) {
    return res.status(404).json({ success: false, message: 'المحفظة غير موجودة' });
  }
  const userRole = req.user?.role;
  const userId = String(req.user?._id || req.user?.id);
  const isPrivileged = ['admin', 'super_admin', 'finance'].includes(userRole);
  const isOwner = String(wallet.ownerId) === userId || String(wallet.createdBy) === userId;
  if (!isPrivileged && !isOwner) {
    return res.status(403).json({ success: false, message: 'لا تملك صلاحية للوصول لهذه المحفظة' });
  }
  req.wallet = wallet; // cache for handler
  next();
});

// ── قائمة المحافظ ────────────────────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const data = await walletService.list({ ...req.query, branchId: effectiveBranchScope(req) });
    res.json({ success: true, ...data });
  })
);

// ── إحصائيات ─────────────────────────────────────────────────────────────────
router.get(
  '/stats',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const data = await walletService.getStats(effectiveBranchScope(req));
    res.json({ success: true, data });
  })
);

// ── إنشاء محفظة ──────────────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const wallet = await walletService.createWallet(
      req.body.ownerType,
      req.body.ownerId,
      effectiveBranchScope(req),
      req.user._id
    );
    res.status(201).json({ success: true, data: wallet });
  })
);

// ── عرض محفظة واحدة ──────────────────────────────────────────────────────────
router.get(
  '/:id',
  authenticate,
  requireBranchAccess,
  requireWalletAccess,
  wrap(async (req, res) => {
    const DigitalWallet = require('../models/DigitalWallet');
    const wallet = await DigitalWallet.findOne({ _id: req.params.id, deletedAt: null });
    if (!wallet) return res.status(404).json({ success: false, message: 'المحفظة غير موجودة' });
    res.json({ success: true, data: wallet });
  })
);

// ── شحن المحفظة ──────────────────────────────────────────────────────────────
router.post(
  '/:id/topup',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const data = await walletService.topUp(
      req.params.id,
      Number(req.body.amount),
      req.body.source || 'manual',
      req.body.metadata || {},
      req.user._id
    );
    res.json({ success: true, data });
  })
);

// ── خصم من المحفظة ───────────────────────────────────────────────────────────
router.post(
  '/:id/debit',
  authenticate,
  requireBranchAccess,
  requireWalletAccess,
  wrap(async (req, res) => {
    const data = await walletService.debit(
      req.params.id,
      Number(req.body.amount),
      req.body.description,
      req.body.relatedType || null,
      req.body.relatedId || null,
      req.user._id
    );
    res.json({ success: true, data });
  })
);

// ── تحويل بين المحافظ ────────────────────────────────────────────────────────
router.post(
  '/:id/transfer',
  authenticate,
  requireBranchAccess,
  requireWalletAccess,
  wrap(async (req, res) => {
    const data = await walletService.transfer(
      req.params.id,
      req.body.targetWalletNumber || req.body.targetWalletId,
      Number(req.body.amount),
      req.user._id
    );
    res.json({ success: true, data });
  })
);

// ── تطبيق كوبون خصم ──────────────────────────────────────────────────────────
router.post(
  '/:id/apply-coupon',
  authenticate,
  requireBranchAccess,
  requireWalletAccess,
  wrap(async (req, res) => {
    const data = await walletService.applyCoupon(
      req.body.couponCode,
      Number(req.body.orderAmount),
      req.body.beneficiaryId,
      effectiveBranchScope(req)
    );
    res.json({ success: true, data });
  })
);

// ── استرداد نقاط الولاء ──────────────────────────────────────────────────────
router.post(
  '/:id/redeem-loyalty',
  authenticate,
  requireBranchAccess,
  requireWalletAccess,
  wrap(async (req, res) => {
    const data = await walletService.redeemLoyaltyPoints(
      req.params.id,
      Number(req.body.points),
      req.user._id
    );
    res.json({ success: true, data });
  })
);

// ── كشف حساب المحفظة ─────────────────────────────────────────────────────────
router.get(
  '/:id/statement',
  authenticate,
  requireBranchAccess,
  requireWalletAccess,
  wrap(async (req, res) => {
    const data = await walletService.getStatement(
      req.params.id,
      req.query.from || req.query.dateFrom,
      req.query.to || req.query.dateTo
    );
    res.json({ success: true, data });
  })
);

// ── تجميد / إلغاء تجميد المحفظة ─────────────────────────────────────────────
router.post(
  '/:id/block',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const data = await walletService.blockWallet(req.params.id, req.body.reason, req.user._id);
    res.json({ success: true, data });
  })
);

router.post(
  '/:id/unblock',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const data = await walletService.unblockWallet(req.params.id, req.user._id);
    res.json({ success: true, data });
  })
);

// ── قائمة الكوبونات ──────────────────────────────────────────────────────────
router.get(
  '/coupons/list',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance', 'manager']),
  wrap(async (req, res) => {
    const DiscountCoupon = require('../models/DiscountCoupon');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 15;
    const query = { deletedAt: null };
    if (req.query.search) query.code = new RegExp(escapeRegex(req.query.search), 'i');
    const [docs, total] = await Promise.all([
      DiscountCoupon.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      DiscountCoupon.countDocuments(query),
    ]);
    res.json({ success: true, docs, total, page, pages: Math.ceil(total / limit) });
  })
);

// ── إنشاء كوبون ──────────────────────────────────────────────────────────────
router.post(
  '/coupons',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'finance']),
  wrap(async (req, res) => {
    const DiscountCoupon = require('../models/DiscountCoupon');
    const coupon = await DiscountCoupon.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: coupon });
  })
);

// ── تاريخ نقاط الولاء ────────────────────────────────────────────────────────
router.get(
  '/:id/loyalty-history',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    const LoyaltyPointsTransaction = require('../models/LoyaltyPointsTransaction');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 20;
    const query = { walletId: req.params.id, deletedAt: null };
    const [docs, total] = await Promise.all([
      LoyaltyPointsTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      LoyaltyPointsTransaction.countDocuments(query),
    ]);
    res.json({ success: true, docs, total, page });
  })
);

module.exports = router;
