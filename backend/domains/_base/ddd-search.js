/**
 * DDD Cross-Domain Search — البحث الموحّد عبر الدومينات
 *
 * Provides a single API endpoint to search across ALL 34 DDD models.
 * Supports text search, filters, pagination, domain scoping.
 *
 * GET /api/v1/platform/search?q=keyword&domains=core,sessions&page=1&limit=20
 *
 * @module domains/_base/ddd-search
 */

'use strict';

const mongoose = require('mongoose');
const express = require('express');
const safeError = require('../../utils/safeError');

// ── Domain → Model registry ────────────────────────────────────────────

const DOMAIN_MODELS = {
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

// Fields to select for each model (fast summary)
const SUMMARY_FIELDS = {
  Beneficiary: 'firstName lastName mrn status disabilityType',
  EpisodeOfCare: 'beneficiary phase status referralDate',
  CareTimeline: 'beneficiary eventType title occurredAt',
  ClinicalAssessment: 'beneficiary type status assessor scheduledDate',
  UnifiedCarePlan: 'beneficiary title status startDate',
  ClinicalSession: 'beneficiary therapist sessionType scheduledDate status',
  TherapeuticGoal: 'beneficiary title priority status targetDate',
  Measure: 'name nameAr category status',
  MeasureApplication: 'beneficiary measure score createdAt',
  WorkflowTask: 'title taskType status priority assignee dueDate',
  WorkflowTransitionLog: 'task fromPhase toPhase performedAt',
  Program: 'name status maxEnrollees',
  ProgramEnrollment: 'beneficiary program status enrollmentDate',
  ClinicalRiskScore: 'beneficiary riskLevel score calculatedAt',
  Recommendation: 'beneficiary type priority status',
  QualityAudit: 'auditType auditor status scheduledDate',
  CorrectiveAction: 'auditId assignee status priority dueDate',
  FamilyMember: 'beneficiary name relation isPrimary',
  FamilyCommunication: 'beneficiary familyMember type direction subject',
  ReportTemplate: 'name category status',
  GeneratedReport: 'template generatedBy status generatedAt',
  TherapyGroup: 'name therapist status maxMembers',
  GroupSession: 'group scheduledDate status',
  TeleSession: 'beneficiary therapist scheduledDate status platform',
  ARVRSession: 'beneficiary sessionType environment status',
  BehaviorRecord: 'beneficiary behaviorType severity recordedAt',
  BehaviorPlan: 'beneficiary title status',
  ResearchStudy: 'title principalInvestigator status startDate',
  TrainingProgram: 'name supervisor status duration',
  TraineeRecord: 'program trainee status',
  DashboardConfig: 'name role',
  KPIDefinition: 'kpiId name domain unit',
  KPISnapshot: 'kpiId value period periodStart',
  DecisionAlert: 'title severity status domain',
};

// Text-searchable fields per model (limited to indexed text fields)
const TEXT_FIELDS = {
  Beneficiary: ['firstName', 'lastName', 'mrn', 'nationalId'],
  EpisodeOfCare: ['primaryDiagnosis', 'notes'],
  CareTimeline: ['title', 'description'],
  ClinicalAssessment: ['notes'],
  UnifiedCarePlan: ['title'],
  ClinicalSession: ['notes', 'progressNotes'],
  TherapeuticGoal: ['title', 'description'],
  Measure: ['name', 'nameAr', 'description'],
  WorkflowTask: ['title', 'titleEn', 'description'],
  Program: ['name', 'description'],
  QualityAudit: ['scope'],
  FamilyMember: ['name'],
  FamilyCommunication: ['subject', 'content'],
  ReportTemplate: ['name', 'description'],
  TherapyGroup: ['name', 'description'],
  BehaviorRecord: ['description', 'antecedent'],
  BehaviorPlan: ['title'],
  ResearchStudy: ['title', 'description'],
  TrainingProgram: ['name', 'description'],
  DashboardConfig: ['name'],
  KPIDefinition: ['name', 'nameAr'],
  DecisionAlert: ['title', 'description'],
};

// ── Search Engine ───────────────────────────────────────────────────────

/**
 * Search across multiple DDD models.
 *
 * @param {object} options
 * @param {string}  options.query       - Text to search for (regex-safe)
 * @param {string[]} [options.domains]  - Limit to specific domains
 * @param {number}  [options.page=1]
 * @param {number}  [options.limit=20]
 * @param {string}  [options.status]    - Filter by status field
 * @param {string}  [options.beneficiary] - Filter by beneficiary ObjectId
 * @returns {Promise<object>}           - { results, total, page, limit, domains }
 */
async function dddSearch(options = {}) {
  const {
    query = '',
    domains = Object.keys(DOMAIN_MODELS),
    page = 1,
    limit = 20,
    status,
    beneficiary,
  } = options;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const results = [];
  const domainCounts = {};
  let totalMatches = 0;

  // Determine which models to search
  const targetModels = [];
  for (const domain of domains) {
    const models = DOMAIN_MODELS[domain];
    if (!models) continue;
    for (const modelName of models) {
      const Model = mongoose.models[modelName];
      if (Model) {
        targetModels.push({ domain, modelName, Model });
      }
    }
  }

  // Build parallel queries
  const searchPromises = targetModels.map(async ({ domain, modelName, Model }) => {
    try {
      // Build filter
      const filter = {};

      // Text search via regex on text-searchable fields
      if (query) {
        const fields = TEXT_FIELDS[modelName] || [];
        if (fields.length > 0) {
          filter.$or = fields.map(f => ({ [f]: { $regex: escapedQuery, $options: 'i' } }));
        } else {
          return { domain, modelName, docs: [], count: 0 };
        }
      }

      // Optional status filter
      if (status) {
        const modelPaths = Model.schema.paths;
        if (modelPaths.status) {
          filter.status = status;
        }
      }

      // Optional beneficiary filter
      if (beneficiary) {
        const modelPaths = Model.schema.paths;
        if (modelPaths.beneficiary) {
          filter.beneficiary = beneficiary;
        }
      }

      // Soft-delete aware
      if (Model.schema.paths.isDeleted) {
        filter.isDeleted = { $ne: true };
      }

      const [count, docs] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter)
          .select(SUMMARY_FIELDS[modelName] || '')
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(Math.min(limit, 50))
          .lean(),
      ]);

      return { domain, modelName, docs, count };
    } catch (err) {
      return { domain, modelName, docs: [], count: 0, error: err.message };
    }
  });

  const searchResults = await Promise.all(searchPromises);

  // Aggregate results
  for (const r of searchResults) {
    domainCounts[r.domain] = (domainCounts[r.domain] || 0) + r.count;
    totalMatches += r.count;

    for (const doc of r.docs) {
      results.push({
        _id: doc._id,
        domain: r.domain,
        model: r.modelName,
        data: doc,
        ...(r.error && { error: r.error }),
      });
    }
  }

  // Simple cross-model pagination (client-side-like for MVP)
  const start = (page - 1) * limit;
  const paginatedResults = results.slice(start, start + limit);

  return {
    success: true,
    query,
    total: totalMatches,
    page,
    limit,
    pages: Math.ceil(totalMatches / limit),
    domainCounts,
    results: paginatedResults,
  };
}

// ── Express Router ──────────────────────────────────────────────────────

function createSearchRouter() {
  const router = express.Router();

  /**
   * @route   GET /api/v1/platform/search
   * @query   q           - Search keyword (required)
   * @query   domains     - Comma-separated domain list
   * @query   page        - Page number (default: 1)
   * @query   limit       - Results per page (default: 20, max: 100)
   * @query   status      - Filter by status
   * @query   beneficiary - Filter by beneficiary ID
   * @access  Authenticated
   */
  router.get('/search', async (req, res) => {
    try {
      const {
        q,
        domains: domStr,
        page = '1',
        limit: limitStr = '20',
        status,
        beneficiary,
      } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'يجب توفير كلمة بحث (حرفان على الأقل)',
          message_en: 'Search query must be at least 2 characters',
        });
      }

      const pageParsed = Math.max(1, parseInt(page, 10) || 1);
      const limitParsed = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 20));
      const domainsList = domStr
        ? domStr
            .split(',')
            .map(d => d.trim())
            .filter(Boolean)
        : undefined;

      const result = await dddSearch({
        query: q.trim(),
        domains: domainsList,
        page: pageParsed,
        limit: limitParsed,
        status,
        beneficiary,
      });

      res.json(result);
    } catch (err) {
      console.error('[DDD-Search] Error:', err.message);
      safeError(res, err, 'ddd-search');
    }
  });

  /**
   * @route   GET /api/v1/platform/search/domains
   * @desc    List all searchable domains and their models
   */
  router.get('/search/domains', (req, res) => {
    const domainsInfo = {};
    for (const [domain, models] of Object.entries(DOMAIN_MODELS)) {
      domainsInfo[domain] = {
        models,
        registered: models.filter(m => !!mongoose.models[m]),
      };
    }
    res.json({ success: true, domains: domainsInfo });
  });

  return router;
}

module.exports = {
  DOMAIN_MODELS,
  dddSearch,
  createSearchRouter,
};
