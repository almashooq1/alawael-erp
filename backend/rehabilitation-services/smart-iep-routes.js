/**
 * Smart IEP Routes - Priority 2
 * نظام الخطة التعليمية الفردية الذكية مع بنك الأهداف
 * Al-Awael ERP System
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import models
const { GoalsBank, SmartIEP, SessionLog } = require('../models/SmartIEP');

// Import services
const { GoalsBankService, SmartIEPService, SessionLogService } = require('./smart-iep-service');

// ─── Goals Bank Routes ─────────────────────────────────────────────────────────

/**
 * POST /goals-bank/seed
 * تهيئة بنك الأهداف المدمج (يُستخدم مرة واحدة عند الإعداد)
 */
router.post('/goals-bank/seed', async (req, res) => {
  try {
    const result = await GoalsBankService.seedBuiltInGoals();
    res.json({
      success: true,
      message: 'تم تهيئة بنك الأهداف بنجاح',
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /goals-bank/search
 * البحث في بنك الأهداف
 * Query: domain, disability_type, performance_level, keyword, limit
 */
router.get('/goals-bank/search', async (req, res) => {
  try {
    const { domain, disability_type, performance_level, keyword, limit } = req.query;
    const filters = {};
    if (domain) filters.domain = domain;
    if (disability_type) filters.disability_type = disability_type;
    if (performance_level) filters.performance_level = performance_level;
    if (keyword) filters.keyword = keyword;
    if (limit) filters.limit = parseInt(limit);

    const goals = await GoalsBankService.searchGoals(filters);
    res.json({
      success: true,
      count: goals.length,
      data: goals,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /goals-bank/suggest
 * اقتراح أهداف ذكية بناءً على نتائج التقييم
 * Body: { beneficiaryId, assessmentSummary }
 */
router.post('/goals-bank/suggest', async (req, res) => {
  try {
    const { beneficiaryId, assessmentSummary } = req.body;
    if (!assessmentSummary) {
      return res.status(400).json({ success: false, error: 'assessmentSummary مطلوب' });
    }
    const suggestions = await GoalsBankService.suggestGoalsFromAssessment(assessmentSummary);
    res.json({
      success: true,
      beneficiaryId,
      total_suggestions: suggestions.reduce((acc, d) => acc + d.suggested_goals.length, 0),
      domains: suggestions,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /goals-bank
 * جلب جميع أهداف بنك الأهداف
 */
router.get('/goals-bank', async (req, res) => {
  try {
    const goals = await GoalsBank.find({ is_active: true })
      .select(
        'goal_code goal_ar domain performance_level disability_types mastery_criteria usage_stats'
      )
      .sort({ domain: 1, goal_code: 1 });
    res.json({ success: true, count: goals.length, data: goals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /goals-bank/domains
 * جلب قائمة المجالات المتاحة
 */
router.get('/goals-bank/domains', async (req, res) => {
  try {
    const domains = await GoalsBank.distinct('domain');
    const domainLabels = {
      communication: 'التواصل',
      daily_living: 'مهارات الحياة اليومية',
      socialization: 'المهارات الاجتماعية',
      motor_skills: 'المهارات الحركية',
      cognitive: 'المهارات المعرفية',
      behavior: 'السلوك',
      play: 'مهارات اللعب',
      academic: 'المهارات الأكاديمية',
    };
    res.json({
      success: true,
      data: domains.map(d => ({ value: d, label: domainLabels[d] || d })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Smart IEP Routes ──────────────────────────────────────────────────────────

/**
 * POST /iep
 * إنشاء خطة تعليمية فردية جديدة
 * Body: { beneficiary_id, branch_id, plan_start, plan_end, team_members, present_level, services, family_involvement }
 */
router.post('/iep', async (req, res) => {
  try {
    const iepData = req.body;
    if (!iepData.beneficiary_id || !iepData.branch_id) {
      return res.status(400).json({ success: false, error: 'beneficiary_id و branch_id مطلوبان' });
    }
    const iep = await SmartIEPService.createIEP(iepData);
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الخطة التعليمية الفردية بنجاح',
      data: iep,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /iep/beneficiary/:beneficiaryId
 * جلب جميع خطط المستفيد
 */
router.get('/iep/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const ieps = await SmartIEP.find({ beneficiary_id: req.params.beneficiaryId })
      .select('iep_number plan_start plan_end status overall_progress annual_goals review_schedule')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: ieps.length, data: ieps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /iep/:id
 * جلب خطة تعليمية فردية كاملة مع التحليل
 */
router.get('/iep/:id', async (req, res) => {
  try {
    const iep = await SmartIEP.findById(req.params.id)
      .populate('beneficiary_id', 'name birth_date disability_types branch_id')
      .populate(
        'annual_goals.goal_bank_ref',
        'goal_code goal_ar mastery_criteria intervention_strategies'
      );

    if (!iep) {
      return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
    }

    // حساب التقدم الإجمالي
    const progress = await SmartIEPService.updateOverallProgress(req.params.id);

    res.json({
      success: true,
      data: {
        iep,
        progress_summary: progress,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /iep/:id
 * تحديث بيانات الخطة التعليمية الفردية
 */
router.patch('/iep/:id', async (req, res) => {
  try {
    const allowedFields = [
      'plan_end',
      'status',
      'present_level',
      'services',
      'family_involvement',
      'parent_consent',
      'iep_team',
    ];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    updates.updated_at = new Date();

    const iep = await SmartIEP.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!iep) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });

    res.json({ success: true, message: 'تم تحديث الخطة بنجاح', data: iep });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /iep/:id/goals
 * إضافة هدف سنوي للخطة التعليمية الفردية
 * Body: { goal_bank_ref, annual_goal_ar, domain, target_date, priority_level, assigned_therapist, objectives }
 */
router.post('/iep/:id/goals', async (req, res) => {
  try {
    const iep = await SmartIEP.findById(req.params.id);
    if (!iep) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });

    const goalData = req.body;
    if (!goalData.annual_goal_ar || !goalData.domain) {
      return res.status(400).json({ success: false, error: 'annual_goal_ar و domain مطلوبان' });
    }

    // إضافة الهدف
    iep.annual_goals.push({
      ...goalData,
      current_accuracy: 0,
      mastery_achieved: false,
      alerts: { plateau: false, regression: false },
    });

    await iep.save();

    // تحديث إحصائيات بنك الأهداف
    if (goalData.goal_bank_ref) {
      await GoalsBankService.updateGoalStats(goalData.goal_bank_ref, 'selected');
    }

    res.status(201).json({
      success: true,
      message: 'تم إضافة الهدف بنجاح',
      data: iep.annual_goals[iep.annual_goals.length - 1],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /iep/:id/goals/:goalId/progress
 * تحديث تقدم هدف معين
 * Body: { accuracy, notes, date, therapist_id }
 */
router.patch('/iep/:id/goals/:goalId/progress', async (req, res) => {
  try {
    const iep = await SmartIEP.findById(req.params.id);
    if (!iep) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });

    const goal = iep.annual_goals.id(req.params.goalId);
    if (!goal) return res.status(404).json({ success: false, error: 'الهدف غير موجود' });

    const { accuracy, notes, date, therapist_id } = req.body;
    if (accuracy === undefined) {
      return res.status(400).json({ success: false, error: 'accuracy مطلوب' });
    }

    // إضافة سجل تقدم
    goal.progress_log.push({
      date: date ? new Date(date) : new Date(),
      accuracy: parseFloat(accuracy),
      notes: notes || '',
      logged_by: therapist_id,
    });

    // تحديث الدقة الحالية
    goal.current_accuracy = parseFloat(accuracy);

    // تحقق من الإتقان (3 جلسات متتالية ≥ 80%)
    const recent = goal.progress_log.slice(-3);
    if (recent.length === 3 && recent.every(log => log.accuracy >= 80)) {
      goal.mastery_achieved = true;
      goal.mastery_date = new Date();
    }

    await iep.save();

    res.json({
      success: true,
      message: 'تم تحديث التقدم بنجاح',
      mastery_achieved: goal.mastery_achieved,
      current_accuracy: goal.current_accuracy,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /iep/:id/report
 * توليد تقرير تقدم شامل للخطة التعليمية الفردية
 */
router.get('/iep/:id/report', async (req, res) => {
  try {
    const report = await SmartIEPService.generateProgressReport(req.params.id);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /iep/:id/analyze
 * تحليل الخطة بالذكاء الاصطناعي
 */
router.post('/iep/:id/analyze', async (req, res) => {
  try {
    const analysis = await SmartIEPService.analyzeIEP(req.params.id);
    res.json({ success: true, data: analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /iep/:id/meetings
 * تسجيل اجتماع فريق IEP
 * Body: { meeting_type, date, attendees, discussion_points, decisions, next_review_date }
 */
router.post('/iep/:id/meetings', async (req, res) => {
  try {
    const iep = await SmartIEP.findById(req.params.id);
    if (!iep) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });

    const meetingData = req.body;
    if (!meetingData.meeting_type || !meetingData.date) {
      return res.status(400).json({ success: false, error: 'meeting_type و date مطلوبان' });
    }

    iep.meetings.push(meetingData);
    await iep.save();

    res.status(201).json({
      success: true,
      message: 'تم تسجيل الاجتماع بنجاح',
      data: iep.meetings[iep.meetings.length - 1],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Session Log Routes ─────────────────────────────────────────────────────────

/**
 * POST /sessions
 * تسجيل جلسة تدريبية جديدة
 * Body: { iep_id, beneficiary_id, session_date, duration_minutes, goals_worked, beneficiary_state, abc_records, family_communication_ar }
 */
router.post('/sessions', async (req, res) => {
  try {
    const sessionData = req.body;
    if (!sessionData.iep_id || !sessionData.beneficiary_id) {
      return res.status(400).json({ success: false, error: 'iep_id و beneficiary_id مطلوبان' });
    }
    const session = await SessionLogService.createSession(sessionData);
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الجلسة بنجاح',
      data: session,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /sessions/beneficiary/:beneficiaryId/analytics
 * تحليل جلسات المستفيد
 * Query: weeks (default: 4)
 */
router.get('/sessions/beneficiary/:beneficiaryId/analytics', async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 4;
    const analytics = await SessionLogService.getSessionAnalytics(req.params.beneficiaryId, weeks);
    res.json({ success: true, data: analytics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /sessions/beneficiary/:beneficiaryId
 * جلب سجل الجلسات للمستفيد
 * Query: limit (default: 20), skip (default: 0)
 */
router.get('/sessions/beneficiary/:beneficiaryId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    const sessions = await SessionLog.find({ beneficiary_id: req.params.beneficiaryId })
      .sort({ session_date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('therapist_id', 'name specialty');

    const total = await SessionLog.countDocuments({ beneficiary_id: req.params.beneficiaryId });

    res.json({
      success: true,
      total,
      count: sessions.length,
      data: sessions,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /sessions/:sessionId
 * جلب تفاصيل جلسة معينة
 */
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const session = await SessionLog.findById(req.params.sessionId)
      .populate('therapist_id', 'name specialty')
      .populate('iep_id', 'iep_number plan_start plan_end');

    if (!session) return res.status(404).json({ success: false, error: 'الجلسة غير موجودة' });

    // تحليل بيانات ABC إن وجدت
    let abcSummary = null;
    if (session.abc_records && session.abc_records.length > 0) {
      abcSummary = await SessionLogService.summarizeABCData(
        session.beneficiary_id,
        30 // آخر 30 يوم
      );
    }

    res.json({
      success: true,
      data: {
        session,
        abc_summary: abcSummary,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /sessions/iep/:iepId
 * جلب جميع جلسات خطة تعليمية محددة
 */
router.get('/sessions/iep/:iepId', async (req, res) => {
  try {
    const sessions = await SessionLog.find({ iep_id: req.params.iepId })
      .sort({ session_date: -1 })
      .populate('therapist_id', 'name specialty');

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /sessions/abc-analysis/:beneficiaryId
 * تحليل بيانات ABC للسلوك
 * Query: days (default: 30)
 */
router.get('/sessions/abc-analysis/:beneficiaryId', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const analysis = await SessionLogService.summarizeABCData(req.params.beneficiaryId, days);
    res.json({ success: true, data: analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── IEP Dashboard / Branch Summary ──────────────────────────────────────────

/**
 * GET /iep/branch/:branchId/summary
 * ملخص خطط IEP للفرع
 */
router.get('/iep/branch/:branchId/summary', async (req, res) => {
  try {
    const summary = await SmartIEP.aggregate([
      {
        $lookup: {
          from: 'beneficiaries',
          localField: 'beneficiary_id',
          foreignField: '_id',
          as: 'beneficiary',
        },
      },
      { $unwind: '$beneficiary' },
      {
        $match: {
          'beneficiary.branch_id': mongoose.Types.ObjectId.isValid(req.params.branchId)
            ? new mongoose.Types.ObjectId(req.params.branchId)
            : req.params.branchId,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avg_progress: { $avg: '$overall_progress.overall_percentage' },
          mastered_goals_total: { $sum: '$overall_progress.mastered_goals' },
          active_goals_total: { $sum: '$overall_progress.active_goals' },
        },
      },
    ]);

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
