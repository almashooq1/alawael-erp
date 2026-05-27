/**
 * Workflow Webhooks — extracted from workflowEnhanced.routes.js.
 *
 * Concrete sub-module #3 of the workflowEnhanced refactor. Same router,
 * same endpoint paths, same SSRF guard (`validateOutboundUrl`), same
 * middleware order. Mounted through `workflowEnhanced.routes.js` via
 * `router.use('/', require('./workflowWebhooks.routes'))` so public
 * URLs are unchanged externally.
 *
 * Endpoints:
 *   GET    /webhooks
 *   GET    /webhooks/:id
 *   POST   /webhooks
 *   PUT    /webhooks/:id
 *   DELETE /webhooks/:id
 *   POST   /webhooks/:id/test
 *   GET    /webhooks/:id/logs
 */

'use strict';

const express = require('express');
const router = express.Router();

const { WorkflowWebhook } = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { validateOutboundUrl } = require('../utils/validateUrl');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

// ════════════════════════════════════════════════════════════════════════════════
// WEBHOOKS — الربط الخارجي
// ════════════════════════════════════════════════════════════════════════════════

/** List webhooks */
router.get('/webhooks', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const webhooks = await WorkflowWebhook.find({})
      .limit(200)
      .populate('workflowDefinition', 'name nameAr')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: webhooks });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Get webhook by ID */
router.get('/webhooks/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const wh = await WorkflowWebhook.findById(req.params.id)
      .populate('workflowDefinition', 'name nameAr')
      .lean();
    if (!wh) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: wh });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Create webhook */
router.post('/webhooks', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    // SSRF protection: validate webhook URL
    if (req.body.url) {
      const urlCheck = validateOutboundUrl(req.body.url);
      if (!urlCheck.valid) {
        return res
          .status(422)
          .json({ success: false, message: `رابط غير مسموح: ${urlCheck.reason}` });
      }
    }
    const wh = await WorkflowWebhook.create({
      ...req.body,
      createdBy: uid(req),
    });
    res.status(201).json({ success: true, data: wh, message: 'تم إنشاء الـ Webhook' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Update webhook */
router.put('/webhooks/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    // SSRF protection: validate webhook URL if being updated
    if (req.body.url) {
      const urlCheck = validateOutboundUrl(req.body.url);
      if (!urlCheck.valid) {
        return res
          .status(422)
          .json({ success: false, message: `رابط غير مسموح: ${urlCheck.reason}` });
      }
    }
    const wh = await WorkflowWebhook.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      returnDocument: 'after',
    });
    if (!wh) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: wh });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Delete webhook */
router.delete('/webhooks/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    await WorkflowWebhook.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم الحذف' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Test webhook */
router.post('/webhooks/:id/test', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const wh = await WorkflowWebhook.findById(req.params.id);
    if (!wh) return res.status(404).json({ success: false, message: 'غير موجود' });

    // SSRF protection: validate stored webhook URL before making request
    const urlCheck = validateOutboundUrl(wh.url);
    if (!urlCheck.valid) {
      return res
        .status(422)
        .json({ success: false, message: `رابط غير مسموح: ${urlCheck.reason}` });
    }

    // Send test payload
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'Webhook test from Al-Awael Workflow System' },
    };

    try {
      const https = require('https');
      const http = require('http');
      const url = new URL(wh.url);
      const transport = url.protocol === 'https:' ? https : http;

      await new Promise((resolve, reject) => {
        const r = transport.request(
          url,
          { method: wh.method || 'POST', headers: { 'Content-Type': 'application/json' } },
          response => {
            wh.lastTriggeredAt = new Date();
            wh.lastResponseStatus = response.statusCode;
            wh.totalTriggered += 1;
            wh.save();
            resolve(response.statusCode);
          }
        );
        r.on('error', err => {
          wh.lastError = err.message;
          wh.totalFailed += 1;
          wh.save();
          reject(err);
        });
        r.write(JSON.stringify(testPayload));
        r.end();
      });

      res.json({ success: true, message: 'تم إرسال الاختبار بنجاح' });
    } catch (err) {
      res.json({ success: false, message: 'فشل الاختبار', error: safeError(err) });
    }
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Webhook delivery log */
router.get('/webhooks/:id/logs', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const wh = await WorkflowWebhook.findById(req.params.id).lean();
    if (!wh) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({
      success: true,
      data: {
        totalTriggered: wh.totalTriggered,
        totalFailed: wh.totalFailed,
        lastTriggeredAt: wh.lastTriggeredAt,
        lastResponseStatus: wh.lastResponseStatus,
        lastError: wh.lastError,
      },
    });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

module.exports = router;
