/**
 * Disability Assessment Routes
 * مسارات اختبارات تقييم الإعاقة
 *
 * Handles:
 *  GET  /disability/beneficiaries                       – list beneficiaries
 *  GET  /disability/assessment/scale-results            – list scale results
 *  POST /disability/assessment/scale-results            – save scale result
 *  GET  /disability/assessment/test-results             – list test results
 *  POST /disability/assessment/test-results             – save test result
 *  GET  /disability/statistics                          – KPI summary
 *  GET  /disability/assessment/scales                   – available scales list
 *  GET  /disability/assessment/scales/:scaleKey         – single scale details
 *  DELETE /disability/assessment/test-results/:id       – remove test result
 *  DELETE /disability/assessment/scale-results/:id      – remove scale result
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Beneficiary = require('../models/Beneficiary');
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const validateObjectId = require('../middleware/validateObjectId');
const safeError = require('../utils/safeError');

// W467: role gate for clinical disability assessments (PHI). Pre-W467
// any authenticated user could create/modify/delete scale + test
// results. Assessments drive clinical care decisions; falsified
// scores misdirect treatment. Clinical roles only.
const DISABILITY_ASSESSMENT_ROLES = [
  'admin',
  'super_admin',
  'superadmin',
  'manager',
  'branch_manager',
  'clinical_supervisor',
  'physician',
  'doctor',
  'nurse',
  'therapist',
  'psychologist',
];

// ─── Inline models (stored in the same collection for now) ──────────────────

const assessmentResultSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['scale', 'test'], required: true, index: true },
    beneficiaryId: { type: String, required: true, index: true },
    beneficiaryName: String,
    // Scale-specific
    scaleId: { type: String, index: true },
    scaleName: String,
    domainScores: mongoose.Schema.Types.Mixed,
    totalScore: Number,
    maxScore: Number,
    // Test-specific
    testId: { type: String, index: true },
    testName: String,
    scores: mongoose.Schema.Types.Mixed,
    totalItems: Number,
    maxPossible: Number,
    // Common
    percentage: Number,
    overallLevel: String,
    notes: String,
    date: { type: String, index: -1 },
    assessorName: String,
    status: { type: String, default: 'completed' },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const AssessmentResult =
  mongoose.models.DisabilityAssessmentResult ||
  mongoose.model('DisabilityAssessmentResult', assessmentResultSchema);

// ─── Auth guard ──────────────────────────────────────────────────────────────
router.use(authenticate);
router.use(requireBranchAccess);
router.use(authorize(DISABILITY_ASSESSMENT_ROLES)); // W467

// ────────────────────────────────────────────────────────────────────────────
//  GET /disability/beneficiaries
// ────────────────────────────────────────────────────────────────────────────
router.get('/beneficiaries', async (req, res) => {
  try {
    const bFilter = branchFilter(req);
    const { q, limit = 100 } = req.query;
    const filter = { ...bFilter };
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ 'name.first': re }, { 'name.last': re }, { name_ar: re }, { full_name: re }];
    }

    const beneficiaries = await Beneficiary.find(filter)
      .select(
        '_id firstName lastName firstName_ar lastName_ar name name_ar full_name ' +
          'dateOfBirth disability status contact'
      )
      .limit(Number(limit))
      .lean();

    // Normalize to the flat shape the frontend expects
    const data = beneficiaries.map(b => ({
      id: String(b._id),
      name:
        b.name_ar ||
        b.full_name ||
        [b.firstName_ar || b.firstName, b.lastName_ar || b.lastName].filter(Boolean).join(' ') ||
        'غير محدد',
      age: b.dateOfBirth
        ? Math.floor((Date.now() - new Date(b.dateOfBirth)) / (365.25 * 24 * 3600 * 1000))
        : null,
      disabilityType: b.disability?.primaryType || b.disability?.type || b.category || 'unknown',
      therapist: b.assignedTherapist || '',
      status: b.status,
    }));

    res.json({ success: true, data, count: data.length });
  } catch (err) {
    logger.error('[disability] GET /beneficiaries error:', err.message);
    safeError(res, err, 'GET /disability/beneficiaries');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /disability/assessment/scales
// ────────────────────────────────────────────────────────────────────────────
router.get('/assessment/scales', async (req, res) => {
  try {
    // Static definitions are owned by the frontend service (scales.js).
    // Backend returns the DB-persisted meta so the frontend can sync.
    const results = await AssessmentResult.aggregate([
      { $match: { type: 'scale' } },
      {
        $group: {
          _id: '$scaleId',
          scaleName: { $first: '$scaleName' },
          usageCount: { $sum: 1 },
          lastUsed: { $max: '$date' },
        },
      },
    ]);
    res.json({ success: true, data: results });
  } catch (err) {
    safeError(res, err, 'GET /disability/assessment/scales');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /disability/assessment/scales/:scaleKey
// ────────────────────────────────────────────────────────────────────────────
router.get('/assessment/scales/:scaleKey', async (req, res) => {
  try {
    const { scaleKey } = req.params;
    const results = await AssessmentResult.find({ type: 'scale', scaleId: scaleKey })
      .sort({ date: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: { scaleKey, results } });
  } catch (err) {
    safeError(res, err, 'GET /disability/assessment/scales/:scaleKey');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /disability/assessment/scale-results
// ────────────────────────────────────────────────────────────────────────────
router.get('/assessment/scale-results', async (req, res) => {
  try {
    const { beneficiaryId, scaleId, page = 1, limit = 50 } = req.query;
    const filter = { type: 'scale', ...branchFilter(req) };
    if (beneficiaryId) filter.beneficiaryId = String(beneficiaryId);
    if (scaleId) filter.scaleId = String(scaleId);

    const [data, count] = await Promise.all([
      AssessmentResult.find(filter)
        .sort({ date: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      AssessmentResult.countDocuments(filter),
    ]);

    // Add id alias
    const normalized = data.map(r => ({ ...r, id: String(r._id) }));
    res.json({ success: true, data: normalized, count, page: Number(page) });
  } catch (err) {
    safeError(res, err, 'GET /disability/assessment/scale-results');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  POST /disability/assessment/scale-results
// ────────────────────────────────────────────────────────────────────────────
router.post('/assessment/scale-results', async (req, res) => {
  try {
    const payload = {
      type: 'scale',
      ...req.body,
      branchId: req.user?.branchId,
      createdBy: req.user?._id,
    };
    const result = await AssessmentResult.create(payload);
    res.status(201).json({ success: true, data: { ...result.toObject(), id: String(result._id) } });
  } catch (err) {
    safeError(res, err, 'POST /disability/assessment/scale-results');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  DELETE /disability/assessment/scale-results/:id
// ────────────────────────────────────────────────────────────────────────────
router.delete('/assessment/scale-results/:id', validateObjectId('id'), async (req, res) => {
  try {
    const doc = await AssessmentResult.findOneAndDelete({
      _id: req.params.id,
      type: 'scale',
    });
    if (!doc) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true });
  } catch (err) {
    safeError(res, err, 'DELETE /disability/assessment/scale-results/:id');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /disability/assessment/test-results
// ────────────────────────────────────────────────────────────────────────────
router.get('/assessment/test-results', async (req, res) => {
  try {
    const { beneficiaryId, testId, page = 1, limit = 50 } = req.query;
    const filter = { type: 'test', ...branchFilter(req) };
    if (beneficiaryId) filter.beneficiaryId = String(beneficiaryId);
    if (testId) filter.testId = String(testId);

    const [data, count] = await Promise.all([
      AssessmentResult.find(filter)
        .sort({ date: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      AssessmentResult.countDocuments(filter),
    ]);

    const normalized = data.map(r => ({ ...r, id: String(r._id) }));
    res.json({ success: true, data: normalized, count, page: Number(page) });
  } catch (err) {
    safeError(res, err, 'GET /disability/assessment/test-results');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  POST /disability/assessment/test-results
// ────────────────────────────────────────────────────────────────────────────
router.post('/assessment/test-results', async (req, res) => {
  try {
    const payload = {
      type: 'test',
      ...req.body,
      branchId: req.user?.branchId,
      createdBy: req.user?._id,
    };
    const result = await AssessmentResult.create(payload);
    res.status(201).json({ success: true, data: { ...result.toObject(), id: String(result._id) } });
  } catch (err) {
    safeError(res, err, 'POST /disability/assessment/test-results');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  DELETE /disability/assessment/test-results/:id
// ────────────────────────────────────────────────────────────────────────────
router.delete('/assessment/test-results/:id', validateObjectId('id'), async (req, res) => {
  try {
    const doc = await AssessmentResult.findOneAndDelete({
      _id: req.params.id,
      type: 'test',
    });
    if (!doc) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true });
  } catch (err) {
    safeError(res, err, 'DELETE /disability/assessment/test-results/:id');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /disability/statistics
// ────────────────────────────────────────────────────────────────────────────
router.get('/statistics', async (req, res) => {
  try {
    const bFilter = branchFilter(req);
    const filter = { ...bFilter };

    const [total, scaleCount, testCount, avgAgg, beneficiaryIds, monthly] = await Promise.all([
      AssessmentResult.countDocuments(filter),
      AssessmentResult.countDocuments({ ...filter, type: 'scale' }),
      AssessmentResult.countDocuments({ ...filter, type: 'test' }),
      AssessmentResult.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            avg: { $avg: '$percentage' },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          },
        },
      ]),
      AssessmentResult.distinct('beneficiaryId', filter),
      AssessmentResult.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $substr: ['$date', 0, 7] },
            scales: { $sum: { $cond: [{ $eq: ['$type', 'scale'] }, 1, 0] } },
            tests: { $sum: { $cond: [{ $eq: ['$type', 'test'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 6 },
      ]),
    ]);

    const avg = avgAgg[0];
    res.json({
      success: true,
      data: {
        totalAssessments: total,
        scaleAssessments: scaleCount,
        testAssessments: testCount,
        totalBeneficiaries: beneficiaryIds.length,
        averageScore: avg ? Math.round(avg.avg || 0) : 0,
        completionRate: total > 0 ? Math.round(((avg?.completed || 0) / total) * 100) : 0,
        monthlyTrend: monthly.map(m => ({
          month: m._id,
          scales: m.scales,
          tests: m.tests,
        })),
      },
    });
  } catch (err) {
    safeError(res, err, 'GET /disability/statistics');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  POST /disability/assessment/perform  — run a test and save immediately
// ────────────────────────────────────────────────────────────────────────────
router.post('/assessment/perform', async (req, res) => {
  try {
    const payload = {
      type: 'test',
      ...req.body,
      status: 'completed',
      branchId: req.user?.branchId,
      createdBy: req.user?._id,
    };
    const result = await AssessmentResult.create(payload);
    res.status(201).json({ success: true, data: { ...result.toObject(), id: String(result._id) } });
  } catch (err) {
    safeError(res, err, 'POST /disability/assessment/perform');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  POST /disability/assessment/batch  — save multiple results at once
// ────────────────────────────────────────────────────────────────────────────
router.post('/assessment/batch', async (req, res) => {
  try {
    const { assessments = [] } = req.body;
    const docs = assessments.map(a => ({
      ...a,
      branchId: req.user?.branchId,
      createdBy: req.user?._id,
    }));
    const saved = await AssessmentResult.insertMany(docs, { ordered: false });
    res.status(201).json({ success: true, count: saved.length });
  } catch (err) {
    safeError(res, err, 'POST /disability/assessment/batch');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /disability/assessment/profile/:beneficiaryId  — all results for one beneficiary
// ────────────────────────────────────────────────────────────────────────────
router.get('/assessment/profile/:beneficiaryId', async (req, res) => {
  try {
    const filter = {
      beneficiaryId: req.params.beneficiaryId,
      ...branchFilter(req),
    };
    const results = await AssessmentResult.find(filter).sort({ date: -1 }).limit(200).lean();
    res.json({ success: true, data: results.map(r => ({ ...r, id: String(r._id) })) });
  } catch (err) {
    safeError(res, err, 'GET /disability/assessment/profile/:beneficiaryId');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /disability/assessment/compare/:beneficiaryId  — progress over time
// ────────────────────────────────────────────────────────────────────────────
router.get('/assessment/compare/:beneficiaryId', async (req, res) => {
  try {
    const filter = {
      beneficiaryId: req.params.beneficiaryId,
      ...branchFilter(req),
    };
    const results = await AssessmentResult.find(filter)
      .select('type testId scaleId percentage date')
      .sort({ date: 1 })
      .lean();
    // Group by testId/scaleId for trend lines
    const grouped = {};
    results.forEach(r => {
      const key = r.testId || r.scaleId || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ date: r.date, percentage: r.percentage, type: r.type });
    });
    res.json({ success: true, data: grouped });
  } catch (err) {
    safeError(res, err, 'GET /disability/assessment/compare/:beneficiaryId');
  }
});

// ────────────────────────────────────────────────────────────────────────────
//  GET /disability/assessment/analytics  — aggregate analytics
// ────────────────────────────────────────────────────────────────────────────
router.get('/assessment/analytics', async (req, res) => {
  try {
    const filter = branchFilter(req);
    const [byLevel, byTest, byMonth] = await Promise.all([
      AssessmentResult.aggregate([
        { $match: filter },
        { $group: { _id: '$overallLevel', count: { $sum: 1 }, avgScore: { $avg: '$percentage' } } },
        { $sort: { count: -1 } },
      ]),
      AssessmentResult.aggregate([
        { $match: { ...filter, type: 'test' } },
        {
          $group: {
            _id: '$testId',
            testName: { $first: '$testName' },
            count: { $sum: 1 },
            avgScore: { $avg: '$percentage' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AssessmentResult.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $substr: ['$date', 0, 7] },
            count: { $sum: 1 },
            avgScore: { $avg: '$percentage' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]),
    ]);
    res.json({ success: true, data: { byLevel, byTest, byMonth } });
  } catch (err) {
    safeError(res, err, 'GET /disability/assessment/analytics');
  }
});

module.exports = router;
