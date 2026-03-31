/**
 * Escalation Notifications Service - نظام إشعارات التصعيد التلقائي
 * يراقب حالات المستفيدين ويرسل إشعارات عند الحاجة للتدخل
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

// ============================================================
// Schema تعريف نموذج قواعد التصعيد
// ============================================================
const EscalationRuleSchema = new mongoose.Schema(
  {
    ruleId: { type: String, required: true, unique: true },
    ruleName: { type: String, required: true },
    ruleType: {
      type: String,
      enum: [
        'progress_stagnation', // ركود التقدم
        'session_missed', // تغيب عن الجلسة
        'goal_overdue', // هدف متأخر
        'behavior_escalation', // تصعيد سلوكي
        'assessment_due', // موعد تقييم
        'iep_review_due', // موعد مراجعة IEP
        'family_contact_needed', // الحاجة للتواصل مع الأسرة
        'medication_review', // مراجعة الدواء
        'discharge_eligible', // مؤهل للإنهاء
        'crisis_indicator', // مؤشر أزمة
        'waitlist_overdue', // قائمة انتظار متأخرة
        'custom',
      ],
      required: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    triggerConditions: {
      consecutiveMissedSessions: { type: Number }, // عدد جلسات متتالية
      daysSinceLastProgress: { type: Number }, // أيام منذ آخر تقدم
      goalProgressThreshold: { type: Number }, // نسبة تقدم الهدف (%)
      daysSinceAssessment: { type: Number }, // أيام منذ آخر تقييم
      ieReviewIntervalDays: { type: Number }, // فترة مراجعة IEP بالأيام
      behaviorIncidentsCount: { type: Number }, // عدد الحوادث السلوكية
      customLogic: { type: String },
    },
    notificationTargets: {
      therapist: { type: Boolean, default: true },
      supervisor: { type: Boolean, default: false },
      familyPortal: { type: Boolean, default: false },
      caseManager: { type: Boolean, default: false },
      doctor: { type: Boolean, default: false },
      adminOfficer: { type: Boolean, default: false },
    },
    notificationChannels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },
    escalationChain: [
      {
        level: { type: Number },
        delayHours: { type: Number }, // تأخير قبل التصعيد
        targets: [{ type: String }], // معرّفات المستلمين
        requiresAcknowledgement: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
    department: { type: String },
    applicableDiagnoses: [{ type: String }],
    messageTemplateAr: { type: String },
    messageTemplateEn: { type: String },
  },
  { timestamps: true }
);

// ============================================================
// Schema تعريف نموذج الإشعارات
// ============================================================
const EscalationNotificationSchema = new mongoose.Schema(
  {
    notificationId: { type: String, required: true, unique: true },
    ruleId: { type: String, required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipients: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        channel: { type: String },
        sentAt: { type: Date },
        deliveredAt: { type: Date },
        readAt: { type: Date },
        acknowledgedAt: { type: Date },
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'read', 'acknowledged', 'failed'],
          default: 'pending',
        },
      },
    ],
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    title: { type: String, required: true },
    body: { type: String, required: true },
    triggerData: { type: mongoose.Schema.Types.Mixed },
    escalationLevel: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved', 'expired', 'escalated'],
      default: 'active',
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },
    nextEscalationAt: { type: Date },
    dueDate: { type: Date },
    priority: { type: Number, default: 5 },
    tags: [{ type: String }],
    relatedEntityType: { type: String }, // IEP, Assessment, Session...
    relatedEntityId: { type: String },
  },
  { timestamps: true }
);

const EscalationRule = mongoose.model('EscalationRule', EscalationRuleSchema);
const EscalationNotification = mongoose.model(
  'EscalationNotification',
  EscalationNotificationSchema
);

// ============================================================
// القواعد الافتراضية للتصعيد
// ============================================================
const DEFAULT_ESCALATION_RULES = [
  {
    ruleId: 'ESC-001',
    ruleName: 'تغيب متكرر عن الجلسات',
    ruleType: 'session_missed',
    severity: 'high',
    triggerConditions: { consecutiveMissedSessions: 3 },
    notificationTargets: {
      therapist: true,
      supervisor: true,
      caseManager: true,
      familyPortal: true,
    },
    notificationChannels: { inApp: true, sms: true, whatsapp: true },
    messageTemplateAr:
      'تنبيه: المستفيد {beneficiaryName} تغيب عن {count} جلسات متتالية. يرجى التواصل مع الأسرة فوراً.',
    escalationChain: [
      { level: 1, delayHours: 0, targets: ['therapist'], requiresAcknowledgement: true },
      {
        level: 2,
        delayHours: 24,
        targets: ['supervisor', 'caseManager'],
        requiresAcknowledgement: true,
      },
      { level: 3, delayHours: 48, targets: ['admin'], requiresAcknowledgement: false },
    ],
  },
  {
    ruleId: 'ESC-002',
    ruleName: 'ركود في التقدم نحو الأهداف',
    ruleType: 'progress_stagnation',
    severity: 'medium',
    triggerConditions: { daysSinceLastProgress: 30, goalProgressThreshold: 10 },
    notificationTargets: { therapist: true, supervisor: true },
    notificationChannels: { inApp: true, email: true },
    messageTemplateAr:
      'تنبيه: لم يُحرز المستفيد {beneficiaryName} تقدماً يُذكر في الأهداف خلال 30 يوماً.',
    escalationChain: [
      { level: 1, delayHours: 0, targets: ['therapist'], requiresAcknowledgement: true },
      { level: 2, delayHours: 72, targets: ['supervisor'], requiresAcknowledgement: false },
    ],
  },
  {
    ruleId: 'ESC-003',
    ruleName: 'موعد مراجعة خطة IEP',
    ruleType: 'iep_review_due',
    severity: 'medium',
    triggerConditions: { ieReviewIntervalDays: 90 },
    notificationTargets: { therapist: true, caseManager: true, familyPortal: true },
    notificationChannels: { inApp: true, email: true },
    messageTemplateAr:
      'تذكير: حان موعد مراجعة خطة التدخل الفردية (IEP) للمستفيد {beneficiaryName}.',
    escalationChain: [
      {
        level: 1,
        delayHours: 0,
        targets: ['therapist', 'caseManager'],
        requiresAcknowledgement: true,
      },
    ],
  },
  {
    ruleId: 'ESC-004',
    ruleName: 'مؤشر أزمة سلوكية',
    ruleType: 'crisis_indicator',
    severity: 'critical',
    triggerConditions: { behaviorIncidentsCount: 3 },
    notificationTargets: { therapist: true, supervisor: true, doctor: true, familyPortal: true },
    notificationChannels: { inApp: true, sms: true, email: true, whatsapp: true },
    messageTemplateAr:
      'تنبيه عاجل: سُجّلت 3 حوادث سلوكية لدى المستفيد {beneficiaryName} خلال الأسبوع. يلزم اجتماع طارئ.',
    escalationChain: [
      {
        level: 1,
        delayHours: 0,
        targets: ['therapist', 'supervisor', 'doctor'],
        requiresAcknowledgement: true,
      },
      {
        level: 2,
        delayHours: 2,
        targets: ['admin', 'familyPortal'],
        requiresAcknowledgement: false,
      },
    ],
  },
  {
    ruleId: 'ESC-005',
    ruleName: 'موعد التقييم الدوري',
    ruleType: 'assessment_due',
    severity: 'low',
    triggerConditions: { daysSinceAssessment: 180 },
    notificationTargets: { therapist: true, caseManager: true },
    notificationChannels: { inApp: true },
    messageTemplateAr:
      'تذكير: يستحق المستفيد {beneficiaryName} إجراء تقييم دوري (مر {days} يوماً منذ آخر تقييم).',
    escalationChain: [
      { level: 1, delayHours: 0, targets: ['therapist'], requiresAcknowledgement: true },
    ],
  },
  {
    ruleId: 'ESC-006',
    ruleName: 'تأخر في تحقيق هدف محدد',
    ruleType: 'goal_overdue',
    severity: 'medium',
    triggerConditions: { goalProgressThreshold: 20 },
    notificationTargets: { therapist: true, supervisor: false },
    notificationChannels: { inApp: true },
    messageTemplateAr:
      'تنبيه: الهدف "{goalTitle}" للمستفيد {beneficiaryName} متأخر عن الجدول الزمني.',
    escalationChain: [
      { level: 1, delayHours: 0, targets: ['therapist'], requiresAcknowledgement: false },
    ],
  },
  {
    ruleId: 'ESC-007',
    ruleName: 'الحاجة للتواصل مع الأسرة',
    ruleType: 'family_contact_needed',
    severity: 'low',
    triggerConditions: { daysSinceLastProgress: 14 },
    notificationTargets: { therapist: true, caseManager: true },
    notificationChannels: { inApp: true },
    messageTemplateAr:
      'تذكير: يُنصح بالتواصل مع أسرة المستفيد {beneficiaryName} لمناقشة التقدم والدعم المنزلي.',
    escalationChain: [
      {
        level: 1,
        delayHours: 0,
        targets: ['therapist', 'caseManager'],
        requiresAcknowledgement: false,
      },
    ],
  },
  {
    ruleId: 'ESC-008',
    ruleName: 'قائمة انتظار طويلة',
    ruleType: 'waitlist_overdue',
    severity: 'high',
    triggerConditions: { daysSinceLastProgress: 60 },
    notificationTargets: { supervisor: true, adminOfficer: true },
    notificationChannels: { inApp: true, email: true },
    messageTemplateAr:
      'تنبيه إداري: المستفيد {beneficiaryName} في قائمة الانتظار منذ {days} يوماً.',
    escalationChain: [
      {
        level: 1,
        delayHours: 0,
        targets: ['supervisor', 'adminOfficer'],
        requiresAcknowledgement: true,
      },
    ],
  },
];

// ============================================================
// EscalationNotificationsService الخدمة الرئيسية
// ============================================================
class EscalationNotificationsService extends EventEmitter {
  constructor() {
    super();
    this._monitoringActive = false;
    this._monitoringInterval = null;
  }

  /**
   * تهيئة قواعد التصعيد الافتراضية
   */
  async seedDefaultRules() {
    try {
      const count = await EscalationRule.countDocuments();
      if (count > 0) return { success: true, message: `القواعد موجودة مسبقاً (${count})` };
      await EscalationRule.insertMany(DEFAULT_ESCALATION_RULES);
      return {
        success: true,
        message: 'تم تهيئة قواعد التصعيد الافتراضية',
        count: DEFAULT_ESCALATION_RULES.length,
      };
    } catch (error) {
      throw new Error(`خطأ في تهيئة القواعد: ${error.message}`);
    }
  }

  /**
   * إنشاء إشعار تصعيد جديد
   */
  async createNotification({ ruleId, beneficiaryId, therapistId, triggerData, recipients = [] }) {
    try {
      const rule = await EscalationRule.findOne({ ruleId, isActive: true });
      if (!rule) throw new Error(`القاعدة ${ruleId} غير موجودة أو معطّلة`);

      const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const title = this._buildTitle(rule, triggerData);
      const body = this._buildMessage(rule.messageTemplateAr, triggerData);

      const priorityMap = { low: 3, medium: 5, high: 7, critical: 10 };
      const priority = priorityMap[rule.severity] || 5;

      // احتساب موعد التصعيد التالي
      const nextEscalation =
        rule.escalationChain.length > 1
          ? new Date(Date.now() + rule.escalationChain[1].delayHours * 3600000)
          : null;

      const notification = new EscalationNotification({
        notificationId,
        ruleId,
        beneficiaryId,
        therapistId,
        severity: rule.severity,
        title,
        body,
        triggerData,
        escalationLevel: 1,
        priority,
        nextEscalationAt: nextEscalation,
        recipients: recipients.map(r => ({
          ...r,
          status: 'pending',
          sentAt: new Date(),
        })),
        dueDate: new Date(Date.now() + 24 * 3600000),
      });

      await notification.save();

      // إطلاق حدث الإشعار
      this.emit('notification:created', {
        notification,
        rule,
        triggerData,
      });

      return { success: true, data: notification, message: 'تم إرسال الإشعار بنجاح' };
    } catch (error) {
      throw new Error(`خطأ في إنشاء الإشعار: ${error.message}`);
    }
  }

  /**
   * تشغيل محرك المراقبة التلقائية
   */
  startMonitoring(checkIntervalMinutes = 30) {
    if (this._monitoringActive) return { success: false, message: 'المراقبة نشطة مسبقاً' };

    this._monitoringActive = true;
    this._monitoringInterval = setInterval(
      async () => {
        await this.runMonitoringCycle();
      },
      checkIntervalMinutes * 60 * 1000
    );

    return { success: true, message: `بدأت المراقبة التلقائية (كل ${checkIntervalMinutes} دقيقة)` };
  }

  /**
   * إيقاف المراقبة
   */
  stopMonitoring() {
    if (this._monitoringInterval) {
      clearInterval(this._monitoringInterval);
      this._monitoringInterval = null;
    }
    this._monitoringActive = false;
    return { success: true, message: 'تم إيقاف المراقبة التلقائية' };
  }

  /**
   * دورة المراقبة - تفحص جميع الشروط
   */
  async runMonitoringCycle() {
    const results = [];
    try {
      // 1. فحص الإشعارات المنتهية الصلاحية
      await this._handleExpiredNotifications();

      // 2. تصعيد الإشعارات المعلقة
      const escalated = await this._processEscalationChains();
      results.push({ type: 'escalations_processed', count: escalated });

      this.emit('monitoring:cycle_complete', { timestamp: new Date(), results });
      return { success: true, results };
    } catch (error) {
      this.emit('monitoring:error', { error: error.message, timestamp: new Date() });
      return { success: false, error: error.message };
    }
  }

  /**
   * الإقرار بالإشعار (Acknowledge)
   */
  async acknowledgeNotification(notificationId, userId, notes = '') {
    const notification = await EscalationNotification.findOne({ notificationId });
    if (!notification) throw new Error('الإشعار غير موجود');

    notification.status = 'acknowledged';
    notification.resolvedBy = userId;
    notification.resolvedAt = new Date();
    notification.resolutionNotes = notes;

    // تحديث حالة المستلم
    notification.recipients.forEach(r => {
      if (r.userId?.toString() === userId.toString()) {
        r.acknowledgedAt = new Date();
        r.status = 'acknowledged';
      }
    });

    await notification.save();
    this.emit('notification:acknowledged', { notificationId, userId, notes });
    return { success: true, message: 'تم الإقرار بالإشعار بنجاح' };
  }

  /**
   * حل الإشعار
   */
  async resolveNotification(notificationId, userId, resolutionNotes) {
    const notification = await EscalationNotification.findOne({ notificationId });
    if (!notification) throw new Error('الإشعار غير موجود');

    notification.status = 'resolved';
    notification.resolvedBy = userId;
    notification.resolvedAt = new Date();
    notification.resolutionNotes = resolutionNotes;
    await notification.save();

    this.emit('notification:resolved', { notificationId, userId });
    return { success: true, message: 'تم حل الإشعار بنجاح' };
  }

  /**
   * الحصول على إشعارات المستخدم
   */
  async getUserNotifications(userId, { status, severity, page = 1, limit = 20 } = {}) {
    const query = {
      'recipients.userId': userId,
    };
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      EscalationNotification.find(query)
        .sort({ createdAt: -1, priority: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('beneficiaryId', 'name'),
      EscalationNotification.countDocuments(query),
    ]);

    return {
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount: notifications.filter(
        n => !n.recipients.find(r => r.userId?.toString() === userId?.toString())?.readAt
      ).length,
    };
  }

  /**
   * الحصول على إشعارات المستفيد
   */
  async getBeneficiaryNotifications(beneficiaryId) {
    const notifications = await EscalationNotification.find({ beneficiaryId })
      .sort({ createdAt: -1 })
      .limit(50);
    return { success: true, data: notifications, count: notifications.length };
  }

  /**
   * إحصائيات إشعارات القسم
   */
  async getDepartmentStats(department, dateFrom, dateTo) {
    const query = {
      createdAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
    };

    const stats = await EscalationNotification.aggregate([
      { $match: query },
      {
        $group: {
          _id: { severity: '$severity', status: '$status' },
          count: { $sum: 1 },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'resolved'] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
    ]);

    const totalActive = await EscalationNotification.countDocuments({
      ...query,
      status: 'active',
    });
    const critical = await EscalationNotification.countDocuments({
      ...query,
      severity: 'critical',
      status: 'active',
    });

    return {
      success: true,
      data: {
        breakdownBySeverityAndStatus: stats,
        totalActive,
        criticalActive: critical,
        dateRange: { from: dateFrom, to: dateTo },
      },
    };
  }

  /**
   * قواعد التصعيد
   */
  async getRules({ isActive, ruleType } = {}) {
    const query = {};
    if (isActive !== undefined) query.isActive = isActive;
    if (ruleType) query.ruleType = ruleType;
    const rules = await EscalationRule.find(query).sort({ severity: -1 });
    return { success: true, data: rules, count: rules.length };
  }

  async createRule(ruleData) {
    const rule = new EscalationRule(ruleData);
    await rule.save();
    return { success: true, data: rule, message: 'تم إنشاء قاعدة التصعيد بنجاح' };
  }

  async updateRule(ruleId, updates) {
    const rule = await EscalationRule.findOneAndUpdate({ ruleId }, updates, { new: true });
    if (!rule) throw new Error(`القاعدة ${ruleId} غير موجودة`);
    return { success: true, data: rule };
  }

  // ============================================================
  // دوال مساعدة خاصة
  // ============================================================
  _buildTitle(rule, data) {
    const titleMap = {
      session_missed: `🚨 تغيب متكرر - ${data?.beneficiaryName || 'مستفيد'}`,
      progress_stagnation: `⚠️ ركود في التقدم - ${data?.beneficiaryName || 'مستفيد'}`,
      iep_review_due: `📋 مراجعة IEP مستحقة - ${data?.beneficiaryName || 'مستفيد'}`,
      crisis_indicator: `🆘 مؤشر أزمة - ${data?.beneficiaryName || 'مستفيد'}`,
      assessment_due: `📊 تقييم دوري مستحق - ${data?.beneficiaryName || 'مستفيد'}`,
      goal_overdue: `🎯 هدف متأخر - ${data?.beneficiaryName || 'مستفيد'}`,
      family_contact_needed: `👨‍👩‍👧 تواصل مع الأسرة مطلوب - ${data?.beneficiaryName || 'مستفيد'}`,
      waitlist_overdue: `⏰ قائمة انتظار طويلة - ${data?.beneficiaryName || 'مستفيد'}`,
    };
    return titleMap[rule.ruleType] || `إشعار: ${rule.ruleName}`;
  }

  _buildMessage(template, data) {
    if (!template) return 'إشعار تلقائي من نظام الأوائل';
    return template
      .replace(/{beneficiaryName}/g, data?.beneficiaryName || 'المستفيد')
      .replace(/{count}/g, data?.count || '')
      .replace(/{days}/g, data?.days || '')
      .replace(/{goalTitle}/g, data?.goalTitle || '')
      .replace(/{therapistName}/g, data?.therapistName || '');
  }

  async _handleExpiredNotifications() {
    const expiredCount = await EscalationNotification.updateMany(
      {
        status: 'active',
        dueDate: { $lt: new Date() },
      },
      { $set: { status: 'expired' } }
    );
    return expiredCount.modifiedCount;
  }

  async _processEscalationChains() {
    const pendingEscalations = await EscalationNotification.find({
      status: 'active',
      nextEscalationAt: { $lte: new Date() },
    }).limit(100);

    let count = 0;
    for (const notification of pendingEscalations) {
      notification.escalationLevel += 1;
      notification.status = 'escalated';
      await notification.save();

      this.emit('notification:escalated', {
        notificationId: notification.notificationId,
        newLevel: notification.escalationLevel,
      });
      count++;
    }
    return count;
  }
}

module.exports = new EscalationNotificationsService();
module.exports.EscalationNotificationsService = EscalationNotificationsService;
module.exports.EscalationRule = EscalationRule;
module.exports.EscalationNotification = EscalationNotification;
module.exports.DEFAULT_ESCALATION_RULES = DEFAULT_ESCALATION_RULES;
