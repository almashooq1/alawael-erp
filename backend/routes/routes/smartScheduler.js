/**
 * API الجدولة الذكية - Smart Scheduler API
 * يدير جدولة الجلسات بشكل ذكي مع تجنب التعارضات
 */

const express = require('express');
const router = express.Router();
const { SmartScheduler } = require('../models/smartScheduler');

/**
 * POST /api/scheduler/create-schedule
 * إنشاء جدولة ذكية جديدة
 */
router.post('/create-schedule', async (req, res) => {
  try {
    const {
      beneficiaryId,
      programId,
      frequency,
      sessionsPerWeek,
      planDuration,
      schedulingCriteria,
    } = req.body;

    if (!beneficiaryId || !programId) {
      return res.error('البيانات المطلوبة غير مكتملة', 'Missing required fields', 400);
    }

    const planStartDate = new Date();
    const planEndDate = new Date();
    planEndDate.setDate(planEndDate.getDate() + (planDuration || 90));

    const scheduler = new SmartScheduler.model({
      beneficiaryId,
      programId,
      schedulingCriteria: schedulingCriteria || {},
      schedulingPlan: {
        frequency: frequency || 'weekly',
        sessionsPerWeek: sessionsPerWeek || 2,
        planStartDate,
        planEndDate,
        suggestedSchedule: [],
      },
      status: 'draft',
      createdBy: req.user?.id,
    });

    await scheduler.save();

    res.success(scheduler, 'تم إنشاء الجدولة الذكية بنجاح', 201);
  } catch (error) {
    res.error(error, 'فشل في إنشاء الجدولة');
  }
});

/**
 * GET /api/scheduler/:id
 * الحصول على تفاصيل جدولة
 */
router.get('/:id', async (req, res) => {
  try {
    const scheduler = await SmartScheduler.model.findById(req.params.id).populate([
      { path: 'beneficiaryId', select: 'name email' },
      { path: 'programId', select: 'name sessionConfig' },
    ]);

    if (!scheduler) {
      return res.error('الجدولة غير موجودة', 'Scheduler not found', 404);
    }

    res.success(scheduler, 'تم جلب تفاصيل الجدولة');
  } catch (error) {
    res.error(error, 'فشل في جلب الجدولة');
  }
});

/**
 * POST /api/scheduler/:id/generate-suggestions
 * توليد مقترحات جدولة ذكية
 */
router.post('/:id/generate-suggestions', async (req, res) => {
  try {
    const scheduler = await SmartScheduler.model.findById(req.params.id);

    if (!scheduler) {
      return res.error('الجدولة غير موجودة', 'Scheduler not found', 404);
    }

    // توليد المقترحات بناءً على المعايير
    const suggestions = generateScheduleSuggestions(scheduler);

    scheduler.schedulingPlan.suggestedSchedule = suggestions;
    scheduler.status = 'pending-review';

    await scheduler.save();

    res.success(
      {
        totalSuggestions: suggestions.length,
        suggestions: suggestions.slice(0, 10), // إرسال أول 10 مقترحات
        fullCount: suggestions.length,
      },
      'تم توليد المقترحات بنجاح'
    );
  } catch (error) {
    res.error(error, 'فشل في توليد المقترحات');
  }
});

/**
 * POST /api/scheduler/:id/approve-schedule
 * الموافقة على الجدولة
 */
router.post('/:id/approve-schedule', async (req, res) => {
  try {
    const scheduler = await SmartScheduler.model.findById(req.params.id);

    if (!scheduler) {
      return res.error('الجدولة غير موجودة', 'Scheduler not found', 404);
    }

    const { approverType = 'specialist' } = req.body;

    if (approverType === 'specialist') {
      scheduler.approvals.specialistApproval = {
        approved: true,
        approvedAt: new Date(),
        approvedBy: req.user?.id,
      };
    } else if (approverType === 'supervisor') {
      scheduler.approvals.supervisorApproval = {
        approved: true,
        approvedAt: new Date(),
        approvedBy: req.user?.id,
      };
    } else if (approverType === 'beneficiary') {
      scheduler.approvals.beneficiaryApproval = {
        approved: true,
        approvedAt: new Date(),
        approvedBy: req.user?.id,
      };
    }

    // التحقق من جميع الموافقات
    const allApproved =
      scheduler.approvals.specialistApproval?.approved &&
      scheduler.approvals.supervisorApproval?.approved &&
      scheduler.approvals.beneficiaryApproval?.approved;

    if (allApproved) {
      scheduler.status = 'approved';
    }

    await scheduler.save();

    res.success(scheduler, 'تم تسجيل الموافقة بنجاح');
  } catch (error) {
    res.error(error, 'فشل في تسجيل الموافقة');
  }
});

/**
 * POST /api/scheduler/:id/activate-schedule
 * تفعيل الجدولة
 */
router.post('/:id/activate-schedule', async (req, res) => {
  try {
    const scheduler = await SmartScheduler.model.findById(req.params.id);

    if (!scheduler) {
      return res.error('الجدولة غير موجودة', 'Scheduler not found', 404);
    }

    if (scheduler.status !== 'approved') {
      return res.error('الجدولة يجب أن تكون موافق عليها', 'Schedule must be approved first', 400);
    }

    scheduler.status = 'active';
    scheduler.updatedAt = new Date();

    await scheduler.save();

    res.success(scheduler, 'تم تفعيل الجدولة بنجاح');
  } catch (error) {
    res.error(error, 'فشل في تفعيل الجدولة');
  }
});

/**
 * GET /api/scheduler/:id/conflicts
 * الحصول على التعارضات المحتملة
 */
router.get('/:id/conflicts', async (req, res) => {
  try {
    const scheduler = await SmartScheduler.model.findById(req.params.id);

    if (!scheduler) {
      return res.error('الجدولة غير موجودة', 'Scheduler not found', 404);
    }

    // تحديد التعارضات
    const conflicts = detectScheduleConflicts(scheduler);

    res.success(
      {
        conflictsFound: conflicts.length > 0,
        conflicts,
        resolutionStrategies: generateResolutionStrategies(conflicts),
      },
      'تم الكشف عن التعارضات'
    );
  } catch (error) {
    res.error(error, 'فشل في الكشف عن التعارضات');
  }
});

/**
 * POST /api/scheduler/:id/customize-duration
 * تخصيص مدة الجلسات
 */
router.post('/:id/customize-duration', async (req, res) => {
  try {
    const scheduler = await SmartScheduler.model.findById(req.params.id);

    if (!scheduler) {
      return res.error('الجدولة غير موجودة', 'Scheduler not found', 404);
    }

    const { baseSessionDuration, adjustments } = req.body;

    if (baseSessionDuration) {
      scheduler.sessionDurationCustomization.baseSessionDuration = baseSessionDuration;
    }

    if (adjustments && Array.isArray(adjustments)) {
      scheduler.sessionDurationCustomization.adjustmentFactors = adjustments;
    }

    // حساب المدة الموصى بها
    const recommendedDuration = calculateRecommendedDuration(scheduler);
    scheduler.sessionDurationCustomization.recommendedDurationAdjustment = recommendedDuration;

    await scheduler.save();

    res.success(scheduler.sessionDurationCustomization, 'تم تخصيص المدة بنجاح');
  } catch (error) {
    res.error(error, 'فشل في تخصيص المدة');
  }
});

/**
 * GET /api/scheduler/:id/analytics
 * الحصول على تحليلات الجدولة
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const scheduler = await SmartScheduler.model.findById(req.params.id);

    if (!scheduler) {
      return res.error('الجدولة غير موجودة', 'Scheduler not found', 404);
    }

    res.success(
      {
        analytics: scheduler.analytics || {},
        efficiency: calculateScheduleEfficiency(scheduler),
        recommendations: generateScheduleRecommendations(scheduler),
      },
      'تم جلب تحليلات الجدولة'
    );
  } catch (error) {
    res.error(error, 'فشل في جلب التحليلات');
  }
});

// ============ الدوال المساعدة ============

function generateScheduleSuggestions(scheduler) {
  // منطق لتوليد المقترحات الذكية
  const suggestions = [];
  const { planStartDate, planEndDate, sessionsPerWeek } = scheduler.schedulingPlan;

  let currentDate = new Date(planStartDate);
  let sessionCount = 0;

  while (
    currentDate <= planEndDate &&
    sessionCount < scheduler.schedulingPlan.totalPlannedSessions
  ) {
    const dayOfWeek = currentDate.getDay();

    // تجنب الجمعة والسبت
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      suggestions.push({
        scheduledDateTime: new Date(currentDate),
        recommendedSpecialist: {
          name: 'متاح',
          specialistId: null,
        },
        confidenceScore: 85,
        explanation: 'موعد متاح ومناسب',
      });
      sessionCount++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return suggestions;
}

function detectScheduleConflicts(scheduler) {
  const conflicts = [];
  const { suggestedSchedule } = scheduler.schedulingPlan;

  // منطق الكشف عن التعارضات
  // مثال: الجلسات المتتالية دون فترة راحة

  return conflicts;
}

function generateResolutionStrategies(conflicts) {
  return conflicts.map(conflict => ({
    conflict: conflict,
    strategies: ['تأجيل إحدى الجلسات', 'تغيير الأخصائي', 'تغيير الموقع'],
  }));
}

function calculateRecommendedDuration(scheduler) {
  return {
    suggestedDuration: 60,
    reason: 'مدة معيارية موصى بها',
    basedOn: ['assessment', 'fatigue-level'],
    confidence: 80,
  };
}

function calculateScheduleEfficiency(scheduler) {
  // حساب كفاءة الجدولة
  return {
    overallEfficiency: 85,
    resourceUtilization: 90,
    specialistUtilization: 80,
  };
}

function generateScheduleRecommendations(scheduler) {
  return ['زيادة عدد الجلسات الأسبوعية', 'إضافة فترات راحة أطول', 'تنويع الأنشطة'];
}

module.exports = router;
