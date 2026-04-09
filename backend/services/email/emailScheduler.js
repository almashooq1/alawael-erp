/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Email Scheduler — جدولة البريد الإلكتروني
 * ═══════════════════════════════════════════════════════════════
 *
 * Handles scheduled email tasks:
 *  - Daily digest for managers
 *  - Payment reminders for overdue invoices
 *  - Appointment reminders (24h/1h before)
 *  - Expiring document alerts
 *  - Weekly performance summaries
 *  - Old log cleanup
 *
 * Uses node-cron or simple setInterval-based scheduling.
 */

const logger = require('../../utils/logger');
const EmailConfig = require('./EmailConfig');

class EmailScheduler {
  /**
   * @param {import('./EmailManager')} emailManager
   */
  constructor(emailManager) {
    this.emailManager = emailManager;
    this._timers = [];
    this._running = false;
    this._lastRuns = {};

    // Data access functions (set externally)
    this._dataProviders = {
      getManagersForDigest: null,
      getOverdueInvoices: null,
      getUpcomingAppointments: null,
      getExpiringDocuments: null,
      getPendingApprovals: null,
    };

    // Digest aggregator reference (set via setDigestAggregator)
    this._digestAggregator = null;
  }

  /**
   * Wire a digest aggregator for scheduled flushing.
   * @param {import('./EmailDigestAggregator').EmailDigestAggregator} aggregator
   */
  setDigestAggregator(aggregator) {
    this._digestAggregator = aggregator;
    logger.info('[EmailScheduler] 📬 Digest aggregator connected for scheduled flushing');
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 START / STOP
  // ═══════════════════════════════════════════════════════════

  /**
   * Start all scheduled jobs
   * @param {Object} dataProviders - Functions that retrieve data for scheduled emails
   */
  start(dataProviders = {}) {
    if (this._running) return;

    Object.assign(this._dataProviders, dataProviders);

    // Try to use node-cron if available
    let cron;
    try {
      cron = require('node-cron');
    } catch {
      logger.debug('[EmailScheduler] node-cron not available, using setInterval');
    }

    if (cron) {
      this._startWithCron(cron);
    } else {
      this._startWithIntervals();
    }

    this._running = true;
    logger.info('[EmailScheduler] 🕒 Started scheduled email jobs');
  }

  stop() {
    for (const timer of this._timers) {
      if (timer.stop) timer.stop(); // node-cron
      if (timer.unref) clearInterval(timer); // setInterval
    }
    this._timers = [];
    this._running = false;
    logger.info('[EmailScheduler] ⏹️ Stopped');
  }

  // ── Cron-based scheduling ─────────────────────────────────

  _startWithCron(cron) {
    // Daily digest — Every day at 7:00 AM
    this._timers.push(
      cron.schedule('0 7 * * *', () => this._runDailyDigest(), { timezone: 'Asia/Riyadh' })
    );

    // Payment reminders — Every day at 9:00 AM
    this._timers.push(
      cron.schedule('0 9 * * *', () => this._runPaymentReminders(), { timezone: 'Asia/Riyadh' })
    );

    // Appointment reminders (24h) — Every day at 8:00 PM
    this._timers.push(
      cron.schedule('0 20 * * *', () => this._runAppointmentReminders24h(), {
        timezone: 'Asia/Riyadh',
      })
    );

    // Appointment reminders (1h) — Every 30 minutes
    this._timers.push(cron.schedule('*/30 * * * *', () => this._runAppointmentReminders1h()));

    // Expiring documents — Every day at 10:00 AM
    this._timers.push(
      cron.schedule('0 10 * * *', () => this._runExpiringDocumentAlerts(), {
        timezone: 'Asia/Riyadh',
      })
    );

    // Pending approvals reminder — Monday & Wednesday at 9:00 AM
    this._timers.push(
      cron.schedule('0 9 * * 1,3', () => this._runPendingApprovalReminders(), {
        timezone: 'Asia/Riyadh',
      })
    );

    // Log cleanup — Every Sunday at 3:00 AM
    this._timers.push(
      cron.schedule('0 3 * * 0', () => this._runLogCleanup(), { timezone: 'Asia/Riyadh' })
    );

    // Weekly performance summary — Every Sunday at 8:00 AM
    this._timers.push(
      cron.schedule('0 8 * * 0', () => this._runWeeklyPerformanceSummary(), {
        timezone: 'Asia/Riyadh',
      })
    );
  }

  // ── Interval-based fallback ───────────────────────────────

  _startWithIntervals() {
    // Daily tasks — check every hour if it's time
    const dailyCheck = setInterval(
      () => {
        const hour = new Date().getHours();
        const today = new Date().toDateString();

        if (hour === 7 && this._lastRuns.digest !== today) {
          this._lastRuns.digest = today;
          this._runDailyDigest();
        }
        if (hour === 9 && this._lastRuns.payment !== today) {
          this._lastRuns.payment = today;
          this._runPaymentReminders();
        }
        if (hour === 20 && this._lastRuns.appointment24 !== today) {
          this._lastRuns.appointment24 = today;
          this._runAppointmentReminders24h();
        }
        if (hour === 10 && this._lastRuns.documents !== today) {
          this._lastRuns.documents = today;
          this._runExpiringDocumentAlerts();
        }
      },
      60 * 60 * 1000
    ); // every hour

    // Appointment 1h reminder — every 30 min
    const apt1h = setInterval(() => this._runAppointmentReminders1h(), 30 * 60 * 1000);

    // Cleanup — weekly
    const cleanup = setInterval(() => this._runLogCleanup(), 7 * 24 * 60 * 60 * 1000);

    // Weekly performance summary — every Sunday at 8 AM (check hourly)
    const weeklyPerf = setInterval(
      () => {
        const now = new Date();
        const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;
        if (now.getDay() === 0 && now.getHours() === 8 && this._lastRuns.weeklyPerf !== weekKey) {
          this._lastRuns.weeklyPerf = weekKey;
          this._runWeeklyPerformanceSummary();
        }
      },
      60 * 60 * 1000
    );

    this._timers.push(dailyCheck, apt1h, cleanup, weeklyPerf);
  }

  // ═══════════════════════════════════════════════════════════
  // 📋 SCHEDULED TASKS
  // ═══════════════════════════════════════════════════════════

  /**
   * Daily digest for managers/admins
   */
  async _runDailyDigest() {
    logger.info('[EmailScheduler] 📋 Running daily digest...');

    try {
      if (!this._dataProviders.getManagersForDigest) {
        logger.debug('[EmailScheduler] No getManagersForDigest provider, skipping');
        return;
      }

      const managers = await this._dataProviders.getManagersForDigest();
      if (!managers || !managers.length) return;

      let sent = 0;
      for (const manager of managers) {
        if (!manager.email) continue;
        try {
          await this.emailManager.sendDailyDigest(manager.email, {
            name: manager.name || manager.fullName,
            stats: manager.stats || [],
            tasks: manager.tasks || [],
            appointments: manager.appointments || [],
            notifications: manager.notifications || [],
            tasksCount: manager.tasksCount || manager.tasks?.length || 0,
            appointmentsCount: manager.appointmentsCount || manager.appointments?.length || 0,
          });
          sent++;
        } catch (err) {
          logger.debug(`[EmailScheduler] digest to ${manager.email}: ${err.message}`);
        }
      }

      logger.info(`[EmailScheduler] ✅ Daily digest sent to ${sent}/${managers.length} managers`);
    } catch (err) {
      logger.error(`[EmailScheduler] Daily digest error: ${err.message}`);
    }

    // Also flush the digest aggregator's daily queue
    if (this._digestAggregator) {
      try {
        const flushResult = await this._digestAggregator.flushDaily();
        logger.info(
          `[EmailScheduler] 📬 Daily digest aggregator flushed: ${flushResult.sent} sent, ${flushResult.failed} failed`
        );
      } catch (err) {
        logger.error(`[EmailScheduler] Digest aggregator flush error: ${err.message}`);
      }
    }
  }

  /**
   * Payment reminders for overdue invoices
   */
  async _runPaymentReminders() {
    logger.info('[EmailScheduler] 💰 Running payment reminders...');

    try {
      if (!this._dataProviders.getOverdueInvoices) {
        logger.debug('[EmailScheduler] No getOverdueInvoices provider, skipping');
        return;
      }

      const invoices = await this._dataProviders.getOverdueInvoices();
      if (!invoices || !invoices.length) return;

      let sent = 0;
      for (const invoice of invoices) {
        const email = invoice.customerEmail || invoice.email;
        if (!email) continue;
        try {
          await this.emailManager.sendPaymentReminder({
            ...invoice,
            email,
            overdueDays: invoice.overdueDays || _calcOverdueDays(invoice.dueDate),
          });
          sent++;
        } catch (err) {
          logger.debug(
            `[EmailScheduler] payment reminder ${invoice.invoiceNumber}: ${err.message}`
          );
        }
      }

      logger.info(`[EmailScheduler] ✅ Payment reminders: ${sent}/${invoices.length}`);
    } catch (err) {
      logger.error(`[EmailScheduler] Payment reminders error: ${err.message}`);
    }
  }

  /**
   * Appointment reminders — 24 hours before
   */
  async _runAppointmentReminders24h() {
    logger.info('[EmailScheduler] 📅 Running 24h appointment reminders...');

    try {
      if (!this._dataProviders.getUpcomingAppointments) return;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const appointments = await this._dataProviders.getUpcomingAppointments(
        _startOfDay(tomorrow),
        _endOfDay(tomorrow)
      );

      if (!appointments || !appointments.length) return;

      let sent = 0;
      for (const apt of appointments) {
        try {
          const result = await this.emailManager.sendAppointmentReminder(apt);
          if (result.success) sent++;
        } catch (err) {
          logger.debug(`[EmailScheduler] apt reminder: ${err.message}`);
        }
      }

      logger.info(`[EmailScheduler] ✅ 24h reminders: ${sent}/${appointments.length}`);
    } catch (err) {
      logger.error(`[EmailScheduler] Appointment reminders error: ${err.message}`);
    }
  }

  /**
   * Appointment reminders — 1 hour before
   */
  async _runAppointmentReminders1h() {
    try {
      if (!this._dataProviders.getUpcomingAppointments) return;

      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const appointments = await this._dataProviders.getUpcomingAppointments(now, oneHourLater);

      if (!appointments || !appointments.length) return;

      let sent = 0;
      for (const apt of appointments) {
        try {
          const result = await this.emailManager.sendAppointmentReminder({
            ...apt,
            urgentReminder: true,
          });
          if (result.success) sent++;
        } catch {
          /* silent — frequent job */
        }
      }

      if (sent > 0) {
        logger.info(`[EmailScheduler] ✅ 1h reminders: ${sent}/${appointments.length}`);
      }
    } catch {
      /* silent */
    }
  }

  /**
   * Expiring document alerts
   */
  async _runExpiringDocumentAlerts() {
    logger.info('[EmailScheduler] 📄 Running expiring document alerts...');

    try {
      if (!this._dataProviders.getExpiringDocuments) return;

      const documents = await this._dataProviders.getExpiringDocuments();
      if (!documents || !documents.length) return;

      let sent = 0;
      for (const doc of documents) {
        const email = doc.ownerEmail || doc.userEmail || doc.email;
        if (!email) continue;
        try {
          await this.emailManager.sendAlert(
            {
              title: `مستند قارب على الانتهاء: ${doc.name || doc.type || ''}`,
              message: `المستند "${doc.name || doc.type}" ينتهز بتاريخ ${new Date(doc.expiryDate).toLocaleDateString('ar-SA')}. يرجى التجديد.`,
              severity: 'warning',
              source: 'نظام المستندات',
              actionUrl: `${process.env.FRONTEND_URL || ''}/documents`,
            },
            email
          );
          sent++;
        } catch {
          /* continue */
        }
      }

      logger.info(`[EmailScheduler] ✅ Document alerts: ${sent}/${documents.length}`);
    } catch (err) {
      logger.error(`[EmailScheduler] Document alerts error: ${err.message}`);
    }
  }

  /**
   * Pending approval reminders
   */
  async _runPendingApprovalReminders() {
    logger.info('[EmailScheduler] 📋 Running pending approval reminders...');

    try {
      if (!this._dataProviders.getPendingApprovals) return;

      const approvals = await this._dataProviders.getPendingApprovals();
      if (!approvals || !approvals.length) return;

      // Group by approver
      const grouped = {};
      for (const a of approvals) {
        const email = a.approverEmail || a.email;
        if (!email) continue;
        if (!grouped[email]) grouped[email] = { email, name: a.approverName, items: [] };
        grouped[email].items.push(a);
      }

      let sent = 0;
      for (const approver of Object.values(grouped)) {
        try {
          await this.emailManager.sendNotification(approver.email, {
            title: `لديك ${approver.items.length} طلب(ات) بانتظار الاعتماد`,
            message: `لديك طلبات معلقة تحتاج مراجعتك: ${approver.items.map(i => i.type || i.title || 'طلب').join('، ')}`,
            actionUrl: `${process.env.FRONTEND_URL || ''}/approvals`,
            actionText: 'مراجعة الطلبات',
          });
          sent++;
        } catch {
          /* continue */
        }
      }

      logger.info(`[EmailScheduler] ✅ Approval reminders: ${sent} approvers notified`);
    } catch (err) {
      logger.error(`[EmailScheduler] Approval reminders error: ${err.message}`);
    }
  }

  /**
   * Weekly performance summary — email system health report for admins
   */
  async _runWeeklyPerformanceSummary() {
    logger.info('[EmailScheduler] 📊 Running weekly performance summary...');

    try {
      // Gather stats from EmailManager and analytics
      let stats = {};
      try {
        stats = await this.emailManager.getStats();
      } catch {
        stats = { provider: 'unknown', inMemory: { sent: 0, failed: 0 } };
      }

      let analyticsData = {};
      try {
        const EmailAnalytics = require('./EmailAnalytics');
        const analytics = new EmailAnalytics(this.emailManager);
        analyticsData = await analytics.getDashboard();
      } catch {
        analyticsData = {};
      }

      // Circuit breaker status
      const cbStats = this.emailManager._circuitBreaker?.stats || {};

      // Build summary data
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const summaryData = {
        period: `${weekStart.toLocaleDateString('ar-SA')} - ${new Date().toLocaleDateString('ar-SA')}`,
        provider: stats.provider || 'unknown',
        totals: {
          sent: stats.inMemory?.sent || analyticsData?.week?.sent || 0,
          failed: stats.inMemory?.failed || analyticsData?.week?.failed || 0,
          queued: stats.inMemory?.queued || 0,
          bounced: stats.inMemory?.bounced || 0,
        },
        circuitBreaker: {
          state: cbStats.state || 'N/A',
          totalTrips: cbStats.totalTrips || 0,
          totalFailovers: cbStats.totalFailovers || 0,
        },
        rateLimit: stats.rateLimit || {},
      };

      // Calculate success rate
      const total = summaryData.totals.sent + summaryData.totals.failed;
      summaryData.successRate =
        total > 0 ? ((summaryData.totals.sent / total) * 100).toFixed(1) + '%' : 'N/A';

      // Send to admin/manager recipients
      const getManagers = this._dataProviders.getManagersForDigest;
      let recipients = [];

      if (typeof getManagers === 'function') {
        try {
          recipients = await getManagers();
        } catch {
          recipients = [];
        }
      }

      // Fallback to system admin email
      if (recipients.length === 0) {
        const adminEmail = process.env.ADMIN_EMAIL || process.env.HR_EMAIL;
        if (adminEmail) recipients = [{ email: adminEmail, name: 'Admin' }];
      }

      let sent = 0;
      for (const recipient of recipients) {
        try {
          await this.emailManager.send({
            to: recipient.email,
            subject: `📊 تقرير أداء البريد الأسبوعي — ${summaryData.period}`,
            html: this._buildWeeklyReportHtml(summaryData),
            metadata: { type: 'weekly_performance', autoRetry: false },
          });
          sent++;
        } catch {
          /* continue */
        }
      }

      logger.info(`[EmailScheduler] ✅ Weekly performance summary: sent to ${sent} recipients`);
    } catch (err) {
      logger.error(`[EmailScheduler] Weekly performance error: ${err.message}`);
    }

    // Also flush the digest aggregator's weekly queue
    if (this._digestAggregator) {
      try {
        const flushResult = await this._digestAggregator.flushWeekly();
        logger.info(
          `[EmailScheduler] 📬 Weekly digest aggregator flushed: ${flushResult.sent} sent, ${flushResult.failed} failed`
        );
      } catch (err) {
        logger.error(`[EmailScheduler] Weekly digest flush error: ${err.message}`);
      }
    }
  }

  /**
   * Build HTML for weekly performance report
   */
  _buildWeeklyReportHtml(data) {
    const rows = [
      ['الرسائل المرسلة', data.totals.sent, '✅'],
      ['الرسائل الفاشلة', data.totals.failed, '❌'],
      ['في الانتظار', data.totals.queued, '📋'],
      ['الارتداد', data.totals.bounced, '↩️'],
    ]
      .map(
        ([label, value, icon]) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px">${icon} ${label}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:18px;font-weight:bold;text-align:center">${value}</td>
      </tr>`
      )
      .join('');

    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Tahoma,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:20px">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">📊 تقرير أداء البريد الأسبوعي</h1>
          <p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px">${data.period}</p>
        </div>
        <div style="padding:24px">
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center">
            <h3 style="margin:0 0 8px;color:#333">نسبة النجاح</h3>
            <span style="font-size:36px;font-weight:bold;color:${parseFloat(data.successRate) >= 95 ? '#28a745' : parseFloat(data.successRate) >= 80 ? '#ffc107' : '#dc3545'}">${data.successRate}</span>
          </div>
          <h3 style="color:#667eea;border-bottom:2px solid #667eea;padding-bottom:8px">📈 إحصائيات الأسبوع</h3>
          <table style="width:100%;border-collapse:collapse">${rows}</table>
          <h3 style="color:#667eea;border-bottom:2px solid #667eea;padding-bottom:8px;margin-top:24px">⚙️ حالة النظام</h3>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px">🔌 المزود</td>
              <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px;text-align:center">${data.provider}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px">🔄 قاطع الدائرة</td>
              <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px;text-align:center">${data.circuitBreaker.state}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px">⚡ عمليات التبديل</td>
              <td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px;text-align:center">${data.circuitBreaker.totalFailovers}</td>
            </tr>
          </table>
        </div>
        <div style="background:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#888">
          تقرير تلقائي — نظام الأوائل ERP
        </div>
      </div>
    </body>
    </html>`;
  }

  /**
   * Clean up old email logs
   */
  async _runLogCleanup() {
    logger.info('[EmailScheduler] 🧹 Running email log cleanup...');

    try {
      const EmailAnalytics = require('./EmailAnalytics');
      const analytics = new EmailAnalytics(this.emailManager);
      const result = await analytics.cleanup();
      logger.info(`[EmailScheduler] ✅ Cleanup: ${result.deleted} old logs removed`);
    } catch (err) {
      logger.error(`[EmailScheduler] Cleanup error: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🔧 MANUAL TRIGGERS
  // ═══════════════════════════════════════════════════════════

  /** Run a specific job manually */
  async runJob(jobName) {
    const jobs = {
      dailyDigest: () => this._runDailyDigest(),
      paymentReminders: () => this._runPaymentReminders(),
      appointmentReminders24h: () => this._runAppointmentReminders24h(),
      appointmentReminders1h: () => this._runAppointmentReminders1h(),
      expiringDocuments: () => this._runExpiringDocumentAlerts(),
      pendingApprovals: () => this._runPendingApprovalReminders(),
      logCleanup: () => this._runLogCleanup(),
      weeklyPerformance: () => this._runWeeklyPerformanceSummary(),
    };

    if (!jobs[jobName]) {
      return { success: false, error: `Unknown job: ${jobName}`, availableJobs: Object.keys(jobs) };
    }

    await jobs[jobName]();
    return { success: true, job: jobName, ranAt: new Date() };
  }

  /** List all available jobs */
  getJobs() {
    return [
      { name: 'dailyDigest', schedule: 'Every day 7:00 AM', description: 'ملخص يومي للمديرين' },
      {
        name: 'paymentReminders',
        schedule: 'Every day 9:00 AM',
        description: 'تذكير بالفواتير المتأخرة',
      },
      {
        name: 'appointmentReminders24h',
        schedule: 'Every day 8:00 PM',
        description: 'تذكير بالمواعيد (24 ساعة)',
      },
      {
        name: 'appointmentReminders1h',
        schedule: 'Every 30 min',
        description: 'تذكير بالمواعيد (ساعة واحدة)',
      },
      {
        name: 'expiringDocuments',
        schedule: 'Every day 10:00 AM',
        description: 'تنبيه المستندات المنتهية',
      },
      {
        name: 'pendingApprovals',
        schedule: 'Mon & Wed 9:00 AM',
        description: 'تذكير بالاعتمادات المعلقة',
      },
      {
        name: 'logCleanup',
        schedule: 'Every Sunday 3:00 AM',
        description: 'تنظيف السجلات القديمة',
      },
      {
        name: 'weeklyPerformance',
        schedule: 'Every Sunday 8:00 AM',
        description: 'تقرير أداء البريد الأسبوعي',
      },
    ];
  }

  getStats() {
    return {
      running: this._running,
      timers: this._timers.length,
      lastRuns: this._lastRuns,
      jobs: this.getJobs(),
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────

function _calcOverdueDays(dueDate) {
  if (!dueDate) return 0;
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function _startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function _endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

module.exports = EmailScheduler;
