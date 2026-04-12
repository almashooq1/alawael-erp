'use strict';
/**
 * HealthEducation Routes
 * Auto-extracted from services/dddHealthEducation.js
 * 10 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddHealthEducation');


  // Service imported as singleton above;

  router.get('/health-education/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'health-education');
    }
  });

  router.post('/health-education/content', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createContent(req.body) });
    } catch (e) {
      safeError(res, e, 'health-education');
    }
  });
  router.get('/health-education/content', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listContent(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'health-education');
    }
  });
  router.get('/health-education/content/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getContentById(req.params.id) });
    } catch (e) {
      safeError(res, e, 'health-education');
    }
  });
  router.put('/health-education/content/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateContent(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'health-education');
    }
  });

  router.post('/health-education/paths', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPath(req.body) });
    } catch (e) {
      safeError(res, e, 'health-education');
    }
  });
  router.get('/health-education/paths', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPaths(req.query) });
    } catch (e) {
      safeError(res, e, 'health-education');
    }
  });

  router.post('/health-education/assessments', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitAssessment(req.body) });
    } catch (e) {
      safeError(res, e, 'health-education');
    }
  });
  router.get('/health-education/assessments', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAssessments(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'health-education');
    }
  });

  router.get('/health-education/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getEducationStats() });
    } catch (e) {
      safeError(res, e, 'health-education');
    }
  });

module.exports = router;
