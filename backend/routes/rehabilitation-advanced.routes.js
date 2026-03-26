/**
 * Rehabilitation Advanced Routes — مسارات التأهيل المتقدم
 * CRUD APIs for: BehaviorIncident, BehaviorPlan, VocationalProfile,
 * JobCoachLog, HomeProgram, MedicationRecord, AutismProfile,
 * TherapySession, NutritionPlan, ResourceRoom, StaffCertification, DischargePlan
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
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
        filter.$or = searchFields.map(sf => ({ [sf]: { $regex: search, $options: 'i' } }));
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
      res.status(500).json({ success: false, message: err.message });
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
      res.status(500).json({ success: false, message: err.message });
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
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST /
  sub.post('/', requireAuth, async (req, res) => {
    try {
      const doc = await Model.create(req.body);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} POST / error:`, err);
      res.status(400).json({ success: false, message: err.message });
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
      res.status(400).json({ success: false, message: err.message });
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
      res.status(500).json({ success: false, message: err.message });
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
