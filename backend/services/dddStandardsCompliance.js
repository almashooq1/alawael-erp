'use strict';
/**
 * DDD Standards Compliance Service
 * ─────────────────────────────────
 * Phase 30 – Regulatory Compliance & Accreditation (Module 3/4)
 *
 * Manages compliance standards mapping, gap analysis, evidence collection,
 * compliance scoring, and regulatory requirement tracking.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const STANDARD_FRAMEWORKS = [
  'jci',
  'cbahi',
  'carf',
  'iso_9001',
  'iso_45001',
  'hipaa',
  'gdpr',
  'nphies',
  'moh_regulations',
  'fire_code',
  'building_code',
  'labor_law',
];

const COMPLIANCE_STATUSES = [
  'compliant',
  'non_compliant',
  'partially_compliant',
  'in_progress',
  'not_assessed',
  'exempt',
  'pending_evidence',
  'under_review',
  'waiver_granted',
  'expired',
];

const REQUIREMENT_PRIORITIES = [
  'critical',
  'high',
  'medium',
  'low',
  'informational',
  'mandatory',
  'recommended',
  'best_practice',
  'optional',
  'conditional',
];

const EVIDENCE_TYPES = [
  'document',
  'policy',
  'procedure',
  'record',
  'observation',
  'interview',
  'audit_report',
  'training_record',
  'photo',
  'measurement',
];

const GAP_CATEGORIES = [
  'documentation',
  'process',
  'training',
  'equipment',
  'staffing',
  'facility',
  'technology',
  'policy',
  'communication',
  'monitoring',
];

const ASSESSMENT_METHODS = [
  'document_review',
  'staff_interview',
  'patient_interview',
  'direct_observation',
  'data_analysis',
  'walkthrough',
  'simulation',
  'audit_trail',
  'peer_review',
  'self_assessment',
];

const BUILTIN_REGULATORY_BODIES = [
  { code: 'MOH_SA', name: 'Ministry of Health Saudi Arabia', country: 'SA' },
  { code: 'SCFHS_SA', name: 'Saudi Commission for Health Specialties', country: 'SA' },
  { code: 'SFDA', name: 'Saudi Food and Drug Authority', country: 'SA' },
  { code: 'NPHIES', name: 'National Platform for Health Insurance Exchange', country: 'SA' },
  { code: 'CBAHI_SA', name: 'Central Board for Accreditation of Healthcare', country: 'SA' },
  { code: 'WHO', name: 'World Health Organization', country: 'INT' },
  { code: 'JCI_INT', name: 'Joint Commission International', country: 'INT' },
  { code: 'CIVIL_DEF', name: 'Civil Defense Authority', country: 'SA' },
  { code: 'HRSD', name: 'Ministry of Human Resources', country: 'SA' },
  { code: 'NCA', name: 'National Cybersecurity Authority', country: 'SA' },
];

/* ═══════════════════ Schemas ═══════════════════ */
const complianceStandardSchema = new Schema(
  {
    framework: { type: String, enum: STANDARD_FRAMEWORKS, required: true },
    standardRef: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    chapter: { type: String },
    section: { type: String },
    priority: { type: String, enum: REQUIREMENT_PRIORITIES, default: 'medium' },
    department: { type: String },
    isMeasurable: { type: Boolean, default: true },
    effectiveDate: { type: Date },
    reviewDate: { type: Date },
    isActive: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
complianceStandardSchema.index({ framework: 1, standardRef: 1 }, { unique: true });
complianceStandardSchema.index({ department: 1 });

const complianceAssessmentSchema = new Schema(
  {
    standardId: { type: Schema.Types.ObjectId, ref: 'DDDComplianceStandard', required: true },
    assessmentDate: { type: Date, default: Date.now },
    assessorId: { type: Schema.Types.ObjectId, ref: 'User' },
    method: { type: String, enum: ASSESSMENT_METHODS },
    status: { type: String, enum: COMPLIANCE_STATUSES, default: 'not_assessed' },
    score: { type: Number, min: 0, max: 100 },
    findings: { type: String },
    evidenceCollected: [
      {
        type: { type: String, enum: EVIDENCE_TYPES },
        description: String,
        url: String,
        collectedDate: Date,
      },
    ],
    gapIdentified: { type: Boolean, default: false },
    nextReviewDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
complianceAssessmentSchema.index({ standardId: 1, assessmentDate: -1 });

const gapAnalysisSchema = new Schema(
  {
    standardId: { type: Schema.Types.ObjectId, ref: 'DDDComplianceStandard', required: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'DDDComplianceAssessment' },
    category: { type: String, enum: GAP_CATEGORIES, required: true },
    description: { type: String, required: true },
    currentState: { type: String },
    requiredState: { type: String },
    gapSeverity: { type: String, enum: ['critical', 'major', 'minor', 'negligible'] },
    remediationPlan: { type: String },
    responsibleId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetDate: { type: Date },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'accepted', 'deferred'],
      default: 'open',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
gapAnalysisSchema.index({ standardId: 1, status: 1 });
gapAnalysisSchema.index({ category: 1 });

const complianceScoreSchema = new Schema(
  {
    framework: { type: String, enum: STANDARD_FRAMEWORKS, required: true },
    department: { type: String },
    period: { type: String },
    assessmentDate: { type: Date, default: Date.now },
    totalStandards: { type: Number, default: 0 },
    compliantCount: { type: Number, default: 0 },
    nonCompliantCount: { type: Number, default: 0 },
    partialCount: { type: Number, default: 0 },
    overallScore: { type: Number, min: 0, max: 100 },
    trend: { type: String, enum: ['improving', 'stable', 'declining'] },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
complianceScoreSchema.index({ framework: 1, assessmentDate: -1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDComplianceStandard =
  mongoose.models.DDDComplianceStandard ||
  mongoose.model('DDDComplianceStandard', complianceStandardSchema);
const DDDComplianceAssessment =
  mongoose.models.DDDComplianceAssessment ||
  mongoose.model('DDDComplianceAssessment', complianceAssessmentSchema);
const DDDGapAnalysis =
  mongoose.models.DDDGapAnalysis || mongoose.model('DDDGapAnalysis', gapAnalysisSchema);
const DDDComplianceScore =
  mongoose.models.DDDComplianceScore || mongoose.model('DDDComplianceScore', complianceScoreSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class StandardsCompliance {
  /* ── Standards ── */
  async createStandard(data) {
    return DDDComplianceStandard.create(data);
  }
  async listStandards(filter = {}, page = 1, limit = 20) {
    return DDDComplianceStandard.find(filter)
      .sort({ framework: 1, standardRef: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async getStandardById(id) {
    return DDDComplianceStandard.findById(id).lean();
  }
  async updateStandard(id, data) {
    return DDDComplianceStandard.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── Assessments ── */
  async createAssessment(data) {
    return DDDComplianceAssessment.create(data);
  }
  async listAssessments(filter = {}, page = 1, limit = 20) {
    return DDDComplianceAssessment.find(filter)
      .sort({ assessmentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  /* ── Gap Analysis ── */
  async createGapAnalysis(data) {
    return DDDGapAnalysis.create(data);
  }
  async listGapAnalyses(filter = {}, page = 1, limit = 20) {
    return DDDGapAnalysis.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateGapAnalysis(id, data) {
    return DDDGapAnalysis.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  /* ── Scores ── */
  async recordScore(data) {
    return DDDComplianceScore.create(data);
  }
  async listScores(filter = {}) {
    return DDDComplianceScore.find(filter).sort({ assessmentDate: -1 }).lean();
  }

  /* ── Analytics ── */
  async getFrameworkCompliance(framework) {
    const standards = await DDDComplianceStandard.find({ framework, isActive: true }).lean();
    const latest = await DDDComplianceAssessment.aggregate([
      { $sort: { assessmentDate: -1 } },
      {
        $group: {
          _id: '$standardId',
          latestStatus: { $first: '$status' },
          latestScore: { $first: '$score' },
        },
      },
    ]);
    return { framework, totalStandards: standards.length, assessments: latest };
  }

  async getOpenGaps() {
    return DDDGapAnalysis.find({ status: { $in: ['open', 'in_progress'] } })
      .sort({ gapSeverity: 1 })
      .lean();
  }

  /* ── Health ── */
  async healthCheck() {
    const [standards, assessments, gaps, scores] = await Promise.all([
      DDDComplianceStandard.countDocuments(),
      DDDComplianceAssessment.countDocuments(),
      DDDGapAnalysis.countDocuments(),
      DDDComplianceScore.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'StandardsCompliance',
      counts: { standards, assessments, gaps, scores },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createStandardsComplianceRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new StandardsCompliance();

  router.get('/standards-compliance/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/standards-compliance/standards', async (req, res) => {
    try {
      res.status(201).json(await svc.createStandard(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/standards-compliance/standards', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listStandards(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/standards-compliance/standards/:id', async (req, res) => {
    try {
      res.json(await svc.updateStandard(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/standards-compliance/assessments', async (req, res) => {
    try {
      res.status(201).json(await svc.createAssessment(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/standards-compliance/assessments', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listAssessments(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/standards-compliance/gaps', async (req, res) => {
    try {
      res.status(201).json(await svc.createGapAnalysis(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/standards-compliance/gaps', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listGapAnalyses(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/standards-compliance/gaps/:id', async (req, res) => {
    try {
      res.json(await svc.updateGapAnalysis(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/standards-compliance/scores', async (req, res) => {
    try {
      res.status(201).json(await svc.recordScore(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/standards-compliance/scores', async (req, res) => {
    try {
      res.json(await svc.listScores(req.query));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/standards-compliance/frameworks/:fw', async (req, res) => {
    try {
      res.json(await svc.getFrameworkCompliance(req.params.fw));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/standards-compliance/open-gaps', async (_req, res) => {
    try {
      res.json(await svc.getOpenGaps());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  STANDARD_FRAMEWORKS,
  COMPLIANCE_STATUSES,
  REQUIREMENT_PRIORITIES,
  EVIDENCE_TYPES,
  GAP_CATEGORIES,
  ASSESSMENT_METHODS,
  BUILTIN_REGULATORY_BODIES,
  DDDComplianceStandard,
  DDDComplianceAssessment,
  DDDGapAnalysis,
  DDDComplianceScore,
  StandardsCompliance,
  createStandardsComplianceRouter,
};
