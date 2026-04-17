/**
 * ProactiveAlertService — خدمة التنبيهات الاستباقية
 * Prompt 20: AI & Predictive Analytics Module
 */

const AiAlert = require('../../models/AiAlert');
const logger = require('../../utils/logger');

/**
 * تشغيل جميع فحوصات التنبيهات
 * يُستدعى يومياً عبر scheduler
 */
async function runAllChecks(branchId = null) {
  const results = {};
  const checks = [
    { name: 'no_progress', fn: checkNoProgress },
    { name: 'high_absence', fn: checkHighAbsence },
    { name: 'insurance_expiring', fn: checkInsuranceExpiring },
    { name: 'vacant_slots', fn: checkVacantSlots },
    { name: 'caseload_limit', fn: checkCaseloadLimits },
    { name: 'financial_risk', fn: checkFinancialRisk },
    { name: 'dropout_risk', fn: checkDropoutRisk },
  ];

  for (const check of checks) {
    try {
      results[check.name] = await check.fn(branchId);
    } catch (err) {
      logger.error(`Alert check failed: ${check.name}`, { error: err.message });
      results[check.name] = 0;
    }
  }

  return results;
}

/**
 * مساعد: هل يوجد تنبيه مشابه حديث؟
 */
async function alertExists(alertType, targetType, targetId, withinDays = 7) {
  const since = new Date();
  since.setDate(since.getDate() - withinDays);
  return AiAlert.exists({
    alert_type: alertType,
    target_type: targetType,
    target_id: targetId,
    created_at: { $gte: since },
    deleted_at: null,
  });
}

/**
 * فحص 1: مستفيد لم يحقق تقدماً لمدة 3 أشهر
 */
async function checkNoProgress(branchId) {
  let created = 0;
  try {
    const Beneficiary = require('../../models/Beneficiary');
    const Goal = require('../../models/Goal');

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const query = { status: 'active', deleted_at: null };
    if (branchId) query.branch_id = branchId;

    const beneficiaries = await Beneficiary.find(query).lean();

    for (const b of beneficiaries) {
      const stagnantGoals = await Goal.find({
        beneficiary_id: b._id,
        status: 'in_progress',
        updated_at: { $lte: threeMonthsAgo },
      }).lean();

      if (!stagnantGoals.length) continue;
      if (await alertExists('no_progress', 'beneficiary', b._id)) continue;

      await AiAlert.create({
        alert_type: 'no_progress',
        severity: 'warning',
        target_type: 'beneficiary',
        target_id: b._id,
        message_ar: `المستفيد ${b.full_name || b.name_ar || 'غير محدد'} لم يحقق تقدم ملحوظ منذ 3 أشهر`,
        message_en: `Beneficiary has shown no notable progress for 3 months`,
        data: {
          months_without_progress: 3,
          stagnant_goals_count: stagnantGoals.length,
          stagnant_goal_ids: stagnantGoals.map(g => g._id),
        },
        suggested_actions: [
          {
            action: 'review_plan',
            label_ar: 'مراجعة الخطة العلاجية',
            label_en: 'Review treatment plan',
          },
          {
            action: 'team_meeting',
            label_ar: 'عقد اجتماع فريق',
            label_en: 'Schedule team meeting',
          },
          {
            action: 'reassess',
            label_ar: 'إعادة تقييم المستفيد',
            label_en: 'Reassess beneficiary',
          },
        ],
        branch_id: b.branch_id,
      });
      created++;
    }
  } catch (err) {
    logger.error('checkNoProgress failed', { error: err.message });
  }
  return created;
}

/**
 * فحص 2: نسبة غياب مرتفعة (> 30% في الشهر الماضي)
 */
async function checkHighAbsence(branchId) {
  let created = 0;
  try {
    const Beneficiary = require('../../models/Beneficiary');
    const Session =
      require('../../models/DailySession') || require('../../models/DisabilitySession');

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const query = { status: 'active', deleted_at: null };
    if (branchId) query.branch_id = branchId;

    const beneficiaries = await Beneficiary.find(query).lean();

    for (const b of beneficiaries) {
      const sessions = await Session.find({
        beneficiary_id: b._id,
        $or: [{ session_date: { $gte: oneMonthAgo } }, { date: { $gte: oneMonthAgo } }],
      }).lean();

      if (sessions.length < 4) continue;

      const absences = sessions.filter(s => s.attendance_status === 'absent').length;
      const absenceRate = absences / sessions.length;

      if (absenceRate < 0.3) continue;
      if (await alertExists('high_absence', 'beneficiary', b._id)) continue;

      await AiAlert.create({
        alert_type: 'high_absence',
        severity: absenceRate >= 0.5 ? 'critical' : 'warning',
        target_type: 'beneficiary',
        target_id: b._id,
        message_ar: `نسبة غياب ${b.full_name || b.name_ar || ''} مرتفعة: ${Math.round(absenceRate * 100)}% في الشهر الماضي`,
        message_en: `High absence rate: ${Math.round(absenceRate * 100)}% last month`,
        data: {
          absence_rate: Math.round(absenceRate * 1000) / 1000,
          total_sessions: sessions.length,
          absences,
        },
        suggested_actions: [
          {
            action: 'contact_parent',
            label_ar: 'التواصل مع ولي الأمر',
            label_en: 'Contact parent/guardian',
          },
          {
            action: 'reschedule',
            label_ar: 'إعادة جدولة المواعيد',
            label_en: 'Reschedule appointments',
          },
        ],
        branch_id: b.branch_id,
      });
      created++;
    }
  } catch (err) {
    logger.error('checkHighAbsence failed', { error: err.message });
  }
  return created;
}

/**
 * فحص 3: اقتراب انتهاء الموافقة التأمينية (خلال 14 يوم)
 */
async function checkInsuranceExpiring(branchId) {
  let created = 0;
  try {
    // البحث عن سجلات التأمين المقاربة على الانتهاء
    const InsuranceClaim = require('../../models/InsuranceClaims') || null;
    if (!InsuranceClaim) return 0;

    const now = new Date();
    const in14Days = new Date();
    in14Days.setDate(in14Days.getDate() + 14);

    const query = {
      status: 'approved',
      expiry_date: { $gte: now, $lte: in14Days },
    };
    if (branchId) query.branch_id = branchId;

    const approvals = await InsuranceClaim.find(query).lean();

    for (const approval of approvals) {
      const daysLeft = Math.ceil((new Date(approval.expiry_date) - now) / (24 * 3600 * 1000));

      if (await alertExists('insurance_expiring', 'beneficiary', approval.beneficiary_id, 3))
        continue;

      await AiAlert.create({
        alert_type: 'insurance_expiring',
        severity: daysLeft <= 3 ? 'urgent' : daysLeft <= 7 ? 'critical' : 'warning',
        target_type: 'beneficiary',
        target_id: approval.beneficiary_id,
        message_ar: `موافقة التأمين ستنتهي خلال ${daysLeft} يوم`,
        message_en: `Insurance approval expires in ${daysLeft} days`,
        data: {
          approval_id: approval._id,
          expiry_date: approval.expiry_date,
          days_remaining: daysLeft,
          insurance_company: approval.insurance_company,
        },
        suggested_actions: [
          {
            action: 'renew_approval',
            label_ar: 'تقديم طلب تجديد',
            label_en: 'Submit renewal request',
          },
          {
            action: 'notify_parent',
            label_ar: 'إبلاغ ولي الأمر',
            label_en: 'Notify parent/guardian',
          },
        ],
        branch_id: approval.branch_id || branchId,
      });
      created++;
    }
  } catch (err) {
    logger.error('checkInsuranceExpiring failed', { error: err.message });
  }
  return created;
}

/**
 * فحص 4: مقاعد شاغرة مع وجود قائمة انتظار
 */
async function checkVacantSlots(branchId) {
  let created = 0;
  try {
    const Appointment = require('../../models/Appointment');

    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const cancelledQuery = {
      status: 'cancelled',
      appointment_date: { $gte: now, $lte: nextWeek },
    };
    if (branchId) cancelledQuery.branch_id = branchId;

    const cancelledCount = await Appointment.countDocuments(cancelledQuery);
    if (cancelledCount <= 0) return 0;

    // فحص قائمة الانتظار (محاولة نموذج Waitlist)
    let waitingCount = 0;
    try {
      const Waitlist = require('../../models/Waitlist') || null;
      if (Waitlist) {
        const waitQuery = { status: 'waiting' };
        if (branchId) waitQuery.branch_id = branchId;
        waitingCount = await Waitlist.countDocuments(waitQuery);
      }
    } catch (_) {
      /* ignore */
    }

    if (waitingCount <= 0) return 0;

    const targetId = branchId || '000000000000000000000000';
    const sinceYesterday = new Date();
    sinceYesterday.setDate(sinceYesterday.getDate() - 1);

    const exists = await AiAlert.exists({
      alert_type: 'vacant_slot',
      target_type: 'branch',
      created_at: { $gte: sinceYesterday },
      deleted_at: null,
    });
    if (exists) return 0;

    await AiAlert.create({
      alert_type: 'vacant_slot',
      severity: 'info',
      target_type: 'branch',
      target_id: targetId,
      message_ar: `يوجد ${cancelledCount} مقعد شاغل الأسبوع القادم و${waitingCount} مستفيد في قائمة الانتظار`,
      message_en: `${cancelledCount} vacant slots next week and ${waitingCount} beneficiaries on waiting list`,
      data: { vacant_slots: cancelledCount, waiting_count: waitingCount },
      suggested_actions: [
        {
          action: 'fill_from_waitlist',
          label_ar: 'ملء من قائمة الانتظار',
          label_en: 'Fill from waiting list',
        },
      ],
      branch_id: branchId || targetId,
    });
    created = 1;
  } catch (err) {
    logger.error('checkVacantSlots failed', { error: err.message });
  }
  return created;
}

/**
 * فحص 5: أخصائي وصل لسقف الحالات
 */
async function checkCaseloadLimits(branchId) {
  let created = 0;
  try {
    const User = require('../../models/HR/Employee') || require('../../models/User');
    const Beneficiary = require('../../models/Beneficiary');

    const query = { role: { $in: ['specialist', 'therapist'] }, status: 'active' };
    if (branchId) query.branch_id = branchId;

    const specialists = await User.find(query).lean();

    for (const specialist of specialists) {
      const currentCaseload = await Beneficiary.countDocuments({
        assigned_specialist_id: specialist._id,
        status: 'active',
        deleted_at: null,
      });

      const maxCaseload = specialist.max_caseload || 20;
      if (currentCaseload < maxCaseload * 0.9) continue;

      if (await alertExists('caseload_limit', 'specialist', specialist._id)) continue;

      const atLimit = currentCaseload >= maxCaseload;

      await AiAlert.create({
        alert_type: 'caseload_limit',
        severity: atLimit ? 'critical' : 'warning',
        target_type: 'specialist',
        target_id: specialist._id,
        message_ar: atLimit
          ? `الأخصائي ${specialist.full_name || specialist.name_ar || ''} وصل لسقف الحالات (${currentCaseload}/${maxCaseload})`
          : `الأخصائي ${specialist.full_name || specialist.name_ar || ''} قارب على سقف الحالات (${currentCaseload}/${maxCaseload})`,
        message_en: atLimit
          ? `Specialist reached caseload limit (${currentCaseload}/${maxCaseload})`
          : `Specialist nearing caseload limit (${currentCaseload}/${maxCaseload})`,
        data: {
          current_caseload: currentCaseload,
          max_caseload: maxCaseload,
          utilization: Math.round((currentCaseload / maxCaseload) * 100 * 10) / 10,
        },
        suggested_actions: [
          {
            action: 'redistribute',
            label_ar: 'إعادة توزيع الحالات',
            label_en: 'Redistribute cases',
          },
          {
            action: 'increase_limit',
            label_ar: 'رفع السقف مؤقتاً',
            label_en: 'Temporarily increase limit',
          },
        ],
        branch_id: specialist.branch_id,
      });
      created++;
    }
  } catch (err) {
    logger.error('checkCaseloadLimits failed', { error: err.message });
  }
  return created;
}

/**
 * فحص 6: خطر مالي (مستفيد لديه 2+ فواتير متأخرة)
 */
async function checkFinancialRisk(branchId) {
  let created = 0;
  try {
    const Invoice = require('../../models/AccountingInvoice') || null;
    if (!Invoice) return 0;

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const pipeline = [
      {
        $match: {
          status: 'overdue',
          due_date: { $lte: oneMonthAgo },
          ...(branchId ? { branch_id: branchId } : {}),
        },
      },
      {
        $group: {
          _id: '$beneficiary_id',
          count: { $sum: 1 },
          total_overdue: { $sum: '$total_amount' },
          branch_id: { $first: '$branch_id' },
        },
      },
      { $match: { count: { $gte: 2 } } },
    ];

    const overdueByBeneficiary = await Invoice.aggregate(pipeline);

    for (const item of overdueByBeneficiary) {
      if (!item._id) continue;
      if (await alertExists('financial_risk', 'beneficiary', item._id)) continue;

      await AiAlert.create({
        alert_type: 'financial_risk',
        severity: item.total_overdue > 10000 ? 'critical' : 'warning',
        target_type: 'beneficiary',
        target_id: item._id,
        message_ar: `المستفيد لديه ${item.count} فواتير متأخرة بمبلغ ${Number(item.total_overdue).toFixed(2)} ر.س`,
        message_en: `Beneficiary has ${item.count} overdue invoices totaling ${Number(item.total_overdue).toFixed(2)} SAR`,
        data: {
          overdue_count: item.count,
          total_overdue: item.total_overdue,
        },
        suggested_actions: [
          {
            action: 'contact_parent',
            label_ar: 'التواصل مع ولي الأمر',
            label_en: 'Contact parent',
          },
          { action: 'payment_plan', label_ar: 'عرض خطة تقسيط', label_en: 'Offer payment plan' },
        ],
        branch_id: item.branch_id || branchId,
      });
      created++;
    }
  } catch (err) {
    logger.error('checkFinancialRisk failed', { error: err.message });
  }
  return created;
}

/**
 * فحص 7: خطر انسحاب المستفيد
 */
async function checkDropoutRisk(branchId) {
  let created = 0;
  try {
    const Beneficiary = require('../../models/Beneficiary');
    const Session = (() => {
      try {
        return require('../../models/DailySession');
      } catch (_err) {
        logger.debug('DailySession model not available, trying fallback', { error: _err.message });
      }
      try {
        return require('../../models/DisabilitySession');
      } catch (_err) {
        logger.debug('DisabilitySession model not available', { error: _err.message });
      }
      return null;
    })();

    if (!Session) return 0;

    const query = { status: 'active', deleted_at: null };
    if (branchId) query.branch_id = branchId;

    const beneficiaries = await Beneficiary.find(query).lean();

    const now = new Date();
    const thirtyAgo = new Date(now);
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const sixtyAgo = new Date(now);
    sixtyAgo.setDate(sixtyAgo.getDate() - 60);

    for (const b of beneficiaries) {
      const recentSessions = await Session.find({
        beneficiary_id: b._id,
        $or: [{ session_date: { $gte: thirtyAgo } }, { date: { $gte: thirtyAgo } }],
      }).lean();

      const prevSessions = await Session.find({
        beneficiary_id: b._id,
        $or: [
          { session_date: { $gte: sixtyAgo, $lt: thirtyAgo } },
          { date: { $gte: sixtyAgo, $lt: thirtyAgo } },
        ],
      }).lean();

      if (recentSessions.length < 2) continue;

      const recentAbsRate =
        recentSessions.filter(s => s.attendance_status === 'absent').length / recentSessions.length;
      const prevAbsRate =
        prevSessions.length > 0
          ? prevSessions.filter(s => s.attendance_status === 'absent').length / prevSessions.length
          : 0;

      if (recentAbsRate < 0.4 || recentAbsRate <= prevAbsRate) continue;
      if (await alertExists('dropout_risk', 'beneficiary', b._id, 14)) continue;

      await AiAlert.create({
        alert_type: 'dropout_risk',
        severity: 'critical',
        target_type: 'beneficiary',
        target_id: b._id,
        message_ar: `خطر انسحاب: نسبة الغياب ارتفعت من ${Math.round(prevAbsRate * 100)}% إلى ${Math.round(recentAbsRate * 100)}%`,
        message_en: `Dropout risk: absence rate increased from ${Math.round(prevAbsRate * 100)}% to ${Math.round(recentAbsRate * 100)}%`,
        data: {
          recent_absence_rate: Math.round(recentAbsRate * 1000) / 1000,
          previous_absence_rate: Math.round(prevAbsRate * 1000) / 1000,
          trend: 'increasing',
        },
        suggested_actions: [
          {
            action: 'urgent_contact',
            label_ar: 'تواصل عاجل مع ولي الأمر',
            label_en: 'Urgent parent contact',
          },
          { action: 'home_visit', label_ar: 'زيارة منزلية', label_en: 'Home visit' },
          {
            action: 'schedule_review',
            label_ar: 'مراجعة الجدول والمواعيد',
            label_en: 'Review schedule',
          },
        ],
        branch_id: b.branch_id,
      });
      created++;
    }
  } catch (err) {
    logger.error('checkDropoutRisk failed', { error: err.message });
  }
  return created;
}

module.exports = {
  runAllChecks,
  checkNoProgress,
  checkHighAbsence,
  checkInsuranceExpiring,
  checkVacantSlots,
  checkCaseloadLimits,
  checkFinancialRisk,
  checkDropoutRisk,
};
