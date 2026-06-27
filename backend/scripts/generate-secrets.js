#!/usr/bin/env node
/**
 * generate-secrets.js — توليد secrets قوية للبيئة الحالية
 *
 * Usage:
 *   node scripts/generate-secrets.js
 *
 * Generates:
 *   - JWT_SECRET (64 bytes hex)
 *   - JWT_REFRESH_SECRET (64 bytes hex)
 *   - SESSION_SECRET (32 bytes hex)
 *   - ENCRYPTION_KEY (32 bytes hex)
 *   - REDIS_PASSWORD (16 bytes alphanumeric)
 *   - MONGO_ROOT_PASSWORD (16 bytes alphanumeric)
 *   - MINIO_SECRET_KEY (16 bytes alphanumeric)
 *   - GRAFANA_PASSWORD (12 bytes alphanumeric)
 *   - ADMIN_DEFAULT_PASSWORD (12 bytes mixed)
 *
 * Outputs ready-to-paste environment variables.
 */
'use strict';

const crypto = require('crypto');

function genHex(len) {
  return crypto.randomBytes(len).toString('hex');
}

function genAlphanumeric(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function genPassword(len = 12) {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*';
  const all = lower + upper + digits + symbols;
  let result = '';
  const bytes = crypto.randomBytes(len);
  // Ensure at least one of each category
  result += lower[bytes[0] % lower.length];
  result += upper[bytes[1] % upper.length];
  result += digits[bytes[2] % digits.length];
  result += symbols[bytes[3] % symbols.length];
  for (let i = 4; i < len; i++) {
    result += all[bytes[i] % all.length];
  }
  // Shuffle
  return result.split('').sort(() => 0.5 - Math.random()).join('');
}

const secrets = {
  JWT_SECRET: genHex(64),
  JWT_REFRESH_SECRET: genHex(64),
  SESSION_SECRET: genHex(32),
  ENCRYPTION_KEY: genHex(32),
  REDIS_PASSWORD: genAlphanumeric(16),
  MONGO_ROOT_PASSWORD: genAlphanumeric(16),
  MINIO_SECRET_KEY: genAlphanumeric(16),
  GRAFANA_PASSWORD: genPassword(12),
  ADMIN_DEFAULT_PASSWORD: genPassword(12),
};

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('  Al-Awael ERP — Generated Secrets for .env');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');
console.log('# ─── Copy these into your .env file ──────────────────────────────────');
console.log('');
for (const [key, value] of Object.entries(secrets)) {
  console.log(`${key}=${value}`);
}
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('  ⚠️  WARNING: Store these secrets securely. Do NOT commit .env to git.');
console.log('═══════════════════════════════════════════════════════════════════════');

// Also generate a docker-compose override snippet
console.log('');
console.log('# ─── Docker Compose override snippet (docker-compose.override.yml) ───');
console.log('');
console.log('version: "3.8"');
console.log('services:');
console.log('  backend:');
console.log('    environment:');
console.log(`      ALLOW_DEV_SECRETS: "1"`);
console.log(`      JWT_SECRET: ${secrets.JWT_SECRET}`);
console.log(`      JWT_REFRESH_SECRET: ${secrets.JWT_REFRESH_SECRET}`);
console.log(`      SESSION_SECRET: ${secrets.SESSION_SECRET}`);
console.log(`      ENCRYPTION_KEY: ${secrets.ENCRYPTION_KEY}`);
console.log(`      REDIS_PASSWORD: ${secrets.REDIS_PASSWORD}`);
console.log(`      MONGO_ROOT_PASSWORD: ${secrets.MONGO_ROOT_PASSWORD}`);
console.log(`      MINIO_SECRET_KEY: ${secrets.MINIO_SECRET_KEY}`);
console.log(`      GRAFANA_PASSWORD: ${secrets.GRAFANA_PASSWORD}`);
console.log(`      ADMIN_DEFAULT_PASSWORD: ${secrets.ADMIN_DEFAULT_PASSWORD}`);
