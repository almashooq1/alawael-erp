/**
 * RehabService.js — خدمات وحدة التأهيل والبرامج
 * Rehabilitation & Programs Module Business Logic
 *
 * يشمل: ProgramService, EnrollmentService, RehabPlanService, SessionService
 */

'use strict';

const Program = require('../../models/rehabilitation/Program');
const ProgramEnrollment = require('../../models/rehabilitation/ProgramEnrollment');
const { RehabPlan, RehabPlanGoal } = require('../../models/rehabilitation/RehabPlan');
const {
  RehabSession,
  SessionGoalProgress,
  GroupSession,
  ProgramReferral,
} = require('../../models/rehabilitation/RehabSession');

const logger = require('../../utils/logger');

// ════════════════════════════════════════════════════════════════
// ProgramService — إدارة البرامج التأهيلية
// ════════════════════════════════════════════════════════════════
class ProgramService {
  /**
   * إحصائيات لوحة التحكم
   */
  static async getDashboardStats(branchId) {
    const match = { is_deleted: { $ne: true } };
    if (branchId) match.branch_id = branchId;

    const [programs, enrollments] = await Promise.all([
      Program.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      ProgramEnrollment.aggregate([
        { $match: { is_deleted: { $ne: true }, status: 'active' } },
        {
          $group: {
            _id: '$program_id',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = { active: 0, inactive: 0, archived: 0, total: 0, total_enrollments: 0 };
    programs.forEach(p => {
      stats[p._id] = p.count;
      stats.total += p.count;
    });
    stats.total_enrollments = enrollments.reduce((s, e) => s + e.count, 0);

    return stats;
  }

  /**
   * إحصائيات برنامج واحد
   */
  static async getProgramStats(programId) {
    const [enrollStats, sessionStats] = await Promise.all([
      ProgramEnrollment.aggregate([
        { $match: { program_id: programId, is_deleted: { $ne: true } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avg_attendance: { $avg: '$sessions_attended' },
          },
        },
      ]),
      RehabSession.aggregate([
        { $match: { program_id: programId, is_deleted: { $ne: true } } },
        {
          $group: {
            _id: '$attendance_status',
            count: { $sum: 1 },
            total_minutes: { $sum: '$actual_duration_minutes' },
          },
        },
      ]),
    ]);

    return { enrollments: enrollStats, sessions: sessionStats };
  }
}

// ════════════════════════════════════════════════════════════════
// EnrollmentService — إدارة التسجيل في البرامج
// ════════════════════════════════════════════════════════════════
class EnrollmentService {
  /**
   * تسجيل مستفيد في برنامج
   */
  static async enrollBeneficiary(data, enrolledByUserId) {
    const program = await Program.findById(data.program_id);
    if (!program || program.is_deleted) {
      throw new Error('البرنامج غير موجود أو محذوف');
    }
    if (program.status !== 'active') {
      throw new Error('البرنامج غير نشط');
    }

    // التحقق من السعة
    const activeCount = await ProgramEnrollment.countDocuments({
      program_id: data.program_id,
      status: 'active',
      is_deleted: { $ne: true },
    });
    if (activeCount >= program.max_participants) {
      throw new Error(`البرنامج وصل للسعة القصوى (${program.max_participants} مستفيد)`);
    }

    // التحقق من عدم وجود تسجيل نشط مكرر
    const existing = await ProgramEnrollment.findOne({
      beneficiary_id: data.beneficiary_id,
      program_id: data.program_id,
      status: 'active',
      is_deleted: { $ne: true },
    });
    if (existing) {
      throw new Error('المستفيد مسجل بالفعل في هذا البرنامج');
    }

    // حساب تاريخ الانتهاء المتوقع
    const startDate = new Date(data.start_date);
    const durationMonths = program.program_duration_months || 12;
    const maxYears = program.max_duration_years || 3;

    const expectedEnd = new Date(startDate);
    expectedEnd.setMonth(expectedEnd.getMonth() + durationMonths);

    const absoluteMax = new Date(startDate);
    absoluteMax.setFullYear(absoluteMax.getFullYear() + maxYears);
    if (expectedEnd > absoluteMax) {
      expectedEnd.setTime(absoluteMax.getTime());
    }

    const enrollment = await ProgramEnrollment.create({
      beneficiary_id: data.beneficiary_id,
      program_id: data.program_id,
      specialist_id: data.specialist_id,
      branch_id: data.branch_id,
      enrollment_date: new Date(),
      start_date: startDate,
      expected_end_date: expectedEnd,
      status: 'active',
      enrolled_by: enrolledByUserId,
      enrollment_notes: data.notes,
    });

    logger.info(
      `[Enrollment] Beneficiary ${data.beneficiary_id} enrolled in program ${data.program_id}`
    );
    return enrollment;
  }

  /**
   * إنهاء تسجيل (خروج من البرنامج)
   */
  static async discharge(enrollmentId, data, userId) {
    const enrollment = await ProgramEnrollment.findById(enrollmentId);
    if (!enrollment) throw new Error('التسجيل غير موجود');
    if (enrollment.status === 'discharged') throw new Error('المستفيد خرج من البرنامج مسبقاً');

    enrollment.status = 'discharged';
    enrollment.actual_end_date = new Date();
    enrollment.discharge_reason = data.discharge_reason;
    enrollment.discharge_summary = data.discharge_summary;
    enrollment.progress_at_discharge = data.progress_at_discharge;
    await enrollment.save();

    // إغلاق الخطط النشطة
    await RehabPlan.updateMany(
      { enrollment_id: enrollmentId, status: { $in: ['active', 'draft', 'approved'] } },
      { $set: { status: 'closed', end_date: new Date(), updated_by: userId } }
    );

    logger.info(`[Enrollment] Discharged: ${enrollmentId}`);
    return enrollment;
  }

  /**
   * تمديد فترة التسجيل (مع التحقق من 3 سنوات)
   */
  static async extend(enrollmentId, newEndDate) {
    const enrollment = await ProgramEnrollment.findById(enrollmentId);
    if (!enrollment) throw new Error('التسجيل غير موجود');

    const maxDate = new Date(enrollment.start_date);
    maxDate.setFullYear(maxDate.getFullYear() + 3);

    if (new Date(newEndDate) > maxDate) {
      throw new Error('لا يمكن تمديد البرنامج لأكثر من 3 سنوات حسب اللائحة السعودية');
    }

    enrollment.expected_end_date = newEndDate;
    await enrollment.save();
    return enrollment;
  }
}

// ════════════════════════════════════════════════════════════════
// RehabPlanService — إدارة الخطط التأهيلية
// ════════════════════════════════════════════════════════════════
class RehabPlanService {
  /**
   * إنشاء خطة تأهيلية جديدة مع أهدافها
   */
  static async createPlan(data, userId) {
    const goals = data.goals || [];
    delete data.goals;

    const plan = await RehabPlan.create({
      ...data,
      created_by: userId,
      status: 'draft',
    });

    // إنشاء الأهداف
    const goalDocs = await Promise.all(
      goals.map((g, i) =>
        RehabPlanGoal.create({
          ...g,
          plan_id: plan._id,
          sort_order: i + 1,
          status: 'not_started',
          baseline_date: data.start_date || new Date(),
        })
      )
    );

    logger.info(`[RehabPlan] Created plan ${plan.plan_number} with ${goalDocs.length} goals`);
    return { plan, goals: goalDocs };
  }

  /**
   * مراجعة الخطة وإنشاء نسخة جديدة
   */
  static async reviewAndCreateNewVersion(oldPlanId, data, userId) {
    const oldPlan = await RehabPlan.findById(oldPlanId);
    if (!oldPlan) throw new Error('الخطة غير موجودة');

    // إغلاق الخطة القديمة
    oldPlan.status = 'reviewed';
    oldPlan.end_date = new Date();
    oldPlan.updated_by = userId;
    await oldPlan.save();

    // إنشاء خطة جديدة
    const newPlanData = {
      beneficiary_id: oldPlan.beneficiary_id,
      program_id: oldPlan.program_id,
      enrollment_id: oldPlan.enrollment_id,
      specialist_id: data.specialist_id || oldPlan.specialist_id,
      branch_id: oldPlan.branch_id,
      plan_type: 'review',
      title: data.title || `${oldPlan.title || 'خطة'} (مراجعة)`,
      start_date: new Date(),
      end_date:
        data.end_date ||
        (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 3);
          return d;
        })(),
      baseline_summary:
        data.baseline_summary || `مبني على الخطة السابقة ${oldPlan.plan_number || ''}`,
      objectives_summary: data.objectives_summary || oldPlan.objectives_summary,
      previous_plan_id: oldPlan._id,
      created_by: userId,
      status: 'draft',
    };

    const newPlan = await RehabPlan.create(newPlanData);

    // نسخ الأهداف غير المتقنة من الخطة القديمة
    const oldGoals = await RehabPlanGoal.find({
      plan_id: oldPlanId,
      status: { $nin: ['mastered', 'discontinued'] },
    });

    await Promise.all(
      oldGoals.map((g, i) =>
        RehabPlanGoal.create({
          plan_id: newPlan._id,
          goal_type: g.goal_type,
          domain: g.domain,
          description_ar: g.description_ar,
          description_en: g.description_en,
          measurement_criteria: g.measurement_criteria,
          baseline_level: g.current_level || g.baseline_level,
          baseline_date: new Date(),
          target_level: g.target_level,
          target_date: (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + 3);
            return d;
          })(),
          mastery_criteria: g.mastery_criteria,
          mastery_percentage: g.mastery_percentage,
          status: 'in_progress',
          sort_order: i + 1,
          priority: g.priority,
        })
      )
    );

    return newPlan;
  }

  /**
   * تحديث نسبة إتقان هدف بناءً على تقدم الجلسات
   */
  static async updateGoalMastery(goalId) {
    const goal = await RehabPlanGoal.findById(goalId);
    if (!goal || goal.status === 'mastered') return goal;

    // جلب آخر 5 سجلات تقدم
    const recentProgress = await SessionGoalProgress.find({ goal_id: goalId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (recentProgress.length === 0) return goal;

    // حساب متوسط الدقة
    let totalTrials = 0;
    let totalCorrect = 0;
    recentProgress.forEach(p => {
      totalTrials += p.trial_data?.total_trials || 0;
      totalCorrect += p.trial_data?.correct || 0;
    });

    if (totalTrials > 0) {
      const masteryPct = Math.round((totalCorrect / totalTrials) * 100 * 10) / 10;
      goal.mastery_percentage = masteryPct;
      goal.current_level = `${masteryPct}% دقة`;

      // فحص الإتقان: 80%+ في آخر 3 جلسات متتالية
      if (recentProgress.length >= 3) {
        const last3 = recentProgress.slice(0, 3);
        const allMastered = last3.every(p => {
          const t = p.trial_data?.total_trials || 0;
          const c = p.trial_data?.correct || 0;
          return t > 0 && c / t >= 0.8;
        });

        if (allMastered && goal.status !== 'mastered') {
          goal.status = 'mastered';
          goal.status_changed_at = new Date();
          goal.status_changed_reason = 'تم الإتقان تلقائياً — وصل 80%+ في 3 جلسات متتالية';
          logger.info(`[Goal] Goal ${goalId} mastered automatically`);
        }
      }

      await goal.save();
    }

    return goal;
  }

  /**
   * حساب نسبة التقدم الكلية للخطة
   */
  static async calcOverallProgress(planId) {
    const goals = await RehabPlanGoal.find({ plan_id: planId });
    if (goals.length === 0) return { percentage: 0, status: 'no_goals' };

    const avg = goals.reduce((s, g) => s + (g.mastery_percentage || 0), 0) / goals.length;
    const mastered = goals.filter(g => g.status === 'mastered').length;
    const inProgress = goals.filter(g => g.status === 'in_progress').length;
    const behind = goals.filter(g => g.is_behind_schedule).length;

    let progressStatus = 'needs_attention';
    if (avg >= 80 && behind === 0) progressStatus = 'excellent';
    else if (avg >= 60) progressStatus = 'good';
    else if (avg >= 40) progressStatus = 'moderate';

    return {
      percentage: Math.round(avg * 10) / 10,
      total_goals: goals.length,
      mastered,
      in_progress: inProgress,
      behind_schedule: behind,
      status: progressStatus,
    };
  }
}

// ════════════════════════════════════════════════════════════════
// SessionService — إدارة الجلسات
// ════════════════════════════════════════════════════════════════
class SessionService {
  /**
   * إنشاء جلسة جديدة وتسجيل تقدم الأهداف
   */
  static async createSession(data, userId) {
    const goalProgressData = data.goals || [];
    delete data.goals;

    data.created_by = userId;
    data.status = data.status || 'draft';

    const session = await RehabSession.create(data);

    // تسجيل تقدم الأهداف
    if (goalProgressData.length > 0) {
      await SessionService.recordGoalProgress(session._id, goalProgressData);
    }

    return session;
  }

  /**
   * تسجيل تقدم الأهداف في جلسة
   */
  static async recordGoalProgress(sessionId, goals) {
    const created = [];

    for (const g of goals) {
      // البحث عن سجل موجود أو إنشاء جديد
      const progress = await SessionGoalProgress.findOneAndUpdate(
        { session_id: sessionId, goal_id: g.goal_id },
        {
          trial_data: g.trial_data,
          progress_rating: g.progress_rating,
          prompting_level: g.prompting_level,
          notes: g.notes,
        },
        { upsert: true, new: true }
      );
      created.push(progress);

      // تحديث نسبة الإتقان في الهدف
      try {
        const updatedGoal = await RehabPlanService.updateGoalMastery(g.goal_id);
        // إذا تحقق الإتقان، سجّل تنبيهاً
        if (updatedGoal && updatedGoal.status === 'mastered') {
          logger.info(`[Session] Goal ${g.goal_id} mastered after session ${sessionId}`);
        }
      } catch (err) {
        logger.warn(`[Session] Could not update goal mastery: ${err.message}`);
      }
    }

    return created;
  }

  /**
   * إتمام الجلسة وتوقيعها
   */
  static async completeSession(sessionId, data, userId) {
    const session = await RehabSession.findById(sessionId);
    if (!session) throw new Error('الجلسة غير موجودة');

    Object.assign(session, data);
    session.status = 'completed';
    session.signed_by = userId;
    session.signed_at = new Date();
    await session.save();

    // تحديث عداد الحضور في التسجيل
    if (session.enrollment_id) {
      if (session.attendance_status === 'present') {
        await ProgramEnrollment.findByIdAndUpdate(session.enrollment_id, {
          $inc: { sessions_attended: 1 },
        });
      } else if (['absent', 'cancelled'].includes(session.attendance_status)) {
        await ProgramEnrollment.findByIdAndUpdate(session.enrollment_id, {
          $inc: { sessions_missed: 1 },
        });
      }
    }

    // فحص الغياب المتكرر (3 مرات متتالية)
    await SessionService.checkConsecutiveAbsences(
      session.beneficiary_id,
      session.program_id,
      session.date
    );

    return session;
  }

  /**
   * تسجيل الحضور
   */
  static async recordAttendance(sessionId, attendanceData) {
    const session = await RehabSession.findById(sessionId);
    if (!session) throw new Error('الجلسة غير موجودة');

    session.attendance_status = attendanceData.attendance_status;
    session.absence_reason = attendanceData.absence_reason;
    await session.save();

    return session;
  }

  /**
   * فحص الغياب المتكرر وإنشاء تنبيه
   */
  static async checkConsecutiveAbsences(beneficiaryId, programId, sessionDate) {
    const last3 = await RehabSession.find({
      beneficiary_id: beneficiaryId,
      program_id: programId,
      date: { $lte: sessionDate },
      is_deleted: { $ne: true },
    })
      .sort({ date: -1 })
      .limit(3)
      .lean();

    if (last3.length >= 3) {
      const allAbsent = last3.every(s => ['absent', 'cancelled'].includes(s.attendance_status));

      if (allAbsent) {
        logger.warn(
          `[Session] Consecutive absence alert: beneficiary ${beneficiaryId} in program ${programId}`
        );
        // يمكن إضافة نظام تنبيهات هنا
      }
    }
  }

  /**
   * بيانات الرسم البياني لتقدم الأهداف
   */
  static async getGoalProgressChart(beneficiaryId, programId) {
    const sessions = await RehabSession.find({
      beneficiary_id: beneficiaryId,
      ...(programId ? { program_id: programId } : {}),
      status: 'completed',
      is_deleted: { $ne: true },
    })
      .select('_id date')
      .lean();

    const sessionIds = sessions.map(s => s._id);
    const sessionDateMap = {};
    sessions.forEach(s => {
      sessionDateMap[s._id.toString()] = s.date;
    });

    const progressRecords = await SessionGoalProgress.find({
      session_id: { $in: sessionIds },
    })
      .populate('goal_id', 'description_ar domain mastery_percentage')
      .lean();

    const chartData = {};
    progressRecords.forEach(p => {
      const goalId = p.goal_id?._id?.toString();
      if (!goalId) return;

      if (!chartData[goalId]) {
        chartData[goalId] = {
          goal_id: goalId,
          goal_name: p.goal_id.description_ar,
          domain: p.goal_id.domain,
          data_points: [],
        };
      }

      const trials = p.trial_data?.total_trials || 0;
      const correct = p.trial_data?.correct || 0;
      const accuracy = trials > 0 ? Math.round((correct / trials) * 100 * 10) / 10 : 0;

      chartData[goalId].data_points.push({
        date: sessionDateMap[p.session_id.toString()],
        accuracy,
        rating: p.progress_rating,
      });
    });

    return Object.values(chartData);
  }

  /**
   * ملخص جلسات مستفيد
   */
  static async getBeneficiarySummary(beneficiaryId) {
    const sessions = await RehabSession.find({
      beneficiary_id: beneficiaryId,
      is_deleted: { $ne: true },
    }).lean();

    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const present = sessions.filter(s => s.attendance_status === 'present').length;
    const totalMinutes = sessions.reduce((s, sess) => s + (sess.actual_duration_minutes || 0), 0);

    const byProgram = {};
    sessions.forEach(s => {
      const pid = s.program_id?.toString();
      if (pid) {
        if (!byProgram[pid]) byProgram[pid] = { total: 0, attended: 0 };
        byProgram[pid].total++;
        if (s.attendance_status === 'present') byProgram[pid].attended++;
      }
    });

    return {
      total_sessions: total,
      completed,
      attendance_rate: total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
      by_program: byProgram,
    };
  }
}

module.exports = {
  ProgramService,
  EnrollmentService,
  RehabPlanService,
  SessionService,
};
