/**
 * Centralized Secret Management
 *
 * Single source of truth for ALL secret/key lookups.
 * - Production: throws immediately if a required secret is missing.
 * - Development/Test: uses a CONSISTENT dev-only fallback so every
 *   module sees the same value (prevents "wrong-secret" mismatches).
 *
 * Usage:
 *   const { jwtSecret, jwtRefreshSecret } = require('../config/secrets');
 */

'use strict';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;

if (!isProd && !isTest && !process.env.ALLOW_DEV_SECRETS) {
  const logger = console;
  logger.warn(
    '[SECURITY] Running with dev-only secret fallbacks. ' +
      'Set NODE_ENV=production or ALLOW_DEV_SECRETS=1 to suppress.'
  );
}

/**
 * Resolve a secret from an env var.
 * @param {string}  envKey        – environment-variable name
 * @param {string}  devFallback   – value used when NOT in production
 * @param {boolean} [required=true] – if true, throw in production when missing
 */
function secret(envKey, devFallback, required = true) {
  const value = process.env[envKey];
  if (value) return value;

  if (isProd && required) {
    throw new Error(
      `[SECURITY] Missing required env var "${envKey}" in production. ` +
        'Set it before starting the server.'
    );
  }

  return devFallback;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────
const jwtSecret = secret('JWT_SECRET', 'dev-only-jwt-secret-do-not-use-in-prod');
const jwtRefreshSecret = secret('JWT_REFRESH_SECRET', 'dev-only-refresh-secret-do-not-use-in-prod');
const notificationJwtSecret = secret(
  'NOTIFICATION_JWT_SECRET',
  'dev-only-notification-secret',
  false
);

// ─── Encryption ──────────────────────────────────────────────────────────────
const encryptionKey = secret('ENCRYPTION_KEY', 'dev-only-encryption-key-32chars!');
const hmacKey = secret('HMAC_KEY', 'dev-only-hmac-key-do-not-use-prod', false);
const backupEncryptionPassword = secret(
  'BACKUP_ENCRYPTION_PASSWORD',
  'dev-only-backup-password',
  false
);
const gpsEncryptionKey = secret('GPS_ENCRYPTION_KEY', 'dev-only-gps-key', false);

// ─── Session ─────────────────────────────────────────────────────────────────
const sessionSecret = secret('SESSION_SECRET', 'dev-only-session-secret-do-not-use-prod');

// ─── External Services ───────────────────────────────────────────────────────
const fcmServerKey = secret('FCM_SERVER_KEY', '', false);

module.exports = {
  jwtSecret,
  jwtRefreshSecret,
  notificationJwtSecret,
  encryptionKey,
  hmacKey,
  backupEncryptionPassword,
  gpsEncryptionKey,
  sessionSecret,
  fcmServerKey,
};
