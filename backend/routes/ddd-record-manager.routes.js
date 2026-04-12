'use strict';
/**
 * RecordManager Routes
 * Auto-extracted from services/dddRecordManager.js
 * 14 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddRecordManager');


  // Service imported as singleton above;

  /* Records */
  router.get('/records/clinical', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRecords(req.query) });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });
  router.get('/records/clinical/search', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.searchRecords(req.query.q || '') });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });
  router.get('/records/clinical/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRecord(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });
  router.post('/records/clinical', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRecord(req.body) });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });
  router.put('/records/clinical/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRecord(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });
  router.post('/records/clinical/:id/amend', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.amendRecord(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });
  router.post('/records/clinical/:id/lock', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.lockRecord(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });

  /* Categories */
  router.get('/records/categories', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listCategories() });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });
  router.post('/records/categories', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCategory(req.body) });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });

  /* Retention */
  router.get('/records/retentions', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listRetentions() });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });
  router.post('/records/retentions', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRetention(req.body) });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });

  /* Audit */
  router.get('/records/audit/:recordId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAuditLogs(req.params.recordId) });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });

  /* Analytics & Health */
  router.get('/records/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getRecordAnalytics() });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });
  router.get('/records/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'record-manager');
    }
  });


module.exports = router;
