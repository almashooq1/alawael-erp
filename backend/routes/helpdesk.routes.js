/* eslint-disable no-unused-vars */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { HelpDeskTicket, HelpDeskArticle } = require('../models/HelpDesk');

// ── Dashboard ────────────────────────────────────────────────────────
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [total, open, inProgress, resolved, critical] = await Promise.all([
      HelpDeskTicket.countDocuments(),
      HelpDeskTicket.countDocuments({ status: 'open' }),
      HelpDeskTicket.countDocuments({ status: 'in_progress' }),
      HelpDeskTicket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      HelpDeskTicket.countDocuments({ priority: 'critical', status: { $nin: ['resolved', 'closed'] } }),
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
        total, open, inProgress, resolved, critical,
        slaBreached: await HelpDeskTicket.countDocuments({ slaBreached: true, status: { $nin: ['resolved', 'closed'] } }),
        byCategory: byCategory.map((c) => ({ category: c._id, count: c.count })),
        byPriority: byPriority.map((p) => ({ priority: p._id, count: p.count })),
        recentTickets,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات لوحة التحكم', error: error.message });
  }
});

// ── Tickets CRUD ─────────────────────────────────────────────────────
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const { status, priority, category, page = 1, limit = 10 } = req.query;
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
    res.status(500).json({ success: false, message: 'خطأ في جلب التذاكر', error: error.message });
  }
});

router.post('/tickets', authenticate, async (req, res) => {
  try {
    const ticket = new HelpDeskTicket({ ...req.body, requester: req.user._id });
    await ticket.save();
    res.status(201).json({ success: true, data: ticket, message: 'تم إنشاء التذكرة بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في إنشاء التذكرة', error: error.message });
  }
});

router.put('/tickets/:id', authenticate, async (req, res) => {
  try {
    const ticket = await HelpDeskTicket.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث التذكرة', error: error.message });
  }
});

router.delete('/tickets/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const ticket = await HelpDeskTicket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    res.json({ success: true, message: 'تم حذف التذكرة بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في حذف التذكرة', error: error.message });
  }
});

// ── Ticket comments ──────────────────────────────────────────────────
router.post('/tickets/:id/comments', authenticate, async (req, res) => {
  try {
    const ticket = await HelpDeskTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    ticket.comments.push({ user: req.user._id, text: req.body.text, isInternal: req.body.isInternal || false });
    await ticket.save();
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في إضافة التعليق', error: error.message });
  }
});

// ── Knowledge Articles ───────────────────────────────────────────────
router.get('/articles', authenticate, async (req, res) => {
  try {
    const { category, status = 'published', page = 1, limit = 10 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      HelpDeskArticle.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit).lean(),
      HelpDeskArticle.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { total, page: +page, limit: +limit } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب المقالات', error: error.message });
  }
});

router.post('/articles', authenticate, async (req, res) => {
  try {
    const article = new HelpDeskArticle({ ...req.body, createdBy: req.user._id });
    await article.save();
    res.status(201).json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في إنشاء المقالة', error: error.message });
  }
});

module.exports = router;
