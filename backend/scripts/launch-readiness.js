#!/usr/bin/env node
'use strict';

/**
 * launch-readiness.js — W1286.
 *
 * The EXECUTABLE form of docs/GO_LIVE_RUNBOOK_2026-06-11.md's "Definition of
 * launched" checklist. The runbook sequences the steps; this gives an operator
 * a single GO / NOT-YET verdict against the REAL database — turning ~8 manual
 * "verify that…" lines into one mechanical read-only status with the exact
 * remaining command for each gap.
 *
 * 100% READ-ONLY: counts + env presence only. No writes, no smoke docs (active
 * verification stays in the explicit `npm run smoke:launch-spine` /
 * `smoke:clinical-spine`, which this report points to). Safe to run anytime,
 * including against prod.
 *
 * Each check is PASS / NOT-YET / INFO:
 *   PASS    — mechanically satisfied.
 *   NOT-YET — a concrete launch gap; the fix command is printed.
 *   INFO    — owner-gated / judgement call (SMTP, demo-data fate); never a
 *             hard fail (refuse to declare someone else's decision "wrong").
 *
 * Verdict: GO when zero NOT-YET; otherwise NOT-YET with the blocking list.
 * INFO items never block (they're surfaced for the owner).
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

const checks = [];
function record(status, name, detail, fix) {
  checks.push({ status, name, detail, fix });
}
const PASS = (n, d) => record('PASS', n, d);
const NOTYET = (n, d, fix) => record('NOT-YET', n, d, fix);
const INFO = (n, d, fix) => record('INFO', n, d, fix);

async function countSafe(coll, query = {}) {
  try {
    return await mongoose.connection.db.collection(coll).countDocuments(query);
  } catch (_e) {
    return null;
  }
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);

  // ── 1. Reference/config data seeded (runbook Phase A.2) ──────────
  const forms = await countSafe('formtemplates');
  forms > 0
    ? PASS('forms catalog seeded', `${forms} templates`)
    : NOTYET('forms catalog seeded', `${forms} templates`, 'npm run seed:forms-catalog');

  const measures = await countSafe('measures_library', { status: 'active' });
  measures > 0
    ? PASS('measures library seeded', `${measures} active instruments`)
    : NOTYET('measures library seeded', `${measures} active`, 'npm run seed:measures');

  const goalbank = await countSafe('goalbanks');
  goalbank > 0
    ? PASS('goal bank seeded (R4 pathway bundles need it)', `${goalbank} goals`)
    : NOTYET('goal bank seeded', `${goalbank} goals`, 'npm run seed:goal-bank');

  // W1287 — ICFCodeReference → mongoose default plural 'icfcodereferences'
  // (the earlier 'icfcodes' guess was a false-negative: prod has 105 codes).
  const icf = await countSafe('icfcodereferences');
  icf > 0
    ? PASS('ICF codes seeded', `${icf} codes`)
    : INFO('ICF codes seeded', `${icf == null ? 'collection absent' : icf} codes`, 'npm run seed:icf-codes');

  // ── 2. Real org + staff exist (runbook A.3 / Definition #2) ──────
  const branches = await countSafe('branches');
  branches > 0
    ? PASS('≥1 branch exists', `${branches} branch(es)`)
    : NOTYET('≥1 branch exists', `${branches}`, 'provision via UI/admin or npm run provision:branches');

  const users = await countSafe('users');
  users > 0
    ? PASS('≥1 user exists', `${users} user(s)`)
    : NOTYET('≥1 user exists', `${users}`, 'provision via UI/admin or npm run provision:staff');

  // ── 3. A beneficiary registered (Definition #3) ──────────────────
  const bens = await countSafe('beneficiaries', { isDeleted: { $ne: true } });
  bens > 0
    ? PASS('≥1 beneficiary registered', `${bens}`)
    : NOTYET('≥1 beneficiary registered', '0', 'register via the Arabic UI form');

  // ── 4. Session write/read split RESOLVED (Definition #6, W1240) ──
  // The UI writes ClinicalSession; analytics read TherapySession. If any
  // ClinicalSession exists, at least one must have a TherapySession projection.
  // W1287 — ClinicalSession declares collection:'clinical_sessions' (explicit,
  // underscored) — NOT the mongoose default 'clinicalsessions'.
  const clinSessions = await countSafe('clinical_sessions');
  if (!clinSessions) {
    INFO('session projection (W1240)', 'no ClinicalSessions yet — nothing to project', null);
  } else {
    const projected = await countSafe('therapysessions', { sourceClinicalSessionId: { $exists: true } });
    projected > 0
      ? PASS('session write/read split resolved (W1240 projection live)', `${projected} projected`)
      : NOTYET(
          'session write/read split resolved (W1240 projection)',
          `${clinSessions} ClinicalSessions, 0 projected → analytics blind`,
          'verify the W1240 projection hook; run npm run smoke:launch-spine'
        );
  }

  // ── 5. Mail provisioned (Definition #1 — THE blocker) ────────────
  const smtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS) || !!process.env.SENDGRID_API_KEY;
  smtp
    ? PASS('mail transport configured', process.env.SENDGRID_API_KEY ? 'sendgrid' : 'smtp')
    : INFO(
        'mail transport configured',
        'no SMTP_USER/PASS or SENDGRID_API_KEY → all mail no-ops (owner-gated)',
        'set SMTP_USER + SMTP_PASS in .env + pm2 restart alawael-api --update-env'
      );

  // ── 6. Demo-data fate (Definition #8 — owner decision) ───────────
  // The demo seed creates sequential national ids 11000000xx.
  const demo = await countSafe('beneficiaries', { nationalId: { $regex: '^11000000' } });
  if (demo > 0) {
    INFO(
      'demo-data fate decided',
      `${demo} demo beneficiary(ies) present (sequential 11000000xx)`,
      'keep-and-tag for soft launch OR seed:demo --reset to clear (DESTRUCTIVE, owner-gated)'
    );
  } else {
    PASS('demo-data fate decided', 'no demo-tagged beneficiaries present');
  }

  await mongoose.disconnect().catch(() => null);

  // ── verdict ──────────────────────────────────────────────────────
  const blocking = checks.filter((c) => c.status === 'NOT-YET');
  const infos = checks.filter((c) => c.status === 'INFO');
  const go = blocking.length === 0;

  if (JSON_OUT) {
    console.log(JSON.stringify({ go, checks }, null, 2));
  } else {
    const icon = { PASS: '✓', 'NOT-YET': '✗', INFO: 'ℹ' };
    for (const c of checks) {
      console.log(`${icon[c.status]} [${c.status}] ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
      if (c.status === 'NOT-YET' && c.fix) console.log(`      → fix: ${c.fix}`);
    }
    console.log('');
    console.log(
      go
        ? `✅ GO — all mechanical launch checks pass (${infos.length} owner-gated INFO item(s) to confirm)`
        : `⛔ NOT-YET — ${blocking.length} launch gap(s): ${blocking.map((b) => b.name).join(', ')}`
    );
    if (infos.length && !go) {
      console.log(`   (plus ${infos.length} owner-gated INFO item(s))`);
    }
    console.log('\nActive verification (run separately): npm run smoke:launch-spine · npm run smoke:clinical-spine');
  }
  process.exit(go ? 0 : 1);
}

main().catch((err) => {
  console.error('launch-readiness fatal:', err.message);
  process.exit(1);
});
