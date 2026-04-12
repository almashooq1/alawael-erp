'use strict';
/**
 * FhirIntegration Routes
 * Auto-extracted from services/dddFhirIntegration.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddFhirIntegration');
const { validate } = require('../middleware/validate');
const v = require('../validations/fhir-integration.validation');


  // Service imported as singleton above;

  router.get('/fhir-integration/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });

  router.post('/fhir-integration/resources', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createResource(req.body) });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });
  router.get('/fhir-integration/resources', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listResources(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });
  router.get('/fhir-integration/resources/:type/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getResource(req.params.type, req.params.id) });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });

  router.post('/fhir-integration/mappings', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createMapping(req.body) });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });
  router.get('/fhir-integration/mappings', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listMappings(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });

  router.post('/fhir-integration/bundles', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBundle(req.body) });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });
  router.get('/fhir-integration/bundles', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listBundles(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });

  router.post('/fhir-integration/capability-statements', authenticate, validate(v.createCapabilityStatement), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCapabilityStatement(req.body) });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });
  router.get('/fhir-integration/capability-statements', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCapabilityStatements(req.query) });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });

  router.get('/fhir-integration/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getFhirStats() });
    } catch (e) {
      safeError(res, e, 'fhir-integration');
    }
  });

module.exports = router;
