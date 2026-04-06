'use strict';

const express = require('express');

const router = express.Router();
const docService = require('../services/documents/document-enhanced.service');
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// ============================================================
// البحث في المستندات
// ============================================================
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, page = 1, limit = 20, ...filters } = req.query;
    const result = await docService.searchDocuments(q, filters, Number(page), Number(limit));
    res.json({ success: true, ...result });
  } catch (err) {
    safeError(res, err);
  }
});

// ============================================================
// إصدارات المستند
// ============================================================
router.get('/:id/versions', authenticate, async (req, res) => {
  try {
    await docService.logAccess(req.params.id, req.user._id, 'view', req);
    const versions = await docService.getVersions(req.params.id);
    res.json({ success: true, data: versions });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/:id/versions', authenticate, async (req, res) => {
  try {
    const version = await docService.createVersion(
      req.params.id,
      req.body,
      req.user._id,
      req.body.changeNotes
    );
    await docService.logAccess(req.params.id, req.user._id, 'edit', req, {
      version: version.versionNumber,
    });
    res.status(201).json({ success: true, data: version });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// التوقيع الإلكتروني
// ============================================================
router.post('/:id/signatures/request', authenticate, async (req, res) => {
  try {
    const signatures = await docService.requestSignatures(
      req.params.id,
      req.body.signers,
      req.user._id
    );
    res.status(201).json({ success: true, data: signatures });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/signatures/:signatureId/sign', authenticate, async (req, res) => {
  try {
    const signature = await docService.sign(
      req.params.signatureId,
      req.user._id,
      req.body.otp,
      req.body.signatureData
    );
    res.json({ success: true, data: signature });
  } catch (err) {
    res.status(422).json({ success: false, message: err.message });
  }
});

// ============================================================
// المشاركة
// ============================================================
router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const share = await docService.shareDocument(req.params.id, req.user._id, req.body);
    await docService.logAccess(req.params.id, req.user._id, 'share', req);
    res.status(201).json({ success: true, data: share });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// رابط مشاركة خارجي (بدون مصادقة)
router.get('/shared/:token', async (req, res) => {
  try {
    const document = await docService.accessSharedDocument(req.params.token, req.query.password);
    res.json({ success: true, data: document });
  } catch (err) {
    res.status(403).json({ success: false, message: err.message });
  }
});

// ============================================================
// سجل الوصول
// ============================================================
router.get('/:id/access-log', authenticate, async (req, res) => {
  try {
    const logs = await docService.getAccessLog(req.params.id, req.query);
    res.json({ success: true, data: logs });
  } catch (err) {
    safeError(res, err);
  }
});

// ============================================================
// الأرشفة وسياسات الاحتفاظ
// ============================================================
router.post('/retention/apply', authenticate, async (req, res) => {
  try {
    const processed = await docService.applyRetentionPolicies();
    res.json({ success: true, data: { processed } });
  } catch (err) {
    safeError(res, err);
  }
});

module.exports = router;
