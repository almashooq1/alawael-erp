/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Email Manager — المدير الرئيسي للبريد الإلكتروني
 * ═══════════════════════════════════════════════════════════════
 *
 * Unified facade for all email operations.
 * Multi-provider, template-aware, queue-backed, tracked.
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('./EmailConfig');
const { EmailTemplateEngine } = require('./EmailTemplateEngine');
const { EmailCircuitBreaker } = require('./EmailCircuitBreaker');
const logger = require('../../utils/logger');

class EmailManager {
  constructor() {
    this.transporter = null;
    this.templateEngine = new EmailTemplateEngine();
    this.provider = 'mock';
    this.initialized = false;

    // In-memory stats
    this.stats = {
      sent: 0,
      failed: 0,
      queued: 0,
      delivered: 0,
      opened: 0,
      bounced: 0,
    };

    // Rate-limit buckets
    this._rateBuckets = { minute: [], hour: [], day: [] };

    // DB models (lazy-loaded)
    this._EmailLog = null;
    this._EmailQueue = null;

    // WebSocket reference
    this._wsManager = null;

    // Circuit breaker for fault tolerance
    this._circuitBreaker = new EmailCircuitBreaker({
      failureThreshold: parseInt(process.env.EMAIL_CB_FAILURE_THRESHOLD, 10) || 5,
      cooldownMs: parseInt(process.env.EMAIL_CB_COOLDOWN_MS, 10) || 60000,
      monitorWindow: parseInt(process.env.EMAIL_CB_MONITOR_WINDOW, 10) || 120000,
      successThreshold: parseInt(process.env.EMAIL_CB_SUCCESS_THRESHOLD, 10) || 2,
      onStateChange: (oldState, newState) => {
        this._emit('email:circuit_breaker', { oldState, newState });
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Initialize transporter and optional integrations
   */
  async initialize(options = {}) {
    const { wsManager, mongoConnection } = options;

    try {
      // 1. Create transporter
      this._createTransporter();

      // 2. WebSocket
      if (wsManager) this._wsManager = wsManager;

      // 3. MongoDB models (lazy)
      if (mongoConnection) {
        await this._loadModels(mongoConnection);
      }

      this.initialized = true;
      logger.info(
        `[EmailManager] ✅ Initialized — provider: ${this.provider}, enabled: ${config.enabled}`
      );
      return { success: true, provider: this.provider };
    } catch (error) {
      logger.error('[EmailManager] ❌ Initialization error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create the appropriate nodemailer transport
   */
  _createTransporter() {
    const resolvedProvider = config.resolveProvider();

    switch (resolvedProvider) {
      case 'sendgrid': {
        try {
          const sgMail = require('@sendgrid/mail');
          sgMail.setApiKey(config.sendgrid.apiKey);
          this._sgMail = sgMail;
          this.provider = 'sendgrid';
          logger.info('[EmailManager] Using SendGrid provider');
        } catch {
          logger.warn('[EmailManager] SendGrid not available, falling back to SMTP');
          this._createSmtpTransporter();
        }
        break;
      }

      case 'smtp': {
        this._createSmtpTransporter();
        break;
      }

      case 'mailgun': {
        try {
          const mg = require('nodemailer-mailgun-transport');
          this.transporter = nodemailer.createTransport(
            mg({ auth: { api_key: config.mailgun.apiKey, domain: config.mailgun.domain } })
          );
          this.provider = 'mailgun';
        } catch {
          logger.warn('[EmailManager] Mailgun not available, falling back to SMTP');
          this._createSmtpTransporter();
        }
        break;
      }

      default:
        this.provider = 'mock';
        logger.warn('[EmailManager] No email credentials — running in mock mode');
    }
  }

  _createSmtpTransporter() {
    if (config.smtp.auth.user && config.smtp.auth.pass) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.auth,
        pool: config.smtp.pool,
        maxConnections: config.smtp.maxConnections,
        maxMessages: config.smtp.maxMessages,
        tls: config.smtp.tls,
      });
      this.provider = 'smtp';
    } else {
      this.provider = 'mock';
      logger.warn('[EmailManager] SMTP credentials missing — running in mock mode');
    }
  }

  async _loadModels(connection) {
    try {
      // Attempt to use models from communication/email-models.js
      const { EmailLog, EmailQueue } = require('../../communication/email-models');
      this._EmailLog = EmailLog;
      this._EmailQueue = EmailQueue;
    } catch {
      logger.debug('[EmailManager] email-models not found, using standalone queue');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 📤 CORE SEND
  // ═══════════════════════════════════════════════════════════

  /**
   * Send an email
   * @param {Object} options
   * @param {string|string[]} options.to
   * @param {string} [options.cc]
   * @param {string} [options.bcc]
   * @param {string} options.subject
   * @param {string} options.html
   * @param {string} [options.text]
   * @param {Array}  [options.attachments]
   * @param {Object} [options.metadata]
   * @param {number} [options.priority=5] 1-10
   * @param {string} [options.userId]         — for preference check
   * @param {string} [options.category]       — email category (auth|hr|finance|system|marketing|appointments)
   * @param {boolean} [options.skipPreferenceCheck=false] — bypass user preferences
   */
  async send(options) {
    const {
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
      metadata = {},
      priority = 5,
      userId,
      category,
      skipPreferenceCheck = false,
    } = options;

    // ── Basic Validation ────────────────────────────────────
    if (!to) {
      return { success: false, error: 'MISSING_RECIPIENT', code: 'E001' };
    }
    if (!subject && !html) {
      return { success: false, error: 'MISSING_CONTENT', code: 'E002' };
    }

    // ── Attachment Size Validation (25 MB max) ──────────────
    if (attachments && attachments.length > 0) {
      const maxBytes = 25 * 1024 * 1024; // 25 MB
      let totalSize = 0;
      for (const att of attachments) {
        if (att.content) {
          totalSize += Buffer.isBuffer(att.content)
            ? att.content.length
            : Buffer.byteLength(att.content, att.encoding || 'utf8');
        } else if (att.path) {
          try {
            const fs = require('fs');
            const stat = fs.statSync(att.path);
            totalSize += stat.size;
          } catch {
            /* ignore stat errors */
          }
        }
      }
      if (totalSize > maxBytes) {
        logger.warn(
          `[EmailManager] Attachment too large: ${(totalSize / 1024 / 1024).toFixed(1)} MB > 25 MB`
        );
        return {
          success: false,
          error: 'ATTACHMENT_TOO_LARGE',
          code: 'E010',
          maxSizeMB: 25,
          actualSizeMB: +(totalSize / 1024 / 1024).toFixed(1),
        };
      }
    }

    // ── Check enabled at runtime (not cached) ───────────────
    const isEnabled = process.env.EMAIL_ENABLED !== 'false';
    if (!isEnabled) {
      logger.debug(`[EmailManager] Email disabled — would send to ${to}: ${subject}`);
      return { success: true, status: 'DISABLED', messageId: `disabled_${Date.now()}` };
    }

    // ── User Email Preference Check ─────────────────────────
    if (!skipPreferenceCheck && userId && category) {
      try {
        const EmailPreference = this._getEmailPreferenceModel();
        if (EmailPreference) {
          const shouldSend = await EmailPreference.shouldSendEmail(userId, category);
          if (!shouldSend) {
            logger.debug(`[EmailManager] Blocked by user preference: ${userId}/${category}`);
            return {
              success: true,
              status: 'PREFERENCE_BLOCKED',
              code: 'E020',
              reason: `User opted out of ${category} emails`,
            };
          }

          // Check if user prefers digest (daily/weekly) instead of instant
          const prefs = await EmailPreference.findOne({ userId });
          if (prefs && prefs.categories?.[category]) {
            const freq = prefs.categories[category].frequency;
            if (freq === 'daily_digest' || freq === 'weekly_digest') {
              // Route to digest aggregator instead of immediate send
              if (this._digestAggregator) {
                const digestResult = this._digestAggregator.add(
                  userId,
                  Array.isArray(to) ? to[0] : to,
                  category,
                  {
                    subject,
                    summary: text || this._stripHtml(html || '').slice(0, 200),
                    data: metadata,
                  },
                  freq
                );
                if (digestResult.queued) {
                  logger.debug(`[EmailManager] Routed to ${freq} digest: ${userId}/${category}`);
                  return {
                    success: true,
                    status: 'DIGEST_QUEUED',
                    code: 'E021',
                    frequency: freq,
                    queueId: digestResult.queueId,
                  };
                }
              }
            }
          }
        }
      } catch (err) {
        // Preference check failure should not block email delivery
        logger.warn(`[EmailManager] Preference check failed (non-blocking): ${err.message}`);
      }
    }

    // ── Rate limit ──────────────────────────────────────────
    if (!this._checkRateLimit()) {
      logger.warn(`[EmailManager] Rate limit reached, queuing email to ${to}`);
      return this._enqueueEmail({
        to,
        cc,
        bcc,
        subject,
        html,
        text,
        attachments,
        metadata,
        priority,
      });
    }

    // Build mail
    const emailId = this._generateEmailId();
    const mailOptions = {
      from: `"${config.defaults.fromName}" <${config.defaults.from}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || this._stripHtml(html || ''),
      messageId: `<${emailId}@${config.defaults.from.split('@')[1] || 'alawael-erp.com'}>`,
    };

    if (cc) mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    if (bcc) mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
    if (attachments) mailOptions.attachments = attachments;
    if (config.defaults.replyTo) mailOptions.replyTo = config.defaults.replyTo;

    // Add tracking pixel
    if (config.tracking.opens && config.tracking.pixelUrl) {
      mailOptions.html = this._addTrackingPixel(mailOptions.html, emailId);
    }

    // Rewrite links for click tracking
    if (config.tracking.clicks && config.tracking.pixelUrl) {
      mailOptions.html = this._rewriteLinksForTracking(mailOptions.html, emailId);
    }

    // Send via provider (through circuit breaker)
    try {
      const result = await this._circuitBreaker.execute(() => this._sendViaProvider(mailOptions));

      this.stats.sent++;
      this._trackRateLimit();

      // Log to DB
      this._logEmail(emailId, mailOptions, 'sent', result, metadata);

      // WebSocket notification
      this._emit('email:sent', {
        to,
        subject,
        emailId,
        messageId: result.messageId,
        provider: this.provider,
      });

      logger.info(
        `[EmailManager] ✉️ Sent to ${to} via ${this.provider} — ${result.messageId || emailId}`
      );

      return {
        success: true,
        emailId,
        messageId: result.messageId,
        provider: this.provider,
      };
    } catch (error) {
      this.stats.failed++;
      logger.error(`[EmailManager] ❌ Failed to send to ${to}: ${error.message}`);

      // Log failure
      this._logEmail(emailId, mailOptions, 'failed', null, metadata, error.message);

      // Auto-retry via queue
      if (metadata.autoRetry !== false && priority >= 3) {
        return this._enqueueEmail({
          to,
          cc,
          bcc,
          subject,
          html,
          text,
          attachments,
          metadata,
          priority,
        });
      }

      return { success: false, error: error.message, emailId, code: 'E003' };
    }
  }

  /**
   * Send via the active provider
   */
  async _sendViaProvider(mailOptions) {
    if (this.provider === 'sendgrid' && this._sgMail) {
      const msg = {
        to: mailOptions.to,
        from: { email: config.defaults.from, name: config.defaults.fromName },
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
      };
      if (mailOptions.cc) msg.cc = mailOptions.cc;
      if (mailOptions.bcc) msg.bcc = mailOptions.bcc;
      if (mailOptions.attachments) {
        msg.attachments = mailOptions.attachments.map(a => ({
          content: a.content ? a.content.toString('base64') : '',
          filename: a.filename,
          type: a.contentType || 'application/octet-stream',
        }));
      }
      const [response] = await this._sgMail.send(msg);
      return {
        messageId: response?.headers?.['x-message-id'] || `sg_${Date.now()}`,
        response: response?.statusCode,
      };
    }

    if (this.provider === 'mock' || !this.transporter) {
      const mockId = `mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      logger.debug(`[EmailManager] 📧 Mock email to ${mailOptions.to}: ${mailOptions.subject}`);
      return { messageId: mockId, mock: true };
    }

    // SMTP / Mailgun via nodemailer
    return this.transporter.sendMail(mailOptions);
  }

  // ═══════════════════════════════════════════════════════════
  // 📝 TEMPLATE SEND
  // ═══════════════════════════════════════════════════════════

  /**
   * Send an email using a predefined template
   */
  async sendTemplate(to, templateName, data = {}, options = {}) {
    if (!to) return { success: false, error: 'MISSING_RECIPIENT' };

    try {
      const rendered = this.templateEngine.render(templateName, data);
      return this.send({
        to,
        subject: options.subject || rendered.subject,
        html: rendered.html,
        metadata: { template: templateName, ...options.metadata },
        ...options,
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email from an HTML file template
   */
  async sendFileTemplate(to, templateFile, variables = {}, options = {}) {
    if (!to) return { success: false, error: 'MISSING_RECIPIENT' };

    try {
      const html = await this.templateEngine.loadTemplate(templateFile, variables);
      return this.send({
        to,
        html,
        ...options,
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 📮 BULK SEND
  // ═══════════════════════════════════════════════════════════

  /**
   * Send emails to multiple recipients
   */
  async sendBulk(recipients, templateOrOptions) {
    const results = [];
    const batchSize = 5;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async recipient => {
          const email = typeof recipient === 'string' ? recipient : recipient.email || recipient.to;
          if (!email) return { email: 'unknown', success: false, error: 'NO_EMAIL' };

          let result;
          if (typeof templateOrOptions === 'string') {
            result = await this.sendTemplate(email, templateOrOptions, recipient);
          } else {
            result = await this.send({
              to: email,
              ...templateOrOptions,
              variables: { ...templateOrOptions?.variables, ...recipient.variables },
            });
          }
          return { email, ...result };
        })
      );

      results.push(
        ...batchResults.map((r, idx) =>
          r.status === 'fulfilled'
            ? r.value
            : { email: batch[idx]?.email || 'unknown', success: false, error: r.reason?.message }
        )
      );

      // Delay between batches to avoid throttling
      if (i + batchSize < recipients.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return {
      total: recipients.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 🏥 SYSTEM-SPECIFIC CONVENIENCE METHODS
  // ═══════════════════════════════════════════════════════════

  // Authentication
  async sendWelcome(user) {
    return this.sendTemplate(user.email, 'WELCOME', user);
  }

  async sendPasswordReset(user, token) {
    return this.sendTemplate(user.email, 'PASSWORD_RESET', { ...user, resetToken: token });
  }

  async sendEmailVerification(user, token) {
    return this.sendTemplate(user.email, 'EMAIL_VERIFICATION', {
      ...user,
      verificationToken: token,
    });
  }

  async sendOTP(user, otp, expiry = 5) {
    return this.sendTemplate(user.email, 'OTP_CODE', { ...user, otp, expiry }, { priority: 10 });
  }

  async send2FAEnabled(email, username) {
    return this.sendTemplate(email, 'TWO_FA_ENABLED', { email, username });
  }

  async send2FADisabled(email, username) {
    return this.sendTemplate(email, 'TWO_FA_DISABLED', { email, username });
  }

  async sendLoginAlert(user, loginInfo) {
    return this.sendTemplate(user.email, 'LOGIN_ALERT', { ...user, ...loginInfo });
  }

  async sendAccountLocked(user, details) {
    return this.sendTemplate(user.email, 'ACCOUNT_LOCKED', { ...user, ...details });
  }

  // Appointments
  async sendAppointmentReminder(appointment) {
    const email = appointment.email || appointment.patient?.email || appointment.beneficiary?.email;
    return email
      ? this.sendTemplate(email, 'APPOINTMENT_REMINDER', appointment)
      : { success: false, error: 'NO_EMAIL' };
  }

  async sendAppointmentConfirmation(appointment) {
    const email = appointment.email || appointment.patient?.email || appointment.beneficiary?.email;
    return email
      ? this.sendTemplate(email, 'APPOINTMENT_CONFIRMATION', appointment)
      : { success: false, error: 'NO_EMAIL' };
  }

  async sendAppointmentCancellation(appointment) {
    const email = appointment.email || appointment.patient?.email || appointment.beneficiary?.email;
    return email
      ? this.sendTemplate(email, 'APPOINTMENT_CANCELLATION', appointment)
      : { success: false, error: 'NO_EMAIL' };
  }

  async sendSessionSummary(session) {
    const email = session.guardianEmail || session.guardian?.email;
    return email
      ? this.sendTemplate(email, 'SESSION_SUMMARY', session)
      : { success: false, error: 'NO_EMAIL' };
  }

  // HR
  async sendLeaveRequest(data) {
    const hrEmail = data.managerEmail || process.env.HR_EMAIL;
    return hrEmail
      ? this.sendTemplate(hrEmail, 'LEAVE_REQUEST', data)
      : { success: false, error: 'NO_HR_EMAIL' };
  }

  async sendLeaveStatus(employee, leave) {
    return employee.email
      ? this.sendTemplate(employee.email, 'LEAVE_STATUS_UPDATE', {
          ...employee,
          ...leave,
          employeeName: employee.name,
        })
      : { success: false, error: 'NO_EMAIL' };
  }

  async sendSalaryNotification(employee, salary) {
    return employee.email
      ? this.sendTemplate(employee.email, 'SALARY_NOTIFICATION', {
          ...salary,
          employeeName: employee.name,
        })
      : { success: false, error: 'NO_EMAIL' };
  }

  async sendAttendanceAlert(employee, alert) {
    return employee.email
      ? this.sendTemplate(employee.email, 'ATTENDANCE_ALERT', {
          ...alert,
          employeeName: employee.name,
        })
      : { success: false, error: 'NO_EMAIL' };
  }

  // Finance
  async sendInvoice(invoice, customer) {
    const email = customer?.email || invoice.email || invoice.customerEmail;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const attachments = invoice.pdf
      ? [
          {
            filename: `invoice-${invoice.number || invoice.invoiceNumber}.pdf`,
            content: invoice.pdf,
          },
        ]
      : undefined;
    return this.sendTemplate(
      email,
      'INVOICE',
      { ...invoice, customerName: customer?.name },
      { attachments }
    );
  }

  async sendPaymentConfirmation(payment) {
    const email = payment.email || payment.customerEmail;
    return email
      ? this.sendTemplate(email, 'PAYMENT_CONFIRMATION', payment)
      : { success: false, error: 'NO_EMAIL' };
  }

  async sendPaymentReminder(invoice) {
    const email = invoice.email || invoice.customerEmail;
    return email
      ? this.sendTemplate(email, 'PAYMENT_REMINDER', invoice)
      : { success: false, error: 'NO_EMAIL' };
  }

  // Supply Chain
  async sendOrderConfirmation(order) {
    const email = order.email || order.customer?.email;
    return email
      ? this.sendTemplate(email, 'ORDER_CONFIRMATION', order)
      : { success: false, error: 'NO_EMAIL' };
  }

  async sendOrderStatusUpdate(order) {
    const email = order.email || order.customer?.email;
    return email
      ? this.sendTemplate(email, 'ORDER_STATUS_UPDATE', order)
      : { success: false, error: 'NO_EMAIL' };
  }

  async sendLowStockAlert(data, recipientEmail) {
    return this.sendTemplate(recipientEmail, 'LOW_STOCK_ALERT', data);
  }

  // Government
  async sendGovDocumentUpdate(user, doc) {
    return user.email
      ? this.sendTemplate(user.email, 'GOV_DOCUMENT_UPDATE', { ...doc, userName: user.name })
      : { success: false, error: 'NO_EMAIL' };
  }

  // Reports
  async sendReport(report, recipientEmail) {
    const email = recipientEmail || report.email;
    if (!email) return { success: false, error: 'NO_EMAIL' };
    const attachments = report.attachment ? [report.attachment] : undefined;
    return this.sendTemplate(email, 'REPORT_READY', report, { attachments });
  }

  // System
  async sendAlert(alert, recipientEmail) {
    const email = recipientEmail || alert.email;
    return email
      ? this.sendTemplate(email, 'ALERT_NOTIFICATION', alert, {
          priority: alert.severity === 'critical' ? 10 : 7,
        })
      : { success: false, error: 'NO_EMAIL' };
  }

  async sendNotification(to, notification) {
    if (!to) return { success: false, error: 'MISSING_RECIPIENT' };
    const data =
      typeof notification === 'string' ? { title: 'إشعار', message: notification } : notification;
    return this.sendTemplate(to, 'NOTIFICATION', data);
  }

  async sendDailyDigest(to, data) {
    return this.sendTemplate(to, 'DAILY_DIGEST', data);
  }

  // Communication
  async sendNewCommunication(to, data) {
    return this.sendTemplate(to, 'NEW_COMMUNICATION', data);
  }

  async sendApprovalRequest(to, data) {
    return this.sendTemplate(to, 'APPROVAL_REQUEST', data);
  }

  async sendStatusChange(to, data) {
    return this.sendTemplate(to, 'STATUS_CHANGE', data);
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 QUEUE
  // ═══════════════════════════════════════════════════════════

  async _enqueueEmail(options) {
    if (!this._EmailQueue) {
      logger.warn('[EmailManager] No queue available — dropping email');
      return { success: false, error: 'NO_QUEUE', code: 'E004' };
    }

    try {
      const queueId = this._generateEmailId();
      await this._EmailQueue.create({
        queueId,
        emailData: {
          to: Array.isArray(options.to) ? options.to : [options.to],
          cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [],
          bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : [],
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments: options.attachments,
        },
        priority: options.priority || 5,
        status: 'pending',
        scheduledFor: options.scheduledFor || new Date(),
        metadata: {
          ...options.metadata,
          correlationId: options.metadata?.correlationId || queueId,
        },
      });

      this.stats.queued++;
      logger.info(`[EmailManager] 📋 Queued email to ${options.to} (${queueId})`);
      return { success: true, status: 'QUEUED', queueId };
    } catch (error) {
      logger.error(`[EmailManager] Queue error: ${error.message}`);
      return { success: false, error: 'QUEUE_ERROR', code: 'E005' };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🔒 RATE LIMITING
  // ═══════════════════════════════════════════════════════════

  _checkRateLimit() {
    const now = Date.now();
    this._rateBuckets.minute = this._rateBuckets.minute.filter(t => now - t < 60000);
    this._rateBuckets.hour = this._rateBuckets.hour.filter(t => now - t < 3600000);
    this._rateBuckets.day = this._rateBuckets.day.filter(t => now - t < 86400000);

    return (
      this._rateBuckets.minute.length < config.rateLimit.maxPerMinute &&
      this._rateBuckets.hour.length < config.rateLimit.maxPerHour &&
      this._rateBuckets.day.length < config.rateLimit.maxPerDay
    );
  }

  _trackRateLimit() {
    const now = Date.now();
    this._rateBuckets.minute.push(now);
    this._rateBuckets.hour.push(now);
    this._rateBuckets.day.push(now);
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 LOGGING & TRACKING
  // ═══════════════════════════════════════════════════════════

  async _logEmail(emailId, mailOptions, status, result, metadata, error) {
    if (!config.logging.logToDb || !this._EmailLog) return;

    try {
      await this._EmailLog.create({
        emailId,
        messageId: result?.messageId || '',
        from: {
          name: config.defaults.fromName,
          address: config.defaults.from,
        },
        to: Array.isArray(mailOptions.to)
          ? mailOptions.to.map(a => ({ address: a }))
          : [{ address: mailOptions.to }],
        subject: mailOptions.subject,
        status,
        provider: this.provider,
        providerResponse: result,
        error: error ? { message: error, category: 'transient' } : undefined,
        metadata: {
          priority: metadata?.priority || 'normal',
          tags: metadata?.tags || [],
          ...metadata,
        },
        timestamps: {
          queuedAt: new Date(),
          sentAt: status === 'sent' ? new Date() : undefined,
          failedAt: status === 'failed' ? new Date() : undefined,
        },
      });
    } catch (err) {
      logger.debug(`[EmailManager] Log write error: ${err.message}`);
    }
  }

  _addTrackingPixel(html, emailId) {
    const pixel = `<img src="${config.tracking.pixelUrl}/track/open/${emailId}" width="1" height="1" style="display:none;" alt="">`;
    return html.replace('</body>', `${pixel}</body>`);
  }

  /**
   * Rewrite all <a href="..."> links in the email HTML
   * to route through the click-tracking endpoint.
   * Skips mailto:, tel:, #, and unsubscribe links.
   */
  _rewriteLinksForTracking(html, emailId) {
    if (!html) return html;
    const baseUrl = config.tracking.pixelUrl;
    const skipPatterns = /^(mailto:|tel:|#|javascript:|data:)/i;
    const unsubPattern = /unsubscribe/i;

    return html.replace(
      /<a\s([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>/gi,
      (match, before, url, after) => {
        // Skip special URLs and unsubscribe links
        if (skipPatterns.test(url) || unsubPattern.test(url)) return match;

        const encodedUrl = encodeURIComponent(url);
        const trackedUrl = `${baseUrl}/track/click/${emailId}?url=${encodedUrl}`;
        return `<a ${before}href="${trackedUrl}"${after}>`;
      }
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 📡 WEBSOCKET
  // ═══════════════════════════════════════════════════════════

  _emit(event, data) {
    if (!this._wsManager) return;
    try {
      if (typeof this._wsManager.broadcast === 'function') {
        this._wsManager.broadcast(event, data);
      }
    } catch {
      // silent
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🔧 UTILITIES
  // ═══════════════════════════════════════════════════════════

  _generateEmailId() {
    return `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`;
  }

  _stripHtml(html) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 STATS & HEALTH
  // ═══════════════════════════════════════════════════════════

  /**
   * Get email system statistics
   */
  async getStats() {
    let queueStats = {};
    if (this._EmailQueue) {
      try {
        const agg = await this._EmailQueue.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        queueStats = agg.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});
      } catch {
        /* ignore */
      }
    }

    let logStats = {};
    if (this._EmailLog) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const agg = await this._EmailLog.aggregate([
          { $match: { createdAt: { $gte: today } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        logStats = agg.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});
      } catch {
        /* ignore */
      }
    }

    return {
      provider: this.provider,
      enabled: config.enabled,
      initialized: this.initialized,
      inMemory: { ...this.stats },
      today: logStats,
      queue: queueStats,
      rateLimit: {
        minute: { used: this._rateBuckets.minute.length, max: config.rateLimit.maxPerMinute },
        hour: { used: this._rateBuckets.hour.length, max: config.rateLimit.maxPerHour },
        day: { used: this._rateBuckets.day.length, max: config.rateLimit.maxPerDay },
      },
    };
  }

  /**
   * Verify email transport connection
   */
  async verify() {
    if (this.provider === 'mock') {
      return { success: true, message: 'Mock mode — لا تحتاج التحقق', provider: 'mock' };
    }

    if (this.provider === 'sendgrid') {
      return { success: !!this._sgMail, message: 'SendGrid API configured', provider: 'sendgrid' };
    }

    if (!this.transporter) {
      return { success: false, error: 'No transporter configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'تم التحقق من الاتصال بنجاح ✅', provider: this.provider };
    } catch (error) {
      return { success: false, error: error.message, provider: this.provider };
    }
  }

  /**
   * List all available template names
   */
  getAvailableTemplates() {
    return this.templateEngine.getTemplateNames();
  }

  /**
   * Preview a template
   */
  previewTemplate(templateName, data = {}) {
    return this.templateEngine.render(templateName, data);
  }

  // ═══════════════════════════════════════════════════════════
  // 🔌 SERVICE WIRING
  // ═══════════════════════════════════════════════════════════

  /**
   * Lazy-load the EmailPreference model (avoids circular deps)
   * @returns {Model|null}
   */
  _getEmailPreferenceModel() {
    if (this._EmailPreference !== undefined) return this._EmailPreference;
    try {
      this._EmailPreference = require('../../models/EmailPreference');
    } catch {
      this._EmailPreference = null;
    }
    return this._EmailPreference;
  }

  /**
   * Set the digest aggregator reference.
   * Called during initialization in server.js or index.js.
   * @param {import('./EmailDigestAggregator').EmailDigestAggregator} aggregator
   */
  setDigestAggregator(aggregator) {
    this._digestAggregator = aggregator;
    logger.info('[EmailManager] 📬 Digest aggregator connected');
  }
}

module.exports = EmailManager;
