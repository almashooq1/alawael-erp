/**
 * Beneficiary Management Routes — مسارات إدارة المستفيدين
 * Full CRUD APIs for: AcademicRecord, Achievement, AttendanceRecord,
 * CounselingSession, FinancialSupport, Scholarship, SkillsDevelopment, SupportPlan
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { escapeRegex } = require('../utils/sanitize');
const {
  AcademicRecord,
  Achievement,
  AttendanceRecord,
  CounselingSession,
  FinancialSupport,
  Scholarship,
  SkillsDevelopment,
  SupportPlan,
} = require('../models/BeneficiaryManagement');

/* ================================================================
   Helper: generic CRUD factory
   ================================================================ */
function buildCrud(Model, modelName, opts = {}) {
  const sub = express.Router();
  const { filterFields = [], searchFields = [], defaultSort = { createdAt: -1 } } = opts;

  // GET / — list + filter + paginate
  sub.get('/', requireAuth, async (req, res) => {
    try {
      const { page = 1, limit = 25, search, beneficiaryId, status, ...rest } = req.query;
      const filter = {};
      if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
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

  // GET /by-beneficiary/:beneficiaryId — filtered by beneficiary
  sub.get('/by-beneficiary/:beneficiaryId', requireAuth, async (req, res) => {
    try {
      const { page = 1, limit = 25 } = req.query;
      const filter = { beneficiaryId: req.params.beneficiaryId };
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
      logger.error(`${modelName} GET /by-beneficiary error:`, err);
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

// 1. Academic Records — السجلات الأكاديمية
router.use(
  '/academic-records',
  buildCrud(AcademicRecord, 'AcademicRecord', {
    filterFields: ['enrollmentStatus', 'academicStanding', 'degree'],
    searchFields: ['programName', 'major', 'specialization'],
  })
);

// 2. Achievements — الإنجازات
router.use(
  '/achievements',
  buildCrud(Achievement, 'Achievement', {
    filterFields: ['type', 'verificationStatus', 'recognitionLevel'],
    searchFields: ['title', 'issuerName'],
    defaultSort: { achievedDate: -1 },
  })
);

// 3. Attendance Records — سجلات الحضور
router.use(
  '/attendance-records',
  buildCrud(AttendanceRecord, 'AttendanceRecord', {
    filterFields: ['status', 'attendanceAlert'],
    defaultSort: { attendanceDate: -1 },
  })
);

// 4. Counseling Sessions — جلسات الإرشاد
router.use(
  '/counseling-sessions',
  buildCrud(CounselingSession, 'CounselingSession', {
    filterFields: ['sessionStatus', 'sessionType', 'sessionFormat'],
    searchFields: ['topic', 'counselorName'],
    defaultSort: { scheduledDate: -1 },
  })
);

// 5. Financial Support — الدعم المالي
router.use(
  '/financial-support',
  buildCrud(FinancialSupport, 'FinancialSupport', {
    filterFields: ['supportType', 'requestStatus', 'urgencyLevel', 'eligibilityStatus'],
    defaultSort: { requestDate: -1 },
  })
);

// 6. Scholarships — المنح الدراسية
router.use(
  '/scholarships',
  buildCrud(Scholarship, 'Scholarship', {
    filterFields: ['applicationStatus', 'scholarshipType', 'semester'],
    searchFields: ['programName'],
    defaultSort: { applicationDate: -1 },
  })
);

// 7. Skills Development — تطوير المهارات
router.use(
  '/skills-development',
  buildCrud(SkillsDevelopment, 'SkillsDevelopment', {
    filterFields: ['skillCategory', 'currentLevel'],
    searchFields: ['skillName'],
  })
);

// 8. Support Plans — خطط الدعم
router.use(
  '/support-plans',
  buildCrud(SupportPlan, 'SupportPlan', {
    filterFields: ['planStatus', 'planType'],
    searchFields: ['coordinatorName'],
  })
);

/* ── Index endpoint ─────────────────────────────────────────────── */
router.get('/', requireAuth, (_req, res) => {
  res.json({
    success: true,
    modules: [
      'academic-records',
      'achievements',
      'attendance-records',
      'counseling-sessions',
      'financial-support',
      'scholarships',
      'skills-development',
      'support-plans',
    ],
  });
});

module.exports = router;
