'use strict';

/**
 * files.routes.js — Wave 207b.
 *
 * Phase 1: local disk storage at backend/uploads/<purpose>/<yyyy-mm-dd>/.
 * Phase 2: switch storageProvider='s3' and replace the writer/reader with
 * AWS SDK calls — model schema is already storage-agnostic.
 *
 * Endpoints:
 *   POST   /                    — multipart upload (single file)
 *   GET    /                    — list (filters: purpose, beneficiaryId, refId)
 *   GET    /:id                 — metadata
 *   GET    /:id/download        — stream the file (with role check + access log)
 *   DELETE /:id                 — soft-delete (file stays on disk for forensics)
 *   DELETE /:id?hard=1          — admin-only: hard-delete from disk
 *
 * Size cap: 10MB per file (configurable via UPLOAD_MAX_BYTES env var).
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const crypto = require('crypto');
const multer = require('multer');

const { authenticateToken, requireRole } = require('../middleware/auth');
const UploadedFile = require('../models/UploadedFile');
const safeError = require('../utils/safeError');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');

router.use(authenticateToken);
router.use(bodyScopedBeneficiaryGuard); // W441: enforce branch on req.body.beneficiaryId

const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
const MAX_BYTES = parseInt(process.env.UPLOAD_MAX_BYTES || '10485760', 10); // 10MB default

// Ensure upload root exists at module load
try {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
} catch {
  // best-effort
}

const ALLOWED_MIMES = new Set([
  // images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // videos (caps file size below)
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const storage = multer.diskStorage({
  destination: function (req, _file, cb) {
    // W452: path-traversal defense. Pre-W452 `req.body.purpose` flowed
    // straight into path.join — an attacker could send
    // `purpose: '../../../etc/sneaky'` and multer would create the
    // directory (and write the file) OUTSIDE UPLOAD_ROOT before the
    // route handler's PURPOSES allowlist check ran. The post-write
    // unlink would only remove the file inside the escaped dir; the
    // dir itself remains, and the file could land in a web-accessible
    // location if writable. Validate the purpose against the canonical
    // PURPOSES list at multer time, and verify the resolved path
    // stays within UPLOAD_ROOT before continuing.
    const raw = String(req.body?.purpose || 'other');
    const purpose = UploadedFile.PURPOSES.includes(raw) ? raw : 'other';
    const dateDir = new Date().toISOString().slice(0, 10);
    const dir = path.join(UPLOAD_ROOT, purpose, dateDir);
    const resolved = path.resolve(dir);
    if (!resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) {
      return cb(new Error('invalid upload path'), '');
    }
    fs.mkdir(dir, { recursive: true }, err => {
      if (err) return cb(err, '');
      cb(null, dir);
    });
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const uuid = crypto.randomBytes(16).toString('hex');
    cb(null, `${uuid}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      cb(new Error(`نوع الملف غير مسموح: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'nurse',
  'receptionist',
  'parent',
  'guardian',
];
const UPLOAD_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'therapist',
  'teacher',
  'nurse',
];
const DELETE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager'];
const HARD_DELETE_ROLES = ['admin', 'superadmin', 'super_admin'];

// ── POST / — upload ────────────────────────────────────────────────────
router.post('/', requireRole(UPLOAD_ROLES), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يُرفَع ملف' });
    }
    const { purpose, beneficiaryId, refModel, refId, metadata } = req.body || {};
    if (!UploadedFile.PURPOSES.includes(String(purpose))) {
      // Clean up the stored file
      await fsp.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: `purpose يجب أن يكون: ${UploadedFile.PURPOSES.join(' | ')}`,
      });
    }
    const doc = await UploadedFile.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      purpose,
      beneficiaryId:
        beneficiaryId && mongoose.isValidObjectId(beneficiaryId) ? beneficiaryId : null,
      refModel: String(refModel || '').slice(0, 50),
      refId: refId && mongoose.isValidObjectId(refId) ? refId : null,
      storagePath: req.file.path,
      storageProvider: 'local',
      uploadedBy: req.user?.id || null,
      uploadedByName: req.user?.name || '',
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
    res.status(201).json({ success: true, data: doc.toJSON() });
  } catch (err) {
    // Clean up disk artifact on DB failure
    if (req.file?.path) await fsp.unlink(req.file.path).catch(() => {});
    return safeError(res, err, 'files.upload');
  }
});

// Multer errors come as MulterError — translate to JSON
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `الملف أكبر من الحد المسموح (${(MAX_BYTES / 1024 / 1024).toFixed(0)}MB)`,
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

// ── GET / ──────────────────────────────────────────────────────────────
router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = { status: 'active' };
    if (req.query.purpose && UploadedFile.PURPOSES.includes(String(req.query.purpose))) {
      filter.purpose = String(req.query.purpose);
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.beneficiaryId = req.query.beneficiaryId;
    }
    if (req.query.refId && mongoose.isValidObjectId(req.query.refId)) {
      filter.refId = req.query.refId;
    }
    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      UploadedFile.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean({ virtuals: true }),
      UploadedFile.countDocuments(filter),
    ]);
    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'files.list');
  }
});

// ── GET /:id — metadata ───────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const doc = await UploadedFile.findById(req.params.id).lean({ virtuals: true });
    if (!doc) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    if (doc.status === 'soft_deleted') {
      return res.status(404).json({ success: false, message: 'الملف محذوف' });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'files.get');
  }
});

// ── GET /:id/download ─────────────────────────────────────────────────
router.get('/:id/download', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const doc = await UploadedFile.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    if (doc.status === 'soft_deleted') {
      return res.status(404).json({ success: false, message: 'الملف محذوف' });
    }
    // W453: ensure path is within UPLOAD_ROOT (prevent traversal).
    // Pre-W453 the check was `resolved.startsWith(UPLOAD_ROOT)` which
    // matches a sibling like `/path/uploads-evil/file` when UPLOAD_ROOT
    // is `/path/uploads`. Adding `+ path.sep` requires the path to be
    // STRICTLY inside the directory (not a prefix-shared sibling).
    const resolved = path.resolve(doc.storagePath);
    if (!resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) {
      return res.status(403).json({ success: false, message: 'مسار غير مسموح' });
    }
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود على القرص' });
    }
    // W463: defense-in-depth stored-XSS guard (sibling of W462 on
    // documents.routes.js). ALLOWED_MIMES currently excludes the
    // executable-script mime classes, but if a future maintainer
    // adds text/html, text/xml, application/xml, or image/svg+xml
    // to the allowlist, inline render would be stored-XSS. Force
    // attachment + sandbox CSP for those mimes regardless.
    const mime = doc.mimeType || 'application/octet-stream';
    const isExecutableScript =
      /^text\/(html|xml)/i.test(mime) ||
      /^application\/xml/i.test(mime) ||
      /^image\/svg/i.test(mime);
    const disposition = isExecutableScript ? 'attachment' : 'inline';
    res.set('Content-Type', mime);
    res.set(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(doc.originalName)}"`
    );
    if (isExecutableScript) {
      res.set('X-Frame-Options', 'DENY');
      res.set('Content-Security-Policy', "sandbox; default-src 'none'");
    }
    fs.createReadStream(resolved).pipe(res);
  } catch (err) {
    return safeError(res, err, 'files.download');
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────
router.delete('/:id', requireRole(DELETE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const hard = req.query.hard === '1';
    if (hard) {
      const role = String(req.user?.role || req.user?.roleCode || '').toLowerCase();
      if (!HARD_DELETE_ROLES.includes(role)) {
        return res.status(403).json({ success: false, message: 'الحذف النهائي يحتاج مدير عام' });
      }
      const doc = await UploadedFile.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
      const resolved = path.resolve(doc.storagePath);
      // W453: strict path-sep boundary (see /:id/download for rationale)
      if (resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) {
        await fsp.unlink(resolved).catch(() => {});
      }
      return res.json({ success: true, message: 'تم الحذف النهائي' });
    }
    const doc = await UploadedFile.findByIdAndUpdate(
      req.params.id,
      { status: 'soft_deleted', deletedAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    res.json({ success: true, message: 'تم الحذف (Soft)' });
  } catch (err) {
    return safeError(res, err, 'files.delete');
  }
});

module.exports = router;
