/**
 * ============================================
 * ALERT & NOTIFICATION SERVICE
 * خدمة التنبيهات والإشعارات
 * ============================================
 */

const nodemailer = require('nodemailer');
const twilio = require('twilio');
const mongoose = require('mongoose');
const EventEmitter = require('events');

// Alert Model Schema
const alertSchema = new mongoose.Schema({
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  type: String,
  component: String,
  message: String,
  details: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['active', 'resolved', 'acknowledged'] },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date,
  notificationsSent: [
    {
      method: String,
      recipient: String,
      sentAt: Date,
      status: String,
    },
  ],
});

const AlertModel = mongoose.model('Alert', alertSchema);

class AlertService extends EventEmitter {
  constructor() {
    super();

    // Email Configuration
    this.emailTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // SMS Configuration
    this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    this.alertRules = this.initializeAlertRules();
    this.notificationChannels = ['email', 'sms', 'dashboard'];
  }

  /**
   * 1️⃣ ALERT RULES CONFIGURATION
   */

  initializeAlertRules() {
    return {
      database: {
        severity: 'critical',
        channels: ['email', 'sms'],
        threshold: {
          responseTime: 1000,
          downtime: 60000,
        },
      },
      memory: {
        severity: 'high',
        channels: ['email', 'dashboard'],
        threshold: {
          usagePercent: 85,
        },
      },
      cpu: {
        severity: 'high',
        channels: ['email', 'dashboard'],
        threshold: {
          usagePercent: 90,
        },
      },
      api: {
        severity: 'medium',
        channels: ['email', 'dashboard'],
        threshold: {
          errorRate: 5, // percent
        },
      },
      security: {
        severity: 'critical',
        channels: ['email', 'sms'],
        threshold: {
          failedAttempts: 5,
        },
      },
      payment: {
        severity: 'high',
        channels: ['email', 'sms'],
        threshold: {
          failed: 3,
        },
      },
    };
  }

  /**
   * 2️⃣ CREATE AND LOG ALERT
   */

  async createAlert(alertData) {
    try {
      const alert = new AlertModel({
        severity: alertData.severity || 'medium',
        type: alertData.type,
        component: alertData.component,
        message: alertData.message,
        details: alertData.details,
        status: 'active',
      });

      const savedAlert = await alert.save();

      // Emit event for real-time monitoring
      this.emit('alert', savedAlert);

      // Get alert rule
      const alertRule = this.alertRules[alertData.component];

      if (alertRule) {
        // Send notifications based on rule
        await this.sendNotifications(savedAlert, alertRule);
      }

      return savedAlert;
    } catch (error) {
      console.error(`❌ Failed to create alert: ${error.message}`);
      throw error;
    }
  }

  /**
   * 3️⃣ SEND NOTIFICATIONS
   */

  async sendNotifications(alert, rule) {
    const notifications = [];

    for (const channel of rule.channels) {
      try {
        let result;

        switch (channel) {
          case 'email':
            result = await this.sendEmailAlert(alert);
            break;
          case 'sms':
            result = await this.sendSmsAlert(alert);
            break;
          case 'dashboard':
            result = await this.sendDashboardAlert(alert);
            break;
          case 'slack':
            result = await this.sendSlackAlert(alert);
            break;
          default:
            continue;
        }

        notifications.push({
          method: channel,
          recipient: result.recipient,
          sentAt: new Date(),
          status: 'sent',
        });
      } catch (error) {
        console.error(`❌ Failed to send ${channel} notification: ${error.message}`);

        notifications.push({
          method: channel,
          sentAt: new Date(),
          status: 'failed',
          error: error.message,
        });
      }
    }

    // Update alert with notification records
    await AlertModel.updateOne({ _id: alert._id }, { $set: { notificationsSent: notifications } });

    return notifications;
  }

  /**
   * 4️⃣ EMAIL ALERTS
   */

  async sendEmailAlert(alert) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@system.com';

    const emailContent = `
      <h2>🚨 System Alert: ${alert.severity.toUpperCase()}</h2>
      <p><strong>Component:</strong> ${alert.component}</p>
      <p><strong>Type:</strong> ${alert.type}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      <hr>
      <p><strong>Details:</strong></p>
      <pre>${JSON.stringify(alert.details, null, 2)}</pre>
      <hr>
      <p><strong>Time:</strong> ${alert.createdAt}</p>
      <p><small>Alert ID: ${alert._id}</small></p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `[${alert.severity.toUpperCase()}] System Alert: ${alert.component}`,
      html: emailContent,
    };

    await this.emailTransporter.sendMail(mailOptions);

    return {
      method: 'email',
      recipient: adminEmail,
    };
  }

  /**
   * 5️⃣ SMS ALERTS
   */

  async sendSmsAlert(alert) {
    const adminPhone = process.env.ADMIN_PHONE;

    if (!adminPhone) {
      throw new Error('Admin phone number not configured');
    }

    const messageText = `🚨 ALERT [${alert.severity}] - ${alert.component}: ${alert.message}`;

    const message = await this.twilioClient.messages.create({
      body: messageText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: adminPhone,
    });

    return {
      method: 'sms',
      recipient: adminPhone,
      messageId: message.sid,
    };
  }

  /**
   * 6️⃣ DASHBOARD ALERTS
   */

  async sendDashboardAlert(alert) {
    // Store alert for dashboard display
    // Could use WebSocket for real-time updates
    this.emit('dashboardAlert', {
      id: alert._id,
      severity: alert.severity,
      component: alert.component,
      message: alert.message,
      timestamp: alert.createdAt,
    });

    return {
      method: 'dashboard',
      recipient: 'dashboard',
    };
  }

  /**
   * 7️⃣ SLACK ALERTS
   */

  async sendSlackAlert(alert) {
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;

    if (!slackWebhook) {
      throw new Error('Slack webhook not configured');
    }

    const payload = {
      text: `🚨 System Alert: ${alert.severity.toUpperCase()}`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            {
              title: 'Component',
              value: alert.component,
              short: true,
            },
            {
              title: 'Type',
              value: alert.type,
              short: true,
            },
            {
              title: 'Message',
              value: alert.message,
              short: false,
            },
            {
              title: 'Time',
              value: alert.createdAt.toISOString(),
              short: true,
            },
          ],
        },
      ],
    };

    const response = await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return {
      method: 'slack',
      recipient: 'slack-channel',
    };
  }

  /**
   * 8️⃣ ALERT ACKNOWLEDGEMENT
   */

  async acknowledgeAlert(alertId) {
    try {
      const alert = await AlertModel.findByIdAndUpdate(
        alertId,
        { status: 'acknowledged' },
        { new: true }
      );

      return alert;
    } catch (error) {
      throw new Error(`Failed to acknowledge alert: ${error.message}`);
    }
  }

  /**
   * 9️⃣ RESOLVE ALERT
   */

  async resolveAlert(alertId) {
    try {
      const alert = await AlertModel.findByIdAndUpdate(
        alertId,
        {
          status: 'resolved',
          resolvedAt: new Date(),
        },
        { new: true }
      );

      // Send resolution notification
      await this.sendResolutionNotification(alert);

      return alert;
    } catch (error) {
      throw new Error(`Failed to resolve alert: ${error.message}`);
    }
  }

  /**
   * 🔟 RESOLUTION NOTIFICATIONS
   */

  async sendResolutionNotification(alert) {
    const adminEmail = process.env.ADMIN_EMAIL;

    const emailContent = `
      <h2>✅ Alert Resolved</h2>
      <p><strong>Component:</strong> ${alert.component}</p>
      <p><strong>Original Issue:</strong> ${alert.message}</p>
      <p><strong>Duration:</strong> ${((alert.resolvedAt - alert.createdAt) / 1000 / 60).toFixed(
        2
      )} minutes</p>
      <hr>
      <p><strong>Resolved At:</strong> ${alert.resolvedAt}</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `✅ Alert Resolved: ${alert.component}`,
      html: emailContent,
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  /**
   * 1️⃣1️⃣ GET ALERT HISTORY
   */

  async getAlertHistory(filters = {}) {
    try {
      const query = {};

      if (filters.severity) query.severity = filters.severity;
      if (filters.component) query.component = filters.component;
      if (filters.status) query.status = filters.status;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      const alerts = await AlertModel.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100);

      return alerts;
    } catch (error) {
      throw new Error(`Failed to retrieve alert history: ${error.message}`);
    }
  }

  /**
   * 1️⃣2️⃣ ALERT STATISTICS
   */

  async getAlertStatistics() {
    try {
      const stats = {
        total: await AlertModel.countDocuments(),
        active: await AlertModel.countDocuments({ status: 'active' }),
        resolved: await AlertModel.countDocuments({ status: 'resolved' }),
        bySeverity: {
          critical: await AlertModel.countDocuments({ severity: 'critical' }),
          high: await AlertModel.countDocuments({ severity: 'high' }),
          medium: await AlertModel.countDocuments({ severity: 'medium' }),
          low: await AlertModel.countDocuments({ severity: 'low' }),
        },
        byComponent: {},
      };

      // Get counts by component
      const components = await AlertModel.distinct('component');
      for (const component of components) {
        stats.byComponent[component] = await AlertModel.countDocuments({
          component,
        });
      }

      return stats;
    } catch (error) {
      throw new Error(`Failed to generate statistics: ${error.message}`);
    }
  }

  /**
   * 1️⃣3️⃣ HELPER FUNCTIONS
   */

  getSeverityColor(severity) {
    const colors = {
      low: '#36a64f',
      medium: '#ff9800',
      high: '#ff5722',
      critical: '#c62828',
    };
    return colors[severity] || '#9e9e9e';
  }

  formatAlertForDisplay(alert) {
    return {
      id: alert._id,
      severity: alert.severity,
      component: alert.component,
      type: alert.type,
      message: alert.message,
      status: alert.status,
      createdAt: alert.createdAt,
      resolvedAt: alert.resolvedAt,
      durationMinutes: alert.resolvedAt
        ? ((alert.resolvedAt - alert.createdAt) / 1000 / 60).toFixed(2)
        : null,
    };
  }

  /**
   * 1️⃣4️⃣ SETUP AUTO ALERT CLEANUP
   */

  setupAutoAlertCleanup() {
    // Cleanup resolved alerts older than 30 days every hour
    setInterval(
      async () => {
        try {
          const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          const result = await AlertModel.deleteMany({
            status: 'resolved',
            resolvedAt: { $lt: cutoffDate },
          });

          console.log(`🗑️  Cleaned up ${result.deletedCount} old alerts`);
        } catch (error) {
          console.error(`❌ Alert cleanup failed: ${error.message}`);
        }
      },
      60 * 60 * 1000
    ); // Every hour

    console.log('✅ Auto alert cleanup configured');
  }
}

module.exports = new AlertService();
