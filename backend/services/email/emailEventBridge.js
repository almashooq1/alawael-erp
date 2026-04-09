/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Email Event Bridge — جسر ربط البريد بالأحداث
 * ═══════════════════════════════════════════════════════════════
 *
 * Connects the SystemIntegrationBus events to the unified email
 * system. Listens to domain events and triggers appropriate emails.
 *
 * Architecture:
 *  ┌───────────────────────────┐
 *  │  SystemIntegrationBus     │
 *  │  (EventEmitter + NATS)    │
 *  └────────────┬──────────────┘
 *               │  domain events
 *  ┌────────────▼──────────────┐
 *  │   EmailEventBridge        │
 *  │  (Event → Email mapping)  │
 *  └────────────┬──────────────┘
 *               │  sendTemplate()
 *  ┌────────────▼──────────────┐
 *  │   EmailManager            │
 *  │  (SMTP / SendGrid / etc)  │
 *  └───────────────────────────┘
 *
 * Event Categories:
 *  - auth.*         → Welcome, password reset, login alerts, OTP, 2FA
 *  - hr.*           → Leave, salary, attendance, performance
 *  - finance.*      → Invoice, payment, budget alerts
 *  - medical.*      → Appointments, sessions, reports
 *  - order.*        → Order confirmation, status updates
 *  - notification.* → Cross-module notifications → email channel
 *  - system.*       → System alerts and errors
 */

const logger = require('../../utils/logger');

class EmailEventBridge {
  /**
   * @param {import('./EmailManager')} emailManager
   */
  constructor(emailManager) {
    this.emailManager = emailManager;
    this._bus = null;
    this._moduleConnector = null;
    this._subscriptions = [];
    this._enabled = process.env.EMAIL_EVENT_BRIDGE !== 'false';
    this._stats = { received: 0, processed: 0, skipped: 0, errors: 0, deduplicated: 0 };

    // Event deduplication — prevents duplicate emails on event replay
    this._dedupeWindow = parseInt(process.env.EMAIL_DEDUP_WINDOW_MS, 10) || 5 * 60 * 1000; // 5 min
    this._dedupeCache = new Map(); // key → timestamp
    this._dedupePurgeInterval = null;
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Connect to the system integration bus and start listening
   * @param {Object} options
   * @param {EventEmitter} options.bus - SystemIntegrationBus instance
   * @param {Object} [options.moduleConnector] - Cross-module connector
   * @param {Object} [options.socketEmitter] - Socket.IO emitter
   */
  connect(options = {}) {
    const { bus, moduleConnector, socketEmitter } = options;

    if (!this._enabled) {
      logger.info('[EmailEventBridge] ⏸️ Disabled via EMAIL_EVENT_BRIDGE=false');
      return this;
    }

    if (bus) {
      this._bus = bus;
      this._registerEventSubscriptions();

      // Start periodic dedup cache cleanup (every 2 minutes)
      this._dedupePurgeInterval = setInterval(() => this._purgeDedupeCache(), 2 * 60 * 1000);

      logger.info('[EmailEventBridge] ✅ Connected to SystemIntegrationBus');
    }

    if (moduleConnector) {
      this._moduleConnector = moduleConnector;
      this._registerModuleConnectorHooks();
      logger.info('[EmailEventBridge] ✅ Connected to ModuleConnector');
    }

    if (socketEmitter) {
      this.emailManager._wsManager = socketEmitter;
      logger.info('[EmailEventBridge] ✅ Connected WebSocket emitter');
    }

    return this;
  }

  /**
   * Disconnect all subscriptions
   */
  disconnect() {
    if (this._bus) {
      for (const { event, handler } of this._subscriptions) {
        this._bus.removeListener(event, handler);
      }
    }
    this._subscriptions = [];

    // Clear dedup resources
    if (this._dedupePurgeInterval) {
      clearInterval(this._dedupePurgeInterval);
      this._dedupePurgeInterval = null;
    }
    this._dedupeCache.clear();

    logger.info('[EmailEventBridge] 🔌 Disconnected');
  }

  // ═══════════════════════════════════════════════════════════
  // 📋 EVENT SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════

  _registerEventSubscriptions() {
    // ── Auth Events ────────────────────────────────────────
    this._on('auth.user.registered', this._onUserRegistered.bind(this));
    this._on('auth.user.login', this._onUserLogin.bind(this));
    this._on('auth.user.login.suspicious', this._onSuspiciousLogin.bind(this));
    this._on('auth.user.login.failed', this._onLoginFailed.bind(this));
    this._on('auth.user.locked', this._onAccountLocked.bind(this));
    this._on('auth.password.reset.requested', this._onPasswordResetRequested.bind(this));
    this._on('auth.password.reset.completed', this._onPasswordResetCompleted.bind(this));
    this._on('auth.password.changed', this._onPasswordChanged.bind(this));
    this._on('auth.otp.generated', this._onOTPGenerated.bind(this));
    this._on('auth.2fa.enabled', this._on2FAEnabled.bind(this));
    this._on('auth.2fa.disabled', this._on2FADisabled.bind(this));
    this._on('auth.email.verify', this._onEmailVerify.bind(this));

    // ── HR Events ──────────────────────────────────────────
    this._on('hr.leave.requested', this._onLeaveRequested.bind(this));
    this._on('hr.leave.approved', this._onLeaveApproved.bind(this));
    this._on('hr.leave.rejected', this._onLeaveRejected.bind(this));
    this._on('hr.salary.processed', this._onSalaryProcessed.bind(this));
    this._on('hr.payroll.processed', this._onSalaryProcessed.bind(this)); // alias
    this._on('hr.attendance.alert', this._onAttendanceAlert.bind(this));
    this._on('hr.attendance.absence', this._onAttendanceAbsence.bind(this));
    this._on('hr.performance.review', this._onPerformanceReview.bind(this));

    // ── Finance Events ─────────────────────────────────────
    this._on('finance.invoice.created', this._onInvoiceCreated.bind(this));
    this._on('finance.invoice.sent', this._onInvoiceSent.bind(this));
    this._on('finance.payment.received', this._onPaymentReceived.bind(this));
    this._on('finance.payment.reminder', this._onPaymentReminder.bind(this));
    this._on('finance.budget.threshold', this._onBudgetThreshold.bind(this));
    this._on('finance.expense.approved', this._onExpenseApproved.bind(this));

    // ── Medical / Appointment Events ────────────────────────
    this._on('medical.appointment.created', this._onAppointmentCreated.bind(this));
    this._on('medical.appointment.confirmed', this._onAppointmentConfirmed.bind(this));
    this._on('medical.appointment.cancelled', this._onAppointmentCancelled.bind(this));
    this._on('medical.appointment.reminder', this._onAppointmentReminder.bind(this));
    this._on('medical.session.completed', this._onSessionCompleted.bind(this));
    this._on('medical.report.ready', this._onReportReady.bind(this));

    // ── Order / Supply Chain Events ─────────────────────────
    this._on('order.created', this._onOrderCreated.bind(this));
    this._on('order.confirmed', this._onOrderConfirmed.bind(this));
    this._on('order.status.changed', this._onOrderStatusChanged.bind(this));
    this._on('order.delivered', this._onOrderDelivered.bind(this));
    this._on('inventory.low_stock', this._onLowStock.bind(this));

    // ── Government / Documents ──────────────────────────────
    this._on('gov.document.updated', this._onGovDocumentUpdated.bind(this));
    this._on('document.ready', this._onDocumentReady.bind(this));

    // ── Communication Events ────────────────────────────────
    this._on('communication.message.new', this._onNewMessage.bind(this));
    this._on('approval.requested', this._onApprovalRequested.bind(this));
    this._on('status.changed', this._onStatusChanged.bind(this));

    // ── System Events ───────────────────────────────────────
    this._on('system.alert.critical', this._onCriticalAlert.bind(this));
    this._on('system.alert.warning', this._onWarningAlert.bind(this));
    this._on('system.error', this._onSystemError.bind(this));

    // ── Notification Passthrough ────────────────────────────
    this._on('notification.send', this._onNotificationSend.bind(this));
    this._on('notification.email', this._onNotificationEmail.bind(this));
  }

  // ═══════════════════════════════════════════════════════════
  // 🔗 MODULE CONNECTOR HOOKS
  // ═══════════════════════════════════════════════════════════

  _registerModuleConnectorHooks() {
    if (!this._moduleConnector) return;

    try {
      // Register as an email delivery module
      this._moduleConnector.register('email', {
        send: async data => this._handleModuleSend(data),
        sendTemplate: async (to, template, data) =>
          this.emailManager.sendTemplate(to, template, data),
        sendBulk: async (recipients, options) => this.emailManager.sendBulk(recipients, options),
        getStats: async () => this.emailManager.getStats(),
        getTemplates: () => this.emailManager.getAvailableTemplates(),
      });
      logger.info('[EmailEventBridge] 📦 Registered "email" module in ModuleConnector');
    } catch (err) {
      logger.debug(`[EmailEventBridge] ModuleConnector register: ${err.message}`);
    }
  }

  async _handleModuleSend(data) {
    const { to, template, templateData, subject, html, ...options } = data;
    if (template) {
      return this.emailManager.sendTemplate(to, template, templateData || data, options);
    }
    return this.emailManager.send({ to, subject, html, ...options });
  }

  // ═══════════════════════════════════════════════════════════
  // 🎯 AUTH EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  async _onUserRegistered(data) {
    const { user, email, name, fullName, username, role, department } = data;
    const u = user || data;
    await this._safeSend(
      () =>
        this.emailManager.sendWelcome({
          name: u.name || name || fullName || username || '',
          email: u.email || email,
          role: u.role || role || 'مستخدم',
          department: u.department || department || '',
        }),
      'welcome',
      u.email || email
    );
  }

  async _onUserLogin(data) {
    // Only send login alerts for admin accounts or if explicitly enabled
    const { user, ip, device, browser, location, sendAlert } = data;
    if (!sendAlert && user?.role !== 'admin' && user?.role !== 'super_admin') return;

    await this._safeSend(
      () =>
        this.emailManager.sendLoginAlert(
          { name: user?.name || '', email: user?.email },
          { ip, device, browser, location }
        ),
      'login_alert',
      user?.email
    );
  }

  async _onSuspiciousLogin(data) {
    const { user, ip, device, browser, location } = data;
    if (!user?.email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendLoginAlert(
          { name: user.name, email: user.email },
          { ip, device, browser, location: location || 'موقع مشبوه' }
        ),
      'suspicious_login',
      user.email
    );
  }

  async _onLoginFailed(data) {
    // Track consecutive failures for lock warning
    if (data.consecutiveFailures >= 3 && data.user?.email) {
      await this._safeSend(
        () =>
          this.emailManager.sendAlert(
            {
              title: 'محاولات دخول فاشلة متعددة',
              message: `تم رصد ${data.consecutiveFailures} محاولات دخول فاشلة متتالية لحسابك. إذا لم تكن أنت، يرجى تغيير كلمة المرور فوراً.`,
              severity: data.consecutiveFailures >= 5 ? 'critical' : 'warning',
              source: 'نظام المصادقة',
            },
            data.user.email
          ),
        'login_failed_alert',
        data.user.email
      );
    }
  }

  async _onAccountLocked(data) {
    const { user, attempts, lockDuration, lastAttempt } = data;
    if (!user?.email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendAccountLocked({
          name: user.name,
          email: user.email,
          attempts,
          lockDuration: lockDuration || '30 دقيقة',
          lastAttempt: lastAttempt || new Date(),
        }),
      'account_locked',
      user.email
    );
  }

  async _onPasswordResetRequested(data) {
    const { user, token, resetToken, resetUrl } = data;
    if (!user?.email) return;
    await this._safeSend(
      () => this.emailManager.sendPasswordReset(user, token || resetToken),
      'password_reset',
      user.email
    );
  }

  async _onPasswordResetCompleted(data) {
    const { user } = data;
    if (!user?.email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendNotification(user.email, {
          title: 'تم تغيير كلمة المرور',
          message:
            'تم إعادة تعيين كلمة المرور الخاصة بحسابك بنجاح. إذا لم تقم بهذا الإجراء، يرجى التواصل مع الدعم الفني فوراً.',
        }),
      'password_reset_completed',
      user.email
    );
  }

  async _onPasswordChanged(data) {
    const { user } = data;
    if (!user?.email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendNotification(user.email, {
          title: 'تم تغيير كلمة المرور ✅',
          message: 'تم تغيير كلمة المرور الخاصة بحسابك بنجاح.',
        }),
      'password_changed',
      user.email
    );
  }

  async _onOTPGenerated(data) {
    const { user, otp, code, expiry } = data;
    if (!user?.email) return;
    await this._safeSend(
      () => this.emailManager.sendOTP(user, otp || code, expiry || 5),
      'otp',
      user.email
    );
  }

  async _on2FAEnabled(data) {
    const { email, username } = data;
    if (!email) return;
    await this._safeSend(
      () => this.emailManager.send2FAEnabled(email, username),
      '2fa_enabled',
      email
    );
  }

  async _on2FADisabled(data) {
    const { email, username } = data;
    if (!email) return;
    await this._safeSend(
      () => this.emailManager.send2FADisabled(email, username),
      '2fa_disabled',
      email
    );
  }

  async _onEmailVerify(data) {
    const { user, token, verificationToken } = data;
    if (!user?.email) return;
    await this._safeSend(
      () => this.emailManager.sendEmailVerification(user, token || verificationToken),
      'email_verify',
      user.email
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 🏢 HR EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  async _onLeaveRequested(data) {
    const { employee, leave, managerEmail } = data;
    await this._safeSend(
      () =>
        this.emailManager.sendLeaveRequest({
          employeeName: employee?.name || data.employeeName || '',
          department: employee?.department || data.department || '',
          leaveType: leave?.type || data.leaveType || data.type || '',
          startDate: leave?.startDate || data.startDate,
          endDate: leave?.endDate || data.endDate,
          duration: leave?.duration || data.duration,
          reason: leave?.reason || data.reason || '',
          managerEmail: managerEmail || data.approverEmail,
        }),
      'leave_request',
      managerEmail || data.approverEmail
    );
  }

  async _onLeaveApproved(data) {
    const { employee, leave } = data;
    if (!employee?.email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendLeaveStatus(employee, {
          ...leave,
          status: 'approved',
          reviewNotes: data.reviewNotes || data.notes,
        }),
      'leave_approved',
      employee.email
    );
  }

  async _onLeaveRejected(data) {
    const { employee, leave } = data;
    if (!employee?.email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendLeaveStatus(employee, {
          ...leave,
          status: 'rejected',
          reviewNotes: data.reviewNotes || data.notes || data.reason,
        }),
      'leave_rejected',
      employee.email
    );
  }

  async _onSalaryProcessed(data) {
    const { employee, salary, employees, payroll } = data;

    // Single employee
    if (employee?.email) {
      await this._safeSend(
        () => this.emailManager.sendSalaryNotification(employee, salary || data),
        'salary',
        employee.email
      );
      return;
    }

    // Bulk payroll
    if (employees && employees.length) {
      for (const emp of employees) {
        if (emp.email) {
          await this._safeSend(
            () => this.emailManager.sendSalaryNotification(emp, emp.salary || payroll || data),
            'salary_bulk',
            emp.email
          );
        }
      }
    }
  }

  async _onAttendanceAlert(data) {
    const { employee } = data;
    if (!employee?.email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendAttendanceAlert(employee, {
          alertType: data.alertType || 'late',
          date: data.date || new Date(),
          checkInTime: data.checkInTime,
          notes: data.notes,
          message: data.message,
        }),
      'attendance_alert',
      employee.email
    );
  }

  async _onAttendanceAbsence(data) {
    const { employee } = data;
    if (!employee?.email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendAttendanceAlert(employee, {
          alertType: 'absence',
          date: data.date || new Date(),
          notes: data.notes,
          message: data.message,
        }),
      'attendance_absence',
      employee.email
    );
  }

  async _onPerformanceReview(data) {
    const { employee, review } = data;
    if (!employee?.email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendNotification(employee.email, {
          title: 'تقييم أداء جديد',
          message: `تم إضافة تقييم أداء جديد — الفترة: ${review?.period || 'غير محدد'}. الرجاء مراجعته.`,
          actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/hr/performance`,
          actionText: 'عرض التقييم',
        }),
      'performance_review',
      employee.email
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 💰 FINANCE EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  async _onInvoiceCreated(data) {
    const { invoice, customer } = data;
    const email = customer?.email || invoice?.customerEmail || data.email;
    if (!email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendInvoice(
          invoice || data,
          customer || { email, name: data.customerName }
        ),
      'invoice_created',
      email
    );
  }

  async _onInvoiceSent(data) {
    // Same as created — if an invoice is explicitly "sent", resend the email
    return this._onInvoiceCreated(data);
  }

  async _onPaymentReceived(data) {
    const { payment, customer } = data;
    const email = customer?.email || payment?.customerEmail || data.email;
    if (!email) return;
    await this._safeSend(
      () => this.emailManager.sendPaymentConfirmation({ ...payment, ...data, email }),
      'payment_received',
      email
    );
  }

  async _onPaymentReminder(data) {
    const { invoice } = data;
    const email = invoice?.customerEmail || data.email;
    if (!email) return;
    await this._safeSend(
      () => this.emailManager.sendPaymentReminder({ ...invoice, ...data, email }),
      'payment_reminder',
      email
    );
  }

  async _onBudgetThreshold(data) {
    const adminEmail = data.notifyEmail || process.env.ADMIN_EMAIL || process.env.FINANCE_EMAIL;
    if (!adminEmail) return;
    await this._safeSend(
      () =>
        this.emailManager.sendAlert(
          {
            title: 'تنبيه الميزانية',
            message: `${data.budgetName || 'الميزانية'} وصلت إلى ${data.percentage || data.threshold || '?'}% من الحد الأقصى. المبلغ المتبقي: ${data.remaining || 'غير محدد'}`,
            severity: (data.percentage || 0) >= 90 ? 'critical' : 'warning',
            source: 'النظام المالي',
            actionUrl: `${process.env.FRONTEND_URL || ''}/finance/budgets`,
          },
          adminEmail
        ),
      'budget_threshold',
      adminEmail
    );
  }

  async _onExpenseApproved(data) {
    const { employee, expense } = data;
    if (!employee?.email) return;
    await this._safeSend(
      () =>
        this.emailManager.sendNotification(employee.email, {
          title: `تمت الموافقة على المصروف — ${expense?.amount || ''}`,
          message: `تمت الموافقة على طلب المصروف "${expense?.description || expense?.category || ''}" بمبلغ ${expense?.amount || ''}.`,
          actionUrl: `${process.env.FRONTEND_URL || ''}/finance/expenses`,
        }),
      'expense_approved',
      employee.email
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 🏥 MEDICAL / APPOINTMENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  async _onAppointmentCreated(data) {
    const appointment = data.appointment || data;
    await this._safeSend(
      () => this.emailManager.sendAppointmentConfirmation(appointment),
      'appointment_created',
      appointment.email
    );
  }

  async _onAppointmentConfirmed(data) {
    const appointment = data.appointment || data;
    await this._safeSend(
      () => this.emailManager.sendAppointmentConfirmation(appointment),
      'appointment_confirmed',
      appointment.email
    );
  }

  async _onAppointmentCancelled(data) {
    const appointment = data.appointment || data;
    await this._safeSend(
      () => this.emailManager.sendAppointmentCancellation(appointment),
      'appointment_cancelled',
      appointment.email
    );
  }

  async _onAppointmentReminder(data) {
    const appointment = data.appointment || data;
    await this._safeSend(
      () => this.emailManager.sendAppointmentReminder(appointment),
      'appointment_reminder',
      appointment.email
    );
  }

  async _onSessionCompleted(data) {
    const session = data.session || data;
    await this._safeSend(
      () => this.emailManager.sendSessionSummary(session),
      'session_completed',
      session.guardianEmail
    );
  }

  async _onReportReady(data) {
    const report = data.report || data;
    const email = report.recipientEmail || data.email;
    if (!email) return;
    await this._safeSend(() => this.emailManager.sendReport(report, email), 'report_ready', email);
  }

  // ═══════════════════════════════════════════════════════════
  // 📦 ORDER / SUPPLY CHAIN HANDLERS
  // ═══════════════════════════════════════════════════════════

  async _onOrderCreated(data) {
    const order = data.order || data;
    await this._safeSend(
      () => this.emailManager.sendOrderConfirmation(order),
      'order_created',
      order.email
    );
  }

  async _onOrderConfirmed(data) {
    const order = data.order || data;
    await this._safeSend(
      () => this.emailManager.sendOrderConfirmation(order),
      'order_confirmed',
      order.email
    );
  }

  async _onOrderStatusChanged(data) {
    const order = data.order || data;
    await this._safeSend(
      () => this.emailManager.sendOrderStatusUpdate(order),
      'order_status',
      order.email
    );
  }

  async _onOrderDelivered(data) {
    const order = data.order || data;
    await this._safeSend(
      () => this.emailManager.sendOrderStatusUpdate({ ...order, status: 'delivered' }),
      'order_delivered',
      order.email
    );
  }

  async _onLowStock(data) {
    const adminEmail = data.notifyEmail || process.env.ADMIN_EMAIL || process.env.WAREHOUSE_EMAIL;
    if (!adminEmail) return;
    await this._safeSend(
      () => this.emailManager.sendLowStockAlert(data, adminEmail),
      'low_stock',
      adminEmail
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 📄 GOVERNMENT / DOCUMENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  async _onGovDocumentUpdated(data) {
    const { user, document: doc } = data;
    if (!user?.email) return;
    await this._safeSend(
      () => this.emailManager.sendGovDocumentUpdate(user, doc || data),
      'gov_doc',
      user.email
    );
  }

  async _onDocumentReady(data) {
    const email = data.userEmail || data.email;
    if (!email) return;
    await this._safeSend(
      () => this.emailManager.sendTemplate(email, 'DOCUMENT_READY', data),
      'doc_ready',
      email
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 💬 COMMUNICATION HANDLERS
  // ═══════════════════════════════════════════════════════════

  async _onNewMessage(data) {
    const email = data.recipientEmail || data.to;
    if (!email) return;
    await this._safeSend(
      () => this.emailManager.sendNewCommunication(email, data),
      'new_message',
      email
    );
  }

  async _onApprovalRequested(data) {
    const email = data.approverEmail || data.to;
    if (!email) return;
    await this._safeSend(
      () => this.emailManager.sendApprovalRequest(email, data),
      'approval_request',
      email
    );
  }

  async _onStatusChanged(data) {
    const email = data.notifyEmail || data.email || data.to;
    if (!email) return;
    await this._safeSend(
      () => this.emailManager.sendStatusChange(email, data),
      'status_change',
      email
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ⚠️ SYSTEM EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  async _onCriticalAlert(data) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.ALERT_EMAIL;
    if (!adminEmail) return;
    await this._safeSend(
      () => this.emailManager.sendAlert({ ...data, severity: 'critical' }, adminEmail),
      'critical_alert',
      adminEmail
    );
  }

  async _onWarningAlert(data) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.ALERT_EMAIL;
    if (!adminEmail) return;
    await this._safeSend(
      () => this.emailManager.sendAlert({ ...data, severity: 'warning' }, adminEmail),
      'warning_alert',
      adminEmail
    );
  }

  async _onSystemError(data) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;
    await this._safeSend(
      () =>
        this.emailManager.sendAlert(
          {
            title: 'خطأ في النظام',
            message: data.message || data.error || 'حدث خطأ غير متوقع',
            severity: 'critical',
            source: data.source || data.module || 'النظام',
          },
          adminEmail
        ),
      'system_error',
      adminEmail
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 🔔 NOTIFICATION PASSTHROUGH
  // ═══════════════════════════════════════════════════════════

  async _onNotificationSend(data) {
    // Only send email if the notification has channel=email or emailRequired=true
    if (
      data.channel !== 'email' &&
      data.channels?.includes?.('email') !== true &&
      !data.emailRequired
    )
      return;

    const email = data.email || data.to || data.recipientEmail;
    if (!email) return;

    await this._safeSend(
      () =>
        this.emailManager.sendNotification(email, {
          title: data.title || data.subject || 'إشعار',
          message: data.message || data.body || '',
          actionUrl: data.actionUrl || data.link,
          actionText: data.actionText,
        }),
      'notification_email',
      email
    );
  }

  async _onNotificationEmail(data) {
    // Explicit email notification request
    const email = data.to || data.email || data.recipientEmail;
    if (!email) return;

    if (data.template) {
      await this._safeSend(
        () => this.emailManager.sendTemplate(email, data.template, data.data || data),
        `template_${data.template}`,
        email
      );
    } else {
      await this._safeSend(
        () => this.emailManager.sendNotification(email, data),
        'notification_direct',
        email
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🔧 UTILITIES
  // ═══════════════════════════════════════════════════════════

  /**
   * Safe subscribe to bus event (with deduplication)
   */
  _on(event, handler) {
    if (!this._bus) return;

    const wrappedHandler = async data => {
      this._stats.received++;

      // ── Deduplication check ──────────────────────────────
      const dedupeKey = this._buildDedupeKey(event, data);
      if (dedupeKey && this._isDuplicate(dedupeKey)) {
        this._stats.deduplicated++;
        logger.debug(`[EmailEventBridge] 🔁 Deduplicated: ${event}`);
        return;
      }

      try {
        await handler(data);
        this._stats.processed++;
      } catch (err) {
        this._stats.errors++;
        logger.error(`[EmailEventBridge] Error handling ${event}: ${err.message}`);
      }
    };

    // Support both EventEmitter and bus-style subscriptions
    if (typeof this._bus.on === 'function') {
      this._bus.on(event, wrappedHandler);
    } else if (typeof this._bus.subscribe === 'function') {
      this._bus.subscribe(event, wrappedHandler);
    }

    this._subscriptions.push({ event, handler: wrappedHandler });
  }

  /**
   * Build a unique dedup key from event name + payload.
   * Returns null for events that should never be deduplicated (e.g. OTP).
   */
  _buildDedupeKey(event, data) {
    // Never dedup time-sensitive events
    const neverDedup = ['auth.otp.generated', 'auth.password.reset.requested', 'auth.email.verify'];
    if (neverDedup.includes(event)) return null;

    // Build key from event + identifying fields
    const id = data?.id || data?.userId || data?._id || '';
    const email = data?.email || data?.user?.email || '';
    return `${event}:${id}:${email}`;
  }

  /**
   * Check if an event was already processed within the dedup window.
   * If not, mark it as seen.
   */
  _isDuplicate(key) {
    const now = Date.now();
    const seen = this._dedupeCache.get(key);
    if (seen && now - seen < this._dedupeWindow) {
      return true;
    }
    this._dedupeCache.set(key, now);
    return false;
  }

  /**
   * Purge expired dedup entries to prevent memory leaks.
   */
  _purgeDedupeCache() {
    const now = Date.now();
    let purged = 0;
    for (const [key, timestamp] of this._dedupeCache) {
      if (now - timestamp >= this._dedupeWindow) {
        this._dedupeCache.delete(key);
        purged++;
      }
    }
    if (purged > 0) {
      logger.debug(`[EmailEventBridge] 🧹 Purged ${purged} expired dedup entries`);
    }
  }

  /**
   * Safe send wrapper — catches errors, logs, and never throws
   */
  async _safeSend(sendFn, eventType, email) {
    try {
      const result = await sendFn();
      if (result?.success) {
        logger.debug(`[EmailEventBridge] ✉️ ${eventType} → ${email || 'unknown'}`);
      } else {
        logger.debug(`[EmailEventBridge] ⚠️ ${eventType} → ${result?.error || 'failed'}`);
      }
      return result;
    } catch (err) {
      this._stats.errors++;
      logger.error(`[EmailEventBridge] ❌ ${eventType}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get bridge statistics
   */
  getStats() {
    return {
      enabled: this._enabled,
      connected: !!this._bus,
      subscriptionCount: this._subscriptions.length,
      dedupeCacheSize: this._dedupeCache.size,
      ...this._stats,
    };
  }

  /**
   * Emit a custom event manually (for testing or manual triggers)
   */
  async emitEvent(eventName, data) {
    if (this._bus && typeof this._bus.emit === 'function') {
      this._bus.emit(eventName, data);
      return { success: true };
    }
    return { success: false, error: 'No bus connected' };
  }
}

module.exports = EmailEventBridge;
