'use strict';
/**
 * CommunicationLog Routes
 * Auto-extracted from services/dddCommunicationLog.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddCommunicationLog');


  // Service imported as singleton above;

  /* Entries */
  router.get('/communication/entries', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEntries(req.query) });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });
  router.get('/communication/entries/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getEntry(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });
  router.post('/communication/entries', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.logEntry(req.body) });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });
  router.put('/communication/entries/:id/status', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updateEntryStatus(req.params.id, req.body.status, req.body),
      });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });

  /* Tracking */
  router.get('/communication/tracking/:entryId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTracking(req.params.entryId) });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });
  router.post('/communication/tracking', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addTracking(req.body) });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });

  /* Channels */
  router.get('/communication/channels', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listChannels(req.query) });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });
  router.post('/communication/channels', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createChannel(req.body) });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });
  router.put('/communication/channels/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateChannel(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });

  /* Reports */
  router.get('/communication/reports', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReports(req.query) });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });
  router.post('/communication/reports', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.generateReport(req.body) });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });

  /* Analytics & Health */
  router.get('/communication/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getCommunicationAnalytics() });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });
  router.get('/communication/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'communication-log');
    }
  });


module.exports = router;
