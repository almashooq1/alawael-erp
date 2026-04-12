'use strict';
/**
 * NotificationEngine Routes
 * Auto-extracted from services/dddNotificationEngine.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddNotificationEngine');


  // Service imported as singleton above;

  /* Channels */
  router.get('/notifications/channels', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listChannels(req.query) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });
  router.post('/notifications/channels', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createChannel(req.body) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });
  router.put('/notifications/channels/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateChannel(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });

  /* Rules */
  router.get('/notifications/rules', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRules(req.query) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });
  router.post('/notifications/rules', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRule(req.body) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });
  router.put('/notifications/rules/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRule(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });
  router.post('/notifications/rules/:id/toggle', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.toggleRule(req.params.id, req.body.isActive) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });

  /* Deliveries */
  router.get('/notifications/deliveries', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDeliveries(req.query) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });
  router.post('/notifications/send', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.send(req.body) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });

  /* Preferences */
  router.get('/notifications/preferences/:userId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getPreferences(req.params.userId) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });
  router.put('/notifications/preferences', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.setPreference(req.body) });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });

  /* Analytics & Health */
  router.get('/notifications/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getNotificationAnalytics() });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });
  router.get('/notifications/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'notification-engine');
    }
  });


module.exports = router;
