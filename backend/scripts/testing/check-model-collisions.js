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

// Ratchet baseline — measured 2026-05-01. Lower this number as duplicates
// are eliminated; never raise it.
const MAX_COLLIDING_NAMES = 85;

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

  console.log(
    `[guard:model-collisions] ${totalRegistrations} mongoose.model() ` +
      `registrations across ${registrations.size} unique names; ` +
      `${collisions.length} colliding (baseline ≤ ${MAX_COLLIDING_NAMES}).`
  );

  if (collisions.length > MAX_COLLIDING_NAMES) {
    console.error(
      `\n❌ Model collision regression: ${collisions.length} colliding names ` +
        `> baseline ${MAX_COLLIDING_NAMES}.\n` +
        'New duplicates were introduced. Either consolidate the new ' +
        'registration into the existing canonical file or replace the new ' +
        'file with a re-export shim.\n\nColliding names:'
    );
    for (const [name, files] of collisions) {
      console.error(`  - ${name}`);
      for (const f of files) console.error(`      ${f}`);
    }
    process.exit(1);
  }

  if (collisions.length < MAX_COLLIDING_NAMES) {
    console.log(
      `✅ Collisions ratcheted down. Lower MAX_COLLIDING_NAMES in ` +
        `${path.relative(BACKEND_ROOT, __filename).replace(/\\/g, '/')} ` +
        `to ${collisions.length}.`
    );
  } else {
    console.log('✅ Collisions at baseline; no regression.');
  }
}

main();
