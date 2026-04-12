'use strict';
/**
 * CompetencyTracker Routes
 * Auto-extracted from services/dddCompetencyTracker.js
 * 21 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddCompetencyTracker');
const { validate } = require('../middleware/validate');
const v = require('../validations/competency-tracker.validation');


  // Service imported as singleton above;

  /* ── Frameworks ── */
  router.get('/competency/frameworks', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFrameworks(req.query) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.get('/competency/frameworks/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getFramework(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.post('/competency/frameworks', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFramework(req.body) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.put('/competency/frameworks/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateFramework(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });

  /* ── Competencies ── */
  router.get('/competency/skills', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCompetencies(req.query) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.get('/competency/skills/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getCompetency(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.post('/competency/skills', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCompetency(req.body) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.put('/competency/skills/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCompetency(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });

  /* ── Staff Competencies ── */
  router.get('/competency/staff', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listStaffCompetencies(req.query) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.get('/competency/staff/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getStaffCompetency(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.post('/competency/staff', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.assignCompetency(req.body) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.post('/competency/staff/:id/assess', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.recordAssessment(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });

  /* ── Credentials ── */
  router.get('/competency/credentials', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCredentials(req.query) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.get('/competency/credentials/expiring', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.getExpiringCredentials(Number(req.query.days) || 90),
      });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.get('/competency/credentials/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getCredential(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.post('/competency/credentials', authenticate, validate(v.createCredential), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCredential(req.body) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.put('/competency/credentials/:id', authenticate, validate(v.updateCredential), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCredential(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.post('/competency/credentials/:id/renew', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.renewCredential(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });

  /* ── Analysis ── */
  router.get('/competency/gap-analysis/:userId', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.getCompetencyGapAnalysis(req.params.userId, req.query.frameworkId),
      });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });
  router.get('/competency/profile/:userId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getStaffProfile(req.params.userId) });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });

  /* ── Health ── */
  router.get('/competency/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'competency-tracker');
    }
  });


module.exports = router;
