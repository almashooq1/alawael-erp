/**
 * clinical-docs.routes.js — clinical document management.
 *
 * Mount at /api/admin/clinical-docs (staff) and /api/parent-v2/docs (read-only for guardians).
 *
 * Features: upload, list+filter, download, share with guardian/therapist,
 * e-signature (hash-based), soft delete.
 *
 * Storage: local disk `backend/uploads/clinical-docs/` (matches the
 * caseManagement.js convention already in use).
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Document = require('../models/Document');
const Beneficiary = require('../models/Beneficiary');
const Guardian = require('../models/Guardian');
const User = require('../models/User');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

// ── multer setup ─────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads/clinical-docs');
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  /* dir may exist */
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|png|jpe?g|gif|webp|tiff?|zip)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم'));
  },
});

router.use(authenticateToken);

const STAFF_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'specialist',
  'coordinator',
  'social_worker',
];

const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'specialist',
];

const HQ_ROLES = ['admin', 'superadmin', 'super_admin'];

// Map extension → enum fileType
function pickFileType(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const known = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'csv',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'tiff',
    'tif',
    'zip',
  ];
  return known.includes(ext) ? ext : 'other';
}

// ── GET / — list ─────────────────────────────────────────────────────────
router.get('/', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const { beneficiary, category, tag, q, page = 1, limit = 25 } = req.query;
    const filter = { isLatestVersion: true };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (beneficiary && mongoose.isValidObjectId(beneficiary))
      filter['metadata.beneficiary'] = beneficiary;
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { originalFileName: rx }];
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [items, total] = await Promise.all([
      Document.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Document.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'docs.list');
  }
});

// ── GET /stats ───────────────────────────────────────────────────────────
router.get('/stats', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    const [total, byCategory, totalSize, signedCount] = await Promise.all([
      Document.countDocuments({ isLatestVersion: true }),
      Document.aggregate([
        { $match: { isLatestVersion: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Document.aggregate([
        { $match: { isLatestVersion: true } },
        { $group: { _id: null, bytes: { $sum: '$fileSize' } } },
      ]),
      Document.countDocuments({ 'signatures.0': { $exists: true } }),
    ]);
    res.json({
      success: true,
      total,
      signedCount,
      totalBytes: totalSize[0]?.bytes || 0,
      byCategory: Object.fromEntries(byCategory.map(r => [r._id || 'أخرى', r.count])),
    });
  } catch (err) {
    return safeError(res, err, 'docs.stats');
  }
});

// ── GET /:id ─────────────────────────────────────────────────────────────
router.get('/:id', requireRole(STAFF_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const doc = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name firstName lastName email')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'docs.getOne');
  }
});

// ── GET /:id/download ────────────────────────────────────────────────────
router.get('/:id/download', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });

    // Access check
    const userId = String(req.user.id);
    const isStaff = STAFF_ROLES.includes(req.user.role);
    const isShared = (doc.sharedWith || []).some(s => String(s.userId) === userId);
    const isUploader = String(doc.uploadedBy) === userId;
    if (!isStaff && !isShared && !isUploader && !doc.isPublic) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    const filePath = path.isAbsolute(doc.filePath)
      ? doc.filePath
      : path.join(__dirname, '..', doc.filePath.replace(/^\//, ''));

    if (!fs.existsSync(filePath))
      return res.status(404).json({ success: false, message: 'الملف غير متوفر على الخادم' });

    res.download(filePath, doc.originalFileName || doc.fileName);
  } catch (err) {
    return safeError(res, err, 'docs.download');
  }
});

// ── POST / — upload ──────────────────────────────────────────────────────
router.post('/', requireRole(WRITE_ROLES), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'الملف مطلوب' });

    const { title, description = '', category = 'تقارير', beneficiaryId, tags } = req.body || {};

    if (!title) return res.status(400).json({ success: false, message: 'العنوان مطلوب' });

    const relPath = `/uploads/clinical-docs/${req.file.filename}`;
    const doc = await Document.create({
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      fileType: pickFileType(req.file.originalname),
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: relPath,
      title,
      description,
      category,
      tags: Array.isArray(tags)
        ? tags
        : tags
          ? String(tags)
              .split(',')
              .map(t => t.trim())
          : [],
      uploadedBy: req.user?.id,
      uploadedByName: req.user?.name || '',
      uploadedByEmail: req.user?.email || '',
      metadata:
        beneficiaryId && mongoose.isValidObjectId(beneficiaryId)
          ? { beneficiary: beneficiaryId }
          : {},
    });

    logger.info('[clinical-docs] uploaded', {
      id: doc._id.toString(),
      size: req.file.size,
      by: req.user?.id,
    });
    res.status(201).json({ success: true, data: doc, message: 'تم رفع المستند' });
  } catch (err) {
    if (err?.message === 'نوع الملف غير مدعوم')
      return res.status(400).json({ success: false, message: err.message });
    return safeError(res, err, 'docs.upload');
  }
});

// ── PATCH /:id ───────────────────────────────────────────────────────────
router.patch('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.filePath;
    delete body.fileName;
    delete body.fileSize;
    delete body.uploadedBy;
    delete body.signatures; // use /sign endpoint
    delete body.sharedWith; // use /share endpoint
    body.lastModifiedBy = req.user?.id;
    body.lastModified = new Date();
    const doc = await Document.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: doc, message: 'تم التحديث' });
  } catch (err) {
    return safeError(res, err, 'docs.update');
  }
});

// ── POST /:id/share — share with guardian / user ─────────────────────────
router.post('/:id/share', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const { userId, guardianId, permission = 'view' } = req.body || {};
    let targetUserId = userId;
    let name = '';
    let email = '';
    if (!targetUserId && guardianId && mongoose.isValidObjectId(guardianId)) {
      const g = await Guardian.findById(guardianId).lean();
      if (!g) return res.status(404).json({ success: false, message: 'ولي الأمر غير موجود' });
      targetUserId = g.userId;
      name = `${g.firstName_ar || ''} ${g.lastName_ar || ''}`.trim();
      email = g.email;
    }
    if (!targetUserId || !mongoose.isValidObjectId(targetUserId))
      return res.status(400).json({ success: false, message: 'معرّف المستخدم مطلوب' });

    if (!name || !email) {
      const u = await User.findById(targetUserId).select('name email firstName lastName').lean();
      if (u) {
        name = name || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim();
        email = email || u.email;
      }
    }

    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          sharedWith: { userId: targetUserId, name, email, permission, sharedAt: new Date() },
        },
      },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    logger.info('[clinical-docs] shared', {
      id: req.params.id,
      with: String(targetUserId),
      by: req.user?.id,
    });
    res.json({ success: true, data: doc, message: 'تمت المشاركة' });
  } catch (err) {
    return safeError(res, err, 'docs.share');
  }
});

// ── POST /:id/sign — e-signature ─────────────────────────────────────────
router.post('/:id/sign', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });

    // Signature hash = SHA-256 of (userId + filePath + timestamp)
    const ts = new Date();
    const payload = `${req.user.id}:${doc.filePath}:${ts.toISOString()}`;
    const signatureHash = crypto.createHash('sha256').update(payload).digest('hex');

    doc.signatures.push({
      signedBy: req.user.id,
      signedAt: ts,
      signatureHash,
      status: 'signed',
    });
    await doc.save();
    res.json({
      success: true,
      data: doc.toObject(),
      signatureHash,
      message: 'تم التوقيع الإلكتروني',
    });
  } catch (err) {
    return safeError(res, err, 'docs.sign');
  }
});

// ── DELETE /:id — soft delete ────────────────────────────────────────────
router.delete('/:id', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, archivedAt: new Date(), archivedBy: req.user?.id },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, message: 'تمت الأرشفة' });
  } catch (err) {
    return safeError(res, err, 'docs.archive');
  }
});

// ── GET /guardian/my — guardian's shared docs ────────────────────────────
router.get('/guardian/my', async (req, res) => {
  try {
    const role = req.user.role || '';
    if (!['parent', 'guardian', ...HQ_ROLES].includes(role))
      return res.status(403).json({ success: false, message: 'غير مصرح' });

    const filter = {
      isLatestVersion: true,
      isArchived: { $ne: true },
      'sharedWith.userId': req.user.id,
    };
    const items = await Document.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .select(
        'title description category fileType fileSize originalFileName createdAt signatures sharedWith'
      )
      .lean();
    res.json({ success: true, items });
  } catch (err) {
    return safeError(res, err, 'docs.guardianList');
  }
});

module.exports = router;
