'use strict';
/**
 * DataExchange Routes
 * Auto-extracted from services/dddDataExchange.js
 * 10 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddDataExchange');


  // Service imported as singleton above;

  router.get('/data-exchange/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'data-exchange');
    }
  });

  router.post('/data-exchange/jobs', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createJob(req.body) });
    } catch (e) {
      safeError(res, e, 'data-exchange');
    }
  });
  router.get('/data-exchange/jobs', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listJobs(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'data-exchange');
    }
  });

  router.post('/data-exchange/pipelines', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPipeline(req.body) });
    } catch (e) {
      safeError(res, e, 'data-exchange');
    }
  });
  router.get('/data-exchange/pipelines', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listPipelines(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'data-exchange');
    }
  });

  router.post('/data-exchange/validations', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createValidation(req.body) });
    } catch (e) {
      safeError(res, e, 'data-exchange');
    }
  });
  router.get('/data-exchange/validations', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listValidations(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'data-exchange');
    }
  });

  router.post('/data-exchange/agreements', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAgreement(req.body) });
    } catch (e) {
      safeError(res, e, 'data-exchange');
    }
  });
  router.get('/data-exchange/agreements', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAgreements(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'data-exchange');
    }
  });

  router.get('/data-exchange/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getExchangeStats() });
    } catch (e) {
      safeError(res, e, 'data-exchange');
    }
  });

module.exports = router;
