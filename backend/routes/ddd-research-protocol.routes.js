'use strict';
/**
 * ResearchProtocol Routes
 * Auto-extracted from services/dddResearchProtocol.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddResearchProtocol');
const { validate } = require('../middleware/validate');
const v = require('../validations/research-protocol.validation');

  router.get('/research-protocol/protocols', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listProtocols(req.query) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.get('/research-protocol/protocols/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getProtocol(req.params.id) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.post('/research-protocol/protocols', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createProtocol(req.body) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.put('/research-protocol/protocols/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateProtocol(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.get('/research-protocol/irb', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listIRBSubmissions(req.query) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.post('/research-protocol/irb', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.submitToIRB(req.body) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.put('/research-protocol/irb/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateIRBStatus(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.get('/research-protocol/teams', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTeams(req.query) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.post('/research-protocol/teams', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTeam(req.body) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.get('/research-protocol/data-collections', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDataCollections(req.query) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.post('/research-protocol/data-collections', authenticate, validate(v.createDataCollection), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDataCollection(req.body) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.get('/research-protocol/analytics', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getProtocolAnalytics(req.query) });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

  router.get('/research-protocol/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'research-protocol');
    }
  });

module.exports = router;
