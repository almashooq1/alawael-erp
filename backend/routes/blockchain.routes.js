/**
 * Blockchain Certificate Routes — مسارات شهادات البلوكتشين (Admin)
 *
 * Endpoints (all require auth + branch scope):
 *   /api/blockchain/templates         — Certificate templates CRUD
 *   /api/blockchain/certificates      — Certificate CRUD + lifecycle
 *   /api/blockchain/certificates/batch-issue — Anchor many certs in one tx
 *   /api/blockchain/certificates/:id/pdf     — PDF download with QR
 *   /api/blockchain/verify            — Authenticated verification (logs userId)
 *   /api/blockchain/dashboard         — Stats
 *
 * Public, unauthenticated verification lives at /api/v1/blockchain/public/*.
 * Logic is in services/blockchainCertService.js — this file is HTTP only.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  BlockchainCertificate,
  CertificateTemplate,
  VerificationLog,
} = require('../models/blockchain.model');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');
const certService = require('../services/blockchainCertService');
const { generateCertificatePdf } = require('../services/blockchainPdfService');

router.use(authenticate);
router.use(requireBranchAccess);

router.param('id', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: 'معرف غير صالح' });
  }
  next();
});

// ── helper: map service-thrown errors to HTTP ──────────────────────────────
function send(res, err, defaultLabel) {
  if (err && err.status) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  return safeError(res, err, defaultLabel);
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/templates', async (req, res) => {
  try {
    const { category, active } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';
    const templates = await CertificateTemplate.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: templates });
  } catch (error) {
    safeError(res, error, 'blockchain');
  }
});

router.post('/templates', async (req, res) => {
  try {
    const template = await CertificateTemplate.create({
      ...stripUpdateMeta(req.body),
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: template });
  } catch {
    res.status(400).json({ success: false });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await CertificateTemplate.findByIdAndUpdate(
      req.params.id,
      stripUpdateMeta(req.body),
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, error: 'القالب غير موجود' });
    res.json({ success: true, data: template });
  } catch {
    res.status(400).json({ success: false });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATES — list + read
// ═══════════════════════════════════════════════════════════════════════════

router.get('/certificates', async (req, res) => {
  try {
    const { status, category, recipient, batchId, network, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (batchId) filter.batchId = batchId;
    if (network) filter['blockchain.network'] = network;
    if (recipient) {
      const safe = escapeRegex(recipient);
      filter.$or = [
        { 'recipient.name.ar': { $regex: safe, $options: 'i' } },
        { 'recipient.name.en': { $regex: safe, $options: 'i' } },
        { 'recipient.nationalId': recipient },
      ];
    }
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [certificates, total] = await Promise.all([
      BlockchainCertificate.find(filter)
        .populate('template', 'name category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      BlockchainCertificate.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: certificates,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    safeError(res, error, 'blockchain');
  }
});

router.get('/certificates/:id', async (req, res) => {
  try {
    const cert = await BlockchainCertificate.findById(req.params.id)
      .populate('template')
      .populate('issuer.issuedBy', 'name')
      .populate('signatures.signer', 'name')
      .lean();
    if (!cert) return res.status(404).json({ success: false, error: 'الشهادة غير موجودة' });
    res.json({ success: true, data: cert });
  } catch (error) {
    safeError(res, error, 'blockchain');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATES — lifecycle
// ═══════════════════════════════════════════════════════════════════════════

router.post('/certificates', async (req, res) => {
  try {
    const idempotencyKey = req.get('Idempotency-Key') || req.body?.idempotencyKey || undefined;
    const result = await certService.createCertificate(req.body, {
      userId: req.user?._id,
      idempotencyKey,
    });
    res
      .status(result.deduped ? 200 : 201)
      .json({ success: true, data: result.certificate, deduped: result.deduped });
  } catch (err) {
    send(res, err, 'blockchain.create');
  }
});

router.patch('/certificates/:id/issue', async (req, res) => {
  try {
    const cert = await certService.issueCertificate(req.params.id, { userId: req.user?._id });
    res.json({ success: true, data: cert, message: 'تم إصدار الشهادة بنجاح' });
  } catch (err) {
    send(res, err, 'blockchain.issue');
  }
});

router.post('/certificates/batch-issue', async (req, res) => {
  try {
    const { certificateIds } = req.body || {};
    const result = await certService.batchIssue(certificateIds, { userId: req.user?._id });
    res.json({
      success: true,
      data: result,
      message: `تم تثبيت ${result.issued} شهادة في معاملة واحدة`,
    });
  } catch (err) {
    send(res, err, 'blockchain.batch-issue');
  }
});

router.patch('/certificates/:id/sign', async (req, res) => {
  try {
    const cert = await certService.signCertificate(req.params.id, {
      userId: req.user?._id,
      signerName: req.body?.signerName,
      signerTitle: req.body?.signerTitle,
    });
    res.json({ success: true, data: cert, message: 'تم التوقيع بنجاح' });
  } catch (err) {
    send(res, err, 'blockchain.sign');
  }
});

router.patch('/certificates/:id/revoke', async (req, res) => {
  try {
    const cert = await certService.revokeCertificate(req.params.id, {
      userId: req.user?._id,
      reason: req.body?.reason,
    });
    res.json({ success: true, data: cert, message: 'تم إلغاء الشهادة' });
  } catch (err) {
    send(res, err, 'blockchain.revoke');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATES — PDF download
// ═══════════════════════════════════════════════════════════════════════════

router.get('/certificates/:id/pdf', async (req, res) => {
  try {
    const cert = await BlockchainCertificate.findById(req.params.id).lean();
    if (!cert) return res.status(404).json({ success: false, error: 'الشهادة غير موجودة' });
    const verifyUrl = certService.publicVerifyUrl(cert.hash);
    const pdf = await generateCertificatePdf(cert, { verifyUrl });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="certificate-${cert.certificateNumber || cert._id}.pdf"`
    );
    res.send(pdf);
  } catch (err) {
    safeError(res, err, 'blockchain.pdf');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION (authenticated — public mirror at /public/verify)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/verify/:hash', async (req, res) => {
  try {
    const out = await certService.verifyByHash(req.params.hash, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?._id,
      method: 'manual_lookup',
    });
    if (out.result === 'not_found') {
      return res.status(404).json({ success: false, verified: false, ...out });
    }
    res.json({ success: true, ...out });
  } catch (error) {
    safeError(res, error, 'blockchain.verify');
  }
});

router.get('/verify/number/:certNumber', async (req, res) => {
  try {
    const cert = await BlockchainCertificate.findOne({
      certificateNumber: req.params.certNumber,
    })
      .select('hash')
      .lean();
    if (!cert) {
      return res.status(404).json({ success: false, verified: false, result: 'not_found' });
    }
    const safeHash = /^[a-fA-F0-9]{1,128}$/.test(cert.hash) ? cert.hash : '';
    if (!safeHash)
      return res.status(400).json({ success: false, message: 'Invalid certificate hash' });
    res.redirect(`/api/blockchain/verify/${safeHash}`);
  } catch (error) {
    safeError(res, error, 'blockchain.verify-number');
  }
});

router.get('/verify/:certId/logs', async (req, res) => {
  try {
    const logs = await VerificationLog.find({ certificate: req.params.certId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: logs });
  } catch (error) {
    safeError(res, error, 'blockchain.logs');
  }
});

// All verification logs across all certs — paged + filterable for the admin UI
router.get('/logs', async (req, res) => {
  try {
    const { result, method, certificateNumber, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (result) filter.result = result;
    if (method) filter.method = method;
    if (certificateNumber) filter.certificateNumber = certificateNumber;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [logs, total, byResult, byMethod] = await Promise.all([
      VerificationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      VerificationLog.countDocuments(filter),
      VerificationLog.aggregate([
        { $match: filter },
        { $group: { _id: '$result', count: { $sum: 1 } } },
      ]),
      VerificationLog.aggregate([
        { $match: filter },
        { $group: { _id: '$method', count: { $sum: 1 } } },
      ]),
    ]);
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
      stats: { byResult, byMethod },
    });
  } catch (error) {
    safeError(res, error, 'blockchain.logs.all');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (_req, res) => {
  try {
    const [
      totalCertificates,
      issuedCertificates,
      revokedCertificates,
      draftCertificates,
      templates,
      totalVerifications,
      byCategory,
      byNetwork,
      recentCertificates,
      recentVerifications,
    ] = await Promise.all([
      BlockchainCertificate.countDocuments({ isDeleted: { $ne: true } }),
      BlockchainCertificate.countDocuments({ status: 'issued', isDeleted: { $ne: true } }),
      BlockchainCertificate.countDocuments({ status: 'revoked', isDeleted: { $ne: true } }),
      BlockchainCertificate.countDocuments({ status: 'draft', isDeleted: { $ne: true } }),
      CertificateTemplate.countDocuments({ isActive: true }),
      VerificationLog.countDocuments(),
      BlockchainCertificate.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
      BlockchainCertificate.aggregate([
        { $match: { isDeleted: { $ne: true }, 'blockchain.network': { $exists: true } } },
        { $group: { _id: '$blockchain.network', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      BlockchainCertificate.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('certificateNumber title status issueDate category blockchain.network hash')
        .lean(),
      VerificationLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('certificateNumber method result hashMatch createdAt')
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        totalCertificates,
        issuedCertificates,
        revokedCertificates,
        draftCertificates,
        activeTemplates: templates,
        totalVerifications,
        byCategory,
        byNetwork,
        recentCertificates,
        recentVerifications,
      },
    });
  } catch (error) {
    safeError(res, error, '[Blockchain] Dashboard error');
  }
});

module.exports = router;
