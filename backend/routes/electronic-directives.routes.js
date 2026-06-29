'use strict';
/**
 * Electronic Directives Routes — إدارة التوجيهات الإلكترونية والموافقات الرقمية
 * ══════════════════════════════════════════════════════════════════════════
 * Manages advance care directives, informed consent forms, and legally
 * significant documents that require electronic signatures or acknowledgment.
 *
 *   GET    /                     list directives (paginated)
 *   POST   /                     create directive
 *   GET    /:id                  get directive detail
 *   PUT    /:id                  update draft directive
 *   DELETE /:id                  delete draft directive
 *   POST   /:id/send-for-signing send to beneficiary/guardian for e-signature
 *   PATCH  /:id/sign             record e-signature (PIN/OTP)
 *   PATCH  /:id/witness-sign     record witness signature
 *   PATCH  /:id/revoke           revoke directive
 *   GET    /:id/audit-trail      full audit trail for directive
 *   GET    /templates            list directive templates
 *   GET    /stats                directive stats
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { bodyScopedBeneficiaryGuard } = require('../middleware/assertBranchMatch');
require('../models/ElectronicDirective'); // register model for safeModel() lookup

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

// ── GET / ──────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const Document = safeModel('ElectronicDirective');
    if (!Document) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, type, status, beneficiaryId } = req.query;
    const filter = { branchId: req.user.branchId, category: 'directive', isDeleted: { $ne: true } };
    if (type) filter.directiveType = type;
    if (status) filter.signatureStatus = status;
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Document.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Document.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'list directives');
  }
});

// ── POST / ─────────────────────────────────────────────────────────────────
router.post('/', requireRole('admin', 'manager', 'doctor', 'clinician'), async (req, res) => {
  try {
    const Document = safeModel('ElectronicDirective');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const { directiveType, beneficiaryId, title, content, requiredSigners = [] } = req.body;
    if (!directiveType || !beneficiaryId || !title)
      return res
        .status(400)
        .json({ success: false, message: 'directiveType, beneficiaryId, and title are required' });
    const doc = await Document.create({
      category: 'directive',
      directiveType,
      beneficiaryId,
      title,
      content,
      requiredSigners,
      signatureStatus: 'pending_creation',
      branchId: req.user.branchId,
      createdBy: req.user._id,
      status: 'draft',
      auditTrail: [{ action: 'created', performedBy: req.user._id, performedAt: new Date() }],
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create directive');
  }
});

// ── GET /templates ─────────────────────────────────────────────────────────
// NOTE: literal routes must precede /:id or Express casts them as Document ids.
router.get('/templates', async (req, res) => {
  try {
    const ESign = safeModel('ESignatureTemplate');
    if (!ESign) return res.json({ success: true, data: [] });
    const data = await ESign.find({ branchId: req.user.branchId }).sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'directive templates');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Document = safeModel('ElectronicDirective');
    if (!Document)
      return res.json({
        success: true,
        data: { total: 0, draft: 0, active: 0, revoked: 0, awaitingSignature: 0 },
      });
    const base = { branchId: req.user.branchId, category: 'directive' };
    const [total, draft, active, revoked, awaitingSignature] = await Promise.all([
      Document.countDocuments(base),
      Document.countDocuments({ ...base, status: 'draft' }),
      Document.countDocuments({ ...base, status: 'active' }),
      Document.countDocuments({ ...base, status: 'revoked' }),
      Document.countDocuments({ ...base, status: 'awaiting_signature' }),
    ]);
    res.json({ success: true, data: { total, draft, active, revoked, awaitingSignature } });
  } catch (err) {
    safeError(res, err, 'directive stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const Document = safeModel('ElectronicDirective');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      category: 'directive',
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Directive not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'get directive');
  }
});

// ── PUT /:id ───────────────────────────────────────────────────────────────
router.put('/:id', requireRole('admin', 'manager', 'doctor', 'clinician'), async (req, res) => {
  try {
    const Document = safeModel('ElectronicDirective');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, category: 'directive', status: 'draft' },
      { ...req.body, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Draft directive not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update directive');
  }
});

// ── DELETE /:id ────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const Document = safeModel('ElectronicDirective');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, status: 'draft' },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Draft directive not found' });
    res.json({ success: true, message: 'Directive deleted' });
  } catch (err) {
    safeError(res, err, 'delete directive');
  }
});

// ── POST /:id/send-for-signing ─────────────────────────────────────────────
router.post(
  '/:id/send-for-signing',
  requireRole('admin', 'manager', 'doctor', 'clinician'),
  async (req, res) => {
    try {
      const Document = safeModel('ElectronicDirective');
      if (!Document)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const { notifyVia = 'email' } = req.body;
      const doc = await Document.findOneAndUpdate(
        { _id: req.params.id, branchId: req.user.branchId, category: 'directive', status: 'draft' },
        {
          status: 'awaiting_signature',
          signatureStatus: 'sent',
          sentForSigningAt: new Date(),
          sentForSigningBy: req.user._id,
          notifyVia,
          $push: {
            auditTrail: {
              action: 'sent_for_signing',
              performedBy: req.user._id,
              performedAt: new Date(),
            },
          },
        },
        { returnDocument: 'after' }
      );
      if (!doc)
        return res
          .status(404)
          .json({ success: false, message: 'Directive not found or not in draft state' });
      res.json({
        success: true,
        data: doc,
        message: `Directive sent for signing via ${notifyVia}`,
      });
    } catch (err) {
      safeError(res, err, 'send for signing');
    }
  }
);

// ── PATCH /:id/sign ────────────────────────────────────────────────────────
router.patch('/:id/sign', async (req, res) => {
  try {
    const { signerType = 'beneficiary', signatureData, pinConfirmed } = req.body;
    if (!pinConfirmed)
      return res.status(400).json({ success: false, message: 'PIN confirmation required' });
    const Document = safeModel('ElectronicDirective');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOneAndUpdate(
      {
        _id: req.params.id,
        branchId: req.user.branchId,
        category: 'directive',
        status: 'awaiting_signature',
      },
      {
        $push: {
          signatures: {
            signerType,
            signedBy: req.user._id,
            signedAt: new Date(),
            signatureData: signatureData || 'digital_acknowledgment',
          },
          auditTrail: {
            action: 'signed',
            signerType,
            performedBy: req.user._id,
            performedAt: new Date(),
          },
        },
        signatureStatus: 'signed',
        status: 'active',
      },
      { returnDocument: 'after' }
    );
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: 'Directive not found or not awaiting signature' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'sign directive');
  }
});

// ── PATCH /:id/witness-sign ────────────────────────────────────────────────
router.patch('/:id/witness-sign', async (req, res) => {
  try {
    const Document = safeModel('ElectronicDirective');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, category: 'directive' },
      {
        $push: {
          signatures: { signerType: 'witness', signedBy: req.user._id, signedAt: new Date() },
          auditTrail: {
            action: 'witness_signed',
            performedBy: req.user._id,
            performedAt: new Date(),
          },
        },
      },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Directive not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'witness sign directive');
  }
});

// ── PATCH /:id/revoke ──────────────────────────────────────────────────────
router.patch('/:id/revoke', requireRole('admin', 'manager', 'doctor'), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason)
      return res.status(400).json({ success: false, message: 'Revocation reason is required' });
    const Document = safeModel('ElectronicDirective');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOneAndUpdate(
      {
        _id: req.params.id,
        branchId: req.user.branchId,
        category: 'directive',
        status: { $in: ['active', 'awaiting_signature'] },
      },
      {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: req.user._id,
        revocationReason: reason,
        $push: {
          auditTrail: {
            action: 'revoked',
            reason,
            performedBy: req.user._id,
            performedAt: new Date(),
          },
        },
      },
      { returnDocument: 'after' }
    );
    if (!doc)
      return res
        .status(404)
        .json({ success: false, message: 'Directive not found or cannot be revoked' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'revoke directive');
  }
});

// ── GET /:id/audit-trail ───────────────────────────────────────────────────
router.get('/:id/audit-trail', async (req, res) => {
  try {
    const Document = safeModel('ElectronicDirective');
    if (!Document)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Document.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      category: 'directive',
    })
      .select('title status auditTrail signatures')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Directive not found' });
    res.json({
      success: true,
      data: {
        title: doc.title,
        status: doc.status,
        auditTrail: doc.auditTrail || [],
        signatures: doc.signatures || [],
      },
    });
  } catch (err) {
    safeError(res, err, 'directive audit trail');
  }
});

module.exports = router;
