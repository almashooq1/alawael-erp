'use strict';

/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Email Config Validator — التحقق من صحة إعدادات البريد
 * ═══════════════════════════════════════════════════════════════
 *
 * Validates EmailConfig at startup using Joi schemas.
 * Returns warnings (non-fatal) and errors (fatal) so the system
 * can start in degraded mode when optional settings are missing.
 */

const Joi = require('joi');
const logger = require('../../utils/logger');

// ─── Schema Definition ───────────────────────────────────────────
const emailConfigSchema = Joi.object({
  provider: Joi.string().valid('smtp', 'sendgrid', 'mailgun', 'azure', 'mock').default('smtp'),

  enabled: Joi.boolean().default(true),

  smtp: Joi.object({
    host: Joi.string().hostname().allow('').default('smtp.gmail.com'),
    port: Joi.number().integer().min(1).max(65535).default(587),
    secure: Joi.boolean().default(false),
    auth: Joi.object({
      user: Joi.string().allow('').default(''),
      pass: Joi.string().allow('').default(''),
    }),
    pool: Joi.boolean().default(true),
    maxConnections: Joi.number().integer().min(1).max(50).default(5),
    maxMessages: Joi.number().integer().min(1).max(1000).default(100),
    tls: Joi.object({
      rejectUnauthorized: Joi.boolean().default(true),
    }),
  }),

  sendgrid: Joi.object({
    apiKey: Joi.string().allow('').default(''),
    enabled: Joi.boolean().default(false),
    fromEmail: Joi.string().email({ tlds: false }).allow('').default(''),
    webhookPublicKey: Joi.string().allow('').default(''),
  }),

  mailgun: Joi.object({
    apiKey: Joi.string().allow('').default(''),
    domain: Joi.string().allow('').default(''),
    enabled: Joi.boolean().default(false),
    fromEmail: Joi.string().email({ tlds: false }).allow('').default(''),
  }),

  azure: Joi.object({
    connectionString: Joi.string().allow('').default(''),
    senderAddress: Joi.string().allow('').default(''),
    webhookSecret: Joi.string().allow('').default(''),
    enabled: Joi.boolean().default(false),
  }),

  defaults: Joi.object({
    from: Joi.string().required(),
    fromName: Joi.string().required(),
    fromAddress: Joi.string().required(),
    replyTo: Joi.string().email({ tlds: false }).allow('').default(''),
  }),

  rateLimit: Joi.object({
    maxPerMinute: Joi.number().integer().min(1).max(1000).default(30),
    maxPerHour: Joi.number().integer().min(1).max(50000).default(500),
    maxPerDay: Joi.number().integer().min(1).max(500000).default(5000),
  }),

  retry: Joi.object({
    maxAttempts: Joi.number().integer().min(0).max(10).default(3),
    initialDelayMs: Joi.number().integer().min(1000).max(60000).default(5000),
    backoffMultiplier: Joi.number().min(1).max(10).default(2),
  }),

  queue: Joi.object({
    batchSize: Joi.number().integer().min(1).max(100).default(10),
    pollIntervalMs: Joi.number().integer().min(5000).max(300000).default(30000),
    staleTimeoutMs: Joi.number().integer().min(60000).default(300000),
  }),

  templates: Joi.object({
    dir: Joi.string().allow(''),
    cacheEnabled: Joi.boolean(),
    cacheTTL: Joi.number().integer().min(0),
  }),

  frontendUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3000'),

  tracking: Joi.object({
    opens: Joi.boolean().default(true),
    clicks: Joi.boolean().default(true),
    pixelUrl: Joi.string().allow('').default(''),
  }),

  logging: Joi.object({
    logToDb: Joi.boolean().default(true),
    logLevel: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
    retainDays: Joi.number().integer().min(1).max(365).default(90),
  }),

  brand: Joi.object({
    name: Joi.string().required(),
    nameEn: Joi.string().default(''),
    logo: Joi.string().allow('').default(''),
    primaryColor: Joi.string()
      .pattern(/^#[0-9a-fA-F]{6}$/)
      .default('#667eea'),
    secondaryColor: Joi.string()
      .pattern(/^#[0-9a-fA-F]{6}$/)
      .default('#764ba2'),
    textColor: Joi.string().default('#333333'),
    bgColor: Joi.string().default('#f8f9fa'),
    footerColor: Joi.string().default('#6c757d'),
  }),
}).options({ stripUnknown: false, allowUnknown: true });

// ─── Rate Limit Consistency Check ─────────────────────────────────
function checkRateLimitConsistency(config) {
  const warnings = [];
  const rl = config.rateLimit;
  if (rl) {
    if (rl.maxPerMinute * 60 > rl.maxPerHour) {
      warnings.push(
        `Rate limit: maxPerMinute (${rl.maxPerMinute}) × 60 = ${rl.maxPerMinute * 60} exceeds maxPerHour (${rl.maxPerHour})`
      );
    }
    if (rl.maxPerHour * 24 > rl.maxPerDay) {
      warnings.push(
        `Rate limit: maxPerHour (${rl.maxPerHour}) × 24 = ${rl.maxPerHour * 24} exceeds maxPerDay (${rl.maxPerDay})`
      );
    }
  }
  return warnings;
}

// ─── Provider Credential Check ────────────────────────────────────
function checkProviderCredentials(config) {
  const warnings = [];
  const provider = config.provider;

  if (provider === 'smtp') {
    if (!config.smtp?.auth?.user || !config.smtp?.auth?.pass) {
      warnings.push(
        'SMTP provider selected but credentials are missing — will fall back to mock mode'
      );
    }
  } else if (provider === 'sendgrid') {
    if (!config.sendgrid?.apiKey) {
      warnings.push('SendGrid provider selected but SENDGRID_API_KEY is missing');
    }
  } else if (provider === 'mailgun') {
    if (!config.mailgun?.apiKey || !config.mailgun?.domain) {
      warnings.push('Mailgun provider selected but API key or domain is missing');
    }
  } else if (provider === 'azure') {
    if (!config.azure?.connectionString) {
      warnings.push('Azure provider selected but connection string is missing');
    }
  }

  return warnings;
}

// ─── Tracking URL Check ──────────────────────────────────────────
function checkTrackingConfig(config) {
  const warnings = [];
  if ((config.tracking?.opens || config.tracking?.clicks) && !config.tracking?.pixelUrl) {
    warnings.push(
      'Email tracking (opens/clicks) is enabled but EMAIL_TRACKING_URL is not set — tracking will not function'
    );
  }
  return warnings;
}

/**
 * Validate the email configuration.
 * @param {Object} config — The EmailConfig object to validate
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateEmailConfig(config) {
  const result = { valid: true, errors: [], warnings: [] };

  // 1. Joi schema validation
  const { error: joiError } = emailConfigSchema.validate(config, {
    abortEarly: false,
  });

  if (joiError) {
    for (const detail of joiError.details) {
      if (detail.type.includes('required')) {
        result.errors.push(`${detail.path.join('.')}: ${detail.message}`);
      } else {
        result.warnings.push(`${detail.path.join('.')}: ${detail.message}`);
      }
    }
  }

  // 2. Business rule checks
  result.warnings.push(...checkRateLimitConsistency(config));
  result.warnings.push(...checkProviderCredentials(config));
  result.warnings.push(...checkTrackingConfig(config));

  // 3. Determine overall validity
  result.valid = result.errors.length === 0;

  return result;
}

/**
 * Validate and log results. Call at startup.
 * @param {Object} config
 * @returns {boolean} — true if config is valid
 */
function validateAndLog(config) {
  const result = validateEmailConfig(config);

  if (result.errors.length > 0) {
    logger.error('[EmailConfigValidator] ❌ Configuration errors:');
    result.errors.forEach(e => logger.error(`  - ${e}`));
  }

  if (result.warnings.length > 0) {
    logger.warn('[EmailConfigValidator] ⚠️ Configuration warnings:');
    result.warnings.forEach(w => logger.warn(`  - ${w}`));
  }

  if (result.valid && result.warnings.length === 0) {
    logger.info('[EmailConfigValidator] ✅ Email configuration is valid');
  }

  return result.valid;
}

module.exports = { validateEmailConfig, validateAndLog, emailConfigSchema };
