'use strict';

/**
 * data-quality.routes.js — Wave 22 (Data Trust & Quality Layer).
 *
 *   GET  /                              — list registered datasets + composite snapshot
 *                                          (composite is null until a snapshot is computed)
 *   GET  /:datasetId                    — current config + thresholds + weights
 *   POST /:datasetId/compute            — compute the 8-dim quality bundle for a
 *                                          caller-supplied snapshot
 *   POST /batch-compute                 — compute for many datasets at once
 *   GET  /sources                       — source catalog + trust scores
 *   GET  /:datasetId/dimensions         — alias for /:datasetId (returns the dimension keys
 *                                          a UI would render, even if no snapshot computed)
 *
 * Read-mostly. The "compute" endpoints take a snapshot in the request
 * body — the route layer does NOT query Mongo to build it. The
 * orchestrator (Wave 20) supplies snapshots from its own loaders.
 */

const express = require('express');
const safeError = require('../utils/safeError');

const REASON_TO_STATUS = Object.freeze({
  DATASET_NOT_REGISTERED: 404,
  INVALID_SNAPSHOT: 400,
  COMPUTE_ERROR: 422,
});

function respond(res, result) {
  if (result && result.ok) {
    return res.json({ success: true, data: result });
  }
  const status = (result && REASON_TO_STATUS[result.reason]) || 400;
  return res.status(status).json({
    success: false,
    message: result?.reason || 'DATA_QUALITY_REJECTED',
    reason: result?.reason,
  });
}

function createDataQualityRouter({ dataQuality, registry = null, logger = console } = {}) {
  if (!dataQuality || typeof dataQuality.computeQuality !== 'function') {
    throw new Error('data-quality.routes: dataQuality service is required');
  }
  void logger;
  const reg = registry || require('../intelligence/data-quality.registry');

  const router = express.Router();

  // GET / — registered datasets list
  router.get('/', async (_req, res) => {
    try {
      const datasets = reg.listRegisteredDatasets().map(id => {
        const cfg = reg.getDatasetConfig(id);
        return {
          datasetId: id,
          category: cfg.category,
          expectedCadenceMin: cfg.expectedCadenceMin,
          slaMs: cfg.slaMs,
          maskOnCritical: cfg.maskOnCritical,
          isAIDerived: cfg.isAIDerived,
          sourceCount: (cfg.sources || []).length,
        };
      });
      return res.json({ success: true, data: { datasets, count: datasets.length } });
    } catch (err) {
      return safeError(res, err, 'dataQuality.list');
    }
  });

  // GET /sources — source category catalog
  // Defined BEFORE /:datasetId so /sources doesn't get captured as a datasetId.
  router.get('/sources', async (_req, res) => {
    try {
      const sources = dataQuality.getSourceCatalog();
      return res.json({ success: true, data: { sources, count: sources.length } });
    } catch (err) {
      return safeError(res, err, 'dataQuality.sources');
    }
  });

  // GET /:datasetId — config + thresholds + weights
  router.get('/:datasetId', async (req, res) => {
    try {
      const cfg = reg.getDatasetConfig(req.params.datasetId);
      if (!cfg) return respond(res, { ok: false, reason: 'DATASET_NOT_REGISTERED' });
      const thresholds = reg.getThresholdsFor(req.params.datasetId);
      const weights = reg.getWeightsFor(req.params.datasetId);
      return res.json({
        success: true,
        data: {
          datasetId: req.params.datasetId,
          config: cfg,
          thresholds,
          weights,
          dimensions: reg.DIMENSIONS,
        },
      });
    } catch (err) {
      return safeError(res, err, 'dataQuality.get');
    }
  });

  // GET /:datasetId/dimensions — dimension list, useful for UI render even pre-compute
  router.get('/:datasetId/dimensions', async (req, res) => {
    try {
      const cfg = reg.getDatasetConfig(req.params.datasetId);
      if (!cfg) return respond(res, { ok: false, reason: 'DATASET_NOT_REGISTERED' });
      const thresholds = reg.getThresholdsFor(req.params.datasetId);
      return res.json({
        success: true,
        data: {
          datasetId: req.params.datasetId,
          dimensions: reg.DIMENSIONS.map(d => ({
            dimension: d,
            warnThreshold: thresholds[d]?.warn ?? null,
            criticalThreshold: thresholds[d]?.critical ?? null,
            applicable: d !== 'aiConfidence' || cfg.isAIDerived,
          })),
        },
      });
    } catch (err) {
      return safeError(res, err, 'dataQuality.dimensions');
    }
  });

  // POST /:datasetId/compute — body = snapshot
  router.post('/:datasetId/compute', async (req, res) => {
    try {
      const body = req.body || {};
      const snapshot = { ...body, datasetId: req.params.datasetId };
      const result = dataQuality.computeQuality(snapshot);
      return respond(res, result);
    } catch (err) {
      return safeError(res, err, 'dataQuality.compute');
    }
  });

  // POST /batch-compute — body = { snapshots: [...] }
  router.post('/batch-compute', async (req, res) => {
    try {
      const snapshots = Array.isArray(req.body?.snapshots) ? req.body.snapshots : [];
      const results = dataQuality.computeQualityBatch(snapshots);
      return res.json({
        success: true,
        data: {
          results,
          count: results.length,
          breachesCount: results.filter(r => r.ok && r.breaches && r.breaches.length > 0).length,
        },
      });
    } catch (err) {
      return safeError(res, err, 'dataQuality.batchCompute');
    }
  });

  return router;
}

module.exports = { createDataQualityRouter };
