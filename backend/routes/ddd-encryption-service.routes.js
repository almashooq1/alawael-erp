'use strict';
/**
 * EncryptionService Routes
 * Auto-extracted from services/dddEncryptionService.js
 * 8 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getEncryptionDashboard, listKeys, generateKey, rotateKey } = require('../services/dddEncryptionService');

  router.get('/encryption/dashboard', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, ...(await getEncryptionDashboard()) });
    } catch (e) {
      safeError(res, e, 'encryption-service');
    }
  });

  router.get('/encryption/keys', authenticate, async (_req, res) => {
    try {
    const keys = await listKeys();
    res.json({ success: true, count: keys.length, keys });
    } catch (e) {
      safeError(res, e, 'encryption-service');
    }
  });

  router.post('/encryption/keys', authenticate, async (req, res) => {
    try {
    const result = await generateKey(req.body.purpose, req.user?._id);
    res.status(201).json({ success: true, key: result });
    } catch (e) {
      safeError(res, e, 'encryption-service');
    }
  });

  router.post('/encryption/keys/:keyId/rotate', authenticate, async (req, res) => {
    try {
    const result = await rotateKey(req.params.keyId, req.user?._id);
    if (!result)
    return res.status(404).json({ success: false, error: 'Key not found or inactive' });
    res.json({ success: true, newKey: result });
    } catch (e) {
      safeError(res, e, 'encryption-service');
    }
  });

  router.get('/encryption/pii-fields', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'encryption-service');
    }
  });

  router.get('/encryption/classifications', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'encryption-service');
    }
  });

  router.post('/encryption/detect-pii', authenticate, async (req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'encryption-service');
    }
  });

  router.post('/encryption/mask', authenticate, async (req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'encryption-service');
    }
  });

module.exports = router;
