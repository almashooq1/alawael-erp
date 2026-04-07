/**
 * rehab-programs-module.routes.js
 * وحدة التأهيل والبرامج — مسارات API الكاملة (البرومبت 5)
 *
 * المسارات:
 * ── البرامج ───────────────────────────────────────────────────
 *  GET    /api/rehab-module/programs
 *  POST   /api/rehab-module/programs
 *  GET    /api/rehab-module/programs/:id
 *  PUT    /api/rehab-module/programs/:id
 *  DELETE /api/rehab-module/programs/:id
 *  GET    /api/rehab-module/programs/:id/stats
 *
 * ── التسجيل ──────────────────────────────────────────────────
 *  POST   /api/rehab-module/enrollments
 *  GET    /api/rehab-module/enrollments
 *  GET    /api/rehab-module/enrollments/:id
 *  PUT    /api/rehab-module/enrollments/:id
 *  POST   /api/rehab-module/enrollments/:id/discharge
 *  POST   /api/rehab-module/enrollments/:id/extend
 *
 * ── الخطط التأهيلية ──────────────────────────────────────────
 *  POST   /api/rehab-module/plans
 *  GET    /api/rehab-module/plans
 *  GET    /api/rehab-module/plans/:id
 *  PUT    /api/rehab-module/plans/:id
 *  POST   /api/rehab-module/plans/:id/approve
 *  POST   /api/rehab-module/plans/:id/review
 *  GET    /api/rehab-module/plans/:id/progress
 *  POST   /api/rehab-module/plans/:planId/goals
 *  PUT    /api/rehab-module/plans/goals/:goalId
 *  DELETE /api/rehab-module/plans/goals/:goalId
 *
 * ── الجلسات ──────────────────────────────────────────────────
 *  POST   /api/rehab-module/sessions
 *  GET    /api/rehab-module/sessions
 *  GET    /api/rehab-module/sessions/today
 *  GET    /api/rehab-module/sessions/:id
 *  PUT    /api/rehab-module/sessions/:id
 *  DELETE /api/rehab-module/sessions/:id
 *  POST   /api/rehab-module/sessions/:id/attendance
 *  POST   /api/rehab-module/sessions/:id/goal-progress
 *  POST   /api/rehab-module/sessions/:id/complete
 *  PATCH  /api/rehab-module/sessions/:id/autosave
 *  GET    /api/rehab-module/sessions/beneficiary/:beneficiaryId/summary
 *  GET    /api/rehab-module/sessions/beneficiary/:beneficiaryId/chart
 *
 * ── الجلسات الجماعية ─────────────────────────────────────────
 *  POST   /api/rehab-module/group-sessions
 *  GET    /api/rehab-module/group-sessions
 *  GET    /api/rehab-module/group-sessions/:id
 *  PUT    /api/rehab-module/group-sessions/:id
 *
 * ── الإحالات ─────────────────────────────────────────────────
 *  POST   /api/rehab-module/referrals
 *  GET    /api/rehab-module/referrals
 *  GET    /api/rehab-module/referrals/:id
 *  PUT    /api/rehab-module/referrals/:id/review
 *
 * @module routes/rehab-programs-module.routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Program = require('../models/rehabilitation/Program');
const ProgramEnrollment = require('../models/rehabilitation/ProgramEnrollment');
const { RehabPlan, RehabPlanGoal } = require('../models/rehabilitation/RehabPlan');
const {
  RehabSession,
  SessionGoalProgress,
  GroupSession,
  ProgramReferral,
} = require('../models/rehabilitation/RehabSession');

const {
  ProgramService,
  EnrollmentService,
  RehabPlanService,
  SessionService,
} = require('../services/rehabilitation/RehabService');

const { authenticateToken } = require('../middleware/auth.middleware');
const escapeRegex = require('../utils/escapeRegex');

// ─── دوال مساعدة ──────────────────────────────────────────────────────────
const ok = (res, data, meta = {}) => res.json({ success: true, ...meta, data });
const created = (res, data) => res.status(201).json({ success: true, data });
const fail = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });
const isId = id => mongoose.Types.ObjectId.isValid(id);
const validId = (req, res, next) => {
  if (!isId(req.params.id)) return fail(res, 'معرّف غير صحيح', 400);
  next();
};

// ── جميع المسارات تتطلب مصادقة ─────────────────────────────────────────────
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// ── البرامج التأهيلية ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** GET /programs — قائمة البرامج مع فلترة */
router.get('/programs', async (req, res) => {
  try {
    const { branch_id, program_type, status, search, page = 1, limit = 20 } = req.query;

    const filter = { is_deleted: { $ne: true } };
    if (branch_id && isId(branch_id)) filter.branch_id = branch_id;
    if (program_type) filter.program_type = program_type;
    if (status) filter.status = status;
    if (search) {
      const safe = escapeRegex(String(search));
      filter.$or = [{ name_ar: new RegExp(safe, 'i') }, { name_en: new RegExp(safe, 'i') }];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [programs, total, stats] = await Promise.all([
      Program.find(filter)
        .populate('branch_id', 'name_ar code')
        .sort({ program_type: 1, name_ar: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Program.countDocuments(filter),
      ProgramService.getDashboardStats(branch_id),
    ]);

    // إضافة عدد المسجلين النشطين لكل برنامج
    const programIds = programs.map(p => p._id);
    const enrollCounts = await ProgramEnrollment.aggregate([
      { $match: { program_id: { $in: programIds }, status: 'active', is_deleted: { $ne: true } } },
      { $group: { _id: '$program_id', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    enrollCounts.forEach(e => {
      countMap[e._id.toString()] = e.count;
    });
    programs.forEach(p => {
      p.active_enrollments = countMap[p._id.toString()] || 0;
    });

    return ok(res, programs, {
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      stats,
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** POST /programs — إنشاء برنامج جديد */
router.post('/programs', async (req, res) => {
  try {
    const {
      branch_id,
      name_ar,
      name_en,
      program_type,
      description,
      objectives,
      target_disabilities,
      min_age,
      max_age,
      max_participants,
      session_duration_minutes,
      sessions_per_week,
      program_duration_months,
      max_duration_years,
      status,
    } = req.body;

    if (!branch_id || !name_ar || !program_type) {
      return fail(res, 'الفرع واسم البرنامج ونوعه مطلوبة', 422);
    }

    const program = await Program.create({
      branch_id,
      name_ar,
      name_en,
      program_type,
      description,
      objectives,
      target_disabilities,
      min_age,
      max_age,
      max_participants,
      session_duration_minutes,
      sessions_per_week,
      program_duration_months,
      max_duration_years,
      status,
      created_by: req.user?._id,
    });

    return created(res, program);
  } catch (err) {
    if (err.name === 'ValidationError')
      return fail(
        res,
        Object.values(err.errors)
          .map(e => e.message)
          .join('، '),
        422
      );
    return fail(res, err.message, 500);
  }
});

/** GET /programs/:id — تفاصيل برنامج */
router.get('/programs/:id', validId, async (req, res) => {
  try {
    const program = await Program.findOne({ _id: req.params.id, is_deleted: { $ne: true } })
      .populate('branch_id', 'name_ar code')
      .lean();

    if (!program) return fail(res, 'البرنامج غير موجود', 404);

    const stats = await ProgramService.getProgramStats(program._id);
    return ok(res, { ...program, stats });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** PUT /programs/:id — تحديث برنامج */
router.put('/programs/:id', validId, async (req, res) => {
  try {
    const allowed = [
      'name_ar',
      'name_en',
      'description',
      'objectives',
      'target_disabilities',
      'min_age',
      'max_age',
      'max_participants',
      'session_duration_minutes',
      'sessions_per_week',
      'program_duration_months',
      'max_duration_years',
      'status',
    ];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const program = await Program.findOneAndUpdate(
      { _id: req.params.id, is_deleted: { $ne: true } },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!program) return fail(res, 'البرنامج غير موجود', 404);

    return ok(res, program);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** DELETE /programs/:id — حذف برنامج (ناعم) */
router.delete('/programs/:id', validId, async (req, res) => {
  try {
    const hasActive = await ProgramEnrollment.exists({
      program_id: req.params.id,
      status: 'active',
      is_deleted: { $ne: true },
    });
    if (hasActive) return fail(res, 'لا يمكن حذف برنامج يحتوي على مستفيدين نشطين', 422);

    await Program.findByIdAndUpdate(req.params.id, {
      $set: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: req.user?._id,
        status: 'inactive',
      },
    });
    return ok(res, { deleted: true });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** GET /programs/:id/stats — إحصائيات برنامج */
router.get('/programs/:id/stats', validId, async (req, res) => {
  try {
    const stats = await ProgramService.getProgramStats(req.params.id);
    return ok(res, stats);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── التسجيل في البرامج ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** POST /enrollments — تسجيل مستفيد */
router.post('/enrollments', async (req, res) => {
  try {
    const { beneficiary_id, program_id, specialist_id, branch_id, start_date, notes } = req.body;
    if (!beneficiary_id || !program_id || !specialist_id || !start_date) {
      return fail(res, 'المستفيد والبرنامج والأخصائي وتاريخ البدء مطلوبة', 422);
    }
    const enrollment = await EnrollmentService.enrollBeneficiary(
      { beneficiary_id, program_id, specialist_id, branch_id, start_date, notes },
      req.user?._id
    );
    return created(res, enrollment);
  } catch (err) {
    return fail(
      res,
      err.message,
      err.message.includes('مسجل') || err.message.includes('القصوى') ? 422 : 500
    );
  }
});

/** GET /enrollments — قائمة التسجيلات */
router.get('/enrollments', async (req, res) => {
  try {
    const {
      beneficiary_id,
      program_id,
      specialist_id,
      branch_id,
      status,
      page = 1,
      limit = 25,
    } = req.query;

    const filter = { is_deleted: { $ne: true } };
    if (beneficiary_id && isId(beneficiary_id)) filter.beneficiary_id = beneficiary_id;
    if (program_id && isId(program_id)) filter.program_id = program_id;
    if (specialist_id && isId(specialist_id)) filter.specialist_id = specialist_id;
    if (branch_id && isId(branch_id)) filter.branch_id = branch_id;
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));

    const [enrollments, total] = await Promise.all([
      ProgramEnrollment.find(filter)
        .populate('beneficiary_id', 'firstName_ar lastName_ar name_ar nationalId')
        .populate('program_id', 'name_ar program_type')
        .populate('specialist_id', 'name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      ProgramEnrollment.countDocuments(filter),
    ]);

    return ok(res, enrollments, {
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** GET /enrollments/:id — تفاصيل تسجيل */
router.get('/enrollments/:id', validId, async (req, res) => {
  try {
    const enrollment = await ProgramEnrollment.findOne({
      _id: req.params.id,
      is_deleted: { $ne: true },
    })
      .populate('beneficiary_id', 'firstName_ar lastName_ar name_ar nationalId dateOfBirth')
      .populate('program_id', 'name_ar program_type session_duration_minutes sessions_per_week')
      .populate('specialist_id', 'name')
      .lean();

    if (!enrollment) return fail(res, 'التسجيل غير موجود', 404);
    return ok(res, enrollment);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** POST /enrollments/:id/discharge — إنهاء التسجيل */
router.post('/enrollments/:id/discharge', validId, async (req, res) => {
  try {
    const { discharge_reason, discharge_summary, progress_at_discharge } = req.body;
    if (!discharge_reason || !discharge_summary) {
      return fail(res, 'سبب الخروج وملخص التقدم مطلوبان', 422);
    }
    const enrollment = await EnrollmentService.discharge(
      req.params.id,
      { discharge_reason, discharge_summary, progress_at_discharge },
      req.user?._id
    );
    return ok(res, enrollment);
  } catch (err) {
    return fail(res, err.message, err.message.includes('غير موجود') ? 404 : 422);
  }
});

/** POST /enrollments/:id/extend — تمديد فترة التسجيل */
router.post('/enrollments/:id/extend', validId, async (req, res) => {
  try {
    const { new_end_date } = req.body;
    if (!new_end_date) return fail(res, 'تاريخ الانتهاء الجديد مطلوب', 422);
    const enrollment = await EnrollmentService.extend(req.params.id, new_end_date);
    return ok(res, enrollment);
  } catch (err) {
    return fail(res, err.message, 422);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── الخطط التأهيلية الفردية ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** POST /plans — إنشاء خطة جديدة */
router.post('/plans', async (req, res) => {
  try {
    const { beneficiary_id, program_id, specialist_id, plan_type, start_date } = req.body;
    if (!beneficiary_id || !program_id || !specialist_id || !plan_type || !start_date) {
      return fail(res, 'المستفيد والبرنامج والأخصائي ونوع الخطة وتاريخ البدء مطلوبة', 422);
    }
    const result = await RehabPlanService.createPlan(req.body, req.user?._id);
    return created(res, result);
  } catch (err) {
    if (err.name === 'ValidationError')
      return fail(
        res,
        Object.values(err.errors)
          .map(e => e.message)
          .join('، '),
        422
      );
    return fail(res, err.message, 500);
  }
});

/** GET /plans — قائمة الخطط */
router.get('/plans', async (req, res) => {
  try {
    const {
      beneficiary_id,
      program_id,
      specialist_id,
      status,
      needs_review,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { is_deleted: { $ne: true } };
    if (beneficiary_id && isId(beneficiary_id)) filter.beneficiary_id = beneficiary_id;
    if (program_id && isId(program_id)) filter.program_id = program_id;
    if (specialist_id && isId(specialist_id)) filter.specialist_id = specialist_id;
    if (status) filter.status = status;
    if (needs_review === 'true') {
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      filter.next_review_date = { $lte: weekFromNow };
      filter.status = 'active';
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));

    const [plans, total] = await Promise.all([
      RehabPlan.find(filter)
        .populate('beneficiary_id', 'firstName_ar lastName_ar name_ar')
        .populate('program_id', 'name_ar program_type')
        .populate('specialist_id', 'name')
        .sort({ start_date: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      RehabPlan.countDocuments(filter),
    ]);

    // عدد الأهداف لكل خطة
    const planIds = plans.map(p => p._id);
    const goalCounts = await RehabPlanGoal.aggregate([
      { $match: { plan_id: { $in: planIds } } },
      {
        $group: {
          _id: '$plan_id',
          count: { $sum: 1 },
          mastered: { $sum: { $cond: [{ $eq: ['$status', 'mastered'] }, 1, 0] } },
        },
      },
    ]);
    const goalMap = {};
    goalCounts.forEach(g => {
      goalMap[g._id.toString()] = g;
    });
    plans.forEach(p => {
      p.goals_summary = goalMap[p._id.toString()] || { count: 0, mastered: 0 };
    });

    return ok(res, plans, {
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** GET /plans/:id — تفاصيل خطة مع الأهداف */
router.get('/plans/:id', validId, async (req, res) => {
  try {
    const plan = await RehabPlan.findOne({ _id: req.params.id, is_deleted: { $ne: true } })
      .populate('beneficiary_id', 'firstName_ar lastName_ar name_ar dateOfBirth')
      .populate('program_id', 'name_ar program_type')
      .populate('specialist_id', 'name')
      .populate('approved_by', 'name')
      .lean();

    if (!plan) return fail(res, 'الخطة غير موجودة', 404);

    const goals = await RehabPlanGoal.find({ plan_id: plan._id }).sort({ sort_order: 1 }).lean();
    const progress = await RehabPlanService.calcOverallProgress(plan._id);

    return ok(res, { ...plan, goals, overall_progress: progress });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** PUT /plans/:id — تحديث خطة */
router.put('/plans/:id', validId, async (req, res) => {
  try {
    const allowed = [
      'title',
      'description',
      'start_date',
      'end_date',
      'review_date',
      'next_review_date',
      'current_level_summary',
      'baseline_summary',
      'objectives_summary',
      'family_goals',
      'parent_involvement_notes',
      'home_program_instructions',
      'specialist_notes',
    ];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    updates.updated_by = req.user?._id;

    const plan = await RehabPlan.findOneAndUpdate(
      { _id: req.params.id, is_deleted: { $ne: true } },
      { $set: updates },
      { new: true }
    );
    if (!plan) return fail(res, 'الخطة غير موجودة', 404);

    return ok(res, plan);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** POST /plans/:id/approve — اعتماد الخطة */
router.post('/plans/:id/approve', validId, async (req, res) => {
  try {
    const plan = await RehabPlan.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'approved', approved_by: req.user?._id, approved_at: new Date() } },
      { new: true }
    );
    if (!plan) return fail(res, 'الخطة غير موجودة', 404);
    return ok(res, plan);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** POST /plans/:id/review — مراجعة الخطة وإنشاء نسخة جديدة */
router.post('/plans/:id/review', validId, async (req, res) => {
  try {
    const newPlan = await RehabPlanService.reviewAndCreateNewVersion(
      req.params.id,
      req.body,
      req.user?._id
    );
    return created(res, newPlan);
  } catch (err) {
    return fail(res, err.message, err.message.includes('موجودة') ? 404 : 500);
  }
});

/** GET /plans/:id/progress — نسبة التقدم الكلية للخطة */
router.get('/plans/:id/progress', validId, async (req, res) => {
  try {
    const progress = await RehabPlanService.calcOverallProgress(req.params.id);
    return ok(res, progress);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** POST /plans/:planId/goals — إضافة هدف للخطة */
router.post('/plans/:planId/goals', async (req, res) => {
  try {
    const { planId } = req.params;
    if (!isId(planId)) return fail(res, 'معرّف الخطة غير صحيح', 400);

    const plan = await RehabPlan.findById(planId);
    if (!plan) return fail(res, 'الخطة غير موجودة', 404);

    const count = await RehabPlanGoal.countDocuments({ plan_id: planId });
    const goal = await RehabPlanGoal.create({
      ...req.body,
      plan_id: planId,
      sort_order: count + 1,
      status: 'not_started',
      baseline_date: req.body.baseline_date || new Date(),
    });

    return created(res, goal);
  } catch (err) {
    if (err.name === 'ValidationError')
      return fail(
        res,
        Object.values(err.errors)
          .map(e => e.message)
          .join('، '),
        422
      );
    return fail(res, err.message, 500);
  }
});

/** PUT /plans/goals/:goalId — تحديث هدف */
router.put('/plans/goals/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    if (!isId(goalId)) return fail(res, 'معرّف الهدف غير صحيح', 400);

    const allowed = [
      'description_ar',
      'description_en',
      'measurement_criteria',
      'measurement_method',
      'target_level',
      'target_date',
      'mastery_criteria',
      'status',
      'status_changed_reason',
      'priority',
      'sort_order',
      'notes',
    ];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    if (updates.status) updates.status_changed_at = new Date();

    const goal = await RehabPlanGoal.findByIdAndUpdate(
      goalId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!goal) return fail(res, 'الهدف غير موجود', 404);

    return ok(res, goal);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** DELETE /plans/goals/:goalId — حذف هدف */
router.delete('/plans/goals/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    if (!isId(goalId)) return fail(res, 'معرّف الهدف غير صحيح', 400);

    const goal = await RehabPlanGoal.findByIdAndDelete(goalId);
    if (!goal) return fail(res, 'الهدف غير موجود', 404);

    return ok(res, { deleted: true });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── الجلسات التأهيلية ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** GET /sessions/today — جدول جلسات اليوم للأخصائي */
router.get('/sessions/today', async (req, res) => {
  try {
    const specialistId = req.query.specialist_id || req.user?._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await RehabSession.find({
      specialist_id: specialistId,
      date: { $gte: today, $lt: tomorrow },
      is_deleted: { $ne: true },
    })
      .populate('beneficiary_id', 'firstName_ar lastName_ar name_ar nationalId')
      .populate('program_id', 'name_ar program_type')
      .populate({
        path: 'plan_id',
        select: 'plan_number status',
      })
      .sort({ start_time: 1 })
      .lean();

    const stats = {
      total: sessions.length,
      completed: sessions.filter(s => s.status === 'completed').length,
      pending: sessions.filter(s => s.status === 'draft').length,
      absent: sessions.filter(s => s.attendance_status === 'absent').length,
    };

    return ok(res, sessions, { stats, date: today.toISOString().split('T')[0] });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** GET /sessions — قائمة الجلسات مع فلترة */
router.get('/sessions', async (req, res) => {
  try {
    const {
      branch_id,
      specialist_id,
      beneficiary_id,
      program_id,
      attendance_status,
      status,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 25,
    } = req.query;

    const filter = { is_deleted: { $ne: true } };
    if (branch_id && isId(branch_id)) filter.branch_id = branch_id;
    if (specialist_id && isId(specialist_id)) filter.specialist_id = specialist_id;
    if (beneficiary_id && isId(beneficiary_id)) filter.beneficiary_id = beneficiary_id;
    if (program_id && isId(program_id)) filter.program_id = program_id;
    if (attendance_status) filter.attendance_status = attendance_status;
    if (status) filter.status = status;
    if (date_from || date_to) {
      filter.date = {};
      if (date_from) filter.date.$gte = new Date(date_from);
      if (date_to) filter.date.$lte = new Date(date_to);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));

    const [sessions, total] = await Promise.all([
      RehabSession.find(filter)
        .populate('beneficiary_id', 'firstName_ar lastName_ar name_ar')
        .populate('specialist_id', 'name')
        .populate('program_id', 'name_ar program_type')
        .sort({ date: -1, start_time: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      RehabSession.countDocuments(filter),
    ]);

    return ok(res, sessions, {
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** POST /sessions — إنشاء جلسة جديدة */
router.post('/sessions', async (req, res) => {
  try {
    const { beneficiary_id, specialist_id, program_id, date, attendance_status } = req.body;
    if (!beneficiary_id || !specialist_id || !program_id || !date || !attendance_status) {
      return fail(res, 'المستفيد والأخصائي والبرنامج والتاريخ وحالة الحضور مطلوبة', 422);
    }
    const session = await SessionService.createSession(req.body, req.user?._id);
    return created(res, session);
  } catch (err) {
    if (err.name === 'ValidationError')
      return fail(
        res,
        Object.values(err.errors)
          .map(e => e.message)
          .join('، '),
        422
      );
    return fail(res, err.message, 500);
  }
});

/** GET /sessions/:id — تفاصيل جلسة */
router.get('/sessions/:id', validId, async (req, res) => {
  try {
    const session = await RehabSession.findOne({ _id: req.params.id, is_deleted: { $ne: true } })
      .populate('beneficiary_id', 'firstName_ar lastName_ar name_ar dateOfBirth')
      .populate('specialist_id', 'name')
      .populate('program_id', 'name_ar program_type')
      .populate('signed_by', 'name')
      .lean();

    if (!session) return fail(res, 'الجلسة غير موجودة', 404);

    // تقدم الأهداف في هذه الجلسة
    const goalProgress = await SessionGoalProgress.find({ session_id: session._id })
      .populate('goal_id', 'description_ar domain mastery_percentage status')
      .lean();

    // الجلسة السابقة للمقارنة
    const prevSession = await RehabSession.findOne({
      beneficiary_id: session.beneficiary_id,
      program_id: session.program_id,
      date: { $lt: session.date },
      status: 'completed',
      is_deleted: { $ne: true },
    })
      .sort({ date: -1 })
      .select('date session_number attendance_status progress_notes')
      .lean();

    return ok(res, { ...session, goal_progress: goalProgress, previous_session: prevSession });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** PUT /sessions/:id — تحديث جلسة */
router.put('/sessions/:id', validId, async (req, res) => {
  try {
    const allowed = [
      'objectives_worked_on',
      'activities_performed',
      'materials_used',
      'beneficiary_response',
      'progress_notes',
      'next_session_plan',
      'parent_feedback_notes',
      'behavioral_observations',
      'mood',
      'energy_level',
      'cooperation_level',
    ];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const session = await RehabSession.findOneAndUpdate(
      { _id: req.params.id, is_deleted: { $ne: true } },
      { $set: updates },
      { new: true }
    );
    if (!session) return fail(res, 'الجلسة غير موجودة', 404);

    // تحديث تقدم الأهداف إذا وُجد
    if (req.body.goals?.length > 0) {
      await SessionService.recordGoalProgress(session._id, req.body.goals);
    }

    return ok(res, session);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** DELETE /sessions/:id — حذف جلسة */
router.delete('/sessions/:id', validId, async (req, res) => {
  try {
    const session = await RehabSession.findOne({ _id: req.params.id, status: 'draft' });
    if (!session) return fail(res, 'الجلسة غير موجودة أو لا يمكن حذفها (مكتملة)', 422);

    await RehabSession.findByIdAndUpdate(req.params.id, {
      $set: { is_deleted: true, deleted_at: new Date() },
    });
    return ok(res, { deleted: true });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** POST /sessions/:id/attendance — تسجيل الحضور */
router.post('/sessions/:id/attendance', validId, async (req, res) => {
  try {
    const { attendance_status, absence_reason } = req.body;
    if (!attendance_status) return fail(res, 'حالة الحضور مطلوبة', 422);
    if (['absent', 'excused', 'cancelled'].includes(attendance_status) && !absence_reason) {
      return fail(res, 'سبب الغياب مطلوب', 422);
    }
    const session = await SessionService.recordAttendance(req.params.id, {
      attendance_status,
      absence_reason,
    });
    return ok(res, session);
  } catch (err) {
    return fail(res, err.message, err.message.includes('غير موجودة') ? 404 : 500);
  }
});

/** POST /sessions/:id/goal-progress — تسجيل تقدم الأهداف */
router.post('/sessions/:id/goal-progress', validId, async (req, res) => {
  try {
    const { goals } = req.body;
    if (!goals?.length) return fail(res, 'بيانات تقدم الأهداف مطلوبة', 422);

    const session = await RehabSession.findById(req.params.id);
    if (!session) return fail(res, 'الجلسة غير موجودة', 404);

    const result = await SessionService.recordGoalProgress(req.params.id, goals);
    return ok(res, result);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** POST /sessions/:id/complete — إتمام الجلسة */
router.post('/sessions/:id/complete', validId, async (req, res) => {
  try {
    const { progress_notes, next_session_plan, parent_feedback_notes } = req.body;
    if (!progress_notes) return fail(res, 'ملاحظات التقدم مطلوبة', 422);

    const session = await SessionService.completeSession(
      req.params.id,
      { progress_notes, next_session_plan, parent_feedback_notes },
      req.user?._id
    );
    return ok(res, session);
  } catch (err) {
    return fail(res, err.message, err.message.includes('غير موجودة') ? 404 : 500);
  }
});

/** PATCH /sessions/:id/autosave — حفظ تلقائي */
router.patch('/sessions/:id/autosave', validId, async (req, res) => {
  try {
    const allowed = [
      'objectives_worked_on',
      'activities_performed',
      'materials_used',
      'beneficiary_response',
      'progress_notes',
      'behavioral_observations',
      'mood',
      'energy_level',
      'cooperation_level',
    ];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    await RehabSession.findByIdAndUpdate(req.params.id, { $set: updates });
    return res.json({ success: true, saved: true, saved_at: new Date().toISOString() });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** GET /sessions/beneficiary/:beneficiaryId/summary — ملخص جلسات مستفيد */
router.get('/sessions/beneficiary/:beneficiaryId/summary', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!isId(beneficiaryId)) return fail(res, 'معرّف المستفيد غير صحيح', 400);

    const summary = await SessionService.getBeneficiarySummary(beneficiaryId);
    return ok(res, summary);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** GET /sessions/beneficiary/:beneficiaryId/chart — رسم بياني للتقدم */
router.get('/sessions/beneficiary/:beneficiaryId/chart', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!isId(beneficiaryId)) return fail(res, 'معرّف المستفيد غير صحيح', 400);

    const chart = await SessionService.getGoalProgressChart(
      beneficiaryId,
      req.query.program_id || null
    );
    return ok(res, chart);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── الجلسات الجماعية ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** POST /group-sessions — إنشاء جلسة جماعية */
router.post('/group-sessions', async (req, res) => {
  try {
    const { program_id, specialist_id, session_date } = req.body;
    if (!program_id || !specialist_id || !session_date) {
      return fail(res, 'البرنامج والأخصائي والتاريخ مطلوبة', 422);
    }
    const session = await GroupSession.create({ ...req.body, created_by: req.user?._id });
    return created(res, session);
  } catch (err) {
    if (err.name === 'ValidationError')
      return fail(
        res,
        Object.values(err.errors)
          .map(e => e.message)
          .join('، '),
        422
      );
    return fail(res, err.message, 500);
  }
});

/** GET /group-sessions — قائمة الجلسات الجماعية */
router.get('/group-sessions', async (req, res) => {
  try {
    const { program_id, branch_id, status, date_from, date_to, page = 1, limit = 20 } = req.query;

    const filter = { is_deleted: { $ne: true } };
    if (program_id && isId(program_id)) filter.program_id = program_id;
    if (branch_id && isId(branch_id)) filter.branch_id = branch_id;
    if (status) filter.status = status;
    if (date_from || date_to) {
      filter.session_date = {};
      if (date_from) filter.session_date.$gte = new Date(date_from);
      if (date_to) filter.session_date.$lte = new Date(date_to);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));

    const [sessions, total] = await Promise.all([
      GroupSession.find(filter)
        .populate('program_id', 'name_ar program_type')
        .populate('specialist_id', 'name')
        .sort({ session_date: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      GroupSession.countDocuments(filter),
    ]);

    return ok(res, sessions, {
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** GET /group-sessions/:id — تفاصيل جلسة جماعية */
router.get('/group-sessions/:id', validId, async (req, res) => {
  try {
    const session = await GroupSession.findOne({ _id: req.params.id, is_deleted: { $ne: true } })
      .populate('program_id', 'name_ar program_type')
      .populate('specialist_id', 'name')
      .populate('participants', 'firstName_ar lastName_ar name_ar')
      .lean();

    if (!session) return fail(res, 'الجلسة الجماعية غير موجودة', 404);
    return ok(res, session);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** PUT /group-sessions/:id — تحديث جلسة جماعية */
router.put('/group-sessions/:id', validId, async (req, res) => {
  try {
    const allowed = [
      'topic_ar',
      'topic_en',
      'description',
      'objectives',
      'participants',
      'max_participants',
      'attendance',
      'activities_performed',
      'materials_used',
      'observations',
      'outcomes',
      'status',
    ];
    const updates = {};
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const session = await GroupSession.findOneAndUpdate(
      { _id: req.params.id, is_deleted: { $ne: true } },
      { $set: updates },
      { new: true }
    );
    if (!session) return fail(res, 'الجلسة الجماعية غير موجودة', 404);

    return ok(res, session);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ── الإحالات بين البرامج ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/** POST /referrals — إنشاء إحالة */
router.post('/referrals', async (req, res) => {
  try {
    const { beneficiary_id, to_program_id, reason } = req.body;
    if (!beneficiary_id || !to_program_id || !reason) {
      return fail(res, 'المستفيد والبرنامج المحال إليه والسبب مطلوبة', 422);
    }
    const referral = await ProgramReferral.create({
      ...req.body,
      referred_by: req.user?._id,
    });
    return created(res, referral);
  } catch (err) {
    if (err.name === 'ValidationError')
      return fail(
        res,
        Object.values(err.errors)
          .map(e => e.message)
          .join('، '),
        422
      );
    return fail(res, err.message, 500);
  }
});

/** GET /referrals — قائمة الإحالات */
router.get('/referrals', async (req, res) => {
  try {
    const { beneficiary_id, status, priority, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (beneficiary_id && isId(beneficiary_id)) filter.beneficiary_id = beneficiary_id;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));

    const [referrals, total] = await Promise.all([
      ProgramReferral.find(filter)
        .populate('beneficiary_id', 'firstName_ar lastName_ar name_ar')
        .populate('from_program_id', 'name_ar program_type')
        .populate('to_program_id', 'name_ar program_type')
        .populate('referred_by', 'name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      ProgramReferral.countDocuments(filter),
    ]);

    return ok(res, referrals, {
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** GET /referrals/:id — تفاصيل إحالة */
router.get('/referrals/:id', validId, async (req, res) => {
  try {
    const referral = await ProgramReferral.findById(req.params.id)
      .populate('beneficiary_id', 'firstName_ar lastName_ar name_ar')
      .populate('from_program_id', 'name_ar program_type')
      .populate('to_program_id', 'name_ar program_type')
      .populate('referred_by', 'name')
      .populate('reviewed_by', 'name')
      .lean();

    if (!referral) return fail(res, 'الإحالة غير موجودة', 404);
    return ok(res, referral);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

/** PUT /referrals/:id/review — مراجعة الإحالة (قبول/رفض) */
router.put('/referrals/:id/review', validId, async (req, res) => {
  try {
    const { status, review_notes, rejection_reason } = req.body;
    if (!status || !['accepted', 'rejected', 'cancelled'].includes(status)) {
      return fail(res, 'الحالة يجب أن تكون accepted أو rejected أو cancelled', 422);
    }
    if (status === 'rejected' && !rejection_reason) {
      return fail(res, 'سبب الرفض مطلوب', 422);
    }

    const referral = await ProgramReferral.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          reviewed_by: req.user?._id,
          reviewed_at: new Date(),
          review_notes,
          rejection_reason: status === 'rejected' ? rejection_reason : undefined,
        },
      },
      { new: true }
    );
    if (!referral) return fail(res, 'الإحالة غير موجودة', 404);

    return ok(res, referral);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;
