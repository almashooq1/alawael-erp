'use strict';

/**
 * files.routes.js — Wave 207b (Unified Document Hub edition).
 *
 * This route is now a thin compatibility layer over the central Document model.
 * New uploads become Document records with sourceModule derived from the
 * `purpose` field. Existing UploadedFile records continue to be readable
 * through this surface for backward compatibility.
 *
 * Endpoints:
 *   POST   /                    — multipart upload (single file)
 *   GET    /                    — list (filters: purpose, beneficiaryId, refId)
 *   GET    /:id                 — metadata
 *   GET    /:id/download        — stream the file (with role check + access log)
 *   DELETE /:id                 — soft-delete
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
const multer = require('multer');

const { authenticateToken, requireRole } = require('../middleware/auth');
const Document = require('../models/Document');
const UploadedFile = require('../models/UploadedFile');
const safeError = require('../utils/safeError');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');
const documentUploadService = require('../services/documents/documentUpload.service');
const storageService = require('../services/storage/storage.service');

router.use(authenticateToken);
router.use(bodyScopedBeneficiaryGuard);

const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
const MAX_BYTES = parseInt(process.env.UPLOAD_MAX_BYTES || '10485760', 10); // 10MB default

const memStorage = multer.memoryStorage();
const upload = multer({
  storage: memStorage,
  limits: { fileSize: MAX_BYTES },
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

const PURPOSE_TO_MODULE = {
  portfolio: 'beneficiary',
  disability_card_scan: 'beneficiary',
  trip_doc: 'beneficiary',
  pickup_auth_doc: 'beneficiary',
  iep_signed_pdf: 'medical',
  rs_evidence: 'medical',
  meal_menu: 'other',
  other: 'core',
};

// ── POST / — upload ────────────────────────────────────────────────────
router.post('/', requireRole(UPLOAD_ROLES), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يُرفَع ملف' });
    }

    const { purpose, beneficiaryId, refModel, refId, metadata } = req.body || {};
    const rawPurpose = String(purpose || 'other');
    const validPurpose = UploadedFile.PURPOSES.includes(rawPurpose) ? rawPurpose : 'other';

    const sourceModule = PURPOSE_TO_MODULE[validPurpose] || 'core';
    const entityType = refModel || (beneficiaryId ? 'Beneficiary' : null);
    const entityId = refId || beneficiaryId || null;

    const doc = await documentUploadService.createDocumentRecord(req.file, req.user, {
      sourceModule,
      entityType,
      entityId,
      folder: validPurpose,
      ...(metadata && typeof metadata === 'object' ? metadata : {}),
    });

    res.status(201).json({ success: true, data: doc.toJSON ? doc.toJSON() : doc });
  } catch (err) {
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
    const filter = { status: 'نشط' };
    if (req.query.purpose && UploadedFile.PURPOSES.includes(String(req.query.purpose))) {
      filter.folder = String(req.query.purpose);
    }
    if (req.query.beneficiaryId && mongoose.isValidObjectId(req.query.beneficiaryId)) {
      filter.entityType = 'Beneficiary';
      filter.entityId = String(req.query.beneficiaryId);
    }
    if (req.query.refId && mongoose.isValidObjectId(req.query.refId)) {
      filter.entityId = String(req.query.refId);
    }

    const p = Math.max(1, parseInt(req.query.page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
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
    return safeError(res, err, 'files.list');
  }
});

// ── GET /:id — metadata ───────────────────────────────────────────────
router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }

    // Prefer Document; fall back to UploadedFile for legacy IDs
    let doc = await Document.findById(req.params.id).lean();
    if (!doc) {
      doc = await UploadedFile.findById(req.params.id).lean({ virtuals: true });
    }
    if (!doc) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    if (doc.status === 'محذوف' || doc.status === 'soft_deleted') {
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

    let doc = await Document.findById(req.params.id);
    if (!doc) {
      doc = await UploadedFile.findById(req.params.id);
    }
    if (!doc) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    if (doc.status === 'محذوف' || doc.status === 'soft_deleted') {
      return res.status(404).json({ success: false, message: 'الملف محذوف' });
    }

    const storageProvider = doc.storageProvider || 'local';
    const storagePath = doc.filePath || doc.storagePath;
    const fileExists = await storageService.exists(storagePath, storageProvider).catch(() => false);
    if (!fileExists) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود على القرص' });
    }

    const mime = doc.mimeType || 'application/octet-stream';
    const isExecutableScript =
      /^text\/(html|xml)/i.test(mime) ||
      /^application\/xml/i.test(mime) ||
      /^image\/svg/i.test(mime);
    const disposition = isExecutableScript ? 'attachment' : 'inline';
    res.set('Content-Type', mime);
    res.set(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(doc.originalName || doc.originalFileName || doc.fileName)}"`
    );
    if (isExecutableScript) {
      res.set('X-Frame-Options', 'DENY');
      res.set('Content-Security-Policy', "sandbox; default-src 'none'");
    }

    const buffer = await storageService.download(storagePath, storageProvider);
    res.send(buffer);
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
      const doc = await Document.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
      await storageService.remove(doc.filePath, doc.storageProvider || 'local').catch(() => {});
      await Document.findByIdAndDelete(req.params.id);
      return res.json({ success: true, message: 'تم الحذف النهائي' });
    }

    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { status: 'محذوف', isArchived: false },
      { returnDocument: 'after' }
    );
    if (!doc) {
      // Fallback to legacy UploadedFile soft-delete
      const legacy = await UploadedFile.findByIdAndUpdate(
        req.params.id,
        { status: 'soft_deleted', deletedAt: new Date() },
        { returnDocument: 'after' }
      );
      if (!legacy) return res.status(404).json({ success: false, message: 'الملف غير موجود' });
      return res.json({ success: true, message: 'تم الحذف (Soft)' });
    }
    res.json({ success: true, message: 'تم الحذف (Soft)' });
  } catch (err) {
    return safeError(res, err, 'files.delete');
  }
});

module.exports = router;
