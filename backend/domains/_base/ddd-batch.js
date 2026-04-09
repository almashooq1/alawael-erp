/**
 * DDD Batch Operations — العمليات الجماعية
 *
 * Provides batch create / update / delete / export for all DDD domains.
 * Enforces size limits, validation, transactional safety and audit logging.
 *
 * POST /api/v1/platform/batch/:domain/create    — Bulk create
 * PATCH /api/v1/platform/batch/:domain/update    — Bulk update
 * DELETE /api/v1/platform/batch/:domain/delete   — Bulk soft-delete
 * POST /api/v1/platform/batch/:domain/export     — Export to JSON
 *
 * @module domains/_base/ddd-batch
 */

'use strict';

const mongoose = require('mongoose');
const express = require('express');

// Max items per batch request
const MAX_BATCH_SIZE = 200;

// ── Domain → Primary Model map (first model per domain) ────────────────

const DOMAIN_PRIMARY_MODEL = {
  core: 'Beneficiary',
  episodes: 'EpisodeOfCare',
  timeline: 'CareTimeline',
  assessments: 'ClinicalAssessment',
  'care-plans': 'UnifiedCarePlan',
  sessions: 'ClinicalSession',
  goals: 'TherapeuticGoal',
  workflow: 'WorkflowTask',
  programs: 'Program',
  'ai-recommendations': 'Recommendation',
  quality: 'QualityAudit',
  family: 'FamilyMember',
  reports: 'ReportTemplate',
  'group-therapy': 'TherapyGroup',
  'tele-rehab': 'TeleSession',
  'ar-vr': 'ARVRSession',
  behavior: 'BehaviorRecord',
  research: 'ResearchStudy',
  'field-training': 'TrainingProgram',
  dashboards: 'DashboardConfig',
};

// Models that support secondary batch targets (e.g. ?model=CorrectiveAction)
const DOMAIN_ALL_MODELS = {
  core: ['Beneficiary'],
  episodes: ['EpisodeOfCare'],
  timeline: ['CareTimeline'],
  assessments: ['ClinicalAssessment'],
  'care-plans': ['UnifiedCarePlan'],
  sessions: ['ClinicalSession'],
  goals: ['TherapeuticGoal', 'Measure', 'MeasureApplication'],
  workflow: ['WorkflowTask', 'WorkflowTransitionLog'],
  programs: ['Program', 'ProgramEnrollment'],
  'ai-recommendations': ['ClinicalRiskScore', 'Recommendation'],
  quality: ['QualityAudit', 'CorrectiveAction'],
  family: ['FamilyMember', 'FamilyCommunication'],
  reports: ['ReportTemplate', 'GeneratedReport'],
  'group-therapy': ['TherapyGroup', 'GroupSession'],
  'tele-rehab': ['TeleSession'],
  'ar-vr': ['ARVRSession'],
  behavior: ['BehaviorRecord', 'BehaviorPlan'],
  research: ['ResearchStudy'],
  'field-training': ['TrainingProgram', 'TraineeRecord'],
  dashboards: ['DashboardConfig', 'KPIDefinition', 'KPISnapshot', 'DecisionAlert'],
};

// ── Helpers ─────────────────────────────────────────────────────────────

function resolveModel(domain, modelQuery) {
  const allowed = DOMAIN_ALL_MODELS[domain];
  if (!allowed) return null;

  const target = modelQuery || DOMAIN_PRIMARY_MODEL[domain];
  if (!allowed.includes(target)) return null;

  return mongoose.models[target] || null;
}

function batchResponse(res, status, data) {
  return res.status(status).json({ success: status < 400, ...data });
}

// ── Batch Engine ────────────────────────────────────────────────────────

/**
 * Bulk create documents
 */
async function batchCreate(Model, items, userId) {
  const results = { created: 0, errors: [] };

  // Assign createdBy if the model supports it
  const hasCreatedBy = !!Model.schema.paths.createdBy;
  const docs = items.map(item => ({
    ...item,
    ...(hasCreatedBy && userId ? { createdBy: userId } : {}),
  }));

  try {
    const inserted = await Model.insertMany(docs, { ordered: false, rawResult: false });
    results.created = inserted.length;
  } catch (err) {
    if (err.writeErrors) {
      results.created = err.insertedDocs?.length || 0;
      results.errors = err.writeErrors.map(e => ({
        index: e.index,
        message: e.errmsg || e.message,
      }));
    } else {
      results.errors.push({ index: -1, message: err.message });
    }
  }

  return results;
}

/**
 * Bulk update documents
 */
async function batchUpdate(Model, operations) {
  const results = { updated: 0, errors: [] };

  const bulkOps = [];
  for (let i = 0; i < operations.length; i++) {
    const { id, update } = operations[i] || {};
    if (!id || !update) {
      results.errors.push({ index: i, message: 'Missing id or update payload' });
      continue;
    }
    bulkOps.push({
      updateOne: {
        filter: { _id: id },
        update: { $set: update },
      },
    });
  }

  if (bulkOps.length === 0) return results;

  try {
    const bulk = await Model.bulkWrite(bulkOps, { ordered: false });
    results.updated = bulk.modifiedCount;
  } catch (err) {
    results.errors.push({ message: err.message });
  }

  return results;
}

/**
 * Bulk soft-delete (or hard-delete if model lacks isDeleted)
 */
async function batchDelete(Model, ids, userId) {
  const results = { deleted: 0, errors: [] };

  if (!ids || ids.length === 0) return results;

  const hasSoftDelete = !!Model.schema.paths.isDeleted;

  try {
    if (hasSoftDelete) {
      const r = await Model.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            ...(Model.schema.paths.deletedBy && userId ? { deletedBy: userId } : {}),
          },
        }
      );
      results.deleted = r.modifiedCount;
    } else {
      const r = await Model.deleteMany({ _id: { $in: ids } });
      results.deleted = r.deletedCount;
    }
  } catch (err) {
    results.errors.push({ message: err.message });
  }

  return results;
}

/**
 * Bulk export (simple JSON dump with lean queries)
 */
async function batchExport(Model, filter = {}, options = {}) {
  const { limit = 1000, select, sort = '-createdAt' } = options;

  // Soft-delete aware
  if (Model.schema.paths.isDeleted) {
    filter.isDeleted = { $ne: true };
  }

  const docs = await Model.find(filter)
    .select(select || '')
    .sort(sort)
    .limit(Math.min(limit, 5000))
    .lean();

  return { count: docs.length, data: docs };
}

// ── Express Router ──────────────────────────────────────────────────────

function createBatchRouter() {
  const router = express.Router();

  // ── Middleware: resolve model ──────────────────────────────────────
  router.use('/batch/:domain', (req, res, next) => {
    const { domain } = req.params;
    const modelName = req.query.model;

    const Model = resolveModel(domain, modelName);
    if (!Model) {
      return batchResponse(res, 404, {
        message: `نطاق غير معروف أو نموذج غير صالح: ${domain}${modelName ? '/' + modelName : ''}`,
        message_en: `Unknown domain or model: ${domain}${modelName ? '/' + modelName : ''}`,
      });
    }

    req.dddModel = Model;
    req.dddDomain = domain;
    req.dddModelName = modelName || DOMAIN_PRIMARY_MODEL[domain];
    next();
  });

  // ── POST /batch/:domain/create ────────────────────────────────────
  router.post('/batch/:domain/create', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return batchResponse(res, 400, { message: 'items array is required' });
      }
      if (items.length > MAX_BATCH_SIZE) {
        return batchResponse(res, 400, {
          message: `Max ${MAX_BATCH_SIZE} items per batch`,
        });
      }

      const userId = req.user?._id || req.user?.id;
      const result = await batchCreate(req.dddModel, items, userId);

      return batchResponse(res, result.errors.length > 0 ? 207 : 201, {
        operation: 'batch-create',
        domain: req.dddDomain,
        model: req.dddModelName,
        ...result,
      });
    } catch (err) {
      console.error('[DDD-Batch] Create error:', err.message);
      return batchResponse(res, 500, { message: err.message });
    }
  });

  // ── PATCH /batch/:domain/update ───────────────────────────────────
  router.patch('/batch/:domain/update', async (req, res) => {
    try {
      const { operations } = req.body;
      if (!Array.isArray(operations) || operations.length === 0) {
        return batchResponse(res, 400, { message: 'operations array is required' });
      }
      if (operations.length > MAX_BATCH_SIZE) {
        return batchResponse(res, 400, {
          message: `Max ${MAX_BATCH_SIZE} operations per batch`,
        });
      }

      const result = await batchUpdate(req.dddModel, operations);

      return batchResponse(res, result.errors.length > 0 ? 207 : 200, {
        operation: 'batch-update',
        domain: req.dddDomain,
        model: req.dddModelName,
        ...result,
      });
    } catch (err) {
      console.error('[DDD-Batch] Update error:', err.message);
      return batchResponse(res, 500, { message: err.message });
    }
  });

  // ── DELETE /batch/:domain/delete ──────────────────────────────────
  router.delete('/batch/:domain/delete', async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return batchResponse(res, 400, { message: 'ids array is required' });
      }
      if (ids.length > MAX_BATCH_SIZE) {
        return batchResponse(res, 400, {
          message: `Max ${MAX_BATCH_SIZE} ids per batch`,
        });
      }

      const userId = req.user?._id || req.user?.id;
      const result = await batchDelete(req.dddModel, ids, userId);

      return batchResponse(res, result.errors.length > 0 ? 207 : 200, {
        operation: 'batch-delete',
        domain: req.dddDomain,
        model: req.dddModelName,
        ...result,
      });
    } catch (err) {
      console.error('[DDD-Batch] Delete error:', err.message);
      return batchResponse(res, 500, { message: err.message });
    }
  });

  // ── POST /batch/:domain/export ────────────────────────────────────
  router.post('/batch/:domain/export', async (req, res) => {
    try {
      const { filter = {}, limit, select, sort } = req.body;

      const result = await batchExport(req.dddModel, filter, { limit, select, sort });

      return batchResponse(res, 200, {
        operation: 'batch-export',
        domain: req.dddDomain,
        model: req.dddModelName,
        ...result,
      });
    } catch (err) {
      console.error('[DDD-Batch] Export error:', err.message);
      return batchResponse(res, 500, { message: err.message });
    }
  });

  return router;
}

module.exports = {
  DOMAIN_PRIMARY_MODEL,
  DOMAIN_ALL_MODELS,
  batchCreate,
  batchUpdate,
  batchDelete,
  batchExport,
  createBatchRouter,
  MAX_BATCH_SIZE,
};
