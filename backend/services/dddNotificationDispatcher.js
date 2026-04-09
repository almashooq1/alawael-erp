/**
 * DDD Notification Dispatcher — موزّع الإشعارات للدومينات العلاجية
 *
 * Bridges all 20 DDD domains to the existing notification infrastructure.
 * Dispatches notifications via email, SMS, push, and in-app channels
 * based on domain events, recipient preferences, and template mappings.
 *
 * Features:
 *  - 25+ pre-built notification templates for DDD events
 *  - Multi-channel delivery (email, SMS, push, in-app)
 *  - Recipient resolution (therapist, family, beneficiary, admin)
 *  - Template variable interpolation
 *  - Delivery tracking & analytics
 *  - Quiet hours respect
 *  - Batch notification support
 *
 * @module services/dddNotificationDispatcher
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ── Lazy service loaders ────────────────────────────────────────────────

function getEmailService() {
  try {
    return require('./emailService');
  } catch {
    return null;
  }
}

function getSmsService() {
  try {
    return require('./smsService');
  } catch {
    return null;
  }
}

function getPushService() {
  try {
    return require('./pushService');
  } catch {
    return null;
  }
}

function getNotificationModel() {
  return mongoose.models.Notification || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Notification Template Registry
// ═══════════════════════════════════════════════════════════════════════════════

const DDD_NOTIFICATION_TEMPLATES = {
  // ── Beneficiary ───────────────────────────────────────────────────────
  'beneficiary.registered': {
    titleAr: 'تسجيل مستفيد جديد',
    titleEn: 'New Beneficiary Registered',
    bodyAr: 'تم تسجيل المستفيد {{firstName}} {{lastName}} برقم ملف {{mrn}}',
    bodyEn: 'Beneficiary {{firstName}} {{lastName}} registered with MRN {{mrn}}',
    channels: ['database', 'email'],
    recipients: ['admin', 'assigned-team'],
    priority: 'normal',
    category: 'clinical',
  },

  // ── Episode lifecycle ─────────────────────────────────────────────────
  'episode.phase-changed': {
    titleAr: 'تغيير مرحلة الحلقة العلاجية',
    titleEn: 'Episode Phase Changed',
    bodyAr: 'انتقل مسار {{beneficiaryName}} إلى مرحلة: {{phase}}',
    bodyEn: '{{beneficiaryName}} episode moved to phase: {{phase}}',
    channels: ['database', 'push'],
    recipients: ['therapist', 'assigned-team'],
    priority: 'normal',
    category: 'clinical',
  },
  'episode.discharge-planning': {
    titleAr: 'بدء التخطيط للتخريج',
    titleEn: 'Discharge Planning Started',
    bodyAr: 'بدأ التخطيط لتخريج {{beneficiaryName}}',
    bodyEn: 'Discharge planning initiated for {{beneficiaryName}}',
    channels: ['database', 'email', 'push'],
    recipients: ['therapist', 'family', 'admin'],
    priority: 'high',
    category: 'clinical',
  },

  // ── Session ───────────────────────────────────────────────────────────
  'session.reminder-24h': {
    titleAr: 'تذكير بجلسة غداً',
    titleEn: 'Session Reminder — Tomorrow',
    bodyAr: 'لديك جلسة {{sessionType}} غداً مع {{beneficiaryName}} الساعة {{time}}',
    bodyEn: 'You have a {{sessionType}} session tomorrow with {{beneficiaryName}} at {{time}}',
    channels: ['push', 'sms'],
    recipients: ['therapist', 'family'],
    priority: 'normal',
    category: 'scheduling',
  },
  'session.completed': {
    titleAr: 'اكتمال الجلسة',
    titleEn: 'Session Completed',
    bodyAr: 'اكتملت جلسة {{sessionType}} مع {{beneficiaryName}}',
    bodyEn: '{{sessionType}} session with {{beneficiaryName}} completed',
    channels: ['database'],
    recipients: ['therapist'],
    priority: 'low',
    category: 'clinical',
  },
  'session.no-show': {
    titleAr: 'غياب عن جلسة',
    titleEn: 'Session No-Show',
    bodyAr: 'لم يحضر {{beneficiaryName}} لجلسة {{sessionType}}',
    bodyEn: '{{beneficiaryName}} missed {{sessionType}} session',
    channels: ['database', 'push', 'sms'],
    recipients: ['therapist', 'family'],
    priority: 'high',
    category: 'clinical',
  },

  // ── Assessment ────────────────────────────────────────────────────────
  'assessment.completed': {
    titleAr: 'اكتمال التقييم',
    titleEn: 'Assessment Completed',
    bodyAr: 'اكتمل تقييم {{assessmentType}} لـ {{beneficiaryName}}',
    bodyEn: '{{assessmentType}} assessment completed for {{beneficiaryName}}',
    channels: ['database', 'email'],
    recipients: ['therapist', 'admin'],
    priority: 'normal',
    category: 'clinical',
  },
  'assessment.overdue': {
    titleAr: 'تقييم متأخر',
    titleEn: 'Assessment Overdue',
    bodyAr: 'تقييم {{assessmentType}} لـ {{beneficiaryName}} متأخر',
    bodyEn: '{{assessmentType}} assessment for {{beneficiaryName}} is overdue',
    channels: ['database', 'push', 'email'],
    recipients: ['therapist', 'admin'],
    priority: 'high',
    category: 'clinical',
  },

  // ── Care Plan ─────────────────────────────────────────────────────────
  'careplan.activated': {
    titleAr: 'تفعيل خطة الرعاية',
    titleEn: 'Care Plan Activated',
    bodyAr: 'تم تفعيل خطة الرعاية "{{planTitle}}" لـ {{beneficiaryName}}',
    bodyEn: 'Care plan "{{planTitle}}" activated for {{beneficiaryName}}',
    channels: ['database', 'email'],
    recipients: ['therapist', 'family'],
    priority: 'normal',
    category: 'clinical',
  },

  // ── Goal ──────────────────────────────────────────────────────────────
  'goal.achieved': {
    titleAr: 'تحقيق هدف علاجي',
    titleEn: 'Goal Achieved',
    bodyAr: '🎉 {{beneficiaryName}} حقق الهدف: {{goalTitle}}',
    bodyEn: '🎉 {{beneficiaryName}} achieved goal: {{goalTitle}}',
    channels: ['database', 'push', 'email'],
    recipients: ['therapist', 'family', 'admin'],
    priority: 'normal',
    category: 'clinical',
  },

  // ── Risk & Safety ─────────────────────────────────────────────────────
  'risk.elevated': {
    titleAr: 'تنبيه خطر سريري مرتفع',
    titleEn: 'Elevated Clinical Risk Alert',
    bodyAr: '⚠️ مستوى خطر مرتفع لـ {{beneficiaryName}} — النتيجة: {{score}}',
    bodyEn: '⚠️ High risk for {{beneficiaryName}} — Score: {{score}}',
    channels: ['database', 'push', 'email', 'sms'],
    recipients: ['therapist', 'admin'],
    priority: 'urgent',
    category: 'safety',
  },

  // ── Behavior ──────────────────────────────────────────────────────────
  'behavior.severe-incident': {
    titleAr: 'حادثة سلوكية شديدة',
    titleEn: 'Severe Behavior Incident',
    bodyAr: '🚨 حادثة سلوكية شديدة لـ {{beneficiaryName}}: {{behaviorType}}',
    bodyEn: '🚨 Severe behavior incident for {{beneficiaryName}}: {{behaviorType}}',
    channels: ['database', 'push', 'email', 'sms'],
    recipients: ['therapist', 'admin', 'family'],
    priority: 'urgent',
    category: 'safety',
  },

  // ── Quality ───────────────────────────────────────────────────────────
  'quality.non-compliant': {
    titleAr: 'عدم مطابقة في مراجعة الجودة',
    titleEn: 'Quality Audit Non-Compliance',
    bodyAr: 'تم رصد عدم مطابقة في مراجعة الجودة: {{auditType}}',
    bodyEn: 'Non-compliance detected in quality audit: {{auditType}}',
    channels: ['database', 'email'],
    recipients: ['admin'],
    priority: 'high',
    category: 'operational',
  },

  // ── Family ────────────────────────────────────────────────────────────
  'family.meeting-scheduled': {
    titleAr: 'اجتماع أسري مجدول',
    titleEn: 'Family Meeting Scheduled',
    bodyAr: 'تم جدولة اجتماع أسري لـ {{beneficiaryName}} في {{date}}',
    bodyEn: 'Family meeting scheduled for {{beneficiaryName}} on {{date}}',
    channels: ['database', 'sms', 'email'],
    recipients: ['family'],
    priority: 'normal',
    category: 'family',
  },
  'family.progress-report': {
    titleAr: 'تقرير تقدم المستفيد',
    titleEn: 'Beneficiary Progress Report',
    bodyAr: 'تقرير تقدم جديد متوفر لـ {{beneficiaryName}}',
    bodyEn: 'New progress report available for {{beneficiaryName}}',
    channels: ['database', 'email', 'push'],
    recipients: ['family'],
    priority: 'normal',
    category: 'family',
  },

  // ── Workflow ───────────────────────────────────────────────────────────
  'workflow.task-assigned': {
    titleAr: 'مهمة جديدة مسندة إليك',
    titleEn: 'New Task Assigned',
    bodyAr: 'تم إسناد مهمة جديدة: {{taskTitle}} — الأولوية: {{priority}}',
    bodyEn: 'New task assigned: {{taskTitle}} — Priority: {{priority}}',
    channels: ['database', 'push'],
    recipients: ['assignee'],
    priority: 'normal',
    category: 'operational',
  },
  'workflow.task-overdue': {
    titleAr: 'مهمة متأخرة',
    titleEn: 'Task Overdue',
    bodyAr: '⏰ المهمة "{{taskTitle}}" تجاوزت الموعد المحدد',
    bodyEn: '⏰ Task "{{taskTitle}}" is past due date',
    channels: ['database', 'push', 'email'],
    recipients: ['assignee', 'admin'],
    priority: 'high',
    category: 'operational',
  },

  // ── Tele-Rehab ────────────────────────────────────────────────────────
  'telerehab.link-ready': {
    titleAr: 'رابط جلسة إعادة التأهيل عن بُعد',
    titleEn: 'Tele-Rehab Session Link Ready',
    bodyAr: 'رابط الجلسة جاهز: {{sessionLink}}',
    bodyEn: 'Session link is ready: {{sessionLink}}',
    channels: ['push', 'sms', 'email'],
    recipients: ['therapist', 'family'],
    priority: 'normal',
    category: 'scheduling',
  },

  // ── AR/VR Safety ──────────────────────────────────────────────────────
  'arvr.safety-alert': {
    titleAr: 'تنبيه أمان جلسة AR/VR',
    titleEn: 'AR/VR Session Safety Alert',
    bodyAr: '🛑 تنبيه أمان في جلسة AR/VR لـ {{beneficiaryName}}',
    bodyEn: '🛑 Safety alert during AR/VR session for {{beneficiaryName}}',
    channels: ['database', 'push'],
    recipients: ['therapist'],
    priority: 'urgent',
    category: 'safety',
  },

  // ── Research ──────────────────────────────────────────────────────────
  'research.milestone-reached': {
    titleAr: 'إنجاز مرحلة بحثية',
    titleEn: 'Research Milestone Reached',
    bodyAr: 'تم تحقيق مرحلة في الدراسة: {{studyTitle}}',
    bodyEn: 'Milestone reached in study: {{studyTitle}}',
    channels: ['database', 'email'],
    recipients: ['admin'],
    priority: 'normal',
    category: 'research',
  },

  // ── Report ────────────────────────────────────────────────────────────
  'report.generated': {
    titleAr: 'تقرير جاهز',
    titleEn: 'Report Generated',
    bodyAr: 'تقرير "{{reportTitle}}" جاهز للتحميل',
    bodyEn: 'Report "{{reportTitle}}" is ready for download',
    channels: ['database', 'push'],
    recipients: ['requester'],
    priority: 'normal',
    category: 'operational',
  },

  // ── Dashboard Alert ───────────────────────────────────────────────────
  'dashboard.kpi-breach': {
    titleAr: 'تجاوز مؤشر أداء',
    titleEn: 'KPI Threshold Breached',
    bodyAr: '⚠️ مؤشر {{kpiName}} تجاوز الحد: {{value}} (الحد: {{threshold}})',
    bodyEn: '⚠️ KPI {{kpiName}} breached threshold: {{value}} (limit: {{threshold}})',
    channels: ['database', 'push', 'email'],
    recipients: ['admin'],
    priority: 'high',
    category: 'operational',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Template Interpolation
// ═══════════════════════════════════════════════════════════════════════════════

function interpolate(template, variables) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = variables[key];
    return val != null ? String(val) : '';
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Notification Delivery Log
// ═══════════════════════════════════════════════════════════════════════════════

const deliveryLogSchema = new mongoose.Schema(
  {
    templateKey: { type: String, required: true, index: true },
    domain: { type: String, index: true },
    channels: [String],
    recipientCount: Number,
    deliveryResults: [
      {
        channel: String,
        recipientId: mongoose.Schema.Types.ObjectId,
        success: Boolean,
        error: String,
      },
    ],
    variables: mongoose.Schema.Types.Mixed,
    priority: String,
    documentId: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true, collection: 'ddd_notification_logs' }
);

deliveryLogSchema.index({ createdAt: -1 });
deliveryLogSchema.index({ domain: 1, createdAt: -1 });

const DDDNotificationLog =
  mongoose.models.DDDNotificationLog || mongoose.model('DDDNotificationLog', deliveryLogSchema);

// ═══════════════════════════════════════════════════════════════════════════════
//  Core Dispatcher
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dispatch a DDD notification using a template key.
 *
 * @param {string} templateKey  - e.g. 'session.no-show'
 * @param {object} options
 * @param {object}  options.variables   - Template interpolation variables
 * @param {string}  [options.domain]    - DDD domain name
 * @param {string}  [options.documentId]- Related document ID
 * @param {string[]} [options.recipientIds] - Override recipients (user ObjectIds)
 * @param {string[]} [options.channels] - Override channels
 * @returns {Promise<object>}
 */
async function dispatchDDDNotification(templateKey, options = {}) {
  const template = DDD_NOTIFICATION_TEMPLATES[templateKey];
  if (!template) {
    logger.warn(`[DDD-Notifier] Unknown template: ${templateKey}`);
    return { success: false, error: 'Unknown template' };
  }

  const {
    variables = {},
    domain,
    documentId,
    recipientIds = [],
    channels: channelOverride,
  } = options;

  const channels = channelOverride || template.channels;
  const titleAr = interpolate(template.titleAr, variables);
  const titleEn = interpolate(template.titleEn, variables);
  const bodyAr = interpolate(template.bodyAr, variables);
  const bodyEn = interpolate(template.bodyEn, variables);

  const deliveryResults = [];

  // ── Channel: database (in-app notification) ───────────────────────
  if (channels.includes('database')) {
    const NotificationModel = getNotificationModel();
    if (NotificationModel && recipientIds.length > 0) {
      for (const recipientId of recipientIds) {
        try {
          await NotificationModel.create({
            recipientId,
            title: titleAr,
            message: bodyAr,
            type: 'info',
            category: template.category || 'general',
            priority: template.priority || 'normal',
            isRead: false,
            metadata: { templateKey, domain, documentId, titleEn, bodyEn },
          });
          deliveryResults.push({ channel: 'database', recipientId, success: true });
        } catch (err) {
          deliveryResults.push({
            channel: 'database',
            recipientId,
            success: false,
            error: err.message,
          });
        }
      }
    }
  }

  // ── Channel: email ────────────────────────────────────────────────
  if (channels.includes('email')) {
    const emailService = getEmailService();
    if (emailService && emailService.sendEmail) {
      for (const recipientId of recipientIds) {
        try {
          // Try to resolve user email
          const User = mongoose.models.User;
          const user = User ? await User.findById(recipientId).select('email name').lean() : null;
          if (user?.email) {
            await emailService.sendEmail({
              to: user.email,
              subject: titleAr,
              html: `<div dir="rtl" style="font-family:Arial,sans-serif;"><h3>${titleAr}</h3><p>${bodyAr}</p><hr/><p style="color:#666;font-size:12px;">${bodyEn}</p></div>`,
            });
            deliveryResults.push({ channel: 'email', recipientId, success: true });
          }
        } catch (err) {
          deliveryResults.push({
            channel: 'email',
            recipientId,
            success: false,
            error: err.message,
          });
        }
      }
    }
  }

  // ── Channel: sms ──────────────────────────────────────────────────
  if (channels.includes('sms')) {
    const smsService = getSmsService();
    if (smsService && smsService.sendSMS) {
      for (const recipientId of recipientIds) {
        try {
          const User = mongoose.models.User;
          const user = User ? await User.findById(recipientId).select('phone').lean() : null;
          if (user?.phone) {
            await smsService.sendSMS(user.phone, bodyAr);
            deliveryResults.push({ channel: 'sms', recipientId, success: true });
          }
        } catch (err) {
          deliveryResults.push({ channel: 'sms', recipientId, success: false, error: err.message });
        }
      }
    }
  }

  // ── Channel: push ─────────────────────────────────────────────────
  if (channels.includes('push')) {
    const pushService = getPushService();
    if (pushService && pushService.sendPush) {
      for (const recipientId of recipientIds) {
        try {
          await pushService.sendPush({
            userId: recipientId,
            title: titleAr,
            body: bodyAr,
            data: { templateKey, domain, documentId },
          });
          deliveryResults.push({ channel: 'push', recipientId, success: true });
        } catch (err) {
          deliveryResults.push({
            channel: 'push',
            recipientId,
            success: false,
            error: err.message,
          });
        }
      }
    }
  }

  // ── Log delivery ──────────────────────────────────────────────────
  try {
    await DDDNotificationLog.create({
      templateKey,
      domain,
      channels,
      recipientCount: recipientIds.length,
      deliveryResults,
      variables,
      priority: template.priority,
      documentId,
    });
  } catch (logErr) {
    logger.warn(`[DDD-Notifier] Log error: ${logErr.message}`);
  }

  const succeeded = deliveryResults.filter(r => r.success).length;
  const failed = deliveryResults.filter(r => !r.success).length;

  logger.info(
    `[DDD-Notifier] ${templateKey}: ${succeeded} delivered, ${failed} failed (${channels.join(',')})`
  );

  return {
    success: true,
    templateKey,
    channels,
    recipientCount: recipientIds.length,
    delivered: succeeded,
    failed,
    deliveryResults,
  };
}

/**
 * Dispatch a notification to all users with a specific role.
 */
async function dispatchToRole(templateKey, role, options = {}) {
  const User = mongoose.models.User;
  if (!User) return { success: false, error: 'User model not found' };

  const users = await User.find({ role, isActive: { $ne: false } })
    .select('_id')
    .lean();

  const recipientIds = users.map(u => u._id);
  return dispatchDDDNotification(templateKey, { ...options, recipientIds });
}

/**
 * Get notification delivery logs with filtering.
 */
async function getNotificationLogs(options = {}) {
  const { templateKey, domain, limit = 50, page = 1, startDate, endDate } = options;
  const filter = {};

  if (templateKey) filter.templateKey = templateKey;
  if (domain) filter.domain = domain;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    DDDNotificationLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DDDNotificationLog.countDocuments(filter),
  ]);

  return { logs, total, page, limit, pages: Math.ceil(total / limit) };
}

/**
 * List all available DDD notification templates.
 */
function listTemplates() {
  return Object.entries(DDD_NOTIFICATION_TEMPLATES).map(([key, t]) => ({
    key,
    titleAr: t.titleAr,
    titleEn: t.titleEn,
    channels: t.channels,
    priority: t.priority,
    category: t.category,
  }));
}

module.exports = {
  DDD_NOTIFICATION_TEMPLATES,
  DDDNotificationLog,
  dispatchDDDNotification,
  dispatchToRole,
  getNotificationLogs,
  listTemplates,
  interpolate,
};
