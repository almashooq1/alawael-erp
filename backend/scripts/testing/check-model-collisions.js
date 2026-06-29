#!/usr/bin/env node
/**
 * Model Collision Guard
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Scans `backend/models/**` and `backend/domains/** /models/**` for every
 * `mongoose.model('X', schema)` registration and FAILS if the number of
 * collisions (same model name registered in >1 file) exceeds a baseline.
 *
 * Why: mongoose silently keeps the FIRST schema registered under a given name
 * and discards the rest, so duplicate `mongoose.model('Beneficiary', ...)`
 * calls in different files become a silent data-integrity hazard. Use this
 * guard as a ratchet — the baseline only goes DOWN as the team consolidates
 * legacy "mega" model files.
 *
 * Exit codes:
 *   0 — collisions ≤ baseline
 *   1 — collisions > baseline (regression introduced)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const SCAN_ROOTS = [path.join(BACKEND_ROOT, 'models'), path.join(BACKEND_ROOT, 'domains')];

// Ratchet baseline — measured 2026-05-01, lowered repeatedly through
// 2026-05-14 as canonical models were promoted and the non-canonical
// registrations were renamed to scoped names (export keys unchanged so
// consumers stayed put). Final session push (2026-05-14) closed the
// last 63 collisions — every mongoose.model() registration in
// backend/models/** and backend/domains/**/models/** is now uniquely
// named. Lower this number as duplicates are eliminated; never raise it.
const MAX_COLLIDING_NAMES = 0;

// Named ratchet allowlist — known collisions that are crash-SAFE (every
// registration uses the `mongoose.models.X || mongoose.model(...)` guard) AND
// whose full structural resolution (Pattern-D rename / consolidation) is tracked
// by an ADR and is stakeholder-gated. A NEW collision NOT in this set still
// fails the guard. The allowlist may only SHRINK — the stale-entry check below
// fails the moment an allowlisted name stops colliding, forcing its removal so
// the set can never silently rot. (Ratchet doctrine, W340 lineage.)
const ALLOWLISTED_COLLISIONS = new Set([
  // ADR-023 — `ReportTemplate` is registered by 3 files with DISTINCT schemas
  // (models/ReportTemplate.js + models/analytics/ReportTemplate.js +
  // models/reports/ReportTemplate.js), each with live consumers. Made crash-safe
  // by W1543 (2026-06-29) via the `mongoose.models.X || ...` guard. The Pattern-D
  // rename of the two non-canonical files is stakeholder-gated (which `ref` /
  // consumer intends which schema), so it is accepted here pending ADR-023.
  'ReportTemplate',
]);

const REGISTER_RE = /mongoose\.model\(\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]\s*,/g;

/** Recursively yields all .js files under `dir` (skipping node_modules). */
function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      yield full;
    }
  }
}

/** Returns Map<modelName, string[] relPaths>. */
function collectRegistrations() {
  const registrations = new Map();
  for (const root of SCAN_ROOTS) {
    for (const file of walk(root)) {
      const src = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = REGISTER_RE.exec(src)) !== null) {
        const name = match[1];
        const rel = path.relative(BACKEND_ROOT, file).replace(/\\/g, '/');
        if (!registrations.has(name)) registrations.set(name, []);
        const list = registrations.get(name);
        if (!list.includes(rel)) list.push(rel);
      }
    }
  }
  return registrations;
}

function main() {
  const registrations = collectRegistrations();
  const collisions = [...registrations.entries()]
    .filter(([, files]) => files.length > 1)
    .sort(([a], [b]) => a.localeCompare(b));

  const totalRegistrations = [...registrations.values()].reduce(
    (sum, files) => sum + files.length,
    0
  );

  // Named ratchet: a collision is a REGRESSION only if it isn't an explicitly
  // accepted, ADR-tracked entry. Stale allowlist entries (no longer colliding)
  // must be removed — that forces the set to ratchet down with real fixes.
  const unexpected = collisions.filter(([name]) => !ALLOWLISTED_COLLISIONS.has(name));
  const collidingNames = new Set(collisions.map(([n]) => n));
  const staleAllowlist = [...ALLOWLISTED_COLLISIONS].filter(n => !collidingNames.has(n));
  const allowlistedHit = collisions.length - unexpected.length;

  console.log(
    `[guard:model-collisions] ${totalRegistrations} mongoose.model() ` +
      `registrations across ${registrations.size} unique names; ` +
      `${collisions.length} colliding (${unexpected.length} unexpected, ` +
      `${allowlistedHit} allowlisted; baseline ≤ ${MAX_COLLIDING_NAMES}).`
  );

  let failed = false;

  if (unexpected.length > MAX_COLLIDING_NAMES) {
    failed = true;
    console.error(
      `\n❌ Model collision regression: ${unexpected.length} unexpected colliding ` +
        `names > baseline ${MAX_COLLIDING_NAMES}.\n` +
        'New duplicates were introduced. Either consolidate the new ' +
        'registration into the existing canonical file, replace the new file ' +
        'with a re-export shim, or — for a known crash-safe ADR-tracked ' +
        'collision — add it to ALLOWLISTED_COLLISIONS with the ADR reference.' +
        '\n\nColliding names:'
    );
    for (const [name, files] of unexpected) {
      console.error(`  - ${name}`);
      for (const f of files) console.error(`      ${f}`);
    }
  }

  if (staleAllowlist.length > 0) {
    failed = true;
    console.error(
      `\n❌ Stale ALLOWLISTED_COLLISIONS entries (no longer colliding — remove ` +
        `them to ratchet the allowlist down): ${staleAllowlist.join(', ')}`
    );
  }

  if (failed) process.exit(1);

  if (collisions.length === 0) {
    console.log('✅ No collisions. (ALLOWLISTED_COLLISIONS is now empty — good.)');
  } else {
    console.log(
      `✅ All ${collisions.length} collision(s) are ADR-tracked allowlisted ` +
        'entries; no unexpected regression.'
    );
  }
}

main();
