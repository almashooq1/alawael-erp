'use strict';
/**
 * Smart Documents Routes — إدارة الوثائق الذكية
 * ══════════════════════════════════════════════════════════════════════════
 * Intelligent document management: smart search, auto-classification,
 * version control, expiry alerts, access logging, and analytics.
 *
 *   GET    /smart-search         full-text + filter search
 *   POST   /auto-classify        classify document by name/content
 *   GET    /expiry-alerts        documents expiring soon
 *   GET    /recent               recently accessed documents
 *   GET    /dashboard            document analytics dashboard
 *   GET    /:id                  document details
 *   POST   /                     create/upload document record
 *   PUT    /:id                  update document metadata
 *   DELETE /:id                  soft-delete document
 *   GET    /:id/versions         version history
 *   POST   /:id/versions         add new version
 *   GET    /:id/access-log       who accessed this document
 *   POST   /:id/share            share document with user/role
 *   POST   /:id/revoke-share     revoke share
 *   GET    /stats                document statistics
 *
 * W1201 contract realignment (phantom-writes burn-down wave 5): the previous
 * revision queried/wrote fields the REAL models never declared —
 * `branchId` / `isDeleted` / `beneficiaryId` / `shares` / `currentVersion` /
 * English `status:'active'` on Document (real: Arabic status enum,
 * `isArchived`, `sharedWith[]`, `version`, W933 `entityType`/`entityId`
 * generic link); `accessedAt` on DocumentAccessLog (timestamps cover it);
 * `fileUrl`/`changeNote` on DocumentVersion (real: `filePath`/`changeNotes`
 * plus REQUIRED fileName/fileSize/fileHash). Every create threw
 * ValidationError and every read matched nothing. Mappings mirror the
 * canonical documents.routes.js W933 metadata-create.
 *
 * Tenancy: Document has NO branchId — visibility follows the model's own
 * sharing semantics (owner / isPublic / sharedWith), with manage roles
 * seeing all. Mutations stay owner-or-manage gated.
 */

const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

const router = express.Router();
router.use(authenticate);
router.use(requireBranchAccess);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

const MANAGE_ROLES = ['admin', 'super_admin', 'manager', 'supervisor'];
const canManage = req => MANAGE_ROLES.includes(req.user?.role);

// JWT carries `id` (not `_id`) on some paths — read both (documents.routes
// W933 precedent).
const actorId = req => req.user.id || req.user._id;

// Mirrors DOC_CATEGORY_MAP in documents.routes.js — Document.category is an
// ARABIC enum; English values violated it.
const DOC_CATEGORY_MAP = {
  CLINICAL: 'تقارير',
  HR: 'مراسلات',
  FINANCE: 'مالي',
  LEGAL: 'عقود',
  QUALITY: 'سياسات',
  GENERAL: 'أخرى',
};
const DOC_CATEGORIES = ['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'شهادات', 'مراسلات', 'أخرى'];
const toDocCategory = c =>
  DOC_CATEGORIES.includes(c) ? c : DOC_CATEGORY_MAP[String(c || '').toUpperCase()] || 'أخرى';

const STATUS_ALIASES = {
  active: 'نشط',
  archived: 'مؤرشف',
  deleted: 'محذوف',
  under_review: 'قيد المراجعة',
};
const toDocStatus = s => STATUS_ALIASES[s] || s;

const NOT_DELETED = { status: { $ne: 'محذوف' } };

/** Visibility filter per the Document model's own sharing semantics. */
function visibilityFilter(req) {
  if (canManage(req)) return {};
  const me = actorId(req);
  return {
    $or: [{ uploadedBy: me }, { isPublic: true }, { 'sharedWith.userId': me }],
  };
}

/**
 * Log access to a document (fire-and-forget). DocumentAccessLog has
 * timestamps — createdAt IS the access time (the old `accessedAt` write was
 * a phantom).
 */
const logAccess = (DocumentAccessLog, docId, userId, action) => {
  if (!DocumentAccessLog) return;
  DocumentAccessLog.create({ documentId: docId, userId, action }).catch(() => {});
};

// ── GET /smart-search ──────────────────────────────────────────────────────
router.get('/smart-search', async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { q, category, status, beneficiaryId, from, to, page = 1, limit = 20 } = req.query;
    const filter = { ...NOT_DELETED, ...visibilityFilter(req) };
    if (q) {
      const safe = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and = [
        {
          $or: [
            { title: { $regex: safe, $options: 'i' } },
            { description: { $regex: safe, $options: 'i' } },
            { tags: { $regex: safe, $options: 'i' } },
          ],
        },
      ];
    }
    if (category) filter.category = toDocCategory(category);
    if (status) filter.status = toDocStatus(status);
    if (beneficiaryId) {
      filter.entityType = 'Beneficiary';
      filter.entityId = String(beneficiaryId);
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Document.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Document.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'smart search');
  }
});

// ── POST /auto-classify ────────────────────────────────────────────────────
router.post('/auto-classify', async (req, res) => {
  try {
    const { title = '', mimeType = '', keywords = [] } = req.body;
    // Rule-based classification — no external AI dependency
    const titleLower = title.toLowerCase();
    const keywordsLower = keywords.map(k => k.toLowerCase());
    const all = [titleLower, ...keywordsLower].join(' ');

    const rules = [
      { category: 'certificate', patterns: ['certificate', 'شهادة', 'cert'] },
      { category: 'report', patterns: ['report', 'تقرير', 'assessment', 'تقييم'] },
      { category: 'consent', patterns: ['consent', 'موافقة', 'permission'] },
      { category: 'directive', patterns: ['directive', 'توجيه', 'instruction'] },
      { category: 'medical', patterns: ['medical', 'طبي', 'health', 'prescription', 'وصفة'] },
      { category: 'identity', patterns: ['identity', 'هوية', 'id card', 'passport', 'national'] },
      { category: 'insurance', patterns: ['insurance', 'تأمين', 'policy'] },
    ];

    let suggestedCategory = 'general';
    let confidence = 0.4;
    for (const rule of rules) {
      if (rule.patterns.some(p => all.includes(p))) {
        suggestedCategory = rule.category;
        confidence = 0.85;
        break;
      }
    }
    res.json({ success: true, data: { suggestedCategory, confidence, title, mimeType } });
  } catch (err) {
    safeError(res, err, 'auto-classify');
  }
});

// ── GET /expiry-alerts ─────────────────────────────────────────────────────
router.get('/expiry-alerts', async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: [] });
    const { days = 30 } = req.query;
    const cutoff = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);
    const data = await Document.find({
      ...NOT_DELETED,
      ...visibilityFilter(req),
      expiryDate: { $lte: cutoff, $gte: new Date() },
    })
      .sort({ expiryDate: 1 })
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    safeError(res, err, 'expiry alerts');
  }
});

// ── GET /recent ────────────────────────────────────────────────────────────
router.get('/recent', async (req, res) => {
  try {
    const DocumentAccessLog = safeModel('DocumentAccessLog');
    const Document = safeModel('Document');
    if (!DocumentAccessLog || !Document) return res.json({ success: true, data: [] });
    const recent = await DocumentAccessLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const docIds = [...new Set(recent.map(r => String(r.documentId)))];
    const docs = await Document.find({
      _id: { $in: docIds },
      ...NOT_DELETED,
    }).lean();
    res.json({ success: true, data: docs });
  } catch (err) {
    safeError(res, err, 'recent documents');
  }
});

// ── GET /dashboard ─────────────────────────────────────────────────────────
router.get('/dashboard', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: {} });
    const base = { ...NOT_DELETED };
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [total, byCategory, expiringCount] = await Promise.all([
      Document.countDocuments(base),
      Document.aggregate([{ $match: base }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Document.countDocuments({ ...base, expiryDate: { $lte: thirtyDays, $gte: new Date() } }),
    ]);
    res.json({ success: true, data: { total, byCategory, expiringCount } });
  } catch (err) {
    safeError(res, err, 'documents dashboard');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────────
// NOTE: must precede /:id or Express casts "stats" as a Document ObjectId.
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    const DocumentAccessLog = safeModel('DocumentAccessLog');
    if (!Document)
      return res.json({ success: true, data: { total: 0, expired: 0, expiringSoon: 0 } });
    const base = { ...NOT_DELETED };
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [total, expired, expiringSoon, accessCount] = await Promise.all([
      Document.countDocuments(base),
      Document.countDocuments({ ...base, expiryDate: { $lt: new Date() } }),
      Document.countDocuments({ ...base, expiryDate: { $gte: new Date(), $lte: thirtyDays } }),
      DocumentAccessLog
        ? DocumentAccessLog.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          })
        : 0,
    ]);
    res.json({
      success: true,
      data: { total, expired, expiringSoon, accessLast7Days: accessCount },
    });
  } catch (err) {
    safeError(res, err, 'document stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const Document = safeModel('Document');
    const DocumentAccessLog = safeModel('DocumentAccessLog');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    const doc = await Document.findOne({
      _id: req.params.id,
      ...NOT_DELETED,
      ...visibilityFilter(req),
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    logAccess(DocumentAccessLog, req.params.id, req.user._id, 'view');
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'get document');
  }
});

// ── POST / ─────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, category, beneficiaryId, fileUrl, mimeType, description, tags, expiryDate } =
      req.body;
    if (!title || !category)
      return res.status(400).json({ success: false, message: 'title and category are required' });
    if (!fileUrl || !String(fileUrl).trim())
      return res.status(400).json({ success: false, message: 'fileUrl is required' });
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const url = String(fileUrl).trim();
    const baseName = url.split(/[\\/?#]/).filter(Boolean).pop() || 'document';
    const doc = await Document.create({
      fileName: baseName,
      originalFileName: baseName,
      mimeType: mimeType || 'application/octet-stream',
      fileSize: Number(req.body.sizeBytes) > 0 ? Number(req.body.sizeBytes) : 1,
      filePath: url,
      fileUrl: url,
      title: String(title).trim(),
      category: toDocCategory(category),
      description: description || '',
      tags: Array.isArray(tags) ? tags : [],
      ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
      ...(beneficiaryId
        ? { entityType: 'Beneficiary', entityId: String(beneficiaryId) }
        : {}),
      status: 'نشط',
      uploadedBy: actorId(req),
      uploadedByName: req.user.name || req.user.fullName || '',
      uploadedByEmail: req.user.email || '',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create document');
  }
});

// ── PUT /:id ───────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    const allowedFields = ['title', 'description', 'tags', 'expiryDate', 'status', 'category'];
    const updates = {};
    allowedFields.forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    if (updates.status) updates.status = toDocStatus(updates.status);
    if (updates.category) updates.category = toDocCategory(updates.category);
    const ownerGate = canManage(req) ? {} : { uploadedBy: actorId(req) };
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED, ...ownerGate },
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update document');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    // Soft delete via the model's own status enum (no isDeleted field exists).
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      {
        $set: {
          status: 'محذوف',
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: req.user._id,
          archiveReason: 'حذف عبر مسار الوثائق الذكية',
        },
      }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    safeError(res, err, 'delete document');
  }
});

// ── GET /:id/versions ──────────────────────────────────────────────────────
router.get('/:id/versions', async (req, res) => {
  try {
    const DocumentVersion = safeModel('DocumentVersion');
    if (!DocumentVersion) return res.json({ success: true, data: [] });
    const data = await DocumentVersion.find({ documentId: req.params.id })
      .sort({ versionNumber: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'document versions');
  }
});

// ── POST /:id/versions ─────────────────────────────────────────────────────
router.post('/:id/versions', async (req, res) => {
  try {
    const DocumentVersion = safeModel('DocumentVersion');
    const Document = safeModel('Document');
    if (!DocumentVersion || !Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    const { fileUrl, changeNote, mimeType, sizeBytes, fileHash } = req.body;
    if (!fileUrl) return res.status(400).json({ success: false, message: 'fileUrl is required' });
    const url = String(fileUrl).trim();
    const baseName = url.split(/[\\/?#]/).filter(Boolean).pop() || 'document';
    // Get current version count
    const count = await DocumentVersion.countDocuments({ documentId: req.params.id });
    const newVersion = await DocumentVersion.create({
      documentId: req.params.id,
      versionNumber: count + 1,
      filePath: url,
      fileName: baseName,
      mimeType: mimeType || 'application/octet-stream',
      fileSize: Number(sizeBytes) > 0 ? Number(sizeBytes) : 1,
      // This route registers URL-linked versions (no binary flows through it).
      // Callers that know the real content hash send fileHash; otherwise we
      // store the URL hash so the REQUIRED field stays truthful to its input.
      fileHash: fileHash || crypto.createHash('sha256').update(url).digest('hex'),
      changeNotes: changeNote || null,
      uploadedBy: req.user._id,
    });
    // Update main doc with latest version ref (model field is `version`)
    await Document.updateOne(
      { _id: req.params.id },
      { $set: { fileUrl: url, filePath: url, version: count + 1 } }
    );
    res.status(201).json({ success: true, data: newVersion });
  } catch (err) {
    safeError(res, err, 'add document version');
  }
});

// ── GET /:id/access-log ────────────────────────────────────────────────────
router.get('/:id/access-log', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const DocumentAccessLog = safeModel('DocumentAccessLog');
    if (!DocumentAccessLog) return res.json({ success: true, data: [] });
    const data = await DocumentAccessLog.find({ documentId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'document access log');
  }
});

// ── POST /:id/share ────────────────────────────────────────────────────────
router.post('/:id/share', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { userId, permission, role } = req.body;
    if (!userId || !mongoose.isValidObjectId(userId))
      return res.status(400).json({ success: false, message: 'userId is required' });
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    // Model subdoc is sharedWith[{userId, permission}] — `shares` was phantom.
    const perm = ['view', 'edit', 'download', 'share'].includes(permission || role)
      ? permission || role
      : 'view';
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { $addToSet: { sharedWith: { userId, permission: perm, sharedAt: new Date() } } },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'share document');
  }
});

// ── POST /:id/revoke-share ─────────────────────────────────────────────────
router.post('/:id/revoke-share', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { userId } = req.body;
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    await Document.updateOne({ _id: req.params.id }, { $pull: { sharedWith: { userId } } });
    res.json({ success: true, message: 'Share revoked' });
  } catch (err) {
    safeError(res, err, 'revoke share');
  }
});

module.exports = router;
