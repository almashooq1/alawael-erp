/* eslint-disable no-unused-vars */
/**
 * Advanced Tickets Routes
 * مسارات نظام التذاكر المتقدم
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const AdvancedTicket = require('../models/AdvancedTicket');

router.use(authenticate);

// ─── SLA stats (before /:id) ─────────────────────────────────────────────────
router.get('/stats/sla', async (req, res) => {
  try {
    const total = await AdvancedTicket.countDocuments();
    const breached = await AdvancedTicket.countDocuments({ 'sla.isBreached': true });
    const byStatus = await AdvancedTicket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const byPriority = await AdvancedTicket.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]);
    const stats = { total, breached, withinSLA: total - breached, byStatus: {}, byPriority: {} };
    byStatus.forEach((s) => { stats.byStatus[s._id] = s.count; });
    byPriority.forEach((p) => { stats.byPriority[p._id] = p.count; });
    res.json({ success: true, data: stats, message: 'إحصائيات SLA' });
  } catch (error) {
    logger.error('Error fetching SLA stats:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات SLA' });
  }
});

// ─── List tickets ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, priority, category, assignee, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignee) filter.assignee = assignee;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      AdvancedTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      AdvancedTicket.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total }, message: 'قائمة التذاكر' });
  } catch (error) {
    logger.error('Error fetching tickets:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التذاكر' });
  }
});

// ─── Get single ticket ───────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const ticket = await AdvancedTicket.findById(req.params.id).lean();
    if (!ticket) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    res.json({ success: true, data: ticket, message: 'بيانات التذكرة' });
  } catch (error) {
    logger.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب التذكرة' });
  }
});

// ─── Create ticket ───────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'العنوان والوصف مطلوبان' });
    }
    const count = await AdvancedTicket.countDocuments();
    const ticketId = `TKT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const slaMap = { low: 48, medium: 24, high: 8, critical: 4 };
    const p = priority || 'medium';
    const ticket = await AdvancedTicket.create({
      ticketId, title, description, category: category || 'general',
      priority: p, reporter: req.user.id, reporterName: req.user.name || req.user.email,
      sla: { responseTime: slaMap[p] || 24, resolutionTime: (slaMap[p] || 24) * 3 },
    });
    res.status(201).json({ success: true, data: ticket, message: 'تم إنشاء التذكرة بنجاح' });
  } catch (error) {
    logger.error('Error creating ticket:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء التذكرة' });
  }
});

// ─── Update ticket ───────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.status === 'resolved' || updates.status === 'closed') {
      updates['sla.resolvedAt'] = new Date();
    }
    const ticket = await AdvancedTicket.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
    if (!ticket) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    res.json({ success: true, data: ticket, message: 'تم تحديث التذكرة بنجاح' });
  } catch (error) {
    logger.error('Error updating ticket:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث التذكرة' });
  }
});

// ─── Escalate ticket ─────────────────────────────────────────────────────────
router.post('/:id/escalate', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const ticket = await AdvancedTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    const currentLevel = ticket.escalations.length;
    ticket.escalations.push({
      level: currentLevel + 1,
      escalatedTo: req.body.escalatedTo,
      escalatedToName: req.body.escalatedToName,
      reason: req.body.reason || 'تصعيد إداري',
    });
    ticket.status = 'escalated';
    await ticket.save();
    res.json({ success: true, data: ticket, message: 'تم تصعيد التذكرة' });
  } catch (error) {
    logger.error('Error escalating ticket:', error);
    res.status(500).json({ success: false, message: 'خطأ في تصعيد التذكرة' });
  }
});

// ─── Add comment ─────────────────────────────────────────────────────────────
router.post('/:id/comments', async (req, res) => {
  try {
    const ticket = await AdvancedTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'التذكرة غير موجودة' });
    ticket.comments.push({
      author: req.user.id,
      authorName: req.user.name || req.user.email,
      content: req.body.content,
      isInternal: req.body.isInternal || false,
    });
    // Track first response for SLA
    if (!ticket.sla.firstResponseAt && ticket.assignee?.toString() === req.user.id) {
      ticket.sla.firstResponseAt = new Date();
    }
    await ticket.save();
    res.status(201).json({ success: true, data: ticket, message: 'تم إضافة التعليق' });
  } catch (error) {
    logger.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: 'خطأ في إضافة التعليق' });
  }
});

module.exports = router;
