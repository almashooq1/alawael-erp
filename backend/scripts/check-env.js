#!/usr/bin/env node
'use strict';

/**
 * check-env.js — Standalone env:check CLI
 *
 * Reads `.env` on a best-effort basis, then verifies that every key in
 * config/validateEnv.js:STRICT_REQUIRED_KEYS is present and non-blank in
 * the environment. Exits 0 on success, 1 on failure.
 */

const path = require('path');

// Load dotenv if available (dev/local); in CI process.env is already populated.
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  /* dotenv is optional */
}

const { STRICT_REQUIRED_KEYS } = require('../config/validateEnv');

const HINTS = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/alawael_erp  (or mongodb+srv://...)',
  JWT_SECRET: 'openssl rand -base64 64  (min 32 chars)',
  JWT_REFRESH_SECRET: 'openssl rand -base64 64  (min 32 chars, distinct from JWT_SECRET)',
  ENCRYPTION_KEY: 'openssl rand -base64 48  (min 32 chars)',
  SESSION_SECRET: 'openssl rand -base64 32  (min 16 chars)',
};

function isBlank(value) {
  return value === undefined || value === null || String(value).trim().length === 0;
}

function buildReport(env = process.env) {
  const missing = STRICT_REQUIRED_KEYS.filter(key => isBlank(env[key]));
  const ok = missing.length === 0;
  return {
    ok,
    total: STRICT_REQUIRED_KEYS.length,
    missing,
    hints: missing.map(key => ({ key, hint: HINTS[key] || 'generate a secure value' })),
  };
}

function run() {
  const report = buildReport();

  if (report.ok) {
    console.log(`✓ env:check — all ${report.total} strict-required keys are set`);
    process.exit(0);
  }

  console.error(
    `✖ env:check — ${report.missing.length} of ${report.total} strict-required keys missing/blank:\n`
  );
  for (const { key, hint } of report.hints) {
    console.error(`  • ${key}\n      → ${hint}`);
  }
  console.error('\nThese are enforced at boot when NODE_ENV=production or CI=true.');
  process.exit(1);
}

module.exports = { buildReport, HINTS, run };

if (require.main === module) {
  run();
}
