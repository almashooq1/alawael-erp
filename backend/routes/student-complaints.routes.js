'use strict';
/**
 * Student Complaints Routes — إدارة الشكاوى والمقترحات للطلاب والأولياء
 * ══════════════════════════════════════════════════════════════════════════
 * Full complaint lifecycle: submission → assignment → resolution → feedback.
 *
 *   GET    /                  list complaints (filtered)
 *   POST   /                  submit new complaint
 *   GET    /:id               get complaint details
 *   PATCH  /:id/assign        assign to staff member
 *   POST   /:id/notes         add internal note
 *   PATCH  /:id/resolve       mark as resolved
 *   PATCH  /:id/escalate      escalate complaint
 *   PATCH  /:id/reopen        reopen resolved complaint
 *   POST   /:id/feedback      submit satisfaction feedback
 *   GET    /categories        list complaint categories
 *   GET    /stats             complaint statistics
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

// We use the Communication model as the canonical complaint/feedback store
// (channel: 'complaint'), falling back to a generic object store pattern.

// ── GET / ──────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, status, category, priority, assignedTo } = req.query;
    const filter = { branchId: req.user.branchId, channel: 'complaint' };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Communication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Communication.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'list complaints');
  }
});

// ── POST / ─────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const { category, subject, description, priority = 'medium', attachments = [] } = req.body;
    if (!category || !description)
      return res
        .status(400)
        .json({ success: false, message: 'category and description are required' });
    const doc = await Communication.create({
      channel: 'complaint',
      branchId: req.user.branchId,
      category,
      subject,
      body: description,
      priority,
      attachments,
      status: 'open',
      direction: 'inbound',
      sender: { userId: req.user._id, name: req.user.name },
      notes: [],
    });
    res.status(201).json({
      success: true,
      data: doc,
      message: 'Complaint submitted successfully. Reference: ' + doc._id,
    });
  } catch (err) {
    safeError(res, err, 'submit complaint');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      channel: 'complaint',
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'get complaint');
  }
});

// ── PATCH /:id/assign ──────────────────────────────────────────────────────
router.patch('/:id/assign', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo)
      return res.status(400).json({ success: false, message: 'assignedTo is required' });
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, channel: 'complaint' },
      { assignedTo, assignedAt: new Date(), assignedBy: req.user._id, status: 'in_progress' },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'assign complaint');
  }
});

// ── POST /:id/notes ────────────────────────────────────────────────────────
router.post(
  '/:id/notes',
  requireRole('admin', 'manager', 'supervisor', 'clinician'),
  async (req, res) => {
    try {
      const { note, isInternal = true } = req.body;
      if (!note)
        return res.status(400).json({ success: false, message: 'note content is required' });
      const Communication = safeModel('Communication');
      if (!Communication)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await Communication.findOneAndUpdate(
        { _id: req.params.id, branchId: req.user.branchId, channel: 'complaint' },
        {
          $push: {
            notes: { content: note, isInternal, addedBy: req.user._id, addedAt: new Date() },
          },
        },
        { returnDocument: 'after' }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'Complaint not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'add complaint note');
    }
  }
);

// ── PATCH /:id/resolve ─────────────────────────────────────────────────────
router.patch('/:id/resolve', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { resolution, notifySubmitter = true } = req.body;
    if (!resolution)
      return res.status(400).json({ success: false, message: 'resolution is required' });
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      {
        _id: req.params.id,
        branchId: req.user.branchId,
        channel: 'complaint',
        status: { $ne: 'resolved' },
      },
      {
        status: 'resolved',
        resolution,
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
        notifySubmitter,
      },
      { returnDocument: 'after' }
    );
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: 'Complaint not found or already resolved' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'resolve complaint');
  }
});

// ── PATCH /:id/escalate ────────────────────────────────────────────────────
router.patch('/:id/escalate', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { reason, escalateTo } = req.body;
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, channel: 'complaint' },
      {
        isEscalated: true,
        escalatedTo: escalateTo,
        escalationReason: reason,
        escalatedAt: new Date(),
        escalatedBy: req.user._id,
        priority: 'urgent',
      },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'escalate complaint');
  }
});

// ── PATCH /:id/reopen ──────────────────────────────────────────────────────
router.patch('/:id/reopen', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { reason } = req.body;
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, channel: 'complaint', status: 'resolved' },
      { status: 'open', reopenReason: reason, reopenedAt: new Date(), reopenedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: 'Resolved complaint not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'reopen complaint');
  }
});

// ── POST /:id/feedback ─────────────────────────────────────────────────────
router.post('/:id/feedback', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, message: 'rating must be between 1 and 5' });
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Communication.findOneAndUpdate(
      {
        _id: req.params.id,
        'sender.userId': req.user._id,
        channel: 'complaint',
        status: 'resolved',
      },
      { customerRating: rating, customerFeedback: comment, feedbackAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: 'Resolved complaint not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'submit complaint feedback');
  }
});

// ── GET /categories ────────────────────────────────────────────────────────
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: [
      { key: 'service_quality', label: 'جودة الخدمة' },
      { key: 'staff_behavior', label: 'سلوك الموظف' },
      { key: 'facilities', label: 'المرافق والتسهيلات' },
      { key: 'scheduling', label: 'المواعيد والجدولة' },
      { key: 'billing', label: 'الفواتير والمدفوعات' },
      { key: 'privacy', label: 'الخصوصية والسرية' },
      { key: 'other', label: 'أخرى' },
    ],
  });
});

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Communication = safeModel('Communication');
    if (!Communication)
      return res.json({ success: true, data: { total: 0, open: 0, resolved: 0, escalated: 0 } });
    const base = { branchId: req.user.branchId, channel: 'complaint' };
    const [total, open, resolved, escalated] = await Promise.all([
      Communication.countDocuments(base),
      Communication.countDocuments({ ...base, status: 'open' }),
      Communication.countDocuments({ ...base, status: 'resolved' }),
      Communication.countDocuments({ ...base, isEscalated: true }),
    ]);
    res.json({
      success: true,
      data: {
        total,
        open,
        resolved,
        escalated,
        resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0,
      },
    });
  } catch (err) {
    safeError(res, err, 'complaint stats');
  }
});

module.exports = router;
