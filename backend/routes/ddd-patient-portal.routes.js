'use strict';
/**
 * PatientPortal Routes
 * Auto-extracted from services/dddPatientPortal.js
 * 12 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddPatientPortal');


  // Service imported as singleton above;

  router.get('/patient-portal/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });

  router.post('/patient-portal/accounts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAccount(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });
  router.get('/patient-portal/accounts', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listAccounts(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });
  router.get('/patient-portal/accounts/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getAccountById(req.params.id) });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });
  router.put('/patient-portal/accounts/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateAccount(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });

  router.post('/patient-portal/messages', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.sendMessage(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });
  router.get('/patient-portal/messages', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listMessages(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });

  router.post('/patient-portal/documents', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.shareDocument(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });
  router.get('/patient-portal/documents', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listDocuments(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });

  router.post('/patient-portal/preferences', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.setPreference(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });
  router.get('/patient-portal/preferences/:accountId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getPreferences(req.params.accountId) });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });

  router.get('/patient-portal/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getPortalStats() });
    } catch (e) {
      safeError(res, e, 'patient-portal');
    }
  });

module.exports = router;
