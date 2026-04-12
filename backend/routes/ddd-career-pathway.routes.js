'use strict';
/**
 * CareerPathway Routes
 * Auto-extracted from services/dddCareerPathway.js
 * 14 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddCareerPathway');


  // Service imported as singleton above;

  router.get('/career-pathway/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });

  /* Career Paths */
  router.post('/career-pathway/paths', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCareerPath(req.body) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });
  router.get('/career-pathway/paths', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json({ success: true, data: await svc.listCareerPaths(filter, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });
  router.get('/career-pathway/paths/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getCareerPathById(req.params.id) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });
  router.put('/career-pathway/paths/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCareerPath(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });

  /* Skill Assessments */
  router.post('/career-pathway/assessments', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSkillAssessment(req.body) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });
  router.get('/career-pathway/assessments', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json({ success: true, data: await svc.listSkillAssessments(filter, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });

  /* Succession Plans */
  router.post('/career-pathway/succession', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSuccessionPlan(req.body) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });
  router.get('/career-pathway/succession', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSuccessionPlans(req.query) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });
  router.put('/career-pathway/succession/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateSuccessionPlan(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });

  /* Development Activities */
  router.post('/career-pathway/activities', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createActivity(req.body) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });
  router.get('/career-pathway/activities', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json({ success: true, data: await svc.listActivities(filter, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });

  /* Analytics */
  router.get('/career-pathway/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getPathwayStats() });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });
  router.get('/career-pathway/succession/coverage', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSuccessionCoverage() });
    } catch (e) {
      safeError(res, e, 'career-pathway');
    }
  });

module.exports = router;
