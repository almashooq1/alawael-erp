/**
 * Blockchain Certificate Routes — مسارات شهادات البلوكتشين
 *
 * Endpoints:
 *   /api/blockchain/certificates  — Certificate CRUD + issuance + revocation
 *   /api/blockchain/templates     — Certificate templates management
 *   /api/blockchain/verify        — Public verification endpoints
 *   /api/blockchain/dashboard     — Blockchain dashboard
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  BlockchainCertificate,
  CertificateTemplate,
  VerificationLog,
} = require('../models/blockchain.model');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// ── Auth: all routes below require authentication ────────────────────────────
router.use(authenticate);
router.use(requireBranchAccess);
// ── ObjectId param validation ────────────────────────────────────────────────
router.param('id', (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: 'معرف غير صالح' });
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — دوال مساعدة
// ═══════════════════════════════════════════════════════════════════════════

function computeHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function getLastCertificateHash() {
  const last = await BlockchainCertificate.findOne({ status: { $ne: 'draft' } })
    .sort({ createdAt: -1 })
    .select('hash')
    .lean();
  return last ? last.hash : '0'.repeat(64); // genesis block
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATES — قوالب الشهادات
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
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await CertificateTemplate.findByIdAndUpdate(
      req.params.id,
      stripUpdateMeta(req.body),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!template) return res.status(404).json({ success: false, error: 'القالب غير موجود' });
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATES — الشهادات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/certificates', async (req, res) => {
  try {
    const { status, category, recipient, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (recipient) {
      const safeRecipient = escapeRegex(recipient);
      filter.$or = [
        { 'recipient.name.ar': { $regex: safeRecipient, $options: 'i' } },
        { 'recipient.name.en': { $regex: safeRecipient, $options: 'i' } },
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

// Allowed fields for certificate creation
const CERT_ALLOWED_FIELDS = [
  'recipient',
  'title',
  'data',
  'issueDate',
  'expiryDate',
  'category',
  'template',
];

router.post('/certificates', async (req, res) => {
  try {
    const previousHash = await getLastCertificateHash();
    const picked = {};
    for (const f of CERT_ALLOWED_FIELDS) {
      if (req.body[f] !== undefined) picked[f] = req.body[f];
    }
    const certData = {
      ...picked,
      previousHash,
      createdBy: req.user._id,
    };

    // Compute hash from certificate data
    const hash = computeHash({
      recipient: certData.recipient,
      title: certData.title,
      data: certData.data,
      issueDate: certData.issueDate || new Date(),
      previousHash,
    });

    certData.hash = hash;
    certData.verificationUrl = `/api/blockchain/verify/${hash}`;

    const certificate = await BlockchainCertificate.create(certData);
    res.status(201).json({ success: true, data: certificate });
  } catch (error) {
    res.status(400).json({ success: false });
  }
});

router.patch('/certificates/:id/issue', async (req, res) => {
  try {
    const cert = await BlockchainCertificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, error: 'الشهادة غير موجودة' });

    if (cert.status !== 'draft') {
      return res
        .status(400)
        .json({ success: false, error: 'لا يمكن إصدار شهادة ليست في حالة مسودة' });
    }

    cert.status = 'issued';
    cert.issueDate = new Date();
    cert.issuer.issuedBy = req.user._id;

    // Simulate blockchain transaction
    cert.blockchain = {
      network: 'internal',
      transactionHash: computeHash({ certId: cert._id, timestamp: Date.now() }),
      blockNumber: (parseInt(crypto.randomBytes(4).toString('hex'), 16) % 1000000) + 1,
      timestamp: new Date(),
    };

    await cert.save();
    res.json({ success: true, data: cert, message: 'تم إصدار الشهادة بنجاح' });
  } catch (error) {
    safeError(res, error, 'blockchain');
  }
});

router.patch('/certificates/:id/sign', async (req, res) => {
  try {
    const cert = await BlockchainCertificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, error: 'الشهادة غير موجودة' });

    const signatureHash = computeHash({
      certHash: cert.hash,
      signer: req.user._id || req.body.signerName,
      timestamp: Date.now(),
    });

    cert.signatures.push({
      signer: req.user._id,
      signerName: req.body.signerName,
      signerTitle: req.body.signerTitle,
      signature: signatureHash,
    });

    await cert.save();
    res.json({ success: true, data: cert, message: 'تم التوقيع بنجاح' });
  } catch (error) {
    safeError(res, error, 'blockchain');
  }
});

router.patch('/certificates/:id/revoke', async (req, res) => {
  try {
    const cert = await BlockchainCertificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, error: 'الشهادة غير موجودة' });

    if (cert.status === 'revoked') {
      return res.status(400).json({ success: false, error: 'الشهادة مُلغاة بالفعل' });
    }

    cert.status = 'revoked';
    cert.revocation = {
      revokedAt: new Date(),
      revokedBy: req.user._id,
      reason: req.body.reason || 'غير محدد',
    };

    await cert.save();
    res.json({ success: true, data: cert, message: 'تم إلغاء الشهادة' });
  } catch (error) {
    safeError(res, error, 'blockchain');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION — التحقق (Public endpoints)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/verify/:hash', async (req, res) => {
  try {
    const cert = await BlockchainCertificate.findOne({ hash: req.params.hash })
      .populate('template', 'name category')
      .select('-__v')
      .lean();

    const result = cert
      ? cert.status === 'revoked'
        ? 'revoked'
        : cert.status === 'expired'
          ? 'expired'
          : 'valid'
      : 'not_found';

    // Verify hash integrity
    let hashMatch = false;
    if (cert) {
      const recomputedHash = computeHash({
        recipient: cert.recipient,
        title: cert.title,
        data: cert.data,
        issueDate: cert.issueDate,
        previousHash: cert.previousHash,
      });
      hashMatch = recomputedHash === cert.hash;
    }

    // Log verification
    await VerificationLog.create({
      certificate: cert?._id,
      certificateNumber: cert?.certificateNumber,
      verifiedBy: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?._id,
      },
      method: 'manual_lookup',
      result,
      hashMatch,
    });

    if (!cert) {
      return res.status(404).json({ success: false, verified: false, result: 'not_found' });
    }

    res.json({
      success: true,
      verified: result === 'valid' && hashMatch,
      result,
      hashMatch,
      certificate: {
        certificateNumber: cert.certificateNumber,
        title: cert.title,
        recipient: cert.recipient?.name,
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate,
        status: cert.status,
        category: cert.category,
        signatures: cert.signatures?.length || 0,
      },
    });
  } catch (error) {
    safeError(res, error, 'blockchain');
  }
});

router.get('/verify/number/:certNumber', async (req, res) => {
  try {
    const cert = await BlockchainCertificate.findOne({
      certificateNumber: req.params.certNumber,
    }).lean();

    if (!cert) {
      return res.status(404).json({ success: false, verified: false, result: 'not_found' });
    }

    // Redirect to hash-based verification — validate hash is safe hex to prevent open redirect
    const safeHash = /^[a-fA-F0-9]{1,128}$/.test(cert.hash) ? cert.hash : '';
    if (!safeHash) {
      return res.status(400).json({ success: false, message: 'Invalid certificate hash' });
    }
    res.redirect(`/api/blockchain/verify/${safeHash}`);
  } catch (error) {
    safeError(res, error, 'blockchain');
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
    safeError(res, error, 'blockchain');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم البلوكتشين
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
      recentCertificates,
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
      BlockchainCertificate.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('certificateNumber title status issueDate category')
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
        recentCertificates,
      },
    });
  } catch (error) {
    safeError(res, error, '[Blockchain] Dashboard error');
  }
});

module.exports = router;
