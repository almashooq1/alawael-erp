'use strict';
/**
 * LegalCaseTracker Routes
 * Auto-extracted from services/dddLegalCaseTracker.js
 * 10 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddLegalCaseTracker');


  // Service imported as singleton above;

  router.get('/legal/cases', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCases(req.query) });
    } catch (e) {
      safeError(res, e, 'legal-case-tracker');
    }
  });
  router.get('/legal/cases/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getCase(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'legal-case-tracker');
    }
  });
  router.post('/legal/cases', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.openCase(req.body) });
    } catch (e) {
      safeError(res, e, 'legal-case-tracker');
    }
  });
  router.get('/legal/cases/:caseId/documents', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDocuments(req.params.caseId) });
    } catch (e) {
      safeError(res, e, 'legal-case-tracker');
    }
  });
  router.post('/legal/cases/:caseId/documents', authenticate, async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.addDocument({ ...req.body, caseId: req.params.caseId }),
        });
    } catch (e) {
      safeError(res, e, 'legal-case-tracker');
    }
  });
  router.get('/legal/cases/:caseId/parties', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listParties(req.params.caseId) });
    } catch (e) {
      safeError(res, e, 'legal-case-tracker');
    }
  });
  router.get('/legal/cases/:caseId/milestones', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listMilestones(req.params.caseId) });
    } catch (e) {
      safeError(res, e, 'legal-case-tracker');
    }
  });
  router.post('/legal/cases/:caseId/milestones', authenticate, async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.addMilestone({ ...req.body, caseId: req.params.caseId }),
        });
    } catch (e) {
      safeError(res, e, 'legal-case-tracker');
    }
  });
  router.get('/legal/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getCaseAnalytics() });
    } catch (e) {
      safeError(res, e, 'legal-case-tracker');
    }
  });
  router.get('/legal/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'legal-case-tracker');
    }
  });


module.exports = router;
