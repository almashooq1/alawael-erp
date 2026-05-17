'use strict';
/**
 * Archive Routes — أرشفة الوثائق وإدارة دورة الحياة
 * ══════════════════════════════════════════════════════════════════════════
 * Document archival, restoration, retention policy management,
 * permanent purge, and archive compliance reporting.
 *
 *   GET    /                   list archived documents
 *   POST   /:id/archive        archive an active document
 *   POST   /:id/restore        restore archived document
 *   DELETE /:id/purge          permanent delete (admin only, archived docs only)
 *   GET    /retention-report   documents by retention policy
 *   GET    /due-for-purge      documents past retention period
 *   PATCH  /:id/retention      update retention policy on a document
 *   GET    /stats              archive statistics
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

// ── GET / ──────────────────────────────────────────────────────────────────
router.get('/', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, category, beneficiaryId, from, to } = req.query;
    const filter = { branchId: req.user.branchId, status: 'archived' };
    if (category) filter.category = category;
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (from || to) {
      filter.archivedAt = {};
      if (from) filter.archivedAt.$gte = new Date(from);
      if (to) filter.archivedAt.$lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Document.find(filter).sort({ archivedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Document.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'list archived documents');
  }
});

// ── POST /:id/archive ──────────────────────────────────────────────────────
router.post('/:id/archive', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { reason, retentionYears = 7 } = req.body;
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const retentionExpiry = new Date();
    retentionExpiry.setFullYear(retentionExpiry.getFullYear() + Number(retentionYears));
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, status: { $nin: ['archived', 'purged'] } },
      {
        status: 'archived',
        archivedAt: new Date(),
        archivedBy: req.user._id,
        archiveReason: reason,
        retentionYears: Number(retentionYears),
        retentionExpiry,
        isDeleted: false,
      },
      { new: true }
    );
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: 'Document not found or already archived' });
    res.json({ success: true, data: doc, message: 'Document archived successfully' });
  } catch (err) {
    safeError(res, err, 'archive document');
  }
});

// ── POST /:id/restore ──────────────────────────────────────────────────────
router.post('/:id/restore', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, status: 'archived' },
      {
        status: 'active',
        restoredAt: new Date(),
        restoredBy: req.user._id,
        $unset: { archivedAt: '', archivedBy: '', archiveReason: '', retentionExpiry: '' },
      },
      { new: true }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: 'Archived document not found' });
    res.json({ success: true, data: doc, message: 'Document restored successfully' });
  } catch (err) {
    safeError(res, err, 'restore document');
  }
});

// ── DELETE /:id/purge ──────────────────────────────────────────────────────
router.delete('/:id/purge', requireRole('admin'), async (req, res) => {
  try {
    const { confirmPurge } = req.body;
    if (confirmPurge !== true && confirmPurge !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Set confirmPurge: true to permanently delete this document.',
      });
    }
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    // Only allow purge of archived documents
    const doc = await Document.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
      status: 'archived',
    });
    if (!doc)
      return res.status(404).json({
        success: false,
        message: 'Archived document not found. Only archived documents can be purged.',
      });
    res.json({ success: true, message: 'Document permanently purged', purgedId: req.params.id });
  } catch (err) {
    safeError(res, err, 'purge document');
  }
});

// ── GET /retention-report ──────────────────────────────────────────────────
router.get('/retention-report', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: [] });
    const data = await Document.aggregate([
      { $match: { branchId: req.user.branchId, status: 'archived' } },
      {
        $group: {
          _id: '$retentionYears',
          count: { $sum: 1 },
          oldestArchivedAt: { $min: '$archivedAt' },
          latestExpiry: { $max: '$retentionExpiry' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'retention report');
  }
});

// ── GET /due-for-purge ─────────────────────────────────────────────────────
router.get('/due-for-purge', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: [] });
    const data = await Document.find({
      branchId: req.user.branchId,
      status: 'archived',
      retentionExpiry: { $lte: new Date() },
    })
      .sort({ retentionExpiry: 1 })
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    safeError(res, err, 'due for purge');
  }
});

// ── PATCH /:id/retention ───────────────────────────────────────────────────
router.patch('/:id/retention', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { retentionYears } = req.body;
    if (!retentionYears || retentionYears < 1)
      return res
        .status(400)
        .json({ success: false, message: 'retentionYears must be a positive number' });
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const retentionExpiry = new Date();
    retentionExpiry.setFullYear(retentionExpiry.getFullYear() + Number(retentionYears));
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, status: 'archived' },
      {
        retentionYears: Number(retentionYears),
        retentionExpiry,
        retentionUpdatedAt: new Date(),
        retentionUpdatedBy: req.user._id,
      },
      { new: true }
    );
    if (!doc)
      return res.status(404).json({ success: false, message: 'Archived document not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update retention');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: { archived: 0, dueToPurge: 0 } });
    const base = { branchId: req.user.branchId };
    const [total, archived, dueToPurge, byCategory] = await Promise.all([
      Document.countDocuments({ ...base, status: { $ne: 'purged' } }),
      Document.countDocuments({ ...base, status: 'archived' }),
      Document.countDocuments({
        ...base,
        status: 'archived',
        retentionExpiry: { $lte: new Date() },
      }),
      Document.aggregate([
        { $match: { ...base, status: 'archived' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);
    res.json({ success: true, data: { total, archived, dueToPurge, byCategory } });
  } catch (err) {
    safeError(res, err, 'archive stats');
  }
});

module.exports = router;
