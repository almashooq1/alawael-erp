/**
 * Environment Variable Validation
 *
 * Validates required and optional environment variables at startup
 * using Joi (already a project dependency). Throws descriptive errors
 * so misconfigurations are caught immediately rather than causing
 * cryptic runtime failures.
 */

const Joi = require('joi');

const envSchema = Joi.object({
  // ─── Server ────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3001),

  // ─── Database ──────────────────────────────────────────────────────────────
  // MONGODB_URI is required in production — falling back to mock DB
  // can mask misconfigurations that only surface under real load.
  MONGODB_URI:
    process.env.NODE_ENV === 'production'
      ? Joi.string()
          .pattern(/^mongodb(\+srv)?:\/\/.+/)
          .required()
          .messages({
            'string.pattern.base': 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
          })
      : Joi.string()
          .pattern(/^mongodb(\+srv)?:\/\/.+/)
          .optional()
          .messages({
            'string.pattern.base': 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
          }),
  USE_MOCK_DB: Joi.string().valid('true', 'false').optional(),

  // ─── Authentication ────────────────────────────────────────────────────────
  JWT_SECRET:
    process.env.NODE_ENV === 'production'
      ? Joi.string().min(32).required()
      : Joi.string().min(16).optional().default('dev-secret-change-in-production'),
  JWT_REFRESH_SECRET:
    process.env.NODE_ENV === 'production'
      ? Joi.string().min(32).required()
      : Joi.string().optional(),
  JWT_EXPIRES_IN: Joi.string().optional().default('24h'),

  // ─── Encryption ────────────────────────────────────────────────────────────
  ENCRYPTION_KEY:
    process.env.NODE_ENV === 'production'
      ? Joi.string().min(32).required()
      : Joi.string().optional(),
  SESSION_SECRET:
    process.env.NODE_ENV === 'production'
      ? Joi.string().min(16).required()
      : Joi.string().optional(),

  // ─── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: Joi.string().optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().integer().min(1).max(65535).optional(),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_DB: Joi.number().integer().min(0).max(15).optional(),
  REDIS_ENABLED: Joi.string().valid('true', 'false').optional(),
  DISABLE_REDIS: Joi.string().valid('true', 'false').optional(),

  // ─── CORS ──────────────────────────────────────────────────────────────────
  CORS_ORIGINS: Joi.string().optional(),
  CORS_ORIGIN: Joi.string().optional(), // alias — both are supported
  FRONTEND_URL: Joi.string().uri().optional(),

  // ─── External Services (optional) ─────────────────────────────────────────
  STRIPE_SECRET_KEY: Joi.string().optional(),
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().integer().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),

  // ─── Feature Flags ────────────────────────────────────────────────────────
  SMART_TEST_MODE: Joi.string().valid('true', 'false').optional(),
  ENABLE_SWAGGER: Joi.string().valid('true', 'false').optional(),
  CSRF_PROTECTION_ENABLED: Joi.string().valid('true', 'false').optional(),
  MFA_ENABLED: Joi.string().valid('true', 'false').optional(),
})
  .unknown(true) // allow other env vars (PATH, etc.)
  .options({ abortEarly: false });

/**
 * Strict schema for CI / production. Rejects undefined env vars that are
 * required for a secure deployment. Enabled when STRICT_ENV_VALIDATION=true
 * or automatically in CI environments.
 */
const strictOverrides = Joi.object({
  MONGODB_URI: Joi.string()
    .pattern(/^mongodb(\+srv)?:\/\/.+/)
    .required()
    .messages({
      'string.pattern.base': 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
    }),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  ENCRYPTION_KEY: Joi.string().min(32).required(),
  SESSION_SECRET: Joi.string().min(16).required(),
})
  .unknown(true)
  .options({ abortEarly: false });

/**
 * Validate process.env and return the validated (with defaults) values.
 * Logs warnings in development, throws in production.
 *
 * When STRICT_ENV_VALIDATION=true or CI=true, an additional strict schema
 * is applied that requires all security-critical variables.
 */
function validateEnv() {
  const { error, value } = envSchema.validate(process.env);

  if (error) {
    const messages = error.details.map(d => `  • ${d.message}`).join('\n');

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`❌ Environment validation failed:\n${messages}`);
    }

    // In dev/test just warn — don't block startup
    const logger = require('../utils/logger');
    logger.warn(`Environment validation warnings:\n${messages}`);
  }

  // Strict mode: enforce in production, CI, or when explicitly enabled
  const isStrict =
    process.env.STRICT_ENV_VALIDATION === 'true' ||
    process.env.CI === 'true' ||
    process.env.NODE_ENV === 'production';

  if (isStrict) {
    const { error: strictError } = strictOverrides.validate(process.env);
    if (strictError) {
      const msgs = strictError.details.map(d => `  • ${d.message}`).join('\n');
      throw new Error(`❌ Strict environment validation failed:\n${msgs}`);
    }
  }

  return value;
}

module.exports = { validateEnv };
