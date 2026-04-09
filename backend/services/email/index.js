/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📧 Unified Email System — نظام البريد الإلكتروني الموحد
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Single entry point for ALL email operations in the application.
 * Replaces the 4 overlapping email services with one unified module.
 *
 * Architecture:
 *  ┌─────────────────────────────────────────────────┐
 *  │            EmailManager (Facade)                 │
 *  ├──────────┬──────────┬──────────┬────────────────┤
 *  │ Provider │ Template │  Queue   │   Analytics    │
 *  │  Layer   │  Engine  │ Processor│   & Tracking   │
 *  ├──────────┴──────────┴──────────┴────────────────┤
 *  │  SMTP / SendGrid / Mailgun / Azure / Mock       │
 *  └─────────────────────────────────────────────────┘
 *
 * Features:
 *  - Multi-provider transport (SMTP primary, SendGrid/Mailgun fallback)
 *  - Professional Arabic RTL HTML email templates
 *  - Queue with retry & exponential backoff
 *  - Rate limiting (minute/hour/day)
 *  - Email tracking (opens, clicks)
 *  - Real-time WebSocket notifications
 *  - Email analytics & reporting
 *  - Template versioning
 *  - Attachment support (25MB max)
 *  - Bounce & complaint tracking
 *  - GDPR-compliant unsubscribe
 */

const EmailManager = require('./EmailManager');
const EmailConfig = require('./EmailConfig');
const { EmailTemplateEngine, BRAND } = require('./EmailTemplateEngine');
const EmailQueueProcessor = require('./EmailQueueProcessor');
const EmailAnalytics = require('./EmailAnalytics');
const EmailEventBridge = require('./emailEventBridge');
const EmailScheduler = require('./emailScheduler');
const { EmailCircuitBreaker } = require('./EmailCircuitBreaker');
const { EmailDigestAggregator } = require('./EmailDigestAggregator');

// Singleton instance
const emailManager = new EmailManager();
const digestAggregator = new EmailDigestAggregator(emailManager);

// Wire digest aggregator into the manager so send() can route to it
emailManager.setDigestAggregator(digestAggregator);

module.exports = {
  // Main service
  EmailManager,
  emailManager,

  // Config
  EmailConfig,

  // Template engine
  EmailTemplateEngine,
  BRAND,

  // Queue
  EmailQueueProcessor,

  // Analytics
  EmailAnalytics,

  // Event Bridge (Integration Bus ↔ Email)
  EmailEventBridge,

  // Scheduler (Cron jobs)
  EmailScheduler,

  // Circuit Breaker (Fault tolerance)
  EmailCircuitBreaker,

  // Digest Aggregator (Daily/Weekly batching)
  EmailDigestAggregator,
  digestAggregator,

  // ── Quick helpers ──────────────────────────────────────────
  sendEmail: (to, subject, html, options) => emailManager.send({ to, subject, html, ...options }),

  sendTemplate: (to, template, data, options) =>
    emailManager.sendTemplate(to, template, data, options),

  sendBulk: (recipients, templateOrOptions) => emailManager.sendBulk(recipients, templateOrOptions),
};
