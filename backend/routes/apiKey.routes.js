/* eslint-disable no-unused-vars */
/**
 * API Key Management Routes — مسارات إدارة مفاتيح API
 * Admin CRUD for API keys used by apiKey.middleware.js
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ApiKey = require('../models/ApiKey');
const logger = require('../utils/logger');

/** GET /api/api-keys — list all API keys (admin) */
router.get('/', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const keys = await ApiKey.find()
      .populate('owner', 'name email')
      .select('-key') // Don't expose full key in list
      .sort({ createdAt: -1 });
    res.json({ success: true, data: keys, count: keys.length });
  } catch (err) {
    logger.error('api-keys list error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** GET /api/api-keys/:id — get single key details (admin) */
router.get('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const key = await ApiKey.findById(req.params.id).populate('owner', 'name email');
    if (!key) return res.status(404).json({ success: false, message: 'API key not found' });
    res.json({ success: true, data: key });
  } catch (err) {
    logger.error('api-key get error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** POST /api/api-keys — generate new API key (admin) */
router.post('/', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, permissions = [], expiresAt } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const generatedKey = ApiKey.generateKey();
    const apiKey = await ApiKey.create({
      key: generatedKey,
      name,
      owner: req.user._id,
      permissions,
      expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
      isActive: true,
    });

    // Return the full key only on creation — won't be shown again
    res.status(201).json({
      success: true,
      data: apiKey,
      warning: 'Save this key now — it will not be fully visible again.',
    });
  } catch (err) {
    logger.error('api-key create error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/** PUT /api/api-keys/:id — update key metadata (admin) */
router.put('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, permissions, expiresAt, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (permissions !== undefined) update.permissions = permissions;
    if (expiresAt !== undefined) update.expiresAt = expiresAt;
    if (isActive !== undefined) update.isActive = isActive;

    const key = await ApiKey.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!key) return res.status(404).json({ success: false, message: 'API key not found' });
    res.json({ success: true, data: key });
  } catch (err) {
    logger.error('api-key update error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/** PUT /api/api-keys/:id/revoke — revoke/deactivate key (admin) */
router.put('/:id/revoke', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const key = await ApiKey.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!key) return res.status(404).json({ success: false, message: 'API key not found' });
    res.json({ success: true, message: 'API key revoked', data: key });
  } catch (err) {
    logger.error('api-key revoke error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** DELETE /api/api-keys/:id — permanently delete key (admin) */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const key = await ApiKey.findByIdAndDelete(req.params.id);
    if (!key) return res.status(404).json({ success: false, message: 'API key not found' });
    res.json({ success: true, message: 'API key deleted permanently' });
  } catch (err) {
    logger.error('api-key delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
