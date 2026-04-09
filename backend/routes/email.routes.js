/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Email API Routes — مسارات البريد الإلكتروني المحسّنة
 * ═══════════════════════════════════════════════════════════════
 *
 * Improved REST API for the unified email system.
 * Replaces fragmented routes with a clean, versioned API.
 *
 * Routes:
 *  POST   /api/v2/email/send           — Send single email
 *  POST   /api/v2/email/send-template  — Send using template
 *  POST   /api/v2/email/send-bulk      — Send to multiple recipients
 *  GET    /api/v2/email/templates       — List available templates
 *  POST   /api/v2/email/preview        — Preview a template
 *  GET    /api/v2/email/stats          — Email statistics
 *  GET    /api/v2/email/analytics      — Detailed analytics dashboard
 *  GET    /api/v2/email/logs           — Email logs with pagination
 *  GET    /api/v2/email/logs/:emailId  — Single email detail
 *  GET    /api/v2/email/health         — Health check
 *  POST   /api/v2/email/verify         — Verify transporter
 *  POST   /api/v2/email/queue/process  — Force process queue
 *  POST   /api/v2/email/queue/retry    — Retry failed queue items
 *  DELETE /api/v2/email/queue/purge    — Purge completed items
 *  GET    /api/v2/email/queue/stats    — Queue stats
 *  GET    /api/v2/email/track/open/:id — Track email open (pixel)
 *  GET    /api/v2/email/bounce-report  — Bounce report
 *  GET    /api/v2/email/time-series    — Time-series analytics
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger');

// Import unified email system
const {
  emailManager,
  EmailQueueProcessor,
  EmailAnalytics,
  digestAggregator,
} = require('../services/email');

// Lazy-initialized helpers
let queueProcessor = null;
let analytics = null;

function getQueueProcessor() {
  if (!queueProcessor) queueProcessor = new EmailQueueProcessor(emailManager);
  return queueProcessor;
}

function getAnalytics() {
  if (!analytics) analytics = new EmailAnalytics(emailManager);
  return analytics;
}

// ─── Multer for attachments ─────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/email-attachments/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|zip|rar|csv/;
    const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowedTypes.test(file.mimetype);
    if (extOk || mimeOk) return cb(null, true);
    cb(new Error('نوع الملف غير مسموح'));
  },
});

// ─── Authentication Middleware ───────────────────────────────
const authenticate = (req, res, next) => {
  // Uses existing auth middleware from the app
  // Fallback for development
  if (!req.user) {
    req.user = req.user || { id: 'system', role: 'admin', tenantId: 'default' };
  }
  next();
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'ACCESS_DENIED',
      message: 'هذا الإجراء يتطلب صلاحيات المدير',
    });
  }
  next();
};

// ─── Rate Limiting ──────────────────────────────────────────
const createRateLimiter = (maxRequests = 30, windowMs = 60000) => {
  const requests = new Map();
  return (req, res, next) => {
    const key = req.ip || req.user?.id || 'anonymous';
    const now = Date.now();

    if (!requests.has(key)) requests.set(key, []);
    const userReqs = requests.get(key).filter(t => t > now - windowMs);

    if (userReqs.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'تم تجاوز الحد الأقصى للطلبات. حاول مرة أخرى لاحقاً.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    userReqs.push(now);
    requests.set(key, userReqs);
    next();
  };
};

const sendLimiter = createRateLimiter(30, 60000);
const bulkLimiter = createRateLimiter(5, 60000);

// ═══════════════════════════════════════════════════════════════
// 📤 SEND ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /send — Send a single email
 */
router.post(
  '/send',
  authenticate,
  sendLimiter,
  upload.array('attachments', 10),
  async (req, res) => {
    try {
      const { to, cc, bcc, subject, html, text, priority, metadata } = req.body;

      if (!to) {
        return res
          .status(400)
          .json({ success: false, error: 'MISSING_RECIPIENT', message: 'يجب تحديد المستلم' });
      }
      if (!subject) {
        return res
          .status(400)
          .json({ success: false, error: 'MISSING_SUBJECT', message: 'يجب تحديد الموضوع' });
      }

      // Process uploaded attachments
      const attachments = req.files?.map(f => ({
        filename: f.originalname,
        path: f.path,
        contentType: f.mimetype,
      }));

      const result = await emailManager.send({
        to,
        cc,
        bcc,
        subject,
        html: html || text || '',
        text,
        attachments,
        priority: priority ? parseInt(priority) : 5,
        metadata: {
          ...metadata,
          userId: req.user?.id,
          tenantId: req.user?.tenantId,
          source: 'api',
        },
      });

      const status = result.success ? 200 : 500;
      return res.status(status).json(result);
    } catch (error) {
      logger.error(`[EmailRoutes] Send error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /send-template — Send using a predefined template
 */
router.post('/send-template', authenticate, sendLimiter, async (req, res) => {
  try {
    const { to, template, data, options } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, error: 'MISSING_RECIPIENT' });
    }
    if (!template) {
      return res.status(400).json({ success: false, error: 'MISSING_TEMPLATE' });
    }

    const result = await emailManager.sendTemplate(to, template, data || {}, {
      ...options,
      metadata: {
        ...options?.metadata,
        userId: req.user?.id,
        source: 'api',
      },
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`[EmailRoutes] Template send error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /send-bulk — Send to multiple recipients
 */
router.post('/send-bulk', authenticate, requireAdmin, bulkLimiter, async (req, res) => {
  try {
    const { recipients, template, options } = req.body;

    if (!recipients || !recipients.length) {
      return res.status(400).json({ success: false, error: 'MISSING_RECIPIENTS' });
    }
    if (recipients.length > 1000) {
      return res
        .status(400)
        .json({ success: false, error: 'TOO_MANY_RECIPIENTS', message: 'الحد الأقصى 1000 مستلم' });
    }

    const result = await emailManager.sendBulk(recipients, template || options);
    return res.json(result);
  } catch (error) {
    logger.error(`[EmailRoutes] Bulk send error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 📝 TEMPLATE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /templates — List available templates
 */
router.get('/templates', authenticate, (req, res) => {
  const templates = emailManager.getAvailableTemplates();
  res.json({
    success: true,
    count: templates.length,
    templates: templates.map(name => ({
      name,
      category: _categorizeTemplate(name),
    })),
  });
});

/**
 * POST /preview — Preview a template with sample data
 */
router.post('/preview', authenticate, (req, res) => {
  try {
    const { template, data } = req.body;

    if (!template) {
      return res.status(400).json({ success: false, error: 'MISSING_TEMPLATE' });
    }

    const rendered = emailManager.previewTemplate(template, data || _getSampleData(template));
    return res.json({
      success: true,
      template,
      subject: rendered.subject,
      html: rendered.html,
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 📊 ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /stats — Quick statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await emailManager.getStats();
    return res.json({ success: true, ...stats });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /analytics — Detailed dashboard analytics
 */
router.get('/analytics', authenticate, requireAdmin, async (req, res) => {
  try {
    const dashboard = await getAnalytics().getDashboard();
    return res.json({ success: true, ...dashboard });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /time-series — Time-series email data
 */
router.get('/time-series', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await getAnalytics().getTimeSeries(days);
    return res.json({ success: true, days, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /bounce-report — Bounce report
 */
router.get('/bounce-report', authenticate, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const report = await getAnalytics().getBounceReport(days);
    return res.json({ success: true, ...report });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 📋 LOG ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /logs — Email logs with pagination and filters
 */
router.get('/logs', authenticate, async (req, res) => {
  try {
    const logs = await getAnalytics().getLogs({
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 20, 100),
      status: req.query.status,
      provider: req.query.provider,
      to: req.query.to,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder === 'asc' ? 1 : -1,
    });
    return res.json({ success: true, ...logs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /logs/:emailId — Single email log detail
 */
router.get('/logs/:emailId', authenticate, async (req, res) => {
  try {
    const detail = await getAnalytics().getEmailDetail(req.params.emailId);
    if (!detail) {
      return res.status(404).json({ success: false, error: 'EMAIL_NOT_FOUND' });
    }
    return res.json({ success: true, data: detail });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 📡 TRACKING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /track/open/:emailId — Tracking pixel for email opens
 */
router.get('/track/open/:emailId', async (req, res) => {
  try {
    await getAnalytics().recordOpen(req.params.emailId, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } catch {
    // Tracking failure should not break anything
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  return res.send(pixel);
});

/**
 * GET /track/click/:emailId — Track email link clicks
 */
router.get('/track/click/:emailId', async (req, res) => {
  const { url } = req.query;

  try {
    await getAnalytics().recordClick(req.params.emailId, url, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } catch {
    // silent
  }

  return res.redirect(url || '/');
});

// ═══════════════════════════════════════════════════════════════
// 📦 QUEUE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /queue/stats — Queue processor statistics
 */
router.get('/queue/stats', authenticate, requireAdmin, (req, res) => {
  const stats = getQueueProcessor().getStats();
  return res.json({ success: true, ...stats });
});

/**
 * POST /queue/process — Force process queue now
 */
router.post('/queue/process', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await getQueueProcessor().processNow();
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /queue/retry — Retry all failed items
 */
router.post('/queue/retry', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await getQueueProcessor().retryFailed();
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /queue/purge — Purge completed items
 */
router.delete('/queue/purge', authenticate, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const result = await getQueueProcessor().purgeCompleted(days);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 🏥 HEALTH
// ═══════════════════════════════════════════════════════════════

/**
 * GET /health — Email system health check
 */
router.get('/health', async (req, res) => {
  try {
    const [verifyResult, stats] = await Promise.all([
      emailManager.verify(),
      emailManager.getStats(),
    ]);

    const healthy = verifyResult.success;
    return res.status(healthy ? 200 : 503).json({
      success: healthy,
      status: healthy ? 'healthy' : 'degraded',
      provider: stats.provider,
      enabled: stats.enabled,
      initialized: stats.initialized,
      verification: verifyResult,
      rateLimit: stats.rateLimit,
    });
  } catch (error) {
    return res.status(503).json({ success: false, status: 'error', error: error.message });
  }
});

/**
 * POST /verify — Verify email transport connection
 */
router.post('/verify', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await emailManager.verify();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 🔧 MAINTENANCE
// ═══════════════════════════════════════════════════════════════

/**
 * POST /cleanup — Clean up old logs
 */
router.post('/cleanup', authenticate, requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.body.retainDays) || 90;
    const result = await getAnalytics().cleanup(days);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════════

function _categorizeTemplate(name) {
  const categories = {
    auth: [
      'WELCOME',
      'PASSWORD_RESET',
      'EMAIL_VERIFICATION',
      'OTP_CODE',
      'TWO_FA_ENABLED',
      'TWO_FA_DISABLED',
      'LOGIN_ALERT',
      'ACCOUNT_LOCKED',
    ],
    appointments: [
      'APPOINTMENT_REMINDER',
      'APPOINTMENT_CONFIRMATION',
      'APPOINTMENT_CANCELLATION',
      'SESSION_SUMMARY',
    ],
    hr: ['LEAVE_REQUEST', 'LEAVE_STATUS_UPDATE', 'SALARY_NOTIFICATION', 'ATTENDANCE_ALERT'],
    finance: ['INVOICE', 'PAYMENT_CONFIRMATION', 'PAYMENT_REMINDER'],
    supply_chain: ['ORDER_CONFIRMATION', 'ORDER_STATUS_UPDATE', 'LOW_STOCK_ALERT'],
    government: ['GOV_DOCUMENT_UPDATE'],
    reports: ['REPORT_READY'],
    system: ['ALERT_NOTIFICATION', 'NOTIFICATION', 'DAILY_DIGEST'],
    communication: ['NEW_COMMUNICATION', 'APPROVAL_REQUEST', 'STATUS_CHANGE', 'DOCUMENT_READY'],
  };

  for (const [cat, templates] of Object.entries(categories)) {
    if (templates.includes(name)) return cat;
  }
  return 'other';
}

function _getSampleData(template) {
  const samples = {
    WELCOME: { name: 'أحمد محمد', email: 'ahmed@example.com', role: 'مستخدم' },
    PASSWORD_RESET: { name: 'سارة علي', resetToken: 'sample-token-xxx' },
    EMAIL_VERIFICATION: { name: 'خالد سعيد', verificationToken: 'verify-xxx' },
    OTP_CODE: { name: 'فاطمة', otp: '583921', expiry: 5 },
    INVOICE: {
      invoiceNumber: 'INV-2026-001',
      customerName: 'شركة الأمل',
      total: 5250,
      dueDate: new Date(),
    },
    APPOINTMENT_REMINDER: {
      patientName: 'محمد',
      type: 'جلسة علاجية',
      date: new Date(),
      startTime: '10:00',
      therapistName: 'د. سارة',
    },
    NOTIFICATION: { title: 'إشعار تجريبي', message: 'هذا إشعار تجريبي لمعاينة القالب.' },
    DAILY_DIGEST: {
      name: 'المدير',
      stats: [
        { value: 12, label: 'مهمة' },
        { value: 3, label: 'موعد' },
        { value: 5, label: 'إشعار' },
      ],
    },
  };
  return samples[template] || { name: 'مستخدم تجريبي', email: 'test@example.com' };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WEBHOOKS — Bounce / Complaint Processing (SendGrid, SES, generic)
// ═══════════════════════════════════════════════════════════════════════════════

let EmailPreference;
try {
  EmailPreference = require('../models/EmailPreference');
} catch {
  EmailPreference = null;
}

/**
 * POST /webhooks/sendgrid — Process SendGrid Event Webhooks
 * Handles: bounce, dropped, deferred, spam_report, unsubscribe
 * No auth required — uses SendGrid signed webhook verification
 */
router.post('/webhooks/sendgrid', async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    let processed = 0;

    for (const event of events) {
      if (!event || !event.email) continue;
      const email = event.email.toLowerCase();

      switch (event.event) {
        case 'bounce':
        case 'dropped':
          if (EmailPreference) {
            const bounceType =
              event.type === 'bounce' && event.status?.startsWith('5') ? 'hard' : 'soft';
            await EmailPreference.recordBounce(email, bounceType);
          }
          logger.warn(`[Webhook/SendGrid] Bounce: ${email} (${event.type || event.event})`);
          processed++;
          break;

        case 'spamreport':
        case 'spam_report':
          if (EmailPreference) {
            await EmailPreference.recordComplaint(email);
          }
          logger.warn(`[Webhook/SendGrid] Spam report: ${email}`);
          processed++;
          break;

        case 'unsubscribe':
        case 'group_unsubscribe':
          if (EmailPreference) {
            const prefs = await EmailPreference.findOne({ email });
            if (prefs) {
              prefs.globalEnabled = false;
              await prefs.save();
            }
          }
          logger.info(`[Webhook/SendGrid] Unsubscribe: ${email}`);
          processed++;
          break;

        case 'open':
        case 'click':
          // Track engagement (non-critical)
          if (EmailPreference) {
            const prefs = await EmailPreference.findOne({ email });
            if (prefs) await prefs.recordEmailOpened();
          }
          processed++;
          break;

        default:
          // delivered, processed, deferred — log but don't act
          break;
      }
    }

    res.json({ success: true, processed, total: events.length });
  } catch (err) {
    logger.error('[Webhook/SendGrid] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /webhooks/ses — Process AWS SES Notifications (via SNS)
 */
router.post('/webhooks/ses', async (req, res) => {
  try {
    let notification = req.body;

    // SNS sends confirmation — auto-confirm
    if (notification.Type === 'SubscriptionConfirmation') {
      logger.info('[Webhook/SES] Subscription confirmation received');
      return res.json({ success: true, message: 'Subscription confirmed' });
    }

    // Parse SNS Message
    if (notification.Type === 'Notification' && notification.Message) {
      try {
        notification = JSON.parse(notification.Message);
      } catch {
        /* use as is */
      }
    }

    const notifType = notification.notificationType || notification.eventType;
    const processed = [];

    if (notifType === 'Bounce' && notification.bounce) {
      for (const recipient of notification.bounce.bouncedRecipients || []) {
        const email = recipient.emailAddress?.toLowerCase();
        if (email && EmailPreference) {
          const bounceType = notification.bounce.bounceType === 'Permanent' ? 'hard' : 'soft';
          await EmailPreference.recordBounce(email, bounceType);
          processed.push(email);
        }
      }
    } else if (notifType === 'Complaint' && notification.complaint) {
      for (const recipient of notification.complaint.complainedRecipients || []) {
        const email = recipient.emailAddress?.toLowerCase();
        if (email && EmailPreference) {
          await EmailPreference.recordComplaint(email);
          processed.push(email);
        }
      }
    }

    res.json({ success: true, type: notifType, processed: processed.length });
  } catch (err) {
    logger.error('[Webhook/SES] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /webhooks/mailgun — Process Mailgun webhook events
 * Mailgun sends events like: bounced, complained, unsubscribed, delivered, opened, clicked
 */
router.post('/webhooks/mailgun', async (req, res) => {
  try {
    // Mailgun wraps events in event-data
    const eventData = req.body?.['event-data'] || req.body;
    if (!eventData) {
      return res.status(400).json({ success: false, error: 'No event data' });
    }

    const event = eventData.event;
    const recipient = eventData.recipient?.toLowerCase();
    let processed = false;

    if (!recipient) {
      return res.json({ success: true, processed: false, reason: 'no_recipient' });
    }

    switch (event) {
      case 'failed': {
        // Permanent = hard bounce, temporary = soft bounce
        const severity = eventData.severity || 'permanent';
        const bounceType = severity === 'permanent' ? 'hard' : 'soft';
        if (EmailPreference) {
          await EmailPreference.recordBounce(recipient, bounceType);
        }
        logger.warn(`[Webhook/Mailgun] Bounce (${severity}): ${recipient}`);
        processed = true;
        break;
      }

      case 'complained': {
        if (EmailPreference) {
          await EmailPreference.recordComplaint(recipient);
        }
        logger.warn(`[Webhook/Mailgun] Complaint: ${recipient}`);
        processed = true;
        break;
      }

      case 'unsubscribed': {
        if (EmailPreference) {
          const prefs = await EmailPreference.findOne({ email: recipient });
          if (prefs) {
            prefs.globalEnabled = false;
            await prefs.save();
          }
        }
        logger.info(`[Webhook/Mailgun] Unsubscribe: ${recipient}`);
        processed = true;
        break;
      }

      case 'opened':
      case 'clicked': {
        if (EmailPreference) {
          const prefs = await EmailPreference.findOne({ email: recipient });
          if (prefs) await prefs.recordEmailOpened();
        }
        processed = true;
        break;
      }

      default:
        // delivered, stored, etc. — log but ignore
        break;
    }

    res.json({ success: true, event, processed });
  } catch (err) {
    logger.error('[Webhook/Mailgun] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  UNSUBSCRIBE — GDPR-compliant one-click unsubscribe
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /unsubscribe/:token — Display unsubscribe page
 */
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    if (!EmailPreference) {
      return res.status(503).send('خدمة إلغاء الاشتراك غير متوفرة حالياً');
    }

    const prefs = await EmailPreference.findOne({ unsubscribeToken: req.params.token });
    if (!prefs) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>رابط غير صالح</title>
        <style>body{font-family:Tahoma,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5}
        .card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);text-align:center;max-width:400px}</style></head>
        <body><div class="card"><h2>⚠️ رابط غير صالح</h2><p>رابط إلغاء الاشتراك غير صالح أو منتهي الصلاحية.</p></div></body></html>
      `);
    }

    const categories = [
      { key: 'auth', label: 'إشعارات الأمان', enabled: prefs.categories.auth.enabled },
      { key: 'hr', label: 'الموارد البشرية', enabled: prefs.categories.hr.enabled },
      { key: 'finance', label: 'المالية', enabled: prefs.categories.finance.enabled },
      { key: 'system', label: 'النظام', enabled: prefs.categories.system.enabled },
      { key: 'marketing', label: 'التسويق', enabled: prefs.categories.marketing.enabled },
      { key: 'appointments', label: 'المواعيد', enabled: prefs.categories.appointments.enabled },
    ];

    const checkboxes = categories
      .map(
        c =>
          `<label><input type="checkbox" name="categories" value="${c.key}" ${c.enabled ? 'checked' : ''}> ${c.label}</label>`
      )
      .join('<br>');

    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>إدارة اشتراكات البريد</title>
      <style>
        body{font-family:Tahoma,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5}
        .card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);max-width:500px;width:100%}
        h2{color:#333;margin-bottom:20px}
        label{display:block;padding:8px 0;font-size:16px;cursor:pointer}
        input[type=checkbox]{margin-left:8px;transform:scale(1.3)}
        .btn{display:inline-block;padding:12px 24px;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin:8px 4px}
        .btn-save{background:#667eea;color:#fff}.btn-save:hover{background:#5a6fd6}
        .btn-unsub{background:#dc3545;color:#fff}.btn-unsub:hover{background:#c82333}
        .footer{margin-top:20px;color:#888;font-size:13px}
      </style></head>
      <body><div class="card">
        <h2>📧 إدارة اشتراكات البريد الإلكتروني</h2>
        <p>اختر أنواع الإشعارات التي ترغب في استقبالها:</p>
        <form method="POST" action="/api/v2/email/unsubscribe/${req.params.token}">
          ${checkboxes}
          <div style="margin-top:20px">
            <button type="submit" class="btn btn-save">💾 حفظ التفضيلات</button>
            <button type="submit" name="action" value="unsubscribe_all" class="btn btn-unsub">🚫 إلغاء جميع الاشتراكات</button>
          </div>
        </form>
        <p class="footer">يمكنك تغيير تفضيلاتك في أي وقت.</p>
      </div></body></html>
    `);
  } catch (err) {
    logger.error('[Unsubscribe] Error:', err.message);
    res.status(500).send('حدث خطأ — يرجى المحاولة لاحقاً');
  }
});

/**
 * POST /unsubscribe/:token — Process unsubscribe
 */
router.post('/unsubscribe/:token', async (req, res) => {
  try {
    if (!EmailPreference) {
      return res.status(503).json({ success: false, message: 'Service unavailable' });
    }

    const { token } = req.params;
    const action = req.body.action;

    if (action === 'unsubscribe_all') {
      const result = await EmailPreference.unsubscribeByToken(token);
      if (!result) {
        return res.status(404).send('رابط غير صالح');
      }
      return res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تم إلغاء الاشتراك</title>
        <style>body{font-family:Tahoma,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5}
        .card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);text-align:center}</style></head>
        <body><div class="card"><h2>✅ تم إلغاء الاشتراك</h2><p>تم إلغاء جميع اشتراكات البريد الإلكتروني بنجاح.</p></div></body></html>
      `);
    }

    // Selective category update
    const prefs = await EmailPreference.findOne({ unsubscribeToken: token });
    if (!prefs) {
      return res.status(404).send('رابط غير صالح');
    }

    const enabledCategories = [].concat(req.body.categories || []);
    const allCategories = ['auth', 'hr', 'finance', 'system', 'marketing', 'appointments'];

    for (const cat of allCategories) {
      if (prefs.categories[cat]) {
        prefs.categories[cat].enabled = enabledCategories.includes(cat);
        if (!enabledCategories.includes(cat)) {
          prefs.categories[cat].frequency = 'off';
        }
      }
    }
    prefs.globalEnabled = enabledCategories.length > 0;
    await prefs.save();

    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تم حفظ التفضيلات</title>
      <style>body{font-family:Tahoma,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5}
      .card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);text-align:center}</style></head>
      <body><div class="card"><h2>✅ تم حفظ التفضيلات</h2><p>تم تحديث تفضيلات البريد الإلكتروني بنجاح.</p></div></body></html>
    `);
  } catch (err) {
    logger.error('[Unsubscribe] Error:', err.message);
    res.status(500).send('حدث خطأ — يرجى المحاولة لاحقاً');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EMAIL PREFERENCES — Per-user notification preferences
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /preferences — Get current user's email preferences
 */
router.get('/preferences', authenticate, async (req, res) => {
  try {
    if (!EmailPreference) {
      return res.status(503).json({ success: false, message: 'Email preferences not available' });
    }

    const prefs = await EmailPreference.findOrCreateForUser(req.user.id, req.user.email);
    res.json({
      success: true,
      data: {
        globalEnabled: prefs.globalEnabled,
        categories: prefs.categories,
        quietHours: prefs.quietHours,
        stats: prefs.stats,
        unsubscribeToken: prefs.unsubscribeToken,
      },
    });
  } catch (err) {
    logger.error('[EmailPreferences] GET error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /preferences — Update current user's email preferences
 */
router.put('/preferences', authenticate, async (req, res) => {
  try {
    if (!EmailPreference) {
      return res.status(503).json({ success: false, message: 'Email preferences not available' });
    }

    const prefs = await EmailPreference.findOrCreateForUser(req.user.id, req.user.email);
    const { globalEnabled, categories, quietHours } = req.body;

    if (typeof globalEnabled === 'boolean') {
      prefs.globalEnabled = globalEnabled;
    }

    if (categories && typeof categories === 'object') {
      const validCats = ['auth', 'hr', 'finance', 'system', 'marketing', 'appointments'];
      const validFreqs = ['instant', 'daily_digest', 'weekly_digest', 'off'];

      for (const cat of validCats) {
        if (categories[cat]) {
          if (typeof categories[cat].enabled === 'boolean') {
            prefs.categories[cat].enabled = categories[cat].enabled;
          }
          if (validFreqs.includes(categories[cat].frequency)) {
            prefs.categories[cat].frequency = categories[cat].frequency;
          }
        }
      }
    }

    if (quietHours && typeof quietHours === 'object') {
      if (typeof quietHours.enabled === 'boolean') prefs.quietHours.enabled = quietHours.enabled;
      if (typeof quietHours.startHour === 'number')
        prefs.quietHours.startHour = Math.min(23, Math.max(0, quietHours.startHour));
      if (typeof quietHours.endHour === 'number')
        prefs.quietHours.endHour = Math.min(23, Math.max(0, quietHours.endHour));
      if (quietHours.timezone) prefs.quietHours.timezone = quietHours.timezone;
    }

    await prefs.save();

    res.json({
      success: true,
      message: 'تم تحديث تفضيلات البريد الإلكتروني',
      data: {
        globalEnabled: prefs.globalEnabled,
        categories: prefs.categories,
        quietHours: prefs.quietHours,
      },
    });
  } catch (err) {
    logger.error('[EmailPreferences] PUT error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CIRCUIT BREAKER — Provider health & fault tolerance status
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /circuit-breaker — Get circuit breaker status
 */
router.get('/circuit-breaker', requireAdmin, async (_req, res) => {
  try {
    const cb = emailManager._circuitBreaker;
    if (!cb) {
      return res.json({
        success: true,
        data: { state: 'N/A', message: 'Circuit breaker not configured' },
      });
    }
    res.json({ success: true, data: cb.stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /circuit-breaker/reset — Manually reset circuit breaker
 */
router.post('/circuit-breaker/reset', requireAdmin, async (_req, res) => {
  try {
    const cb = emailManager._circuitBreaker;
    if (!cb) {
      return res.status(404).json({ success: false, message: 'Circuit breaker not configured' });
    }
    cb.reset();
    res.json({ success: true, message: 'تم إعادة تعيين قاطع الدائرة', data: cb.stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /circuit-breaker/trip — Manually trip circuit breaker (maintenance mode)
 */
router.post('/circuit-breaker/trip', requireAdmin, async (req, res) => {
  try {
    const cb = emailManager._circuitBreaker;
    if (!cb) {
      return res.status(404).json({ success: false, message: 'Circuit breaker not configured' });
    }
    cb.trip(req.body.reason || 'Admin manual trip');
    res.json({ success: true, message: 'تم تعطيل نظام البريد (وضع الصيانة)', data: cb.stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPREHENSIVE HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /health/detailed — Comprehensive email system health report
 */
router.get('/health/detailed', requireAdmin, async (_req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      components: {},
    };

    // Provider status
    health.components.provider = {
      type: emailManager._provider || 'unknown',
      connected: !!emailManager._transporter,
    };

    // Circuit breaker
    const cb = emailManager._circuitBreaker;
    if (cb) {
      health.components.circuitBreaker = {
        state: cb.state,
        stats: cb.stats,
      };
      if (cb.state === 'OPEN') health.status = 'degraded';
    }

    // Queue status
    health.components.queue = {
      enabled: !!emailManager._EmailQueue,
    };

    // Stats
    health.components.stats = emailManager._stats || {};

    // Email preferences (suppressed count)
    if (EmailPreference) {
      try {
        const suppressedCount = await EmailPreference.countDocuments({
          'deliveryHealth.suppressed': true,
        });
        health.components.suppression = {
          suppressedAddresses: suppressedCount,
        };
      } catch {
        health.components.suppression = { status: 'db_unavailable' };
      }
    }

    // Verify SMTP connection
    try {
      if (emailManager._transporter && typeof emailManager._transporter.verify === 'function') {
        await Promise.race([
          emailManager._transporter.verify(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
        health.components.provider.verified = true;
      }
    } catch (err) {
      health.components.provider.verified = false;
      health.components.provider.verifyError = err.message;
      if (health.status === 'healthy') health.status = 'warning';
    }

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 200;
    res.status(statusCode).json({ success: true, data: health });
  } catch (err) {
    res.status(500).json({
      success: false,
      data: { status: 'error', error: err.message, timestamp: new Date().toISOString() },
    });
  }
});

// ═══════════════════════════════════════════════════════════════
//  📬 DIGEST AGGREGATOR ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /digest/stats — Digest queue statistics
 */
router.get('/digest/stats', requireAuth, requireAdmin, (req, res) => {
  try {
    if (!digestAggregator) {
      return res.json({ success: true, data: { status: 'not_initialized' } });
    }
    res.json({ success: true, data: digestAggregator.stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /digest/queue — View pending items in digest queue
 */
router.get('/digest/queue', requireAuth, requireAdmin, (req, res) => {
  try {
    if (!digestAggregator) {
      return res.json({ success: true, data: { pending: {} } });
    }
    res.json({
      success: true,
      data: {
        pending: digestAggregator.getPendingCounts(),
        usersInQueue: digestAggregator.stats.usersInQueue,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /digest/flush/daily — Force flush daily digests now
 */
router.post('/digest/flush/daily', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!digestAggregator) {
      return res.status(400).json({ success: false, error: 'Digest aggregator not initialized' });
    }
    const result = await digestAggregator.flushDaily();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /digest/flush/weekly — Force flush weekly digests now
 */
router.post('/digest/flush/weekly', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!digestAggregator) {
      return res.status(400).json({ success: false, error: 'Digest aggregator not initialized' });
    }
    const result = await digestAggregator.flushWeekly();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /digest/purge — Purge all queued digest items
 */
router.delete('/digest/purge', requireAuth, requireAdmin, (req, res) => {
  try {
    if (!digestAggregator) {
      return res.status(400).json({ success: false, error: 'Digest aggregator not initialized' });
    }
    const counts = digestAggregator.purge();
    res.json({
      success: true,
      message: `Purged ${counts.dailyItems} daily + ${counts.weeklyItems} weekly items`,
      data: counts,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  📅 SCHEDULER ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /scheduler/status — Get scheduler status and job list
 */
router.get('/scheduler/status', requireAuth, requireAdmin, (req, res) => {
  try {
    // Access the scheduler from the server instance
    const scheduler = req.app?.get?.('emailScheduler') || global._emailScheduler;
    if (!scheduler) {
      return res.json({
        success: true,
        data: {
          status: 'not_accessible',
          message: 'Scheduler running but not exposed on request context',
        },
      });
    }

    res.json({
      success: true,
      data: {
        running: scheduler._running,
        jobs: scheduler.getJobs?.() || [],
        lastRuns: scheduler._lastRuns || {},
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /scheduler/run/:jobName — Manually trigger a scheduled job
 */
router.post('/scheduler/run/:jobName', requireAuth, requireAdmin, async (req, res) => {
  try {
    const scheduler = req.app?.get?.('emailScheduler') || global._emailScheduler;
    if (!scheduler) {
      return res.status(400).json({ success: false, error: 'Scheduler not accessible' });
    }

    const { jobName } = req.params;
    if (typeof scheduler.runJob !== 'function') {
      return res.status(400).json({ success: false, error: 'Scheduler has no runJob method' });
    }

    const result = await scheduler.runJob(jobName);
    res.json({ success: true, data: { job: jobName, result } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /scheduler/jobs — List all available scheduled jobs
 */
router.get('/scheduler/jobs', requireAuth, requireAdmin, (req, res) => {
  try {
    const scheduler = req.app?.get?.('emailScheduler') || global._emailScheduler;
    if (!scheduler) {
      return res.json({ success: true, data: [] });
    }
    res.json({ success: true, data: scheduler.getJobs?.() || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  📊 ENHANCED HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

// ─── Error handler ──────────────────────────────────────────
router.use((error, req, res, _next) => {
  logger.error(`[EmailRoutes] Unhandled error: ${error.message}`);
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'حدث خطأ داخلي في نظام البريد الإلكتروني',
  });
});

module.exports = router;
