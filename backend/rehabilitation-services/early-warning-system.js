/**
 * early-warning-system.js
 * نظام الإنذار المبكر الذكي للتأهيل
 * Plateau Detection | Regression Alert | Attendance Monitoring | Behavioral Alerts
 */

'use strict';

const mongoose = require('mongoose');
const { SmartIEP, SessionLog } = require('../models/SmartIEP');

// ══════════════════════════════════════════════════════
// نموذج تنبيهات الإنذار المبكر
// ══════════════════════════════════════════════════════
const earlyWarningAlertSchema = new mongoose.Schema(
  {
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    iep_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SmartIEP' },
    goal_id: { type: mongoose.Schema.Types.ObjectId },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    alert_type: {
      type: String,
      enum: [
        'plateau', // ثبات بدون تحسن
        'regression', // تراجع في المهارة
        'low_attendance', // انخفاض الحضور
        'goal_expired', // انتهت مدة الهدف دون تحقق
        'review_due', // موعد المراجعة قادم
        'no_progress_log', // لا توجد سجلات جلسات
        'behavior_spike', // ارتفاع مفاجئ في السلوك السلبي
        'missed_assessment', // تقييم متأخر
        'family_disengagement', // انخفاض تفاعل الأسرة
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
    },
    alert_title_ar: { type: String, required: true },
    alert_message_ar: { type: String, required: true },
    alert_data: { type: mongoose.Schema.Types.Mixed }, // بيانات إضافية
    recommended_actions_ar: [{ type: String }],

    // ── حالة التنبيه
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
      default: 'active',
    },
    acknowledged_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledged_at: { type: Date },
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolved_at: { type: Date },
    resolution_notes_ar: { type: String },

    // ── الإشعارات
    notified_therapist: { type: Boolean, default: false },
    notified_supervisor: { type: Boolean, default: false },
    notified_family: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'early_warning_alerts',
  }
);

earlyWarningAlertSchema.index({ beneficiary_id: 1, alert_type: 1, status: 1 });
earlyWarningAlertSchema.index({ branch_id: 1, status: 1, severity: 1 });
earlyWarningAlertSchema.index({ createdAt: -1 });

const EarlyWarningAlert = mongoose.model('EarlyWarningAlert', earlyWarningAlertSchema);

// ══════════════════════════════════════════════════════
// محرك كشف الثبات والتراجع (Plateau/Regression Detector)
// ══════════════════════════════════════════════════════
class EarlyWarningService {
  /**
   * الفحص الشامل لجميع المستفيدين النشطين
   * يُشغَّل بشكل دوري (scheduler)
   */
  static async runFullScan(branchId = null) {
    const query = { status: 'active' };
    if (branchId) query.branch_id = branchId;

    const ieps = await SmartIEP.find(query).populate('beneficiary_id', 'name branch_id').lean();

    const alerts = [];
    for (const iep of ieps) {
      const iepAlerts = await this.scanIEP(iep);
      alerts.push(...iepAlerts);
    }

    return { scanned: ieps.length, alerts_generated: alerts.length, alerts };
  }

  /**
   * فحص IEP واحد لجميع أنواع التنبيهات
   */
  static async scanIEP(iep) {
    const alerts = [];
    const beneficiaryId = iep.beneficiary_id?._id || iep.beneficiary_id;

    for (const goal of iep.annual_goals || []) {
      if (goal.current_status === 'achieved' || goal.current_status === 'discontinued') continue;

      // 1. كشف الثبات (Plateau Detection)
      const plateauAlert = await this.detectPlateau(iep._id, goal, beneficiaryId);
      if (plateauAlert) alerts.push(plateauAlert);

      // 2. كشف التراجع (Regression Detection)
      const regressionAlert = this.detectRegression(iep._id, goal, beneficiaryId);
      if (regressionAlert) alerts.push(regressionAlert);

      // 3. انتهاء مدة الهدف
      const expiredAlert = this.detectExpiredGoal(iep._id, goal, beneficiaryId);
      if (expiredAlert) alerts.push(expiredAlert);
    }

    // 4. فحص الحضور
    const attendanceAlert = await this.checkAttendance(beneficiaryId, iep._id, iep.branch_id);
    if (attendanceAlert) alerts.push(attendanceAlert);

    // 5. موعد المراجعة
    const reviewAlert = this.checkReviewDue(iep, beneficiaryId);
    if (reviewAlert) alerts.push(reviewAlert);

    // 6. لا توجد سجلات جلسات
    const noLogAlert = await this.checkNoProgressLogs(beneficiaryId, iep._id);
    if (noLogAlert) alerts.push(noLogAlert);

    // حفظ التنبيهات الجديدة
    for (const alert of alerts) {
      // تجنب التكرار
      const existing = await EarlyWarningAlert.findOne({
        beneficiary_id: alert.beneficiary_id,
        alert_type: alert.alert_type,
        goal_id: alert.goal_id,
        status: { $in: ['active', 'acknowledged'] },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // آخر 7 أيام
      });
      if (!existing) {
        await EarlyWarningAlert.create(alert);
      }
    }

    return alerts;
  }

  /**
   * كشف الثبات: لا تحسن لأكثر من 4 أسابيع
   */
  static async detectPlateau(iepId, goal, beneficiaryId) {
    const recentLogs = goal.progress_log?.slice(-8) || [];
    if (recentLogs.length < 4) return null;

    const last4Logs = recentLogs.slice(-4);
    const avgFirst2 =
      (last4Logs[0]?.accuracy_percentage || 0 + last4Logs[1]?.accuracy_percentage || 0) / 2;
    const avgLast2 =
      (last4Logs[2]?.accuracy_percentage || 0 + last4Logs[3]?.accuracy_percentage || 0) / 2;

    const improvement = avgLast2 - avgFirst2;

    // إذا كان التحسن أقل من 5% في آخر 4 جلسات
    if (Math.abs(improvement) < 5 && avgLast2 < 80) {
      const weeksSinceLastImprovement = this.calculateWeeksSinceProgress(recentLogs);

      if (weeksSinceLastImprovement >= 4) {
        return {
          beneficiary_id: beneficiaryId,
          iep_id: iepId,
          goal_id: goal._id,
          branch_id: goal.branch_id,
          alert_type: 'plateau',
          severity: weeksSinceLastImprovement >= 6 ? 'high' : 'medium',
          alert_title_ar: `ثبات في الهدف: ${goal.goal_ar?.substring(0, 50)}...`,
          alert_message_ar: `لم يُحقق المستفيد تحسناً ملحوظاً في هذا الهدف منذ ${weeksSinceLastImprovement} أسابيع. الأداء الحالي: ${Math.round(avgLast2)}%`,
          alert_data: {
            weeks_no_progress: weeksSinceLastImprovement,
            current_accuracy: avgLast2,
            goal_ar: goal.goal_ar,
          },
          recommended_actions_ar: [
            'مراجعة استراتيجيات التدريس المستخدمة',
            'تقسيم الهدف إلى خطوات أصغر',
            'تحليل العوامل البيئية والسلوكية المؤثرة',
            'استشارة مشرف الخدمة',
            'اجتماع فريق متعدد التخصصات',
          ],
        };
      }
    }
    return null;
  }

  /**
   * كشف التراجع: انخفاض الأداء بعد تحقق الهدف أو بعد تحسن
   */
  static detectRegression(iepId, goal, beneficiaryId) {
    const logs = goal.progress_log || [];
    if (logs.length < 4) return null;

    const lastLogs = logs.slice(-4);
    const peakAccuracy = Math.max(...lastLogs.map(l => l.accuracy_percentage || 0));
    const currentAccuracy = lastLogs[lastLogs.length - 1]?.accuracy_percentage || 0;
    const regression = peakAccuracy - currentAccuracy;

    if (regression >= 20 && currentAccuracy < 70) {
      return {
        beneficiary_id: beneficiaryId,
        iep_id: iepId,
        goal_id: goal._id,
        alert_type: 'regression',
        severity: regression >= 30 ? 'critical' : 'high',
        alert_title_ar: `تراجع مهارة: ${goal.goal_ar?.substring(0, 50)}...`,
        alert_message_ar: `تراجع أداء المستفيد بمقدار ${Math.round(regression)}% في هذا الهدف (من ${Math.round(peakAccuracy)}% إلى ${Math.round(currentAccuracy)}%)`,
        alert_data: {
          regression_amount: regression,
          peak_accuracy: peakAccuracy,
          current_accuracy: currentAccuracy,
        },
        recommended_actions_ar: [
          'مراجعة عوامل البيئة (تغييرات في المنزل أو المركز)',
          'فحص الحالة الصحية للمستفيد',
          'تحليل سجلات ABC للسلوك الأخيرة',
          'التحدث مع الأسرة لاستيضاح أي تغييرات',
          'تعديل مستوى الدعم والإرشادات',
        ],
      };
    }
    return null;
  }

  /**
   * كشف انتهاء مدة الهدف دون تحقق
   */
  static detectExpiredGoal(iepId, goal, beneficiaryId) {
    if (!goal.target_date) return null;
    const today = new Date();
    const targetDate = new Date(goal.target_date);
    const daysOverdue = Math.floor((today - targetDate) / (24 * 60 * 60 * 1000));

    if (daysOverdue > 0 && goal.current_status !== 'achieved') {
      return {
        beneficiary_id: beneficiaryId,
        iep_id: iepId,
        goal_id: goal._id,
        alert_type: 'goal_expired',
        severity: daysOverdue > 30 ? 'high' : 'medium',
        alert_title_ar: `هدف متأخر: ${goal.goal_ar?.substring(0, 50)}...`,
        alert_message_ar: `تجاوز الهدف تاريخ التحقيق المستهدف بـ ${daysOverdue} يوماً. التقدم الحالي: ${goal.progress_percentage || 0}%`,
        alert_data: {
          days_overdue: daysOverdue,
          target_date: targetDate,
          progress: goal.progress_percentage,
        },
        recommended_actions_ar: [
          'مراجعة واقعية الهدف وتعديل التاريخ المستهدف',
          'تقييم إذا كان الهدف مناسباً للمستوى الحالي',
          'تحديث خطة التدخل',
          'اجتماع فريق لمناقشة الحالة',
        ],
      };
    }
    return null;
  }

  /**
   * فحص معدل الحضور
   */
  static async checkAttendance(beneficiaryId, iepId, branchId) {
    const last4Weeks = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const sessions = await SessionLog.find({
      beneficiary_id: beneficiaryId,
      session_date: { $gte: last4Weeks },
    }).countDocuments();

    const expectedSessions = 8; // 2 جلسات/أسبوع × 4 أسابيع
    const attendanceRate = Math.round((sessions / expectedSessions) * 100);

    if (attendanceRate < 70) {
      return {
        beneficiary_id: beneficiaryId,
        iep_id: iepId,
        branch_id: branchId,
        alert_type: 'low_attendance',
        severity: attendanceRate < 50 ? 'critical' : 'high',
        alert_title_ar: 'انخفاض معدل الحضور',
        alert_message_ar: `معدل حضور المستفيد في آخر 4 أسابيع ${attendanceRate}% فقط (${sessions} من ${expectedSessions} جلسات متوقعة)`,
        alert_data: {
          attendance_rate: attendanceRate,
          sessions_attended: sessions,
          expected: expectedSessions,
        },
        recommended_actions_ar: [
          'التواصل فوراً مع الأسرة لمعرفة أسباب الغياب',
          'مراجعة جدول الجلسات لمناسبته',
          'تقديم دعم الأخصائي الاجتماعي للأسرة',
          'توثيق أسباب الغياب في الملف',
        ],
      };
    }
    return null;
  }

  /**
   * فحص موعد المراجعة الدورية
   */
  static checkReviewDue(iep, beneficiaryId) {
    const reviews = [
      iep.review_schedule?.quarterly_review_1,
      iep.review_schedule?.quarterly_review_2,
      iep.review_schedule?.quarterly_review_3,
      iep.review_schedule?.annual_review,
    ].filter(d => d);

    const today = new Date();
    const upcoming = reviews.find(d => {
      const reviewDate = new Date(d);
      const daysUntil = Math.floor((reviewDate - today) / (24 * 60 * 60 * 1000));
      return daysUntil >= 0 && daysUntil <= 14; // 14 يوم قبل الموعد
    });

    if (upcoming) {
      const daysUntil = Math.floor((new Date(upcoming) - today) / (24 * 60 * 60 * 1000));
      return {
        beneficiary_id: beneficiaryId,
        iep_id: iep._id,
        alert_type: 'review_due',
        severity: daysUntil <= 3 ? 'high' : 'medium',
        alert_title_ar: 'موعد مراجعة الخطة التعليمية الفردية قادم',
        alert_message_ar: `موعد مراجعة خطة ${iep.iep_number} خلال ${daysUntil} يوم (${new Date(upcoming).toLocaleDateString('ar-SA')})`,
        alert_data: { review_date: upcoming, days_until: daysUntil },
        recommended_actions_ar: [
          'تحضير ملخص التقدم في جميع الأهداف',
          'تجميع بيانات الجلسات الأخيرة',
          'إشعار جميع أعضاء الفريق بالاجتماع',
          'إشعار الأسرة بموعد الاجتماع',
        ],
      };
    }
    return null;
  }

  /**
   * فحص غياب سجلات الجلسات لأسبوعين
   */
  static async checkNoProgressLogs(beneficiaryId, iepId) {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentSessions = await SessionLog.findOne({
      beneficiary_id: beneficiaryId,
      session_date: { $gte: twoWeeksAgo },
    });

    if (!recentSessions) {
      return {
        beneficiary_id: beneficiaryId,
        iep_id: iepId,
        alert_type: 'no_progress_log',
        severity: 'medium',
        alert_title_ar: 'لا توجد سجلات جلسات حديثة',
        alert_message_ar: 'لم يتم تسجيل أي جلسة تأهيلية لهذا المستفيد خلال الأسبوعين الماضيين',
        alert_data: { last_session_date: null },
        recommended_actions_ar: [
          'التحقق من جدول الجلسات',
          'مطالبة المعالجين بتسجيل الجلسات',
          'مراجعة سبب انقطاع الجلسات',
        ],
      };
    }
    return null;
  }

  /**
   * حساب أسابيع بدون تقدم
   */
  static calculateWeeksSinceProgress(logs) {
    if (logs.length < 2) return 0;
    const sortedLogs = [...logs].sort((a, b) => new Date(b.log_date) - new Date(a.log_date));

    for (let i = 1; i < sortedLogs.length; i++) {
      const diff = Math.abs(
        (sortedLogs[0].accuracy_percentage || 0) - (sortedLogs[i].accuracy_percentage || 0)
      );
      if (diff >= 5) {
        const weeks = Math.floor(
          (new Date() - new Date(sortedLogs[i].log_date)) / (7 * 24 * 60 * 60 * 1000)
        );
        return weeks;
      }
    }
    const oldestLog = sortedLogs[sortedLogs.length - 1];
    return Math.floor((new Date() - new Date(oldestLog.log_date)) / (7 * 24 * 60 * 60 * 1000));
  }

  /**
   * جلب تنبيهات مستفيد معين
   */
  static async getBeneficiaryAlerts(beneficiaryId, status = 'active') {
    return await EarlyWarningAlert.find({ beneficiary_id: beneficiaryId, status })
      .sort({ severity: 1, createdAt: -1 })
      .lean();
  }

  /**
   * جلب تنبيهات فرع بأولويات
   */
  static async getBranchAlerts(branchId, status = 'active') {
    const alerts = await EarlyWarningAlert.find({ branch_id: branchId, status })
      .populate('beneficiary_id', 'name disability_type')
      .sort({ severity: 1, createdAt: -1 })
      .lean();

    // تصنيف حسب الشدة
    return {
      critical: alerts.filter(a => a.severity === 'critical'),
      high: alerts.filter(a => a.severity === 'high'),
      medium: alerts.filter(a => a.severity === 'medium'),
      low: alerts.filter(a => a.severity === 'low'),
      total: alerts.length,
    };
  }

  /**
   * الإقرار بتنبيه
   */
  static async acknowledgeAlert(alertId, userId, notes) {
    return await EarlyWarningAlert.findByIdAndUpdate(
      alertId,
      {
        status: 'acknowledged',
        acknowledged_by: userId,
        acknowledged_at: new Date(),
        resolution_notes_ar: notes,
      },
      { new: true }
    );
  }

  /**
   * حل تنبيه
   */
  static async resolveAlert(alertId, userId, notes) {
    return await EarlyWarningAlert.findByIdAndUpdate(
      alertId,
      {
        status: 'resolved',
        resolved_by: userId,
        resolved_at: new Date(),
        resolution_notes_ar: notes,
      },
      { new: true }
    );
  }

  /**
   * إحصائيات التنبيهات للوحة التحكم
   */
  static async getDashboardStats(branchId) {
    const matchStage = { status: { $in: ['active', 'acknowledged'] } };
    if (branchId) matchStage.branch_id = new mongoose.Types.ObjectId(branchId);

    const stats = await EarlyWarningAlert.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { type: '$alert_type', severity: '$severity' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      total_active: 0,
      by_type: {},
      by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
    };

    for (const stat of stats) {
      summary.total_active += stat.count;
      summary.by_type[stat._id.type] = (summary.by_type[stat._id.type] || 0) + stat.count;
      summary.by_severity[stat._id.severity] =
        (summary.by_severity[stat._id.severity] || 0) + stat.count;
    }

    return summary;
  }
}

// ══════════════════════════════════════════════════════
// مسارات الإنذار المبكر
// ══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();

/**
 * POST /early-warning/scan
 * تشغيل الفحص الشامل يدوياً
 */
router.post('/scan', async (req, res) => {
  try {
    const result = await EarlyWarningService.runFullScan(req.body.branch_id);
    res.json({
      success: true,
      message: `تم الفحص: ${result.alerts_generated} تنبيه جديد`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /early-warning/beneficiary/:id
 */
router.get('/beneficiary/:id', async (req, res) => {
  try {
    const alerts = await EarlyWarningService.getBeneficiaryAlerts(req.params.id, req.query.status);
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /early-warning/branch/:branchId
 */
router.get('/branch/:branchId', async (req, res) => {
  try {
    const alerts = await EarlyWarningService.getBranchAlerts(req.params.branchId, req.query.status);
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /early-warning/dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await EarlyWarningService.getDashboardStats(req.query.branch_id);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /early-warning/:id/acknowledge
 */
router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const alert = await EarlyWarningService.acknowledgeAlert(
      req.params.id,
      req.user?.id || req.body.user_id,
      req.body.notes
    );
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /early-warning/:id/resolve
 */
router.patch('/:id/resolve', async (req, res) => {
  try {
    const alert = await EarlyWarningService.resolveAlert(
      req.params.id,
      req.user?.id || req.body.user_id,
      req.body.notes
    );
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { router, EarlyWarningService, EarlyWarningAlert };
