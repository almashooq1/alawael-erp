/* eslint-disable no-unused-vars */
/**
 * ═══════════════════════════════════════════════════════════════
 * Report Delivery Scheduler Service — خدمة جدولة وتوصيل التقارير
 * ═══════════════════════════════════════════════════════════════
 *
 * Automatically generates and delivers student reports via:
 *   - 📧 Email (with professional Arabic HTML templates)
 *   - 📱 WhatsApp (text summaries + document attachments)
 *
 * Frequencies: daily, weekly, monthly, quarterly, semi-annual, annual
 *
 * Integrates with:
 *   - student-service.js     → report generation
 *   - email-integration.service.js → email delivery
 *   - whatsapp-service.js    → WhatsApp delivery
 *   - scheduler-service.js   → cron scheduling
 */

const mongoose = require('mongoose');
const cron = require('node-cron');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// 📋 SCHEDULE SUBSCRIPTION SCHEMA
// ═══════════════════════════════════════════════════════════════

const ReportSubscriptionSchema = new mongoose.Schema(
  {
    // What to generate
    reportType: {
      type: String,
      required: true,
      enum: [
        'comprehensive',
        'academic-performance',
        'behavioral-analysis',
        'health-wellness',
        'family-engagement',
        'transition-readiness',
        'periodic',
        'comparison',
        'parent',
        'progress-timeline',
        'attendance',
        'progress',
        'therapist-effectiveness',
        'dashboard-analytics',
        'custom',
      ],
    },
    reportTitle: { type: String, required: true },

    // Scope
    scope: {
      type: { type: String, enum: ['student', 'center', 'multi'], default: 'center' },
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
      studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
      centerId: { type: String, default: 'default' },
    },

    // Schedule
    frequency: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'],
    },
    cronExpression: { type: String },
    scheduledTime: { type: String, default: '08:00' }, // HH:mm
    scheduledDayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday (for weekly)
    scheduledDayOfMonth: { type: Number, min: 1, max: 28 }, // for monthly+

    // Delivery channels
    channels: {
      email: {
        enabled: { type: Boolean, default: false },
        recipients: [
          {
            email: { type: String },
            name: { type: String },
            role: { type: String, enum: ['admin', 'therapist', 'parent', 'manager', 'other'] },
          },
        ],
        includeAttachment: { type: Boolean, default: true },
        format: { type: String, enum: ['html', 'pdf', 'csv'], default: 'html' },
      },
      whatsapp: {
        enabled: { type: Boolean, default: false },
        recipients: [
          {
            phone: { type: String },
            name: { type: String },
            role: { type: String },
          },
        ],
        sendSummary: { type: Boolean, default: true },
        sendDocument: { type: Boolean, default: false },
      },
    },

    // Custom report sections (for custom reports)
    customSections: [String],

    // Status
    status: { type: String, enum: ['active', 'paused', 'expired', 'error'], default: 'active' },
    isActive: { type: Boolean, default: true },

    // Execution tracking
    lastExecutedAt: Date,
    nextExecutionAt: Date,
    executionCount: { type: Number, default: 0 },
    lastExecutionStatus: { type: String, enum: ['success', 'partial', 'failed', null] },
    lastError: String,
    consecutiveFailures: { type: Number, default: 0 },

    // Validity
    startDate: { type: Date, default: Date.now },
    endDate: Date,

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    tags: [String],
  },
  {
    timestamps: true,
    collection: 'report_subscriptions',
  }
);

ReportSubscriptionSchema.index({ status: 1, frequency: 1 });
ReportSubscriptionSchema.index({ nextExecutionAt: 1 });
ReportSubscriptionSchema.index({ 'scope.centerId': 1 });
ReportSubscriptionSchema.index({ createdBy: 1 });

// ═══════════════════════════════════════════════════════════════
// 📋 DELIVERY LOG SCHEMA
// ═══════════════════════════════════════════════════════════════

const ReportDeliveryLogSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportSubscription',
      required: true,
    },
    reportType: String,
    frequency: String,

    // Execution
    executedAt: { type: Date, default: Date.now },
    duration: Number, // ms
    status: { type: String, enum: ['success', 'partial', 'failed'], required: true },

    // Report data
    reportGenerated: { type: Boolean, default: false },
    reportSummary: String,

    // Delivery results
    deliveries: [
      {
        channel: { type: String, enum: ['email', 'whatsapp'] },
        recipient: String,
        recipientName: String,
        status: { type: String, enum: ['sent', 'failed', 'skipped'] },
        error: String,
        sentAt: Date,
        messageId: String,
      },
    ],

    // Error tracking
    error: String,
    errorStack: String,
  },
  {
    timestamps: true,
    collection: 'report_delivery_logs',
  }
);

ReportDeliveryLogSchema.index({ subscriptionId: 1, executedAt: -1 });
ReportDeliveryLogSchema.index({ status: 1 });

// ═══════════════════════════════════════════════════════════════
// 🗓️ CRON EXPRESSION MAPPINGS
// ═══════════════════════════════════════════════════════════════

const FREQUENCY_CRON_MAP = {
  daily: time => {
    const [h, m] = (time || '08:00').split(':');
    return `${m} ${h} * * *`; // Every day at HH:MM
  },
  weekly: (time, dayOfWeek = 0) => {
    const [h, m] = (time || '08:00').split(':');
    return `${m} ${h} * * ${dayOfWeek}`; // Every week on dayOfWeek
  },
  monthly: (time, dayOfMonth = 1) => {
    const [h, m] = (time || '08:00').split(':');
    return `${m} ${h} ${dayOfMonth} * *`; // Monthly on dayOfMonth
  },
  quarterly: (time, dayOfMonth = 1) => {
    const [h, m] = (time || '08:00').split(':');
    return `${m} ${h} ${dayOfMonth} 1,4,7,10 *`; // Jan,Apr,Jul,Oct
  },
  'semi-annual': (time, dayOfMonth = 1) => {
    const [h, m] = (time || '08:00').split(':');
    return `${m} ${h} ${dayOfMonth} 1,7 *`; // Jan, Jul
  },
  annual: (time, dayOfMonth = 1) => {
    const [h, m] = (time || '08:00').split(':');
    return `${m} ${h} ${dayOfMonth} 1 *`; // January 1st
  },
};

// ═══════════════════════════════════════════════════════════════
// 📧 REPORT EMAIL TEMPLATE BUILDER
// ═══════════════════════════════════════════════════════════════

function buildReportEmailHtml(reportData, subscription) {
  const {
    wrapInLayout,
    buildInfoCard,
    buildButton,
  } = require('../services/email-integration.service');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';

  const frequencyLabels = {
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    'semi-annual': 'نصف سنوي',
    annual: 'سنوي',
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  // Build summary section from report data
  let summaryHtml = '';
  if (reportData) {
    const summary = reportData.summary || reportData.overview || {};
    const entries = [];

    // Common fields
    if (summary.totalStudents != null) entries.push(['إجمالي الطلاب', summary.totalStudents]);
    if (summary.activeStudents != null) entries.push(['الطلاب النشطون', summary.activeStudents]);
    if (summary.avgAttendance != null) entries.push(['معدل الحضور', `${summary.avgAttendance}%`]);
    if (summary.avgProgress != null) entries.push(['معدل التقدم', `${summary.avgProgress}%`]);
    if (summary.studentsAtRisk != null) entries.push(['طلاب في خطر', summary.studentsAtRisk]);
    if (reportData.gpa != null) entries.push(['المعدل التراكمي', reportData.gpa]);
    if (reportData.overallScore != null)
      entries.push(['الدرجة الإجمالية', `${reportData.overallScore}%`]);
    if (reportData.readinessScore != null)
      entries.push(['درجة الجاهزية', `${reportData.readinessScore}%`]);
    if (reportData.behaviorScore != null)
      entries.push(['درجة السلوك', `${reportData.behaviorScore}%`]);

    // Student specific
    if (reportData.student) {
      const s = reportData.student;
      const name = s.personalInfo
        ? `${s.personalInfo.firstName?.ar || ''} ${s.personalInfo.lastName?.ar || ''}`.trim()
        : s.name || '';
      if (name) entries.unshift(['اسم الطالب', name]);
    }

    if (entries.length > 0) {
      summaryHtml = buildInfoCard(entries);
    } else {
      summaryHtml =
        '<div class="info-card"><p>تم إنشاء التقرير بنجاح. يتضمن جميع البيانات المطلوبة.</p></div>';
    }
  }

  // Build highlights section
  let highlightsHtml = '';
  if (reportData?.highlights && Array.isArray(reportData.highlights)) {
    highlightsHtml = `
      <h3>📌 أبرز النقاط</h3>
      <ul style="padding-right: 20px; margin: 10px 0;">
        ${reportData.highlights.map(h => `<li style="margin: 5px 0;">${h}</li>`).join('')}
      </ul>
    `;
  }

  // Build recommendations section
  let recsHtml = '';
  if (reportData?.recommendations && Array.isArray(reportData.recommendations)) {
    recsHtml = `
      <h3>💡 التوصيات</h3>
      <ul style="padding-right: 20px; margin: 10px 0;">
        ${reportData.recommendations.map(r => `<li style="margin: 5px 0;">${typeof r === 'string' ? r : r.text || r.description || ''}</li>`).join('')}
      </ul>
    `;
  }

  return wrapInLayout(
    'تقرير دوري تلقائي',
    `
    <h2>📊 ${subscription.reportTitle}</h2>
    <p style="color: #666; font-size: 14px;">
      تقرير ${frequencyLabels[subscription.frequency] || subscription.frequency} — ${dateStr} الساعة ${timeStr}
    </p>

    <div style="background: #f0f7ff; border-right: 4px solid #1976d2; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
      <strong>📋 نوع التقرير:</strong> ${subscription.reportTitle}<br>
      <strong>🗓️ التكرار:</strong> ${frequencyLabels[subscription.frequency]}<br>
      <strong>📅 التاريخ:</strong> ${dateStr}
    </div>

    ${summaryHtml}
    ${highlightsHtml}
    ${recsHtml}

    ${buildButton('عرض التقرير الكامل', `${frontendUrl}/student-reports-center`)}

    <div style="margin-top: 20px; padding: 12px; background: #f8f9fa; border-radius: 4px; font-size: 12px; color: #666;">
      <p style="margin: 0;">📬 هذا التقرير تم إرساله تلقائياً وفقاً لجدولتك. يمكنك إدارة اشتراكاتك من <a href="${frontendUrl}/student-reports-center">مركز التقارير</a>.</p>
    </div>
  `,
    { preheader: `${subscription.reportTitle} — ${dateStr}` }
  );
}

// ═══════════════════════════════════════════════════════════════
// 📱 WHATSAPP REPORT MESSAGE BUILDER
// ═══════════════════════════════════════════════════════════════

function buildReportWhatsAppMessage(reportData, subscription) {
  const frequencyLabels = {
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    'semi-annual': 'نصف سنوي',
    annual: 'سنوي',
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let msg = `📊 *${subscription.reportTitle}*\n`;
  msg += `🗓️ تقرير ${frequencyLabels[subscription.frequency]} — ${dateStr}\n`;
  msg += `─────────────────\n`;

  const summary = reportData?.summary || reportData?.overview || {};
  if (summary.totalStudents != null) msg += `👥 إجمالي الطلاب: *${summary.totalStudents}*\n`;
  if (summary.activeStudents != null) msg += `✅ الطلاب النشطون: *${summary.activeStudents}*\n`;
  if (summary.avgAttendance != null) msg += `📅 معدل الحضور: *${summary.avgAttendance}%*\n`;
  if (summary.avgProgress != null) msg += `📈 معدل التقدم: *${summary.avgProgress}%*\n`;
  if (summary.studentsAtRisk != null) msg += `⚠️ طلاب في خطر: *${summary.studentsAtRisk}*\n`;
  if (reportData?.gpa != null) msg += `🎓 المعدل التراكمي: *${reportData.gpa}*\n`;
  if (reportData?.overallScore != null)
    msg += `📊 الدرجة الإجمالية: *${reportData.overallScore}%*\n`;
  if (reportData?.readinessScore != null)
    msg += `🎯 درجة الجاهزية: *${reportData.readinessScore}%*\n`;

  // Student name
  if (reportData?.student) {
    const s = reportData.student;
    const name = s.personalInfo
      ? `${s.personalInfo.firstName?.ar || ''} ${s.personalInfo.lastName?.ar || ''}`.trim()
      : s.name || '';
    if (name)
      msg =
        `📊 *${subscription.reportTitle}*\n👤 الطالب: *${name}*\n` +
        msg.split('\n').slice(1).join('\n');
  }

  // Highlights
  if (reportData?.highlights && Array.isArray(reportData.highlights)) {
    msg += `\n📌 *أبرز النقاط:*\n`;
    reportData.highlights.slice(0, 5).forEach(h => {
      msg += `  • ${h}\n`;
    });
  }

  // Recommendations
  if (reportData?.recommendations && Array.isArray(reportData.recommendations)) {
    msg += `\n💡 *التوصيات:*\n`;
    reportData.recommendations.slice(0, 3).forEach(r => {
      const text = typeof r === 'string' ? r : r.text || r.description || '';
      if (text) msg += `  • ${text}\n`;
    });
  }

  msg += `\n─────────────────\n`;
  msg += `🔗 عرض التقرير الكامل:\n${process.env.FRONTEND_URL || 'http://localhost:3002'}/student-reports-center\n`;
  msg += `\n📬 تقرير تلقائي — مركز الأوائل للتأهيل`;

  return msg;
}

// ═══════════════════════════════════════════════════════════════
// 🗓️ REPORT SCHEDULER SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class ReportSchedulerService {
  constructor() {
    this.ReportSubscription = null;
    this.ReportDeliveryLog = null;
    this.scheduledJobs = new Map(); // subscriptionId → cron task
    this.studentService = null;
    this.emailService = null;
    this.whatsappService = null;
    this.initialized = false;
    this.stats = { totalDelivered: 0, totalFailed: 0, activeSubscriptions: 0 };
  }

  /**
   * Initialize the service
   */
  async initialize(connection) {
    try {
      // Setup Mongoose models
      this.ReportSubscription =
        connection.models.ReportSubscription ||
        connection.model('ReportSubscription', ReportSubscriptionSchema);
      this.ReportDeliveryLog =
        connection.models.ReportDeliveryLog ||
        connection.model('ReportDeliveryLog', ReportDeliveryLogSchema);

      // Lazy-load dependent services
      try {
        const { StudentService } = require('./student-service');
        this.studentService = new StudentService(connection);
      } catch (e) {
        logger.warn('[ReportScheduler] StudentService not available:', e.message);
      }

      try {
        const { emailIntegration } = require('../services/email-integration.service');
        this.emailService = emailIntegration;
      } catch (e) {
        logger.warn('[ReportScheduler] EmailIntegration not available:', e.message);
      }

      try {
        const { whatsappService } = require('../communication/whatsapp-service');
        this.whatsappService = whatsappService;
      } catch (e) {
        logger.warn('[ReportScheduler] WhatsAppService not available:', e.message);
      }

      // Load and schedule all active subscriptions
      await this.loadActiveSubscriptions();

      this.initialized = true;
      logger.info(
        `✅ [ReportScheduler] Initialized — ${this.stats.activeSubscriptions} active subscriptions`
      );
    } catch (error) {
      logger.error('[ReportScheduler] Initialization error:', error.message);
    }
  }

  /**
   * Load all active subscriptions and schedule them
   */
  async loadActiveSubscriptions() {
    const subs = await this.ReportSubscription.find({
      status: 'active',
      isActive: true,
      $or: [{ endDate: null }, { endDate: { $gte: new Date() } }],
    });

    for (const sub of subs) {
      this.scheduleSubscription(sub);
    }
    this.stats.activeSubscriptions = subs.length;
    logger.info(`[ReportScheduler] Loaded ${subs.length} active subscriptions`);
  }

  /**
   * Schedule a single subscription
   */
  scheduleSubscription(sub) {
    // Unschedule if already exists
    this.unscheduleSubscription(sub._id.toString());

    // Build cron expression
    const cronExpr =
      sub.cronExpression ||
      FREQUENCY_CRON_MAP[sub.frequency]?.(
        sub.scheduledTime,
        sub.frequency === 'weekly' ? sub.scheduledDayOfWeek : sub.scheduledDayOfMonth
      );

    if (!cronExpr || !cron.validate(cronExpr)) {
      logger.warn(`[ReportScheduler] Invalid cron for sub ${sub._id}: ${cronExpr}`);
      return;
    }

    const task = cron.schedule(
      cronExpr,
      () => {
        this.executeSubscription(sub._id.toString()).catch(err => {
          logger.error(`[ReportScheduler] Execution error for ${sub._id}:`, err.message);
        });
      },
      { timezone: 'Asia/Riyadh' }
    );

    this.scheduledJobs.set(sub._id.toString(), task);

    // Update next execution time
    this.updateNextExecution(sub);
  }

  /**
   * Unschedule a subscription
   */
  unscheduleSubscription(subId) {
    const existing = this.scheduledJobs.get(subId);
    if (existing) {
      existing.stop();
      this.scheduledJobs.delete(subId);
    }
  }

  /**
   * Execute a subscription — generate report and deliver
   */
  async executeSubscription(subId) {
    const startTime = Date.now();
    let sub;
    const logEntry = {
      subscriptionId: subId,
      executedAt: new Date(),
      deliveries: [],
      status: 'failed',
    };

    try {
      sub = await this.ReportSubscription.findById(subId);
      if (!sub || sub.status !== 'active' || !sub.isActive) {
        logger.info(`[ReportScheduler] Skip inactive sub ${subId}`);
        return;
      }

      // Check expiry
      if (sub.endDate && new Date() > sub.endDate) {
        sub.status = 'expired';
        sub.isActive = false;
        await sub.save();
        this.unscheduleSubscription(subId);
        return;
      }

      logEntry.reportType = sub.reportType;
      logEntry.frequency = sub.frequency;

      // ──── Step 1: Generate Report ────
      const reportData = await this.generateReport(sub);
      logEntry.reportGenerated = !!reportData;

      if (!reportData) {
        logEntry.error = 'Report generation returned null';
        logEntry.status = 'failed';
        sub.consecutiveFailures += 1;
        sub.lastError = 'فشل إنشاء التقرير';
        await sub.save();
        await this.ReportDeliveryLog.create(logEntry);
        return;
      }

      // Build summary for log
      const summary = reportData.summary || reportData.overview || {};
      logEntry.reportSummary = JSON.stringify(summary).substring(0, 500);

      // ──── Step 2: Deliver via Email ────
      if (sub.channels?.email?.enabled && sub.channels.email.recipients?.length > 0) {
        const emailResults = await this.deliverViaEmail(reportData, sub);
        logEntry.deliveries.push(...emailResults);
      }

      // ──── Step 3: Deliver via WhatsApp ────
      if (sub.channels?.whatsapp?.enabled && sub.channels.whatsapp.recipients?.length > 0) {
        const waResults = await this.deliverViaWhatsApp(reportData, sub);
        logEntry.deliveries.push(...waResults);
      }

      // ──── Step 4: Determine overall status ────
      const totalDeliveries = logEntry.deliveries.length;
      const sentCount = logEntry.deliveries.filter(d => d.status === 'sent').length;
      const failedCount = logEntry.deliveries.filter(d => d.status === 'failed').length;

      if (totalDeliveries === 0) {
        logEntry.status = 'failed';
        logEntry.error = 'لا يوجد مستلمين';
      } else if (failedCount === 0) {
        logEntry.status = 'success';
        this.stats.totalDelivered += sentCount;
      } else if (sentCount > 0) {
        logEntry.status = 'partial';
        this.stats.totalDelivered += sentCount;
        this.stats.totalFailed += failedCount;
      } else {
        logEntry.status = 'failed';
        this.stats.totalFailed += failedCount;
      }

      // ──── Step 5: Update subscription ────
      sub.lastExecutedAt = new Date();
      sub.executionCount += 1;
      sub.lastExecutionStatus = logEntry.status;
      sub.lastError = logEntry.status === 'failed' ? logEntry.error || 'فشل التوصيل' : null;
      sub.consecutiveFailures = logEntry.status === 'failed' ? sub.consecutiveFailures + 1 : 0;
      this.updateNextExecution(sub);
      await sub.save();

      // Auto-pause after 5 consecutive failures
      if (sub.consecutiveFailures >= 5) {
        sub.status = 'error';
        sub.isActive = false;
        await sub.save();
        this.unscheduleSubscription(subId);
        logger.warn(`[ReportScheduler] Auto-paused sub ${subId} after 5 consecutive failures`);
      }
    } catch (error) {
      logEntry.status = 'failed';
      logEntry.error = error.message;
      logEntry.errorStack = error.stack?.substring(0, 1000);
      logger.error(`[ReportScheduler] Execute error for ${subId}:`, error.message);

      if (sub) {
        sub.consecutiveFailures = (sub.consecutiveFailures || 0) + 1;
        sub.lastError = error.message;
        sub.lastExecutionStatus = 'failed';
        await sub.save().catch(() => {});
      }
    } finally {
      logEntry.duration = Date.now() - startTime;
      await this.ReportDeliveryLog.create(logEntry).catch(err => {
        logger.error('[ReportScheduler] Failed to create delivery log:', err.message);
      });
    }
  }

  /**
   * Generate report based on subscription config
   */
  async generateReport(sub) {
    if (!this.studentService) {
      logger.error('[ReportScheduler] StudentService not available');
      return null;
    }

    try {
      const { reportType, scope, customSections } = sub;
      const studentId = scope?.studentId?.toString();
      const centerId = scope?.centerId || 'default';

      switch (reportType) {
        case 'comprehensive':
          return studentId ? await this.studentService.getComprehensiveReport(studentId) : null;

        case 'academic-performance':
          return studentId
            ? await this.studentService.getAcademicPerformanceReport(studentId)
            : null;

        case 'behavioral-analysis':
          return studentId
            ? await this.studentService.getBehavioralAnalysisReport(studentId)
            : null;

        case 'health-wellness':
          return studentId ? await this.studentService.getHealthWellnessReport(studentId) : null;

        case 'family-engagement':
          return studentId ? await this.studentService.getFamilyEngagementReport(studentId) : null;

        case 'transition-readiness':
          return studentId
            ? await this.studentService.getTransitionReadinessReport(studentId)
            : null;

        case 'parent':
          return studentId ? await this.studentService.getParentReport(studentId) : null;

        case 'progress-timeline':
          return studentId ? await this.studentService.getStudentProgressTimeline(studentId) : null;

        case 'attendance':
          return await this.studentService.getAttendanceReport(centerId, null, null);

        case 'progress':
          return await this.studentService.getProgressReport(centerId);

        case 'periodic':
          return await this.studentService.getPeriodicReport(centerId, {});

        case 'comparison':
          if (scope?.studentIds?.length >= 2) {
            return await this.studentService.getStudentComparisonReport(
              scope.studentIds.map(id => id.toString())
            );
          }
          return null;

        case 'therapist-effectiveness':
          return await this.studentService.getTherapistEffectivenessReport(centerId);

        case 'dashboard-analytics':
          return await this.studentService.getDashboardAnalytics(centerId);

        case 'custom':
          if (studentId && customSections?.length > 0) {
            return await this.studentService.buildCustomReport(studentId, customSections);
          }
          return null;

        default:
          logger.warn(`[ReportScheduler] Unknown report type: ${reportType}`);
          return null;
      }
    } catch (error) {
      logger.error(`[ReportScheduler] Report generation error:`, error.message);
      return null;
    }
  }

  /**
   * Deliver report via Email
   */
  async deliverViaEmail(reportData, sub) {
    const results = [];

    for (const recipient of sub.channels.email.recipients) {
      const result = {
        channel: 'email',
        recipient: recipient.email,
        recipientName: recipient.name,
        status: 'failed',
      };

      try {
        if (!recipient.email) {
          result.status = 'skipped';
          result.error = 'لا يوجد بريد إلكتروني';
          results.push(result);
          continue;
        }

        const emailHtml = buildReportEmailHtml(reportData, sub);

        if (this.emailService && this.emailService.initialized) {
          const sent = await this.emailService.send({
            to: recipient.email,
            subject: `📊 ${sub.reportTitle} — تقرير تلقائي`,
            html: emailHtml,
          });
          result.status = 'sent';
          result.sentAt = new Date();
          result.messageId = sent?.messageId || null;
        } else {
          // Fallback: try nodemailer directly
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
              user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
              pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD || '',
            },
          });

          const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@alawael-erp.com',
            to: recipient.email,
            subject: `📊 ${sub.reportTitle} — تقرير تلقائي`,
            html: emailHtml,
          });
          result.status = 'sent';
          result.sentAt = new Date();
          result.messageId = info.messageId;
        }
      } catch (error) {
        result.status = 'failed';
        result.error = error.message;
        logger.error(
          `[ReportScheduler] Email delivery failed to ${recipient.email}:`,
          error.message
        );
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Deliver report via WhatsApp
   */
  async deliverViaWhatsApp(reportData, sub) {
    const results = [];

    for (const recipient of sub.channels.whatsapp.recipients) {
      const result = {
        channel: 'whatsapp',
        recipient: recipient.phone,
        recipientName: recipient.name,
        status: 'failed',
      };

      try {
        if (!recipient.phone) {
          result.status = 'skipped';
          result.error = 'لا يوجد رقم هاتف';
          results.push(result);
          continue;
        }

        const message = buildReportWhatsAppMessage(reportData, sub);

        if (this.whatsappService) {
          const sent = await this.whatsappService.sendText(recipient.phone, message);
          result.status = 'sent';
          result.sentAt = new Date();
          result.messageId = sent?.messageId || null;
        } else {
          result.status = 'skipped';
          result.error = 'خدمة الواتساب غير متاحة';
        }
      } catch (error) {
        result.status = 'failed';
        result.error = error.message;
        logger.error(
          `[ReportScheduler] WhatsApp delivery failed to ${recipient.phone}:`,
          error.message
        );
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Calculate and update next execution time
   */
  updateNextExecution(sub) {
    const now = new Date();
    const [h, m] = (sub.scheduledTime || '08:00').split(':').map(Number);
    const next = new Date(now);
    next.setHours(h, m, 0, 0);

    switch (sub.frequency) {
      case 'daily':
        if (next <= now) next.setDate(next.getDate() + 1);
        break;

      case 'weekly': {
        const targetDay = sub.scheduledDayOfWeek || 0;
        const currentDay = next.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd < 0 || (daysToAdd === 0 && next <= now)) daysToAdd += 7;
        next.setDate(next.getDate() + daysToAdd);
        break;
      }

      case 'monthly': {
        const targetDom = sub.scheduledDayOfMonth || 1;
        next.setDate(targetDom);
        if (next <= now) next.setMonth(next.getMonth() + 1);
        break;
      }

      case 'quarterly': {
        const targetDom = sub.scheduledDayOfMonth || 1;
        const quarterMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
        next.setDate(targetDom);
        const curMonth = now.getMonth();
        const nextQMonth = quarterMonths.find(m => m > curMonth);
        next.setMonth(nextQMonth != null ? nextQMonth : quarterMonths[0]);
        if (nextQMonth == null) next.setFullYear(next.getFullYear() + 1);
        if (next <= now) {
          const idx = quarterMonths.indexOf(next.getMonth());
          next.setMonth(quarterMonths[(idx + 1) % 4]);
          if ((idx + 1) % 4 === 0) next.setFullYear(next.getFullYear() + 1);
        }
        break;
      }

      case 'semi-annual': {
        const targetDom = sub.scheduledDayOfMonth || 1;
        next.setDate(targetDom);
        if (now.getMonth() < 6) {
          next.setMonth(6);
        } else {
          next.setMonth(0);
          next.setFullYear(next.getFullYear() + 1);
        }
        if (next <= now) {
          next.setMonth(next.getMonth() + 6);
          if (next.getMonth() > 11) {
            next.setFullYear(next.getFullYear() + 1);
            next.setMonth(next.getMonth() - 12);
          }
        }
        break;
      }

      case 'annual': {
        const targetDom = sub.scheduledDayOfMonth || 1;
        next.setMonth(0, targetDom);
        if (next <= now) next.setFullYear(next.getFullYear() + 1);
        break;
      }
    }

    sub.nextExecutionAt = next;
  }

  // ═══════════════════════════════════════════════════════════
  // 📋 CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * Create a new report subscription
   */
  async createSubscription(data) {
    // Build cron expression
    const cronExpr = FREQUENCY_CRON_MAP[data.frequency]?.(
      data.scheduledTime,
      data.frequency === 'weekly' ? data.scheduledDayOfWeek : data.scheduledDayOfMonth
    );

    const sub = new this.ReportSubscription({
      ...data,
      cronExpression: cronExpr,
      status: 'active',
      isActive: true,
    });

    // Calculate next execution
    this.updateNextExecution(sub);

    await sub.save();

    // Schedule immediately
    this.scheduleSubscription(sub);
    this.stats.activeSubscriptions += 1;

    logger.info(
      `[ReportScheduler] Created subscription: ${sub._id} (${sub.reportType} / ${sub.frequency})`
    );
    return sub;
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(subId, data) {
    const sub = await this.ReportSubscription.findById(subId);
    if (!sub) throw new Error('الاشتراك غير موجود');

    // Update fields
    Object.assign(sub, data);

    // Recalculate cron
    if (
      data.frequency ||
      data.scheduledTime ||
      data.scheduledDayOfWeek ||
      data.scheduledDayOfMonth
    ) {
      sub.cronExpression = FREQUENCY_CRON_MAP[sub.frequency]?.(
        sub.scheduledTime,
        sub.frequency === 'weekly' ? sub.scheduledDayOfWeek : sub.scheduledDayOfMonth
      );
      this.updateNextExecution(sub);
    }

    sub.updatedAt = new Date();
    await sub.save();

    // Reschedule
    if (sub.isActive && sub.status === 'active') {
      this.scheduleSubscription(sub);
    } else {
      this.unscheduleSubscription(subId);
    }

    return sub;
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(subId) {
    this.unscheduleSubscription(subId);
    const result = await this.ReportSubscription.findByIdAndDelete(subId);
    if (result) this.stats.activeSubscriptions = Math.max(0, this.stats.activeSubscriptions - 1);
    return result;
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(subId) {
    const sub = await this.ReportSubscription.findById(subId);
    if (!sub) throw new Error('الاشتراك غير موجود');
    sub.status = 'paused';
    sub.isActive = false;
    await sub.save();
    this.unscheduleSubscription(subId);
    return sub;
  }

  /**
   * Resume a subscription
   */
  async resumeSubscription(subId) {
    const sub = await this.ReportSubscription.findById(subId);
    if (!sub) throw new Error('الاشتراك غير موجود');
    sub.status = 'active';
    sub.isActive = true;
    sub.consecutiveFailures = 0;
    sub.lastError = null;
    this.updateNextExecution(sub);
    await sub.save();
    this.scheduleSubscription(sub);
    return sub;
  }

  /**
   * Execute a subscription immediately (manual trigger)
   */
  async executeNow(subId) {
    return this.executeSubscription(subId);
  }

  /**
   * List all subscriptions with filters
   */
  async listSubscriptions(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.frequency) query.frequency = filters.frequency;
    if (filters.reportType) query.reportType = filters.reportType;
    if (filters.centerId) query['scope.centerId'] = filters.centerId;
    if (filters.createdBy) query.createdBy = filters.createdBy;

    const subs = await this.ReportSubscription.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100);

    return subs;
  }

  /**
   * Get a single subscription
   */
  async getSubscription(subId) {
    return this.ReportSubscription.findById(subId);
  }

  /**
   * Get delivery logs for a subscription
   */
  async getDeliveryLogs(subId, limit = 20) {
    return this.ReportDeliveryLog.find({ subscriptionId: subId })
      .sort({ executedAt: -1 })
      .limit(limit);
  }

  /**
   * Get overall statistics
   */
  async getStatistics() {
    const [total, active, paused, errored] = await Promise.all([
      this.ReportSubscription.countDocuments(),
      this.ReportSubscription.countDocuments({ status: 'active', isActive: true }),
      this.ReportSubscription.countDocuments({ status: 'paused' }),
      this.ReportSubscription.countDocuments({ status: 'error' }),
    ]);

    const recentLogs = await this.ReportDeliveryLog.find().sort({ executedAt: -1 }).limit(100);

    const last24h = recentLogs.filter(l => Date.now() - l.executedAt < 86400000);
    const last7d = recentLogs.filter(l => Date.now() - l.executedAt < 604800000);

    const byFrequency = await this.ReportSubscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$frequency', count: { $sum: 1 } } },
    ]);

    const byChannel = await this.ReportSubscription.aggregate([
      { $match: { status: 'active' } },
      {
        $project: {
          emailEnabled: '$channels.email.enabled',
          whatsappEnabled: '$channels.whatsapp.enabled',
        },
      },
      {
        $group: {
          _id: null,
          email: { $sum: { $cond: ['$emailEnabled', 1, 0] } },
          whatsapp: { $sum: { $cond: ['$whatsappEnabled', 1, 0] } },
        },
      },
    ]);

    const upcomingExecutions = await this.ReportSubscription.find({
      status: 'active',
      isActive: true,
      nextExecutionAt: { $gte: new Date() },
    })
      .sort({ nextExecutionAt: 1 })
      .limit(10)
      .select('reportTitle frequency nextExecutionAt channels');

    return {
      subscriptions: { total, active, paused, errored },
      deliveries: {
        last24h: {
          total: last24h.length,
          success: last24h.filter(l => l.status === 'success').length,
          failed: last24h.filter(l => l.status === 'failed').length,
        },
        last7d: {
          total: last7d.length,
          success: last7d.filter(l => l.status === 'success').length,
          failed: last7d.filter(l => l.status === 'failed').length,
        },
      },
      byFrequency: byFrequency.reduce((acc, f) => {
        acc[f._id] = f.count;
        return acc;
      }, {}),
      byChannel: byChannel[0] || { email: 0, whatsapp: 0 },
      upcomingExecutions,
    };
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    for (const [id, task] of this.scheduledJobs) {
      task.stop();
    }
    this.scheduledJobs.clear();
    logger.info('[ReportScheduler] Shutdown complete');
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON & EXPORTS
// ═══════════════════════════════════════════════════════════════

const reportSchedulerService = new ReportSchedulerService();

module.exports = {
  ReportSchedulerService,
  reportSchedulerService,
  ReportSubscriptionSchema,
  ReportDeliveryLogSchema,
  FREQUENCY_CRON_MAP,
  buildReportEmailHtml,
  buildReportWhatsAppMessage,
};
