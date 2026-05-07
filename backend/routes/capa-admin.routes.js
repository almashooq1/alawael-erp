/**
 * CAPA Admin Routes — مسارات إدارة الإجراءات التصحيحية والوقائية (CAPA)
 *
 * CRUD كامل + انتقالات دورة الحياة لنموذج CorrectiveAction:
 *   open → in_progress → pending_review → resolved → closed
 *                     ↘ escalated / overdue (تلقائي أو يدوي)
 *
 * @module routes/capa-admin
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

const getModel = () =>
  mongoose.models.CorrectiveAction || require('../domains/quality/models/CorrectiveAction');

// ── List ─────────────────────────────────────────────────────────────────────
// GET /api/admin/capa
router.get(
  '/',
  authenticate,
  requireRole(['admin', 'quality_manager', 'manager']),
  async (req, res) => {
    try {
      const CA = getModel();
      const {
        status,
        severity,
        type,
        assignedTo,
        branchId,
        overdue,
        page = 1,
        limit = 20,
      } = req.query;

      const filter = { isDeleted: false };
      if (status) filter.status = status;
      if (severity) filter.severity = severity;
      if (type) filter.type = type;
      if (assignedTo) filter.assignedTo = assignedTo;
      if (branchId) filter.branchId = branchId;
      if (overdue === 'true') {
        filter.dueDate = { $lt: new Date() };
        filter.status = { $nin: ['resolved', 'closed'] };
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [docs, total, overdueCount] = await Promise.all([
        CA.find(filter).sort({ severity: -1, dueDate: 1 }).skip(skip).limit(Number(limit)).lean(),
        CA.countDocuments(filter),
        CA.countDocuments({
          isDeleted: false,
          dueDate: { $lt: new Date() },
          status: { $nin: ['resolved', 'closed'] },
        }),
      ]);

      res.json({
        success: true,
        data: docs,
        overdueCount,
        pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
      });
    } catch (err) {
      safeError(res, err, 'capa-admin');
    }
  }
);

// ── Get single ───────────────────────────────────────────────────────────────
// GET /api/admin/capa/:id
router.get(
  '/:id',
  authenticate,
  requireRole(['admin', 'quality_manager', 'manager']),
  async (req, res) => {
    try {
      const CA = getModel();
      const doc = await CA.findOne({ _id: req.params.id, isDeleted: false }).lean();
      if (!doc)
        return res.status(404).json({ success: false, message: 'الإجراء التصحيحي غير موجود' });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'capa-admin');
    }
  }
);

// ── Create ───────────────────────────────────────────────────────────────────
// POST /api/admin/capa
router.post('/', authenticate, requireRole(['admin', 'quality_manager']), async (req, res) => {
  try {
    const CA = getModel();
    const body = stripUpdateMeta(req.body);
    // auditId is required by schema; allow a sentinel ObjectId for admin-created CAPAs
    if (!body.auditId) {
      body.auditId = new mongoose.Types.ObjectId('000000000000000000000000');
    }
    const doc = await CA.create({ ...body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'capa-admin');
  }
});

// ── Update fields ────────────────────────────────────────────────────────────
// PATCH /api/admin/capa/:id
router.patch(
  '/:id',
  authenticate,
  requireRole(['admin', 'quality_manager', 'manager']),
  async (req, res) => {
    try {
      const CA = getModel();
      const allowed = [
        'title',
        'description',
        'requiredAction',
        'dueDate',
        'assignedTo',
        'assignedRole',
        'assignedTeamId',
        'escalationDate',
        'branchId',
      ];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const doc = await CA.findOneAndUpdate(
        { _id: req.params.id, isDeleted: false },
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (!doc)
        return res.status(404).json({ success: false, message: 'الإجراء التصحيحي غير موجود' });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'capa-admin');
    }
  }
);

// ── Lifecycle: Start ─────────────────────────────────────────────────────────
// POST /api/admin/capa/:id/start
router.post(
  '/:id/start',
  authenticate,
  requireRole(['admin', 'quality_manager', 'manager']),
  async (req, res) => {
    try {
      const CA = getModel();
      const doc = await CA.findOne({ _id: req.params.id, isDeleted: false });
      if (!doc)
        return res.status(404).json({ success: false, message: 'الإجراء التصحيحي غير موجود' });
      if (doc.status !== 'open') {
        return res
          .status(400)
          .json({ success: false, message: `لا يمكن البدء من الحالة: ${doc.status}` });
      }
      doc.status = 'in_progress';
      doc.startedAt = new Date();
      await doc.save();
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'capa-admin');
    }
  }
);

// ── Lifecycle: Resolve ───────────────────────────────────────────────────────
// POST /api/admin/capa/:id/resolve
router.post(
  '/:id/resolve',
  authenticate,
  requireRole(['admin', 'quality_manager', 'manager']),
  async (req, res) => {
    try {
      const CA = getModel();
      const doc = await CA.findOne({ _id: req.params.id, isDeleted: false });
      if (!doc)
        return res.status(404).json({ success: false, message: 'الإجراء التصحيحي غير موجود' });
      if (!['in_progress', 'pending_review', 'open'].includes(doc.status)) {
        return res
          .status(400)
          .json({ success: false, message: `لا يمكن الحل من الحالة: ${doc.status}` });
      }
      if (!req.body.resolutionNote) {
        return res.status(400).json({ success: false, message: 'ملاحظة الحل مطلوبة' });
      }
      doc.status = 'resolved';
      doc.resolvedAt = new Date();
      doc.resolvedBy = req.user?._id;
      doc.resolutionNote = req.body.resolutionNote;
      await doc.save();
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'capa-admin');
    }
  }
);

// ── Lifecycle: Verify / Close ────────────────────────────────────────────────
// POST /api/admin/capa/:id/verify
router.post(
  '/:id/verify',
  authenticate,
  requireRole(['admin', 'quality_manager']),
  async (req, res) => {
    try {
      const CA = getModel();
      const doc = await CA.findOne({ _id: req.params.id, isDeleted: false });
      if (!doc)
        return res.status(404).json({ success: false, message: 'الإجراء التصحيحي غير موجود' });
      if (doc.status !== 'resolved') {
        return res
          .status(400)
          .json({ success: false, message: 'يجب أن يكون الإجراء في حالة محلول قبل التحقق' });
      }
      doc.status = 'closed';
      doc.verifiedAt = new Date();
      doc.verifiedBy = req.user?._id;
      doc.closedAt = new Date();
      await doc.save();
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'capa-admin');
    }
  }
);

// ── Lifecycle: Escalate ──────────────────────────────────────────────────────
// POST /api/admin/capa/:id/escalate
router.post(
  '/:id/escalate',
  authenticate,
  requireRole(['admin', 'quality_manager', 'manager']),
  async (req, res) => {
    try {
      const CA = getModel();
      const doc = await CA.findOne({ _id: req.params.id, isDeleted: false });
      if (!doc)
        return res.status(404).json({ success: false, message: 'الإجراء التصحيحي غير موجود' });
      if (['resolved', 'closed'].includes(doc.status)) {
        return res
          .status(400)
          .json({ success: false, message: 'لا يمكن تصعيد إجراء مغلق أو محلول' });
      }
      doc.status = 'escalated';
      doc.escalationLevel = (doc.escalationLevel || 0) + 1;
      doc.escalatedTo = req.body.escalatedTo || null;
      doc.escalationHistory.push({
        level: doc.escalationLevel,
        escalatedTo: req.body.escalatedTo || null,
        reason: req.body.reason || '',
        at: new Date(),
      });
      await doc.save();
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'capa-admin');
    }
  }
);

// ── Soft Delete ──────────────────────────────────────────────────────────────
// DELETE /api/admin/capa/:id
router.delete('/:id', authenticate, requireRole(['admin', 'quality_manager']), async (req, res) => {
  try {
    const CA = getModel();
    const doc = await CA.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: 'الإجراء التصحيحي غير موجود' });
    res.json({ success: true, message: 'تم حذف الإجراء التصحيحي بنجاح' });
  } catch (err) {
    safeError(res, err, 'capa-admin');
  }
});

module.exports = router;
