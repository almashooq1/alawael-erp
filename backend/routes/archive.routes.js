'use strict';
/**
 * Archive Routes — أرشفة الوثائق وإدارة دورة الحياة
 * ══════════════════════════════════════════════════════════════════════════
 * Document archival, restoration, retention policy management,
 * permanent purge, and archive compliance reporting.
 *
 *   GET    /                          list archived documents
 *   POST   /:id/archive               archive an active document
 *   POST   /:id/restore               restore archived document
 *   DELETE /:id/purge                 permanent delete (admin only)
 *   GET    /retention-report          documents grouped by retention policy
 *   GET    /due-for-purge             documents past retention period
 *   PATCH  /:id/retention             update retention policy on a document
 *   GET    /stats                     archive statistics
 *   POST   /bulk/archive              archive multiple documents at once
 *   GET    /recommendations           smart auto-archive suggestions
 *   POST   /recommendations/scan      trigger fresh recommendation scan
 *   POST   /recommendations/:id/ack   acknowledge a recommendation (archive it)
 *   POST   /recommendations/:id/dismiss   dismiss a recommendation
 *
 * Status convention (matches Document.js enum):
 *   نشط       → active
 *   مؤرشف     → archived
 *   محذوف     → soft-deleted (separate path)
 *   قيد المراجعة → under review
 *
 * Branch scoping: Document model does NOT have a branchId field —
 * tenant isolation is enforced via uploadedBy + sharedWith. RBAC
 * gates this whole router to admin/manager/supervisor.
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

const STATUS_ARCHIVED = 'مؤرشف';
const STATUS_ACTIVE = 'نشط';

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

const computeRetentionExpiry = (archivedAt, retentionYears) => {
  const base = archivedAt instanceof Date ? new Date(archivedAt) : new Date();
  base.setFullYear(base.getFullYear() + Number(retentionYears || 7));
  return base;
};

// ──────────────────────────────────────────────────────────────────────────
// GET / — list archived documents (filterable)
// ──────────────────────────────────────────────────────────────────────────
router.get('/', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, category, uploadedBy, from, to, q } = req.query;
    const filter = { isArchived: true };
    if (category) filter.category = category;
    if (uploadedBy) filter.uploadedBy = uploadedBy;
    if (from || to) {
      filter.archivedAt = {};
      if (from) filter.archivedAt.$gte = new Date(from);
      if (to) filter.archivedAt.$lte = new Date(to);
    }
    if (q && String(q).trim()) {
      const { escapeRegex } = require('../utils/sanitize');
      const rx = new RegExp(escapeRegex(String(q).trim()), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { tags: rx }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Document.find(filter)
        .sort({ archivedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('archivedBy', 'name email')
        .populate('uploadedBy', 'name email')
        .lean(),
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

// ──────────────────────────────────────────────────────────────────────────
// POST /:id/archive — archive a single document
// ──────────────────────────────────────────────────────────────────────────
router.post(
  '/:id/archive',
  requireRole('admin', 'manager', 'supervisor'),
  async (req, res, next) => {
    // W546: non-ObjectId → fall through to literal sibling POST /bulk/archive.
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next();
    try {
      const Document = safeModel('Document');
      if (!Document)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const { reason = '', retentionYears = 7 } = req.body;
      const years = Math.max(1, Math.min(100, Number(retentionYears) || 7));
      const archivedAt = new Date();
      const retentionExpiry = computeRetentionExpiry(archivedAt, years);
      const doc = await Document.findOneAndUpdate(
        { _id: req.params.id, isArchived: { $ne: true } },
        {
          status: STATUS_ARCHIVED,
          isArchived: true,
          archivedAt,
          archivedBy: req.user._id,
          archiveReason: String(reason).trim(),
          retentionYears: years,
          retentionExpiry,
          $unset: { restoredAt: '', restoredBy: '' },
        },
        { returnDocument: 'after' }
      );
      if (!doc)
        return res
          .status(404)
          .json({ success: false, message: 'Document not found or already archived' });
      try {
        doc.activityLog?.push({
          action: 'أرشفة',
          performedBy: req.user._id,
          performedByName: req.user.name || req.user.fullName || '',
          details: reason ? `سبب: ${reason}` : '',
        });
        await doc.save();
      } catch (logErr) {
        logger.warn(`[Archive] activity-log push failed: ${logErr.message}`);
      }
      res.json({ success: true, data: doc, message: 'تم أرشفة المستند بنجاح' });
    } catch (err) {
      safeError(res, err, 'archive document');
    }
  }
);

// ──────────────────────────────────────────────────────────────────────────
// POST /:id/restore — restore an archived document
// ──────────────────────────────────────────────────────────────────────────
router.post('/:id/restore', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, isArchived: true },
      {
        status: STATUS_ACTIVE,
        isArchived: false,
        restoredAt: new Date(),
        restoredBy: req.user._id,
        $unset: {
          archivedAt: '',
          archivedBy: '',
          archiveReason: '',
          retentionExpiry: '',
        },
      },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'المستند المؤرشف غير موجود' });
    try {
      doc.activityLog?.push({
        action: 'استرجاع',
        performedBy: req.user._id,
        performedByName: req.user.name || req.user.fullName || '',
      });
      await doc.save();
    } catch (logErr) {
      logger.warn(`[Archive] activity-log push failed: ${logErr.message}`);
    }
    res.json({ success: true, data: doc, message: 'تم استرجاع المستند بنجاح' });
  } catch (err) {
    safeError(res, err, 'restore document');
  }
});

// ──────────────────────────────────────────────────────────────────────────
// DELETE /:id/purge — permanent delete (archived docs only, admin only)
// ──────────────────────────────────────────────────────────────────────────
router.delete('/:id/purge', requireRole('admin'), async (req, res) => {
  try {
    const { confirmPurge } = req.body;
    if (confirmPurge !== true && confirmPurge !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'يجب تأكيد الحذف النهائي بإرسال confirmPurge: true',
      });
    }
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOneAndDelete({
      _id: req.params.id,
      isArchived: true,
    });
    if (!doc)
      return res.status(404).json({
        success: false,
        message: 'لا يمكن الحذف النهائي إلا للمستندات المؤرشفة',
      });
    logger.info(
      `[Archive] PURGE id=${req.params.id} by=${req.user._id} title="${doc.title || ''}"`
    );
    res.json({
      success: true,
      message: 'تم الحذف النهائي للمستند',
      purgedId: req.params.id,
    });
  } catch (err) {
    safeError(res, err, 'purge document');
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /retention-report — group archived docs by retention policy
// ──────────────────────────────────────────────────────────────────────────
router.get('/retention-report', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: [] });
    const data = await Document.aggregate([
      { $match: { isArchived: true } },
      {
        $group: {
          _id: { $ifNull: ['$retentionYears', 7] },
          count: { $sum: 1 },
          oldestArchivedAt: { $min: '$archivedAt' },
          newestArchivedAt: { $max: '$archivedAt' },
          latestExpiry: { $max: '$retentionExpiry' },
          earliestExpiry: { $min: '$retentionExpiry' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'retention report');
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /due-for-purge — documents past their retention period
// ──────────────────────────────────────────────────────────────────────────
router.get('/due-for-purge', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: [], count: 0 });
    const data = await Document.find({
      isArchived: true,
      retentionExpiry: { $lte: new Date() },
    })
      .sort({ retentionExpiry: 1 })
      .limit(500)
      .populate('archivedBy', 'name email')
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    safeError(res, err, 'due for purge');
  }
});

// ──────────────────────────────────────────────────────────────────────────
// PATCH /:id/retention — update retention years on an archived doc
// ──────────────────────────────────────────────────────────────────────────
router.patch('/:id/retention', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { retentionYears } = req.body;
    const years = Number(retentionYears);
    if (!Number.isFinite(years) || years < 1 || years > 100)
      return res
        .status(400)
        .json({ success: false, message: 'retentionYears يجب أن يكون رقماً بين 1 و 100' });
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const existing = await Document.findOne({ _id: req.params.id, isArchived: true })
      .select('archivedAt')
      .lean();
    if (!existing)
      return res.status(404).json({ success: false, message: 'المستند المؤرشف غير موجود' });
    const retentionExpiry = computeRetentionExpiry(existing.archivedAt, years);
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      {
        retentionYears: years,
        retentionExpiry,
        retentionUpdatedAt: new Date(),
        retentionUpdatedBy: req.user._id,
      },
      { returnDocument: 'after' }
    );
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update retention');
  }
});

// ──────────────────────────────────────────────────────────────────────────
// GET /stats — archive statistics
// ──────────────────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document)
      return res.json({
        success: true,
        data: { total: 0, archived: 0, active: 0, dueToPurge: 0, byCategory: [], totalBytes: 0 },
      });
    const [total, archived, active, dueToPurge, byCategory, bytesAgg, recsPending] =
      await Promise.all([
        Document.countDocuments({}),
        Document.countDocuments({ isArchived: true }),
        Document.countDocuments({ isArchived: { $ne: true } }),
        Document.countDocuments({
          isArchived: true,
          retentionExpiry: { $lte: new Date() },
        }),
        Document.aggregate([
          { $match: { isArchived: true } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Document.aggregate([
          { $match: { isArchived: true } },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$fileSize', 0] } } } },
        ]),
        Document.countDocuments({
          isArchived: { $ne: true },
          'archiveRecommendation.acknowledged': { $ne: true },
          'archiveRecommendation.dismissed': { $ne: true },
          'archiveRecommendation.score': { $gte: 0.5 },
        }),
      ]);
    res.json({
      success: true,
      data: {
        total,
        archived,
        active,
        dueToPurge,
        byCategory,
        totalBytes: bytesAgg[0]?.total || 0,
        recommendationsPending: recsPending,
      },
    });
  } catch (err) {
    safeError(res, err, 'archive stats');
  }
});

// ──────────────────────────────────────────────────────────────────────────
// POST /bulk/archive — archive multiple documents in one call
// ──────────────────────────────────────────────────────────────────────────
router.post('/bulk/archive', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { ids, reason = '', retentionYears = 7 } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: 'يجب تمرير مصفوفة ids' });
    if (ids.length > 200)
      return res.status(400).json({ success: false, message: 'الحد الأقصى 200 مستند لكل طلب' });
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const years = Math.max(1, Math.min(100, Number(retentionYears) || 7));
    const archivedAt = new Date();
    const retentionExpiry = computeRetentionExpiry(archivedAt, years);
    const result = await Document.updateMany(
      { _id: { $in: ids }, isArchived: { $ne: true } },
      {
        status: STATUS_ARCHIVED,
        isArchived: true,
        archivedAt,
        archivedBy: req.user._id,
        archiveReason: String(reason).trim(),
        retentionYears: years,
        retentionExpiry,
      }
    );
    res.json({
      success: true,
      matched: result.matchedCount ?? result.n ?? 0,
      modified: result.modifiedCount ?? result.nModified ?? 0,
      message: 'تمت الأرشفة الجماعية',
    });
  } catch (err) {
    safeError(res, err, 'bulk archive');
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Smart Archive Recommendations
// ──────────────────────────────────────────────────────────────────────────
const smartArchive = (() => {
  try {
    return require('../services/documentArchiveSmart.service');
  } catch (_) {
    return null;
  }
})();

router.get('/recommendations', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: [], count: 0 });
    const { limit = 50, minScore = 0.5 } = req.query;
    const data = await Document.find({
      isArchived: { $ne: true },
      'archiveRecommendation.acknowledged': { $ne: true },
      'archiveRecommendation.dismissed': { $ne: true },
      'archiveRecommendation.score': { $gte: Number(minScore) },
    })
      .sort({ 'archiveRecommendation.score': -1 })
      .limit(Math.min(Number(limit), 200))
      .populate('uploadedBy', 'name email')
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    safeError(res, err, 'list archive recommendations');
  }
});

router.post('/recommendations/scan', requireRole('admin', 'manager'), async (req, res) => {
  try {
    if (!smartArchive)
      return res.status(503).json({ success: false, message: 'خدمة التوصيات الذكية غير متاحة' });
    const result = await smartArchive.scanAndRecommend({
      idleMonths: Number(req.body?.idleMonths) || 6,
      minScore: Number(req.body?.minScore) || 0.5,
      limit: Math.min(Number(req.body?.limit) || 500, 2000),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    safeError(res, err, 'scan archive recommendations');
  }
});

router.post(
  '/recommendations/:id/ack',
  requireRole('admin', 'manager', 'supervisor'),
  async (req, res) => {
    try {
      const Document = safeModel('Document');
      if (!Document)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const { retentionYears = 7, reason = 'auto-archive recommendation accepted' } = req.body;
      const years = Math.max(1, Math.min(100, Number(retentionYears) || 7));
      const archivedAt = new Date();
      const retentionExpiry = computeRetentionExpiry(archivedAt, years);
      const doc = await Document.findOneAndUpdate(
        { _id: req.params.id, isArchived: { $ne: true } },
        {
          status: STATUS_ARCHIVED,
          isArchived: true,
          archivedAt,
          archivedBy: req.user._id,
          archiveReason: reason,
          retentionYears: years,
          retentionExpiry,
          'archiveRecommendation.acknowledged': true,
          'archiveRecommendation.acknowledgedAt': new Date(),
          'archiveRecommendation.acknowledgedBy': req.user._id,
        },
        { returnDocument: 'after' }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
      res.json({ success: true, data: doc, message: 'تمت أرشفة المستند بناءً على التوصية' });
    } catch (err) {
      safeError(res, err, 'ack recommendation');
    }
  }
);

router.post(
  '/recommendations/:id/dismiss',
  requireRole('admin', 'manager', 'supervisor'),
  async (req, res) => {
    try {
      const Document = safeModel('Document');
      if (!Document)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await Document.findByIdAndUpdate(
        req.params.id,
        {
          'archiveRecommendation.dismissed': true,
        },
        { returnDocument: 'after' }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
      res.json({ success: true, message: 'تم تجاهل التوصية' });
    } catch (err) {
      safeError(res, err, 'dismiss recommendation');
    }
  }
);

module.exports = router;
