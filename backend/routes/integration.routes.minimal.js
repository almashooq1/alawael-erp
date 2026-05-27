'use strict';
/**
 * Integration Routes (Minimal) — نقاط تكامل النظام
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Health check (public)
router.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// All endpoints below require auth
router.use(authenticate);

// GET /api/integration/connections — list registered integrations
router.get('/connections', authorize('admin'), async (req, res) => {
  try {
    const Integration = require('../models/Integration/Integration');
    const data = await Integration.find({}).lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'integration');
  }
});

// POST /api/integration/connections — register new integration
router.post('/connections', authorize('admin'), async (req, res) => {
  try {
    const Integration = require('../models/Integration/Integration');
    const integration = await Integration.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: integration });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/integration/connections/:id/enable
router.patch('/connections/:id/enable', authorize('admin'), async (req, res) => {
  try {
    const Integration = require('../models/Integration/Integration');
    const item = await Integration.findByIdAndUpdate(
      req.params.id,
      { enabled: true, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Integration not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/integration/connections/:id/disable
router.patch('/connections/:id/disable', authorize('admin'), async (req, res) => {
  try {
    const Integration = require('../models/Integration/Integration');
    const item = await Integration.findByIdAndUpdate(
      req.params.id,
      { enabled: false, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Integration not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/integration/webhook — receive external webhooks
router.post('/webhook', async (req, res) => {
  try {
    const WebhookLog = require('../models/Integration/WebhookLog');
    const log = await WebhookLog.create({
      source: req.headers['x-webhook-source'] || 'unknown',
      payload: req.body,
      receivedAt: new Date(),
    });
    // TODO: dispatch to integration handler by source
    res.json({ success: true, data: { id: log._id } });
  } catch (err) {
    return safeError(res, err, 'integration');
  }
});

// GET /api/integration/webhook/logs — list received webhooks
router.get('/webhook/logs', authorize('admin'), async (req, res) => {
  try {
    const WebhookLog = require('../models/Integration/WebhookLog');
    const { page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      WebhookLog.find({}).sort({ receivedAt: -1 }).skip(skip).limit(+limit).lean(),
      WebhookLog.countDocuments({}),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'integration');
  }
});

module.exports = router;
