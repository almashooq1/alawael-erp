'use strict';
/**
 * DataWarehouse Routes
 * Auto-extracted from services/dddDataWarehouse.js
 * 8 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getDataWarehouseDashboard, runETLPipeline, refreshMaterializedView, queryCube, seedPipelines } = require('../services/dddDataWarehouse');
const { DDDETLPipeline, DDDMaterializedView, DDDOLAPCube } = require('../models/DddDataWarehouse');

  router.get('/data-warehouse', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await getDataWarehouseDashboard() });
    } catch (e) {
      safeError(res, e, 'data-warehouse');
    }
  });

  router.get('/data-warehouse/pipelines', authenticate, async (_req, res) => {
    try {
    const pipelines = await DDDETLPipeline.find().lean();
    res.json({ success: true, data: pipelines, builtin: BUILTIN_PIPELINES });
    } catch (e) {
      safeError(res, e, 'data-warehouse');
    }
  });

  router.post('/data-warehouse/pipelines/:pipelineId/run', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await runETLPipeline(req.params.pipelineId) });
    } catch (e) {
      safeError(res, e, 'data-warehouse');
    }
  });

  router.get('/data-warehouse/views', authenticate, async (_req, res) => {
    try {
    const views = await DDDMaterializedView.find().lean();
    res.json({ success: true, data: views, builtin: BUILTIN_VIEWS });
    } catch (e) {
      safeError(res, e, 'data-warehouse');
    }
  });

  router.post('/data-warehouse/views/:viewId/refresh', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await refreshMaterializedView(req.params.viewId) });
    } catch (e) {
      safeError(res, e, 'data-warehouse');
    }
  });

  router.get('/data-warehouse/cubes', authenticate, async (_req, res) => {
    try {
    const cubes = await DDDOLAPCube.find().lean();
    res.json({ success: true, data: cubes, builtin: BUILTIN_CUBES });
    } catch (e) {
      safeError(res, e, 'data-warehouse');
    }
  });

  router.post('/data-warehouse/cubes/:cubeId/query', authenticate, async (req, res) => {
    try {
    res.json({ success: true, data: await queryCube(req.params.cubeId, req.body) });
    } catch (e) {
      safeError(res, e, 'data-warehouse');
    }
  });

  router.post('/data-warehouse/seed', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, data: await seedPipelines() });
    } catch (e) {
      safeError(res, e, 'data-warehouse');
    }
  });

module.exports = router;
