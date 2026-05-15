#!/usr/bin/env node
/**
 * wasel-live-smoke.js — pre-flight check for `WASEL_MODE=live`.
 *
 * Exercises every adapter path against the real وَصِل / SPL endpoint
 * and reports whether the deployment is safe to switch over. Designed
 * to be run from a bastion or CI step BEFORE flipping the env flag in
 * production so the operator catches missing creds, bad timeouts, or
 * wrong base URLs without breaking any real save flow.
 *
 * Usage:
 *   WASEL_MODE=live WASEL_BASE_URL=... WASEL_API_KEY=... \
 *     node scripts/wasel-live-smoke.js
 *
 *   # with a known-good test short code (defaults to RFYA1234)
 *   WASEL_TEST_CODE=ABCD1234 node scripts/wasel-live-smoke.js
 *
 * Exit codes:
 *   0  — all checks passed
 *   1  — one or more checks failed (details on stderr)
 *   2  — misconfiguration: missing env vars, wrong mode, etc.
 *
 * The script does NOT mutate any database state. Safe to run anywhere.
 */

'use strict';

const path = require('path');
process.env.NODE_PATH = path.join(__dirname, '..');
require('module').Module._initPaths();

// Force the mode to whatever the operator set in env. We don't want
// to silently fall back to mock when the operator forgot the flag.
const MODE = (process.env.WASEL_MODE || '').toLowerCase();
const TEST_CODE = process.env.WASEL_TEST_CODE || 'RFYA1234';

if (MODE !== 'live') {
  console.error(`[smoke] WASEL_MODE must be 'live' for this check (got "${MODE || 'unset'}").`);
  console.error('       Set WASEL_MODE=live and re-run.');
  process.exit(2);
}

const missing = [];
if (!process.env.WASEL_BASE_URL) missing.push('WASEL_BASE_URL');
if (!process.env.WASEL_API_KEY) missing.push('WASEL_API_KEY');
if (missing.length) {
  console.error(`[smoke] Missing required env vars: ${missing.join(', ')}.`);
  process.exit(2);
}

const wasel = require('../services/waselAdapter');
const nas = require('../services/nationalAddressService');

const checks = [];
function record(name, ok, details) {
  checks.push({ name, ok, details });
  const tag = ok ? 'OK   ' : 'FAIL ';
  const line = `[${tag}] ${name}${details ? ` — ${details}` : ''}`;
  (ok ? console.log : console.error)(line);
}

async function main() {
  console.log(`[smoke] WASEL_MODE=live — base=${process.env.WASEL_BASE_URL}`);
  console.log(`[smoke] test short code: ${TEST_CODE}\n`);

  // 1. config snapshot
  try {
    const cfg = wasel.getConfig();
    record(
      'config exposes live mode',
      cfg.mode === 'live' && cfg.configured === true,
      `mode=${cfg.mode} configured=${cfg.configured}`
    );
  } catch (e) {
    record('config snapshot', false, e.message);
  }

  // 2. connection health
  try {
    const conn = await wasel.testConnection();
    record(
      'live connection health',
      conn.ok === true,
      `mode=${conn.mode} latencyMs=${conn.latencyMs ?? '?'} ${conn.message || ''}`
    );
  } catch (e) {
    record('live connection health', false, e.message);
  }

  // 3. verify a known-good short code end to end
  try {
    const r = await wasel.verifyShortCode({ shortCode: TEST_CODE });
    record(
      `verifyShortCode(${TEST_CODE})`,
      r.status === 'match' || r.status === 'not_found',
      `status=${r.status} city=${r.city || '?'} latencyMs=${r.latencyMs ?? '?'}`
    );
  } catch (e) {
    record(`verifyShortCode(${TEST_CODE})`, false, e.message);
  }

  // 4. nationalAddressService.verifyAndStamp end to end (full pipeline)
  try {
    const stamped = await nas.verifyAndStamp({ shortCode: TEST_CODE });
    const ok =
      !!stamped.verification && ['match', 'not_found'].includes(stamped.verification.status);
    record(
      'verifyAndStamp pipeline',
      ok,
      `verified=${stamped.verification?.verified} status=${stamped.verification?.status}`
    );
  } catch (e) {
    record('verifyAndStamp pipeline', false, e.message);
  }

  // 5. invalid-format rejection still returns a clean result
  try {
    const r = await wasel.verifyShortCode({ shortCode: 'NOTACODE' });
    record('invalid format handled cleanly', r.status === 'invalid_format', `status=${r.status}`);
  } catch (e) {
    record('invalid format handled cleanly', false, e.message);
  }

  const failed = checks.filter(c => !c.ok);
  console.log(`\n[smoke] ${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) {
    console.error('[smoke] DO NOT flip production to live yet.');
    process.exit(1);
  } else {
    console.log('[smoke] safe to flip production to WASEL_MODE=live.');
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('[smoke] unhandled error:', err);
    process.exit(1);
  });
}
