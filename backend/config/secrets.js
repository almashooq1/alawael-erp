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

// ─── Document / field crypto (audit #4/#5/#12/#13) ───────────────────────────
// These were previously read inline as `process.env.X || 'hardcoded-default'`,
// so a prod deploy missing the env var silently used a repo-published key.
// Exposed here as LAZY getters (resolve at call time — env may be injected late
// under APM agents) that throw in production when unset, matching the doctrine
// above. The dev fallback is the EXACT prior literal, so dev/test/CI behaviour
// is unchanged and existing data keyed under the old default still validates
// when prod sets the var to that same value. Migration (rotate to a strong key
// + re-key/re-hash existing data) is documented in
// docs/architecture/CRYPTO_KEY_HARDENING_RUNBOOK.md.
function requiredInProd(envKey, legacyDefault, hint) {
  return () => {
    const v = process.env[envKey];
    if (v) return v;
    if (isProd) {
      throw new Error(
        `[SECURITY] Missing required env var "${envKey}" in production. ` +
          `${hint} See docs/architecture/CRYPTO_KEY_HARDENING_RUNBOOK.md.`
      );
    }
    return legacyDefault;
  };
}

// #4 — deterministic search-hash key. Preserves the original
// DB_HASH_KEY → DB_ENCRYPTION_KEY → default resolution chain.
function dbHashKey() {
  const v = process.env.DB_HASH_KEY || process.env.DB_ENCRYPTION_KEY;
  if (v) return v;
  if (isProd) {
    throw new Error(
      '[SECURITY] Missing required env var "DB_HASH_KEY" (or "DB_ENCRYPTION_KEY") ' +
        'in production. Set it to the prior default to preserve existing ' +
        'search-hashes, or rotate + re-hash. See ' +
        'docs/architecture/CRYPTO_KEY_HARDENING_RUNBOOK.md.'
    );
  }
  return 'default-hash-key';
}

// #5 — document-integration credential encryption key.
const integrationSecret = requiredInProd(
  'INTEGRATION_SECRET',
  'integration-default-key-32chars!!',
  'It encrypts stored third-party integration credentials.'
);

// #12 — document-QR verification HMAC secret.
const qrSecret = requiredInProd(
  'QR_SECRET',
  'doc-qr-secret',
  'It makes document QR codes forgery-resistant.'
);

// #13 — Nafath JWS HS signing secret (mock-mode signer). required=false: a prod
// running in NAFATH mock mode legitimately uses a non-production signer, so this
// centralizes the key + removes the inline literal without breaking that path.
const nafathJwsHsSecret = secret(
  'NAFATH_JWS_HS_SECRET',
  'alawael-nafath-mock-secret-do-not-use-in-prod',
  false
);

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
  // lazy getters (call to resolve)
  dbHashKey,
  integrationSecret,
  qrSecret,
  // resolved value (mock-mode, non-required)
  nafathJwsHsSecret,
};
