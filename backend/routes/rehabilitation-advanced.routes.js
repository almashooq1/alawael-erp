/**
 * Rehabilitation Advanced Routes — مسارات التأهيل المتقدم
 * CRUD APIs for: BehaviorIncident, BehaviorPlan, VocationalProfile,
 * JobCoachLog, HomeProgram, MedicationRecord, AutismProfile,
 * TherapySession, NutritionPlan, ResourceRoom, StaffCertification, DischargePlan
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const {
  BehaviorIncident,
  BehaviorPlan,
  VocationalProfile,
  JobCoachLog,
  HomeProgram,
  MedicationRecord,
  AutismProfile,
  TherapySession,
  NutritionPlan,
  ResourceRoom,
  StaffCertification,
  DischargePlan,
} = require('../models/rehabilitation-advanced.model');

/* ================================================================
   Helper: generic CRUD factory
   ================================================================ */
function buildCrud(Model, modelName, opts = {}) {
  const sub = express.Router();
  const { filterFields = [], searchFields = [], defaultSort = { createdAt: -1 } } = opts;

  // GET / (branch-scoped)
  sub.get('/', requireAuth, requireBranchAccess, async (req, res) => {
    try {
      const { page = 1, limit = 25, search, beneficiary_id, status, ...rest } = req.query;
      const filter = { ...branchFilter(req) };
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
      safeError(res, err, 'rehabilitation-advanced');
    }
  });

  // GET /stats (branch-scoped)
  sub.get('/stats', requireAuth, requireBranchAccess, async (req, res) => {
    try {
      const scope = branchFilter(req);
      const total = await Model.countDocuments(scope);
      const byStatus = await Model.aggregate([
        { $match: scope },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      res.json({ success: true, data: { total, byStatus } });
    } catch (err) {
      safeError(res, err, 'rehabilitation-advanced');
    }
  });

  // GET /:id (branch-scoped)
  sub.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
    try {
      const doc = await Model.findOne({ _id: req.params.id, ...branchFilter(req) });
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'rehabilitation-advanced');
    }
  });

  // POST / (branch-scoped — auto-injects branchId)
  sub.post('/', requireAuth, requireBranchAccess, async (req, res) => {
    try {
      const body = { ...req.body };
      if (req.branchScope && req.branchScope.branchId) {
        body.branchId = req.branchScope.branchId;
      }
      const doc = await Model.create(stripUpdateMeta(body));
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} POST / error:`, err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  });

  // PUT /:id (branch-scoped)
  sub.put('/:id', requireAuth, requireBranchAccess, async (req, res) => {
    try {
      const doc = await Model.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        stripUpdateMeta(req.body),
        { new: true, runValidators: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} PUT /:id error:`, err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  });

  // DELETE /:id (branch-scoped)
  sub.delete('/:id', requireAuth, requireBranchAccess, async (req, res) => {
    try {
      const doc = await Model.findOneAndDelete({ _id: req.params.id, ...branchFilter(req) });
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, message: `${modelName} deleted` });
    } catch (err) {
      safeError(res, err, 'rehabilitation-advanced');
    }
  });

  return sub;
}

/* ================================================================
   Mount sub-routers
   ================================================================ */

// 1. Behavior Incidents — حوادث السلوك
router.use(
  '/behavior-incidents',
  buildCrud(BehaviorIncident, 'BehaviorIncident', {
    filterFields: ['behavior_type.category', 'incident_info.intensity'],
    defaultSort: { 'incident_info.date': -1 },
  })
);

// 2. Behavior Plans — خطط التدخل السلوكي
router.use(
  '/behavior-plans',
  buildCrud(BehaviorPlan, 'BehaviorPlan', {
    filterFields: ['status'],
    searchFields: ['plan_name'],
  })
);

// 3. Vocational Profiles — ملفات التدريب المهني
router.use(
  '/vocational-profiles',
  buildCrud(VocationalProfile, 'VocationalProfile', {
    searchFields: ['employment_plan.career_goal'],
  })
);

// 4. Job Coach Logs — سجلات المدرب المهني
router.use(
  '/job-coach-logs',
  buildCrud(JobCoachLog, 'JobCoachLog', {
    filterFields: ['job_coach_id'],
    defaultSort: { session_date: -1 },
  })
);

// 5. Home Programs — برامج المتابعة المنزلية
router.use(
  '/home-programs',
  buildCrud(HomeProgram, 'HomeProgram', {
    filterFields: ['status'],
    searchFields: ['program_name'],
  })
);

// 6. Medication Records — سجلات الأدوية
router.use(
  '/medication-records',
  buildCrud(MedicationRecord, 'MedicationRecord', {
    filterFields: ['status'],
  })
);

// 7. Autism Profiles — ملفات التوحد
router.use('/autism-profiles', buildCrud(AutismProfile, 'AutismProfile'));

// 8. Therapy Sessions — جلسات العلاج
router.use(
  '/therapy-sessions',
  buildCrud(TherapySession, 'TherapySession', {
    filterFields: ['session_info.session_type', 'session_info.status'],
    defaultSort: { 'session_info.date': -1 },
  })
);

// 9. Nutrition Plans — خطط التغذية
router.use(
  '/nutrition-plans',
  buildCrud(NutritionPlan, 'NutritionPlan', {
    filterFields: ['status'],
  })
);

// 10. Resource Rooms — غرف الموارد
router.use(
  '/resource-rooms',
  buildCrud(ResourceRoom, 'ResourceRoom', {
    filterFields: ['room_info.room_type', 'is_available'],
    searchFields: ['room_info.room_name'],
  })
);

// 11. Staff Certifications — شهادات الموظفين
router.use(
  '/staff-certifications',
  buildCrud(StaffCertification, 'StaffCertification', {
    filterFields: ['status', 'staff_id'],
  })
);

// 12. Discharge Plans — خطط الخروج
router.use(
  '/discharge-plans',
  buildCrud(DischargePlan, 'DischargePlan', {
    filterFields: ['status'],
  })
);

/* ── Index endpoint — list all sub-collections ─────────────────── */
router.get('/', requireAuth, (_req, res) => {
  res.json({
    success: true,
    modules: [
      'behavior-incidents',
      'behavior-plans',
      'vocational-profiles',
      'job-coach-logs',
      'home-programs',
      'medication-records',
      'autism-profiles',
      'therapy-sessions',
      'nutrition-plans',
      'resource-rooms',
      'staff-certifications',
      'discharge-plans',
    ],
  });
});

module.exports = router;
