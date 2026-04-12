'use strict';
/**
 * InteroperabilityGateway Routes
 * Auto-extracted from services/dddInteroperabilityGateway.js
 * 8 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { fhirRead, fhirSearch, fhirCreate, bulkExport, getIntegrationDashboard } = require('../services/dddInteroperabilityGateway');
const { DDDIntegrationLog } = require('../models/DddInteroperabilityGateway');

  router.get('/fhir/metadata', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'interoperability-gateway');
    }
  });

  router.get('/fhir/:resourceType/:id', authenticate, async (req, res) => {
    try {
    const resource = await fhirRead(req.params.resourceType, req.params.id);
    if (!resource)
    return res
    .status(404)
    .json({
    resourceType: 'OperationOutcome',
    issue: [{ severity: 'error', code: 'not-found' }],
    });
    res.json(resource);
    } catch (e) {
      safeError(res, e, 'interoperability-gateway');
    }
  });

  router.get('/fhir/:resourceType', authenticate, async (req, res) => {
    try {
    const bundle = await fhirSearch(req.params.resourceType, req.query);
    res.json(bundle);
    } catch (e) {
      safeError(res, e, 'interoperability-gateway');
    }
  });

  router.post('/fhir/:resourceType', authenticate, async (req, res) => {
    try {
    const resource = await fhirCreate(req.params.resourceType, req.body);
    res.status(201).json(resource);
    } catch (e) {
      safeError(res, e, 'interoperability-gateway');
    }
  });

  router.get('/fhir/$export', authenticate, async (req, res) => {
    try {
    const types = req.query._type ? req.query._type.split(',') : undefined;
    const output = await bulkExport(types);
    res.json({
    success: true,
    output: Object.keys(output).map(rt => ({
    type: rt,
    url: `data:application/ndjson,${encodeURIComponent(output[rt])}`,
    })),
    });
    } catch (e) {
      safeError(res, e, 'interoperability-gateway');
    }
  });

  router.get('/interop/dashboard', authenticate, async (_req, res) => {
    try {
    const dashboard = await getIntegrationDashboard();
    res.json({ success: true, ...dashboard });
    } catch (e) {
      safeError(res, e, 'interoperability-gateway');
    }
  });

  router.get('/interop/logs', authenticate, async (req, res) => {
    try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const logs = await DDDIntegrationLog.find({ isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
    res.json({ success: true, count: logs.length, logs });
    } catch (e) {
      safeError(res, e, 'interoperability-gateway');
    }
  });

  router.get('/interop/resources', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'interoperability-gateway');
    }
  });

module.exports = router;
