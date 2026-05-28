'use strict';
/**
 * Student Certificates Routes — إصدار وإدارة شهادات الطلاب
 * ══════════════════════════════════════════════════════════════════════════
 * Certificate generation, issuance, download, and verification.
 *
 *   GET    /                  list certificates
 *   POST   /generate          generate a new certificate
 *   GET    /:id               get certificate details
 *   DELETE /:id               revoke / delete certificate
 *   GET    /:id/download      download certificate (metadata/link)
 *   POST   /verify            verify certificate authenticity by code
 *   GET    /types             list available certificate types
 *   GET    /stats             certificate statistics
 */

const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
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
router.get('/', async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, beneficiaryId, certType, status } = req.query;
    const filter = {
      branchId: req.user.branchId,
      category: 'certificate',
      isDeleted: { $ne: true },
    };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (certType) filter.certificateType = certType;
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Document.find(filter).sort({ issuedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Document.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'list certificates');
  }
});

// ── POST /generate ─────────────────────────────────────────────────────────
router.post('/generate', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const { beneficiaryId, certificateType, data: certData = {}, expiryDate } = req.body;
    if (!beneficiaryId || !certificateType)
      return res
        .status(400)
        .json({ success: false, message: 'beneficiaryId and certificateType are required' });
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const verificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();
    const doc = await Document.create({
      category: 'certificate',
      beneficiaryId,
      certificateType,
      status: 'issued',
      data: certData,
      expiryDate,
      verificationCode,
      branchId: req.user.branchId,
      issuedAt: new Date(),
      issuedBy: req.user._id,
      title: `${certificateType} Certificate`,
    });
    res.status(201).json({ success: true, data: doc, verificationCode });
  } catch (err) {
    safeError(res, err, 'generate certificate');
  }
});

// ── GET /types ─────────────────────────────────────────────────────────────
// NOTE: literal routes must precede /:id or Express casts them as Document ids.
router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: [
      { key: 'completion', label: 'شهادة إتمام البرنامج', requiresExpiry: false },
      { key: 'attendance', label: 'شهادة حضور', requiresExpiry: false },
      { key: 'assessment', label: 'شهادة تقييم', requiresExpiry: true },
      { key: 'achievement', label: 'شهادة إنجاز', requiresExpiry: false },
      { key: 'enrollment', label: 'شهادة تسجيل', requiresExpiry: true },
      { key: 'medical_clearance', label: 'شهادة تصريح طبي', requiresExpiry: true },
      { key: 'disability', label: 'شهادة إعاقة', requiresExpiry: true },
    ],
  });
});

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document)
      return res.json({
        success: true,
        data: { total: 0, issued: 0, revoked: 0, expiringSoon: 0 },
      });
    const base = { branchId: req.user.branchId, category: 'certificate' };
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [total, issued, revoked, expiringSoon] = await Promise.all([
      Document.countDocuments(base),
      Document.countDocuments({ ...base, status: 'issued' }),
      Document.countDocuments({ ...base, status: 'revoked' }),
      Document.countDocuments({
        ...base,
        status: 'issued',
        expiryDate: { $lte: thirtyDays, $gte: new Date() },
      }),
    ]);
    res.json({ success: true, data: { total, issued, revoked, expiringSoon } });
  } catch (err) {
    safeError(res, err, 'certificate stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      category: 'certificate',
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Certificate not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'get certificate');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { reason } = req.body;
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, category: 'certificate' },
      {
        status: 'revoked',
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id,
        revocationReason: reason,
      }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Certificate not found' });
    res.json({ success: true, message: 'Certificate revoked' });
  } catch (err) {
    safeError(res, err, 'revoke certificate');
  }
});

// ── GET /:id/download ──────────────────────────────────────────────────────
router.get('/:id/download', async (req, res) => {
  try {
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      category: 'certificate',
      status: { $ne: 'revoked' },
    }).lean();
    if (!doc)
      return res.status(404).json({ success: false, message: 'Certificate not found or revoked' });
    // Return download metadata (actual file serving handled by file/storage service)
    res.json({
      success: true,
      data: {
        _id: doc._id,
        title: doc.title,
        fileUrl: doc.fileUrl || null,
        verificationCode: doc.verificationCode,
        issuedAt: doc.issuedAt,
        expiryDate: doc.expiryDate,
      },
    });
  } catch (err) {
    safeError(res, err, 'download certificate');
  }
});

// ── POST /verify ───────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code)
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    const Document = safeModel('Document');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOne({
      verificationCode: code.toUpperCase(),
      category: 'certificate',
    })
      .select('title beneficiaryId certificateType status issuedAt expiryDate branchId')
      .lean();
    if (!doc)
      return res
        .status(404)
        .json({ success: false, valid: false, message: 'Certificate not found' });
    if (doc.status === 'revoked')
      return res.json({ success: true, valid: false, message: 'Certificate has been revoked' });
    if (doc.expiryDate && new Date(doc.expiryDate) < new Date())
      return res.json({ success: true, valid: false, message: 'Certificate has expired' });
    res.json({
      success: true,
      valid: true,
      data: {
        title: doc.title,
        certificateType: doc.certificateType,
        status: doc.status,
        issuedAt: doc.issuedAt,
        expiryDate: doc.expiryDate,
      },
    });
  } catch (err) {
    safeError(res, err, 'verify certificate');
  }
});

module.exports = router;
