'use strict';
/**
 * PublicationManager Routes
 * Auto-extracted from services/dddPublicationManager.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddPublicationManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/publication-manager.validation');


  // Service imported as singleton above;

  router.get('/publication-manager/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });
  router.post('/publication-manager/manuscripts', authenticate, validate(v.createManuscript), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createManuscript(req.body) });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });
  router.get('/publication-manager/manuscripts', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listManuscripts(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });
  router.put('/publication-manager/manuscripts/:id', authenticate, validate(v.updateManuscript), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateManuscript(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });
  router.post('/publication-manager/authorships', authenticate, validate(v.createAuthorship), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addAuthorship(req.body) });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });
  router.get('/publication-manager/authorships', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAuthorships(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });
  router.post('/publication-manager/citations', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordCitation(req.body) });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });
  router.get('/publication-manager/citations', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listCitations(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });
  router.post('/publication-manager/disseminations', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDissemination(req.body) });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });
  router.get('/publication-manager/disseminations', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listDisseminations(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });
  router.get('/publication-manager/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getPublicationStats() });
    } catch (e) {
      safeError(res, e, 'publication-manager');
    }
  });

module.exports = router;
