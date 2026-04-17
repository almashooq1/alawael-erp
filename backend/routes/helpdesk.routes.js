const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { validate } = require('../middleware/validate');
const { schemas } = require('../middleware/validationSchemas');
const { HelpDeskTicket, HelpDeskArticle } = require('../models/HelpDesk');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

/** Max page size to prevent memory exhaustion */
const MAX_PAGE_LIMIT = 100;
const clampLimit = v => Math.max(1, Math.min(parseInt(v, 10) || 10, MAX_PAGE_LIMIT));

/** Guard: reject invalid ObjectIds early (400 instead of CastError 500) */
const validObjectId = (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'معرف غير صالح' });
    return false;
  }
  return true;
};

// ── Dashboard ────────────────────────────────────────────────────────
router.get('/dashboard', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const [total, open, inProgress, resolved, critical] = await Promise.all([
      HelpDeskTicket.countDocuments(),
      HelpDeskTicket.countDocuments({ status: 'open' }),
      HelpDeskTicket.countDocuments({ status: 'in_progress' }),
      HelpDeskTicket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      HelpDeskTicket.countDocuments({
        priority: 'critical',
        status: { $nin: ['resolved', 'closed'] },
      }),
    ]);

    const byCategory = await HelpDeskTicket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const byPriority = await HelpDeskTicket.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const recentTickets = await HelpDeskTicket.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('ticketNumber titleAr category priority status createdAt')
      .lean();

    res.json({
      success: true,
      data: {
        total,
        open,
        inProgress,
        resolved,
        critical,
        slaBreached: await HelpDeskTicket.countDocuments({
          slaBreached: true,
          status: { $nin: ['resolved', 'closed'] },
        }),
        byCategory: byCategory.map(c => ({ category: c._id, count: c.count })),
        byPriority: byPriority.map(p => ({ priority: p._id, count: p.count })),
        recentTickets,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب بيانات لوحة التحكم', error: safeError(error) });
  }
});

// ── Tickets CRUD ─────────────────────────────────────────────────────
router.get('/tickets', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { status, priority, category, page = 1, limit: rawLimit = 10 } = req.query;
    const limit = clampLimit(rawLimit);
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const [data, total] = await Promise.all([
      HelpDeskTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .populate('requester', 'name email')
        .populate('assignedTo', 'name email')
        .lean(),
      HelpDeskTicket.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { total, page: +page, limit: +limit } });
  } catch (error) {
    safeError(res, error, 'helpdesk');
  }
});

router.post(
  '/tickets',
  authenticate,
  requireBranchAccess,
  validate(schemas.helpdesk.createTicket),
  async (req, res) => {
    try {
      const ticket = new HelpDeskTicket({ ...req.body, requester: req.user._id });
      await ticket.save();
      res.status(201).json({ success: true, data: ticket, message: 'تم إنشاء التذكرة بنجاح' });
    } catch (error) {
      safeError(res, error, 'helpdesk');
    }
  }
);

router.put('/tickets/:id', authenticate, requireBranchAccess, async (req, res) => {
  if (!validObjectId(req, res)) return;
  try {
    const ticket = await HelpDeskTicket.findByIdAndUpdate(
      req.params.id,
      stripUpdateMeta(req.body),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!ticket) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    safeError(res, error, 'helpdesk');
  }
});

router.delete(
  '/tickets/:id',
  authenticate,
  requireBranchAccess,
  authorize('admin'),
  async (req, res) => {
    if (!validObjectId(req, res)) return;
    try {
      const ticket = await HelpDeskTicket.findByIdAndDelete(req.params.id);
      if (!ticket) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
      res.json({ success: true, message: 'تم حذف التذكرة بنجاح' });
    } catch (error) {
      safeError(res, error, 'helpdesk');
    }
  }
);

// ── Ticket comments ──────────────────────────────────────────────────
router.post('/tickets/:id/comments', authenticate, requireBranchAccess, async (req, res) => {
  if (!validObjectId(req, res)) return;
  try {
    const ticket = await HelpDeskTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    ticket.comments.push({
      user: req.user._id,
      text: req.body.text,
      isInternal: req.body.isInternal || false,
    });
    await ticket.save();
    res.json({ success: true, data: ticket });
  } catch (error) {
    safeError(res, error, 'helpdesk');
  }
});

// ── Knowledge Articles ───────────────────────────────────────────────
router.get('/articles', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { category, status = 'published', page = 1, limit: rawLimit = 10 } = req.query;
    const limit = clampLimit(rawLimit);
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      HelpDeskArticle.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      HelpDeskArticle.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { total, page: +page, limit: +limit } });
  } catch (error) {
    safeError(res, error, 'helpdesk');
  }
});

router.post('/articles', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const article = new HelpDeskArticle({ ...req.body, createdBy: req.user._id });
    await article.save();
    res.status(201).json({ success: true, data: article });
  } catch (error) {
    safeError(res, error, 'helpdesk');
  }
});

module.exports = router;
