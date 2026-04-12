'use strict';
/**
 * HL7Messaging Routes
 * Auto-extracted from services/dddHL7Messaging.js
 * 10 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddHL7Messaging');


  // Service imported as singleton above;

  router.get('/hl7-messaging/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'h-l7-messaging');
    }
  });

  router.post('/hl7-messaging/messages', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createMessage(req.body) });
    } catch (e) {
      safeError(res, e, 'h-l7-messaging');
    }
  });
  router.get('/hl7-messaging/messages', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listMessages(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'h-l7-messaging');
    }
  });
  router.get('/hl7-messaging/messages/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getMessage(req.params.id) });
    } catch (e) {
      safeError(res, e, 'h-l7-messaging');
    }
  });

  router.post('/hl7-messaging/routes', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRoute(req.body) });
    } catch (e) {
      safeError(res, e, 'h-l7-messaging');
    }
  });
  router.get('/hl7-messaging/routes', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listRoutes(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'h-l7-messaging');
    }
  });

  router.post('/hl7-messaging/acks', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAck(req.body) });
    } catch (e) {
      safeError(res, e, 'h-l7-messaging');
    }
  });
  router.get('/hl7-messaging/acks', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAcks(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'h-l7-messaging');
    }
  });

  router.get('/hl7-messaging/transmissions', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json({ success: true, data: await svc.listTransmissions(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'h-l7-messaging');
    }
  });

  router.get('/hl7-messaging/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getMessagingStats() });
    } catch (e) {
      safeError(res, e, 'h-l7-messaging');
    }
  });

module.exports = router;
