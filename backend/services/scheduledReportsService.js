/**
 * خدمة جدولة التقارير الدورية
 * Scheduled Reports Service
 *
 * جدولة وتنفيذ تقارير دورية تلقائية
 * Schedule and execute periodic reports automatically
 */

const schedule = require('node-schedule');
const logger = require('../../utils/logger');

class ScheduledReportsService {
  constructor() {
    this.jobs = new Map();
    this.reportQueue = [];
    this.history = [];
    this.maxHistory = 1000;
  }

  /**
   * جدولة تقرير دوري
   * Schedule periodic report
   */
  scheduleReport(config) {
    const {
      id = this.generateId(),
      name,
      type,
      frequency, // 'daily', 'weekly', 'monthly', 'custom'
      time = '09:00', // HH:MM
      recipients = [],
      filters = {},
      format = 'pdf',
    } = config;

    try {
      let cronExpression = this.getCronExpression(frequency, time);

      const job = schedule.scheduleJob(cronExpression, () => {
        this.executeScheduledReport({
          id,
          name,
          type,
          recipients,
          format,
          filters,
          scheduledTime: new Date().toISOString(),
        });
      });

      this.jobs.set(id, {
        id,
        name,
        type,
        frequency,
        time,
        recipients,
        format,
        filters,
        createdAt: new Date().toISOString(),
        nextRun: job.nextInvocation(),
        job,
      });

      logger.info(`[Scheduled Reports] Report scheduled: ${name} (${id})`);

      return {
        id,
        status: 'scheduled',
        nextRun: job.nextInvocation(),
      };
    } catch (error) {
      logger.error('[Scheduled Reports] Error scheduling report:', error);
      throw error;
    }
  }

  /**
   * تنفيذ تقرير مجدول
   * Execute scheduled report
   */
  async executeScheduledReport(config) {
    try {
      logger.info(`[Scheduled Reports] Executing report: ${config.name}`);

      const reportRecord = {
        id: this.generateId(),
        ...config,
        status: 'executing',
        startTime: new Date().toISOString(),
        result: null,
      };

      this.reportQueue.push(reportRecord);

      // محاكاة توليد التقرير
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      reportRecord.status = 'completed';
      reportRecord.endTime = new Date().toISOString();
      reportRecord.duration = new Date(reportRecord.endTime) - new Date(reportRecord.startTime);

      // أرسل عبر البريد
      if (config.recipients.length > 0) {
        await this.sendReportEmail(config.name, config.recipients, config.format);
      }

      this.addToHistory(reportRecord);
      logger.info(`[Scheduled Reports] Report completed: ${config.name}`);

      return reportRecord;
    } catch (error) {
      logger.error('[Scheduled Reports] Error executing report:', error);
      throw error;
    }
  }

  /**
   * الحصول على التعبير الـ CRON المناسب
   * Get appropriate cron expression
   */
  getCronExpression(frequency, time) {
    const [hour, minute] = time.split(':').map(Number);

    switch (frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`; // Every day at specified time
      case 'weekly':
        return `${minute} ${hour} * * 1`; // Every Monday at specified time
      case 'monthly':
        return `${minute} ${hour} 1 * *`; // First day of month at specified time
      case 'custom':
        return `${minute} ${hour} * * *`; // Default to daily
      default:
        return `${minute} ${hour} * * *`; // Default to daily
    }
  }

  /**
   * إلغاء جدولة تقرير
   * Unschedule report
   */
  unscheduleReport(reportId) {
    const job = this.jobs.get(reportId);
    if (job) {
      job.job.cancel();
      this.jobs.delete(reportId);
      logger.info(`[Scheduled Reports] Report unscheduled: ${reportId}`);
      return true;
    }
    return false;
  }

  /**
   * إرسال التقرير عبر البريد الإلكتروني
   * Send report via email
   */
  async sendReportEmail(reportName, recipients, format) {
    try {
      logger.info(`[Scheduled Reports] Sending ${reportName} to ${recipients.length} recipients`);
      // محاكاة إرسال البريد
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      logger.info(`[Scheduled Reports] Email sent for ${reportName}`);
    } catch (error) {
      logger.error('[Scheduled Reports] Error sending email:', error);
    }
  }

  /**
   * إضافة إلى السجل
   * Add to history
   */
  addToHistory(record) {
    this.history.push(record);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * الحصول على السجل
   * Get history
   */
  getHistory(limit = 100) {
    return this.history.slice(-limit).reverse();
  }

  /**
   * الحصول على جميع التقارير المجدولة
   * Get all scheduled reports
   */
  getScheduledReports() {
    return Array.from(this.jobs.values()).map(job => ({
      id: job.id,
      name: job.name,
      type: job.type,
      frequency: job.frequency,
      time: job.time,
      recipients: job.recipients,
      status: 'scheduled',
      nextRun: job.nextRun,
      createdAt: job.createdAt,
    }));
  }

  /**
   * توليد معرّف فريد
   * Generate unique ID
   */
  generateId() {
    return `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * إيقاف جميع الجدولات
   * Stop all schedules
   */
  stopAll() {
    this.jobs.forEach(job => {
      job.job.cancel();
    });
    this.jobs.clear();
    logger.info('[Scheduled Reports] All schedules stopped');
  }

  /**
   * الحصول على الإحصائيات
   * Get statistics
   */
  getStatistics() {
    return {
      totalScheduled: this.jobs.size,
      totalExecuted: this.history.length,
      reportsInQueue: this.reportQueue.length,
      averageExecutionTime: this.calculateAverageExecutionTime(),
      successRate: this.calculateSuccessRate(),
    };
  }

  /**
   * حساب متوسط وقت التنفيذ
   * Calculate average execution time
   */
  calculateAverageExecutionTime() {
    if (this.history.length === 0) return 0;
    const totalTime = this.history.reduce((sum, record) => {
      return sum + (record.duration || 0);
    }, 0);
    return Math.round(totalTime / this.history.length);
  }

  /**
   * حساب معدل النجاح
   * Calculate success rate
   */
  calculateSuccessRate() {
    if (this.history.length === 0) return 100;
    const successful = this.history.filter(r => r.status === 'completed').length;
    return Math.round((successful / this.history.length) * 100);
  }
}

module.exports = new ScheduledReportsService();
