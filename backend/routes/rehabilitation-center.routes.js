/**
 * Rehabilitation Center Routes — مسارات مركز التأهيل
 * CRUD APIs for: AssessmentTool, BeneficiaryAssessment, IndividualizedPlan,
 * GroupSession, SatisfactionSurvey, SurveyResponse, Referral, Schedule,
 * AssistiveEquipment, FamilyCommunication, Waitlist, ReportTemplate, GeneratedReport
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { escapeRegex } = require('../utils/sanitize');
const {
  AssessmentTool,
  BeneficiaryAssessment,
  IndividualizedPlan,
  GroupSession,
  SatisfactionSurvey,
  SurveyResponse,
  Referral,
  Schedule,
  AssistiveEquipment,
  FamilyCommunication,
  Waitlist,
  ReportTemplate,
  GeneratedReport,
} = require('../models/rehabilitation-center.model');

/* ================================================================
   Helper: generic CRUD factory
   ================================================================ */
function buildCrud(Model, modelName, opts = {}) {
  const sub = express.Router();
  const { filterFields = [], searchFields = [], defaultSort = { createdAt: -1 } } = opts;

  // GET / — list + filter + paginate
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
        filter.$or = searchFields.map(sf => ({
          [sf]: { $regex: escapeRegex(String(search)), $options: 'i' },
        }));
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

// 1. Assessment Tools — أدوات التقييم
router.use(
  '/assessment-tools',
  buildCrud(AssessmentTool, 'AssessmentTool', {
    filterFields: ['category', 'is_active'],
    searchFields: ['tool_name'],
  })
);

// 2. Beneficiary Assessments — تقييمات المستفيدين
router.use(
  '/beneficiary-assessments',
  buildCrud(BeneficiaryAssessment, 'BeneficiaryAssessment', {
    filterFields: ['assessment_tool_id', 'status'],
    defaultSort: { assessment_date: -1 },
  })
);

// 3. Individualized Plans (ITP) — خطط تأهيلية فردية
router.use(
  '/individualized-plans',
  buildCrud(IndividualizedPlan, 'IndividualizedPlan', {
    filterFields: ['status'],
    searchFields: ['plan_title'],
  })
);

// 4. Group Sessions — جلسات جماعية
router.use(
  '/group-sessions',
  buildCrud(GroupSession, 'GroupSession', {
    filterFields: ['session_type', 'status'],
    searchFields: ['session_name'],
    defaultSort: { start_date: -1 },
  })
);

// 5. Satisfaction Surveys — استبيانات الرضا
router.use(
  '/satisfaction-surveys',
  buildCrud(SatisfactionSurvey, 'SatisfactionSurvey', {
    filterFields: ['status', 'survey_type'],
    searchFields: ['title'],
  })
);

// 6. Survey Responses — ردود الاستبيانات
router.use(
  '/survey-responses',
  buildCrud(SurveyResponse, 'SurveyResponse', {
    filterFields: ['survey_id'],
    defaultSort: { submitted_at: -1 },
  })
);

// 7. Referrals — الإحالات
router.use(
  '/referrals',
  buildCrud(Referral, 'Referral', {
    filterFields: ['status', 'referral_type'],
    defaultSort: { referral_date: -1 },
  })
);

// 8. Schedules — الجداول
router.use(
  '/schedules',
  buildCrud(Schedule, 'Schedule', {
    filterFields: ['schedule_type', 'status'],
  })
);

// 9. Assistive Equipment — الأجهزة المساعدة
router.use(
  '/assistive-equipment',
  buildCrud(AssistiveEquipment, 'AssistiveEquipment', {
    filterFields: ['equipment_type', 'status'],
    searchFields: ['equipment_name'],
  })
);

// 10. Family Communication — تواصل الأسرة
router.use(
  '/family-communications',
  buildCrud(FamilyCommunication, 'FamilyCommunication', {
    filterFields: ['communication_type'],
    defaultSort: { communication_date: -1 },
  })
);

// 11. Waitlist — قوائم الانتظار
router.use(
  '/waitlist',
  buildCrud(Waitlist, 'Waitlist', {
    filterFields: ['status', 'priority'],
    defaultSort: { request_date: -1 },
  })
);

// 12. Report Templates — قوالب التقارير
router.use(
  '/report-templates',
  buildCrud(ReportTemplate, 'ReportTemplate', {
    filterFields: ['report_type', 'is_active'],
    searchFields: ['template_name'],
  })
);

// 13. Generated Reports — التقارير المولدة
router.use(
  '/generated-reports',
  buildCrud(GeneratedReport, 'GeneratedReport', {
    filterFields: ['template_id', 'status'],
    defaultSort: { generated_at: -1 },
  })
);

/* ── Index endpoint — list all sub-collections ─────────────────── */
router.get('/', requireAuth, (_req, res) => {
  res.json({
    success: true,
    modules: [
      'assessment-tools',
      'beneficiary-assessments',
      'individualized-plans',
      'group-sessions',
      'satisfaction-surveys',
      'survey-responses',
      'referrals',
      'schedules',
      'assistive-equipment',
      'family-communications',
      'waitlist',
      'report-templates',
      'generated-reports',
    ],
  });
});

module.exports = router;
