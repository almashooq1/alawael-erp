'use strict';

/**
 * progress-prediction.routes.js — Wave 140 / P3.3 admin surface.
 *
 * HTTP layer for the long-running `services/ai/progressPrediction.service.js`
 * (Prompt 20). Wave 118 added jest tests + a CLI sweeper but no HTTP
 * routes — admins had no way to view accuracy from the UI. This wave
 * closes that gap.
 *
 * Routes (admin-only, perm `ai.progress.read`):
 *   GET /accuracy              ← AiModelConfig.findOne({model_name: 'progress_predictor'})
 *   GET /recent                ← AiPrediction.find({prediction_type:'progress'}, sorted by date)
 *
 * No write paths here — validation happens via the Wave 118 cron
 * (`scripts/progress-validate.js`). The UI is read-only.
 */

const express = require('express');
const safeError = require('../utils/safeError');

function actorFrom(req) {
  return {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || req.user?.roleCode || null,
  };
}

function createProgressPredictionRouter({
  predictionModel = null,
  modelConfigModel = null,
  governance = null,
  logger = console,
} = {}) {
  if (!predictionModel) {
    throw new Error('progress-prediction.routes: predictionModel is required');
  }
  if (!modelConfigModel) {
    throw new Error('progress-prediction.routes: modelConfigModel is required');
  }
  if (!governance || typeof governance.hasPermission !== 'function') {
    throw new Error('progress-prediction.routes: governance service is required');
  }
  void logger;

  const router = express.Router();

  function requirePerm(code) {
    return (req, res, next) => {
      const actor = actorFrom(req);
      if (!actor.userId) {
        return res
          .status(401)
          .json({ success: false, message: 'AUTH_REQUIRED', reason: 'AUTH_REQUIRED' });
      }
      if (!governance.hasPermission(actor.role, code)) {
        return res.status(403).json({
          success: false,
          message: 'PERMISSION_DENIED',
          reason: 'PERMISSION_DENIED',
          requiredPermission: code,
        });
      }
      return next();
    };
  }

  router.get('/accuracy', requirePerm('ai.progress.read'), async (req, res) => {
    try {
      const cursor = modelConfigModel.findOne({ model_name: 'progress_predictor' });
      const cfg = await (cursor && typeof cursor.lean === 'function' ? cursor.lean() : cursor);
      return res.json({
        success: true,
        data: {
          modelName: 'progress_predictor',
          accuracy: cfg && Number.isFinite(cfg.accuracy_score) ? cfg.accuracy_score : null,
          trainingDataCount: cfg ? cfg.training_data_count || 0 : 0,
          lastEvaluatedAt: cfg ? cfg.last_evaluated_at : null,
          modelVersion: cfg ? cfg.model_version : null,
        },
      });
    } catch (err) {
      return safeError(res, err, 'ai.progress.accuracy');
    }
  });

  router.get('/recent', requirePerm('ai.progress.read'), async (req, res) => {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query?.limit) || 50));
      const status = req.query?.status || null; // 'active' | 'expired'
      const beneficiaryId = req.query?.beneficiaryId || null;
      const branchId = req.query?.branchId || null;

      const q = { prediction_type: 'progress' };
      if (status) q.status = status;
      if (beneficiaryId) q.beneficiary_id = beneficiaryId;
      if (branchId) q.branch_id = branchId;

      const cursor = predictionModel.find(q);
      const sorted =
        cursor && typeof cursor.sort === 'function' ? cursor.sort({ prediction_date: -1 }) : cursor;
      const limited = sorted && typeof sorted.limit === 'function' ? sorted.limit(limit) : sorted;
      const rows = await (limited && typeof limited.lean === 'function' ? limited.lean() : limited);
      const items = Array.isArray(rows) ? rows : [];

      // Strip features_used + prediction_details for the list view
      // (keep the response small + avoid leaking diagnostic payload to
      // the UI table). Detail page can fetch a single row separately.
      const summaries = items.map(p => ({
        id: String(p._id || ''),
        beneficiaryId: p.beneficiary_id ? String(p.beneficiary_id) : null,
        planId: p.plan_id ? String(p.plan_id) : null,
        branchId: p.branch_id ? String(p.branch_id) : null,
        predictionType: p.prediction_type,
        predictionScope: p.prediction_scope,
        predictedValue: p.predicted_value,
        actualValue: p.actual_value,
        deviation: p.deviation,
        confidence: p.confidence,
        modelVersion: p.model_version,
        status: p.status,
        predictionDate: p.prediction_date,
        targetDate: p.target_date,
        validatedAt: p.validated_at,
      }));

      // Aggregate: validated counts + within-tolerance counts
      const ACC_TOLERANCE = 0.15;
      let validated = 0;
      let accurate = 0;
      for (const p of items) {
        if (p.actual_value !== null && p.actual_value !== undefined) {
          validated++;
          if (Math.abs((p.actual_value || 0) - (p.predicted_value || 0)) <= ACC_TOLERANCE) {
            accurate++;
          }
        }
      }

      return res.json({
        success: true,
        data: {
          limit,
          total: items.length,
          validated,
          accurate,
          accuracyOnSample:
            validated > 0 ? Math.round((accurate / validated) * 10000) / 10000 : null,
          items: summaries,
        },
      });
    } catch (err) {
      return safeError(res, err, 'ai.progress.recent');
    }
  });

  return router;
}

module.exports = { createProgressPredictionRouter };
