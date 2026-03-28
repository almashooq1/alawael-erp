/**
 * Rehabilitation Intelligent Routes — مسارات التأهيل الذكي
 * CRUD APIs for: AIRecommendation, PredictiveModel, PredictionResult,
 * RiskAssessment, QualityIndicator, AccreditationStandard, ResearchProject,
 * TrainingProgram, CompetencyAssessment, EmergencyProtocol, EmergencyIncident,
 * GovernmentIntegration
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { escapeRegex } = require('../utils/sanitize');
const {
  AIRecommendation,
  PredictiveModel,
  PredictionResult,
  RiskAssessment,
  QualityIndicator,
  AccreditationStandard,
  ResearchProject,
  TrainingProgram,
  CompetencyAssessment,
  EmergencyProtocol,
  EmergencyIncident,
  GovernmentIntegration,
} = require('../models/rehabilitation-intelligent.model');

/* ================================================================
   Helper: generic CRUD factory
   ================================================================ */
function buildCrud(Model, modelName, opts = {}) {
  const sub = express.Router();
  const { filterFields = [], searchFields = [], defaultSort = { createdAt: -1 } } = opts;

  // GET /
  sub.get('/', requireAuth, async (req, res) => {
    try {
      const { page = 1, limit = 25, search, beneficiary_id, status, ...rest } = req.query;
      const filter = {};
      if (beneficiary_id) filter.beneficiary_id = beneficiary_id;
      if (status) filter.status = status;
      filterFields.forEach(f => {
        if (rest[f]) filter[f] = rest[f];
      });
      if (search && searchFields.length) {
        filter.$or = searchFields.map(sf => ({ [sf]: { $regex: escapeRegex(String(search)), $options: 'i' } }));
      }
      const skip = (Number(page) - 1) * Number(limit);
      const [data, total] = await Promise.all([
        Model.find(filter).sort(defaultSort).skip(skip).limit(Number(limit)).lean(),
        Model.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      });
    } catch (err) {
      logger.error(`${modelName} GET / error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  // GET /stats
  sub.get('/stats', requireAuth, async (req, res) => {
    try {
      const total = await Model.countDocuments();
      const byStatus = await Model.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      res.json({ success: true, data: { total, byStatus } });
    } catch (err) {
      logger.error(`${modelName} GET /stats error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  // GET /:id
  sub.get('/:id', requireAuth, async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} GET /:id error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  // POST /
  sub.post('/', requireAuth, async (req, res) => {
    try {
      const doc = await Model.create(req.body);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} POST / error:`, err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  });

  // PUT /:id
  sub.put('/:id', requireAuth, async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} PUT /:id error:`, err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  });

  // DELETE /:id
  sub.delete('/:id', requireAuth, async (req, res) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, message: `${modelName} deleted` });
    } catch (err) {
      logger.error(`${modelName} DELETE /:id error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  return sub;
}

/* ================================================================
   Mount sub-routers
   ================================================================ */

// 1. AI Recommendations — توصيات الذكاء الاصطناعي
router.use(
  '/ai-recommendations',
  buildCrud(AIRecommendation, 'AIRecommendation', {
    filterFields: ['recommendation_type', 'implementation_status.status'],
    defaultSort: { confidence_score: -1 },
  })
);

// 2. Predictive Models — نماذج التنبؤ
router.use(
  '/predictive-models',
  buildCrud(PredictiveModel, 'PredictiveModel', {
    filterFields: ['status', 'model_type'],
    searchFields: ['model_name'],
  })
);

// 3. Prediction Results — نتائج التنبؤ
router.use(
  '/prediction-results',
  buildCrud(PredictionResult, 'PredictionResult', {
    filterFields: ['model_id', 'status'],
    defaultSort: { prediction_date: -1 },
  })
);

// 4. Risk Assessments — تقييمات المخاطر
router.use(
  '/risk-assessments',
  buildCrud(RiskAssessment, 'RiskAssessment', {
    filterFields: ['overall_risk_level', 'status'],
    defaultSort: { assessment_date: -1 },
  })
);

// 5. Quality Indicators — مؤشرات الجودة
router.use(
  '/quality-indicators',
  buildCrud(QualityIndicator, 'QualityIndicator', {
    filterFields: ['category', 'is_active'],
    searchFields: ['indicator_name'],
  })
);

// 6. Accreditation Standards — معايير الاعتماد
router.use(
  '/accreditation-standards',
  buildCrud(AccreditationStandard, 'AccreditationStandard', {
    filterFields: ['accreditation_body', 'compliance_status'],
    searchFields: ['standard_name', 'standard_code'],
  })
);

// 7. Research Projects — مشاريع البحث
router.use(
  '/research-projects',
  buildCrud(ResearchProject, 'ResearchProject', {
    filterFields: ['status', 'methodology.study_type'],
    searchFields: ['title'],
  })
);

// 8. Training Programs — البرامج التدريبية
router.use(
  '/training-programs',
  buildCrud(TrainingProgram, 'TrainingProgram', {
    filterFields: ['status', 'program_type'],
    searchFields: ['program_name'],
  })
);

// 9. Competency Assessments — تقييمات الكفاءة
router.use(
  '/competency-assessments',
  buildCrud(CompetencyAssessment, 'CompetencyAssessment', {
    filterFields: ['staff_id', 'status'],
    defaultSort: { assessment_date: -1 },
  })
);

// 10. Emergency Protocols — بروتوكولات الطوارئ
router.use(
  '/emergency-protocols',
  buildCrud(EmergencyProtocol, 'EmergencyProtocol', {
    filterFields: ['severity_level', 'is_active'],
    searchFields: ['protocol_name'],
  })
);

// 11. Emergency Incidents — حوادث الطوارئ
router.use(
  '/emergency-incidents',
  buildCrud(EmergencyIncident, 'EmergencyIncident', {
    filterFields: ['severity', 'status'],
    defaultSort: { incident_date: -1 },
  })
);

// 12. Government Integration — التكامل الحكومي
router.use(
  '/government-integrations',
  buildCrud(GovernmentIntegration, 'GovernmentIntegration', {
    filterFields: ['integration_type', 'status'],
    searchFields: ['system_name'],
  })
);

/* ── Index endpoint ─────────────────────────────────────────────── */
router.get('/', requireAuth, (_req, res) => {
  res.json({
    success: true,
    modules: [
      'ai-recommendations',
      'predictive-models',
      'prediction-results',
      'risk-assessments',
      'quality-indicators',
      'accreditation-standards',
      'research-projects',
      'training-programs',
      'competency-assessments',
      'emergency-protocols',
      'emergency-incidents',
      'government-integrations',
    ],
  });
});

module.exports = router;
