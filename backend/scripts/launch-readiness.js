#!/usr/bin/env node
'use strict';

/**
 * launch-readiness.js — W1286/W1287, refactored W1375 onto the shared
 * services/launchReadiness.service.js evaluator (one source of truth shared
 * with the read-only HTTP route + the web-admin /launch-readiness page).
 *
 * The EXECUTABLE form of docs/GO_LIVE_RUNBOOK_2026-06-11.md's "Definition of
 * launched" — a single GO / NOT-YET verdict against the REAL database, with
 * the exact remaining command per gap. 100% READ-ONLY; safe anytime incl. prod.
 *
 * Usage:  npm run launch:readiness   (or node scripts/launch-readiness.js [--json])
 * Exit:   0 when GO (no NOT-YET) · 1 otherwise
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_e) {
  /* optional */
}

const JSON_OUT = process.argv.includes('--json');
const mongoose = require('mongoose');
const { evaluateLaunchReadiness } = require('../services/launchReadiness.service');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);

  let result;
  try {
    result = await evaluateLaunchReadiness({ db: mongoose.connection.db, env: process.env });
  } finally {
    await mongoose.disconnect().catch(() => null);
  }

  const { go, checks, summary } = result;
  if (JSON_OUT) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const icon = { PASS: '✓', 'NOT-YET': '✗', INFO: 'ℹ' };
    for (const c of checks) {
      console.log(`${icon[c.status]} [${c.status}] ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
      if (c.status === 'NOT-YET' && c.fix) console.log(`      → fix: ${c.fix}`);
    }
    console.log('');
    const blocking = checks.filter((c) => c.status === 'NOT-YET');
    console.log(
      go
        ? `✅ GO — all mechanical launch checks pass (${summary.info} owner-gated INFO item(s) to confirm)`
        : `⛔ NOT-YET — ${summary.notYet} launch gap(s): ${blocking.map((b) => b.name).join(', ')}`
    );
    if (summary.info && !go) console.log(`   (plus ${summary.info} owner-gated INFO item(s))`);
    console.log('\nActive verification (run separately): npm run smoke:launch-spine · npm run smoke:clinical-spine');
  }
  process.exit(go ? 0 : 1);
}

main().catch((err) => {
  console.error('launch-readiness fatal:', err.message);
  process.exit(1);
});
