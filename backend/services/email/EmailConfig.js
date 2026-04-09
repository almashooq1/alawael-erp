/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Email Configuration — إعدادات البريد الإلكتروني
 * ═══════════════════════════════════════════════════════════════
 *
 * Centralized configuration — all env vars in ONE place.
 * Normalizes the inconsistent env var names from legacy code.
 */

const path = require('path');

/** @type {EmailSystemConfig} */
const EmailConfig = {
  // ─── Provider Selection ───────────────────────────────────
  provider: process.env.EMAIL_PROVIDER || 'smtp',
  enabled: process.env.EMAIL_ENABLED !== 'false',

  // ─── SMTP / Nodemailer ────────────────────────────────────
  smtp: {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10),
    secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE || '') === 'true',
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '',
    },
    pool: true,
    maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || '5', 10),
    maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES || '100', 10),
    // TLS options
    tls: {
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
    },
  },

  // ─── SendGrid ─────────────────────────────────────────────
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    enabled: !!process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || '',
    webhookPublicKey: process.env.SENDGRID_WEBHOOK_PUBLIC_KEY || '',
  },

  // ─── Mailgun ──────────────────────────────────────────────
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY || '',
    domain: process.env.MAILGUN_DOMAIN || '',
    enabled: !!process.env.MAILGUN_API_KEY,
    fromEmail: process.env.MAILGUN_FROM_EMAIL || '',
  },

  // ─── Azure Communication Services ────────────────────────
  azure: {
    connectionString: process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '',
    senderAddress: process.env.AZURE_SENDER_ADDRESS || '',
    webhookSecret: process.env.AZURE_WEBHOOK_SECRET || '',
    enabled: !!process.env.AZURE_COMMUNICATION_CONNECTION_STRING,
  },

  // ─── Defaults ─────────────────────────────────────────────
  defaults: {
    from:
      process.env.EMAIL_FROM ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'noreply@alawael-erp.com',
    fromName: process.env.EMAIL_FROM_NAME || 'نظام الأوائل ERP',
    fromAddress:
      process.env.EMAIL_FROM_ADDRESS ||
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER ||
      'noreply@alawael-erp.com',
    replyTo: process.env.EMAIL_REPLY_TO || '',
  },

  // ─── Rate Limiting ────────────────────────────────────────
  rateLimit: {
    maxPerMinute: parseInt(process.env.EMAIL_RATE_PER_MINUTE || '30', 10),
    maxPerHour: parseInt(process.env.EMAIL_RATE_PER_HOUR || '500', 10),
    maxPerDay: parseInt(process.env.EMAIL_RATE_PER_DAY || '5000', 10),
  },

  // ─── Retry / Queue ────────────────────────────────────────
  retry: {
    maxAttempts: parseInt(process.env.EMAIL_RETRY_MAX || '3', 10),
    initialDelayMs: parseInt(process.env.EMAIL_RETRY_DELAY || '5000', 10),
    backoffMultiplier: 2,
  },

  // ─── Queue Processing ─────────────────────────────────────
  queue: {
    batchSize: parseInt(process.env.EMAIL_QUEUE_BATCH || '10', 10),
    pollIntervalMs: parseInt(process.env.EMAIL_QUEUE_INTERVAL || '30000', 10),
    staleTimeoutMs: 5 * 60 * 1000, // 5 minutes
  },

  // ─── Templates ────────────────────────────────────────────
  templates: {
    dir: process.env.EMAIL_TEMPLATES_DIR || path.join(__dirname, '../../templates/emails'),
    cacheEnabled: process.env.NODE_ENV === 'production',
    cacheTTL: 60 * 60 * 1000, // 1 hour
  },

  // ─── Frontend URL ─────────────────────────────────────────
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // ─── Tracking ─────────────────────────────────────────────
  tracking: {
    opens: process.env.EMAIL_TRACK_OPENS !== 'false',
    clicks: process.env.EMAIL_TRACK_CLICKS !== 'false',
    pixelUrl: process.env.EMAIL_TRACKING_URL || '',
  },

  // ─── Logging ──────────────────────────────────────────────
  logging: {
    logToDb: process.env.EMAIL_LOG_TO_DB !== 'false',
    logLevel: process.env.EMAIL_LOG_LEVEL || 'info',
    retainDays: parseInt(process.env.EMAIL_LOG_RETAIN_DAYS || '90', 10),
  },

  // ─── Company branding ─────────────────────────────────────
  brand: {
    name: process.env.COMPANY_NAME || 'مركز الأوائل للتأهيل',
    nameEn: process.env.COMPANY_NAME_EN || 'Al-Awael Rehabilitation Center',
    logo: process.env.COMPANY_LOGO_URL || '',
    primaryColor: process.env.BRAND_PRIMARY_COLOR || '#667eea',
    secondaryColor: process.env.BRAND_SECONDARY_COLOR || '#764ba2',
    textColor: '#333333',
    bgColor: '#f8f9fa',
    footerColor: '#6c757d',
  },

  // ─── Helper: check if credentials exist ───────────────────
  hasCredentials() {
    return (
      !!(this.smtp.auth.user && this.smtp.auth.pass) ||
      this.sendgrid.enabled ||
      this.mailgun.enabled ||
      this.azure.enabled
    );
  },

  // ─── Helper: resolve best provider ────────────────────────
  resolveProvider() {
    if (this.provider !== 'smtp' && this[this.provider]?.enabled) return this.provider;
    if (this.smtp.auth.user && this.smtp.auth.pass) return 'smtp';
    if (this.sendgrid.enabled) return 'sendgrid';
    if (this.mailgun.enabled) return 'mailgun';
    if (this.azure.enabled) return 'azure';
    return 'mock';
  },
};

module.exports = EmailConfig;
