'use strict';
/**
 * ContinuousEducation Routes
 * Auto-extracted from services/dddContinuousEducation.js
 * 23 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddContinuousEducation');


  // Service imported as singleton above;

  /* ── CEU Records ── */
  router.get('/continuing-education/records', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCEURecords(req.query) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.get('/continuing-education/records/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getCEURecord(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.post('/continuing-education/records', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCEURecord(req.body) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.put('/continuing-education/records/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCEURecord(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.post('/continuing-education/records/:id/approve', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.approveCEURecord(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.post('/continuing-education/records/:id/reject', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.rejectCEURecord(req.params.id, req.body.reason) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });

  /* ── Compliance ── */
  router.get('/continuing-education/compliance/:userId', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.getCEUCompliance(req.params.userId, req.query.requirementCode),
      });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });

  /* ── Dev Plans ── */
  router.get('/continuing-education/plans', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDevPlans(req.query) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.get('/continuing-education/plans/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getDevPlan(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.post('/continuing-education/plans', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDevPlan(req.body) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.put('/continuing-education/plans/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateDevPlan(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.post('/continuing-education/plans/:id/approve', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveDevPlan(req.params.id, req.body.userId, req.body.notes),
      });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.put('/continuing-education/plans/:id/goals/:goalId', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updateGoalProgress(req.params.id, req.params.goalId, req.body),
      });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });

  /* ── Accredited Providers ── */
  router.get('/continuing-education/providers', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listProviders(req.query) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.get('/continuing-education/providers/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getProvider(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.post('/continuing-education/providers', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createProvider(req.body) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.put('/continuing-education/providers/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateProvider(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });

  /* ── Requirements ── */
  router.get('/continuing-education/requirements', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequirements(req.query) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.get('/continuing-education/requirements/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRequirement(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.post('/continuing-education/requirements', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequirement(req.body) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });
  router.put('/continuing-education/requirements/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRequirement(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });

  /* ── Dashboard ── */
  router.get('/continuing-education/dashboard/:userId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getCEUDashboard(req.params.userId) });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });

  /* ── Health ── */
  router.get('/continuing-education/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'continuous-education');
    }
  });


module.exports = router;
