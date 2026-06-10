/**
 * therapist-extended.routes.js
 * ══════════════════════════════════════════════════════════════════
 * Therapist Extended API — واجهة الأخصائي الموسّعة
 *
 * Provides therapist-scoped access to:
 *   - Treatment Plans (delegates to CarePlan model)
 *   - Assessments (delegates to Assessment model)
 *   - Prescriptions (stored in TherapistPrescription collection)
 *   - Professional Development records
 *   - Advanced analytics
 *   - Consultations
 *
 * Mounted at: /api/v1/therapist-extended
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { stripUpdateMeta } = require('../utils/sanitize');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { assertBeneficiaryInScope } = require('../utils/beneficiaryBranchGate');

// ── Model helpers (lazy) ─────────────────────────────────────────────────────
function model(name, fallbackPath) {
  try {
    return mongoose.model(name);
  } catch (_e) {
    try {
      require(fallbackPath);
      return mongoose.model(name);
    } catch (_e2) {
      return null;
    }
  }
}

function CarePlan() {
  return (
    model('CarePlan', '../domains/care-plans/models/CarePlan') ||
    model('CarePlan', '../models/CarePlan')
  );
}

function Assessment() {
  return (
    model('Assessment', '../domains/assessments/models/Assessment') ||
    model('Assessment', '../models/Assessment')
  );
}

function ClinicalSession() {
  return model('ClinicalSession', '../domains/sessions/models/ClinicalSession');
}

// Dynamic schemas for lightweight records not yet in their own domain
function getOrCreateModel(name, schema) {
  try {
    return mongoose.model(name);
  } catch (_e) {
    return mongoose.model(name, new mongoose.Schema(schema, { timestamps: true }));
  }
}

function Prescription() {
  return getOrCreateModel('TherapistPrescription', {
    therapistId: { type: mongoose.Schema.Types.ObjectId },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId },
    medication: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    status: { type: String, default: 'active' },
    notes: String,
    isDeleted: { type: Boolean, default: false },
  });
}

function ProfessionalDev() {
  return getOrCreateModel('TherapistProfessionalDev', {
    therapistId: { type: mongoose.Schema.Types.ObjectId },
    type: String,
    title: String,
    provider: String,
    hours: Number,
    date: Date,
    certificate: String,
    status: { type: String, default: 'completed' },
    notes: String,
    isDeleted: { type: Boolean, default: false },
  });
}

function Consultation() {
  return getOrCreateModel('TherapistConsultation', {
    requestedBy: { type: mongoose.Schema.Types.ObjectId },
    consultedTherapist: { type: mongoose.Schema.Types.ObjectId },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId },
    subject: String,
    description: String,
    response: String,
    respondedAt: Date,
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'in_progress', 'resolved', 'closed'],
    },
    priority: { type: String, default: 'normal', enum: ['low', 'normal', 'high', 'urgent'] },
    isDeleted: { type: Boolean, default: false },
  });
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Helper: therapist ID from auth ───────────────────────────────────────────
function getTherapistId(req) {
  return req.user?.employeeId || req.user?.therapistId || req.user?.id || req.user?._id;
}

/* ══════════════════════ TREATMENT PLANS ════════════════════════════════════ */

router.get(
  '/treatment-plans',
  asyncHandler(async (req, res) => {
    const M = CarePlan();
    if (!M) return res.json({ success: true, data: [], total: 0 });
    const { beneficiaryId, status, limit = 20, skip = 0 } = req.query;
    const therapistId = getTherapistId(req);
    const q = { isDeleted: { $ne: true } };
    if (therapistId) q.therapistId = therapistId;
    if (beneficiaryId) q.beneficiaryId = beneficiaryId;
    if (status) q.status = status;
    const [data, total] = await Promise.all([
      M.find(q).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit)).lean(),
      M.countDocuments(q),
    ]);
    res.json({ success: true, data, total });
  })
);

router.post(
  '/treatment-plans',
  asyncHandler(async (req, res) => {
    const M = CarePlan();
    if (!M) return res.status(503).json({ success: false, message: 'CarePlan model unavailable' });
    const therapistId = getTherapistId(req);
    const plan = await M.create({ ...req.body, therapistId: req.body.therapistId || therapistId });
    res.status(201).json({ success: true, data: plan });
  })
);

router.get(
  '/treatment-plans/:planId',
  asyncHandler(async (req, res) => {
    const M = CarePlan();
    if (!M) return res.status(503).json({ success: false, message: 'CarePlan model unavailable' });
    const plan = await M.findById(req.params.planId).lean();
    if (!plan) return res.status(404).json({ success: false, message: 'Treatment plan not found' });
    res.json({ success: true, data: plan });
  })
);

router.put(
  '/treatment-plans/:planId',
  requireBranchAccess,
  asyncHandler(async (req, res) => {
    const M = CarePlan();
    if (!M) return res.status(503).json({ success: false, message: 'CarePlan model unavailable' });
    // W269 — gate cross-branch edit via the plan's beneficiary BEFORE mutating.
    // Was a bare findByIdAndUpdate(planId) → any authed therapist could edit
    // any branch's clinical care plan. assertBeneficiaryInScope no-ops for
    // cross-branch/HQ roles (empty branchFilter) and for unscoped test calls.
    const existing = await M.findById(req.params.planId).select('beneficiary').lean();
    if (!existing)
      return res.status(404).json({ success: false, message: 'Treatment plan not found' });
    const denied = await assertBeneficiaryInScope(req, existing.beneficiary, res);
    if (denied) return;
    const plan = await M.findByIdAndUpdate(
      req.params.planId,
      { $set: stripUpdateMeta(req.body) },
      { returnDocument: 'after' }
    ).lean();
    if (!plan) return res.status(404).json({ success: false, message: 'Treatment plan not found' });
    res.json({ success: true, data: plan });
  })
);

router.patch(
  '/treatment-plans/:planId/goals/:goalId',
  requireBranchAccess,
  asyncHandler(async (req, res) => {
    const M = CarePlan();
    if (!M) return res.status(503).json({ success: false, message: 'CarePlan model unavailable' });
    // W269 — gate cross-branch goal edit via the plan's beneficiary BEFORE mutating.
    const existing = await M.findById(req.params.planId).select('beneficiary').lean();
    if (!existing)
      return res.status(404).json({ success: false, message: 'Treatment plan not found' });
    const denied = await assertBeneficiaryInScope(req, existing.beneficiary, res);
    if (denied) return;
    const plan = await M.findOneAndUpdate(
      { _id: req.params.planId, 'goals._id': req.params.goalId },
      { $set: { 'goals.$': { ...stripUpdateMeta(req.body), _id: req.params.goalId } } },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: plan });
  })
);

/* ══════════════════════ ASSESSMENTS ════════════════════════════════════════ */

router.get(
  '/assessments',
  asyncHandler(async (req, res) => {
    const M = Assessment();
    if (!M) return res.json({ success: true, data: [], total: 0 });
    const { beneficiaryId, type, status, limit = 20, skip = 0 } = req.query;
    const therapistId = getTherapistId(req);
    const q = { isDeleted: { $ne: true } };
    if (therapistId) q.assessedBy = therapistId;
    if (beneficiaryId) q.beneficiaryId = beneficiaryId;
    if (type) q.type = type;
    if (status) q.status = status;
    const [data, total] = await Promise.all([
      M.find(q).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit)).lean(),
      M.countDocuments(q),
    ]);
    res.json({ success: true, data, total });
  })
);

router.post(
  '/assessments',
  asyncHandler(async (req, res) => {
    const M = Assessment();
    if (!M)
      return res.status(503).json({ success: false, message: 'Assessment model unavailable' });
    const therapistId = getTherapistId(req);
    const assessment = await M.create({
      ...req.body,
      assessedBy: req.body.assessedBy || therapistId,
    });
    res.status(201).json({ success: true, data: assessment });
  })
);

router.get(
  '/assessments/:id',
  asyncHandler(async (req, res) => {
    const M = Assessment();
    if (!M)
      return res.status(503).json({ success: false, message: 'Assessment model unavailable' });
    const assessment = await M.findById(req.params.id).lean();
    if (!assessment)
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: assessment });
  })
);

router.delete(
  '/assessments/:id',
  asyncHandler(async (req, res) => {
    const M = Assessment();
    if (!M)
      return res.status(503).json({ success: false, message: 'Assessment model unavailable' });
    await M.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });
    res.json({ success: true });
  })
);

/* ══════════════════════ PRESCRIPTIONS ══════════════════════════════════════ */

router.get(
  '/prescriptions',
  asyncHandler(async (req, res) => {
    const M = Prescription();
    const therapistId = getTherapistId(req);
    const q = { isDeleted: false };
    if (therapistId) q.therapistId = new mongoose.Types.ObjectId(String(therapistId));
    if (req.query.beneficiaryId)
      q.beneficiaryId = new mongoose.Types.ObjectId(req.query.beneficiaryId);
    const data = await M.find(q).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data, total: data.length });
  })
);

router.post(
  '/prescriptions',
  asyncHandler(async (req, res) => {
    const M = Prescription();
    const therapistId = getTherapistId(req);
    const record = await M.create({
      ...req.body,
      therapistId: req.body.therapistId || therapistId,
    });
    res.status(201).json({ success: true, data: record });
  })
);

router.put(
  '/prescriptions/:id',
  asyncHandler(async (req, res) => {
    const M = Prescription();
    const record = await M.findByIdAndUpdate(
      req.params.id,
      { $set: stripUpdateMeta(req.body) },
      { returnDocument: 'after' }
    ).lean();
    if (!record) return res.status(404).json({ success: false, message: 'Prescription not found' });
    res.json({ success: true, data: record });
  })
);

router.delete(
  '/prescriptions/:id',
  asyncHandler(async (req, res) => {
    const M = Prescription();
    await M.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });
    res.json({ success: true });
  })
);

/* ══════════════════════ PROFESSIONAL DEVELOPMENT ═══════════════════════════ */

router.get(
  '/professional-dev',
  asyncHandler(async (req, res) => {
    const M = ProfessionalDev();
    const therapistId = getTherapistId(req);
    const q = { isDeleted: false };
    if (therapistId) q.therapistId = new mongoose.Types.ObjectId(String(therapistId));
    const data = await M.find(q).sort({ date: -1 }).lean();
    res.json({ success: true, data, total: data.length });
  })
);

router.post(
  '/professional-dev',
  asyncHandler(async (req, res) => {
    const M = ProfessionalDev();
    const therapistId = getTherapistId(req);
    const record = await M.create({
      ...req.body,
      therapistId: req.body.therapistId || therapistId,
    });
    res.status(201).json({ success: true, data: record });
  })
);

router.put(
  '/professional-dev/:id',
  asyncHandler(async (req, res) => {
    const M = ProfessionalDev();
    const record = await M.findByIdAndUpdate(
      req.params.id,
      { $set: stripUpdateMeta(req.body) },
      { returnDocument: 'after' }
    ).lean();
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  })
);

router.delete(
  '/professional-dev/:id',
  asyncHandler(async (req, res) => {
    const M = ProfessionalDev();
    await M.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });
    res.json({ success: true });
  })
);

/* ══════════════════════ ANALYTICS ══════════════════════════════════════════ */

router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const S = ClinicalSession();
    const therapistId = getTherapistId(req);
    if (!S) return res.json({ success: true, data: { summary: {}, weeklyTrend: [], byType: {} } });

    const { from, to } = req.query;
    const q = { isDeleted: { $ne: true } };
    if (therapistId) q.therapistId = new mongoose.Types.ObjectId(String(therapistId));
    if (from || to) {
      q.scheduledDate = {};
      if (from) q.scheduledDate.$gte = new Date(from);
      if (to) q.scheduledDate.$lte = new Date(to);
    }

    const [byStatus, byModality, total] = await Promise.all([
      S.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      S.aggregate([{ $match: q }, { $group: { _id: '$modality', count: { $sum: 1 } } }]),
      S.countDocuments(q),
    ]);

    res.json({
      success: true,
      data: {
        summary: { total },
        sessionsByStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
        sessionsByModality: Object.fromEntries(byModality.map(r => [r._id, r.count])),
        weeklyTrend: [],
        ratingDistribution: {},
        goalStats: {},
        docQuality: {},
      },
    });
  })
);

router.get(
  '/analytics/productivity',
  asyncHandler(async (req, res) => {
    const S = ClinicalSession();
    const therapistId = getTherapistId(req);
    if (!S) return res.json({ success: true, data: {} });

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const last30 = new Date(now);
    last30.setDate(now.getDate() - 30);
    const last90 = new Date(now);
    last90.setDate(now.getDate() - 90);

    const base = {
      therapistId: new mongoose.Types.ObjectId(String(therapistId)),
      isDeleted: { $ne: true },
      status: 'completed',
    };
    const count = dateFilter => S.countDocuments({ ...base, scheduledDate: dateFilter });

    const [today, thisWeek, thisMonth, last30Days, last90Days] = await Promise.all([
      count({ $gte: todayStart }),
      count({ $gte: weekStart }),
      count({ $gte: monthStart }),
      count({ $gte: last30 }),
      count({ $gte: last90 }),
    ]);

    res.json({
      success: true,
      data: {
        today,
        thisWeek,
        thisMonth,
        last30Days,
        last90Days,
        dailyAverage: +(last30Days / 30).toFixed(1),
        weeklyAverage: +(last90Days / 13).toFixed(1),
      },
    });
  })
);

/* ══════════════════════ CONSULTATIONS ══════════════════════════════════════ */

router.get(
  '/consultations',
  asyncHandler(async (req, res) => {
    const M = Consultation();
    const therapistId = getTherapistId(req);
    const q = { isDeleted: false };
    if (therapistId) {
      const tid = new mongoose.Types.ObjectId(String(therapistId));
      q.$or = [{ requestedBy: tid }, { consultedTherapist: tid }];
    }
    if (req.query.status) q.status = req.query.status;
    const data = await M.find(q).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { consultations: data, total: data.length } });
  })
);

router.post(
  '/consultations',
  asyncHandler(async (req, res) => {
    const M = Consultation();
    const therapistId = getTherapistId(req);
    const record = await M.create({
      ...req.body,
      requestedBy: req.body.requestedBy || therapistId,
    });
    res.status(201).json({ success: true, data: record });
  })
);

router.post(
  '/consultations/:id/respond',
  asyncHandler(async (req, res) => {
    const M = Consultation();
    const record = await M.findByIdAndUpdate(
      req.params.id,
      { $set: { response: req.body.response, respondedAt: new Date(), status: 'resolved' } },
      { returnDocument: 'after' }
    ).lean();
    if (!record) return res.status(404).json({ success: false, message: 'Consultation not found' });
    res.json({ success: true, data: record });
  })
);

router.patch(
  '/consultations/:id/status',
  asyncHandler(async (req, res) => {
    const M = Consultation();
    const record = await M.findByIdAndUpdate(
      req.params.id,
      { $set: { status: req.body.status } },
      { returnDocument: 'after' }
    ).lean();
    if (!record) return res.status(404).json({ success: false, message: 'Consultation not found' });
    res.json({ success: true, data: record });
  })
);

router.delete(
  '/consultations/:id',
  asyncHandler(async (req, res) => {
    const M = Consultation();
    await M.findByIdAndUpdate(req.params.id, { $set: { isDeleted: true } });
    res.json({ success: true });
  })
);

module.exports = router;
