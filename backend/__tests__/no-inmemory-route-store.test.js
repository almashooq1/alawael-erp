/**
 * no-inmemory-route-store.test.js — drift guard (data-persistence).
 *
 * WHY: data entered through an API must be written to MongoDB so it
 * survives a server restart. A route file that keeps its records in a
 * module-level JS object/array (`const store = { items: [] }` mutated
 * via `.push(...)` inside a handler) *looks* like it works — the POST
 * returns 201 — but every record vanishes on restart and is invisible
 * to every other process/worker. This is the single worst silent
 * data-loss class in this codebase.
 *
 * WHAT IT CATCHES: any file under `backend/routes/` that, all at once:
 *   1. declares a WRITE handler — `router.post/put/patch/delete(...)`,
 *   2. mutates a MODULE-LEVEL (column-0) container declared with an
 *      object/array literal via `.push(...)`  (the in-memory store), and
 *   3. has ZERO persistence signals — no `require('.../models...')`,
 *      no `mongoose.model(...)`, and no Mongoose write call
 *      (`.save/.create/.insertOne/.insertMany/.updateOne/.updateMany/
 *       .findOneAndUpdate/.findByIdAndUpdate/.deleteOne/.deleteMany/
 *       .bulkWrite/.findByIdAndDelete`).
 *
 * A file that queries a real model (even once) is assumed to persist
 * and is NOT flagged — keeping the false-positive rate at zero against
 * the 500+ legitimately DB-backed route files.
 *
 * RATCHET (per the W325c / W340 convention): the ONE known offender is
 * baselined below. Two assertions enforce a one-way ratchet:
 *   (a) any NEW offending file fails CI;
 *   (b) any baseline entry that no longer exists OR no longer matches
 *       the anti-pattern fails CI — forcing its removal from the
 *       baseline in the SAME commit that fixes/deletes it.
 *
 * HOW TO FIX a flagged file: replace the module-level container with a
 * Mongoose model and `await Model.create(...)` / `Model.find(...)`.
 * See `routes/community-service.routes.js` for the canonical shape.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES_ROOT = path.resolve(__dirname, '..', 'routes');

// Known pre-existing offenders. Each MUST carry a one-line reason.
// Remove an entry in the same commit that converts the file to a
// real DB-backed store (or deletes it) — assertion (b) enforces this.
const BASELINE_INMEMORY_ROUTES = new Set([
  // Dead/unmounted legacy file. The LIVE community feature is
  // `routes/community-service.routes.js` (Mongoose-backed). Kept here
  // only so the ratchet stays honest until this file is archived.
  'community.js',
]);

// ── source helpers ──────────────────────────────────────────────────────────
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const WRITE_ROUTE_RE = /\brouter\.(post|put|patch|delete)\s*\(/;

const PERSISTENCE_SIGNALS = [
  /require\(\s*['"][^'"]*\/models[^'"]*['"]\s*\)/, // require('../models/X')
  /require\(\s*['"][^'"]*\.model['"]\s*\)/, // require('./x.model')
  /\bmongoose\.model\s*\(/,
  /\.(save|create|insertOne|insertMany|updateOne|updateMany|findOneAndUpdate|findByIdAndUpdate|findOneAndDelete|findByIdAndDelete|deleteOne|deleteMany|bulkWrite|replaceOne)\s*\(/,
];

/**
 * Identify module-level (column-0) identifiers bound to an object/array
 * literal, e.g. `const store = {` or `let rows = [`.
 */
function moduleLevelContainers(src) {
  const ids = new Set();
  const re = /^(?:const|let|var)\s+(\w+)\s*=\s*[[{]/gm;
  let m;
  while ((m = re.exec(src)) !== null) ids.add(m[1]);
  return ids;
}

/**
 * Does the source `.push(...)` onto one of the given module-level
 * containers (either directly `id.push(` or via a property
 * `id.prop.push(`)? That is the in-memory-write tell.
 */
function pushesOntoContainer(src, containerIds) {
  for (const id of containerIds) {
    const re = new RegExp(`\\b${id}(?:\\.[\\w$]+)*\\.push\\s*\\(`);
    if (re.test(src)) return true;
  }
  return false;
}

function isInMemoryStoreRoute(src) {
  if (!WRITE_ROUTE_RE.test(src)) return false;
  if (PERSISTENCE_SIGNALS.some(re => re.test(src))) return false;
  const containers = moduleLevelContainers(src);
  if (containers.size === 0) return false;
  return pushesOntoContainer(src, containers);
}

// ── scan ──────────────────────────────────────────────────────────────────
function scanOffenders() {
  const offenders = [];
  for (const file of walk(ROUTES_ROOT)) {
    const rel = path.relative(ROUTES_ROOT, file).replace(/\\/g, '/');
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    if (isInMemoryStoreRoute(src)) offenders.push(rel);
  }
  return offenders;
}

describe('no in-memory store as primary persistence in route files', () => {
  const offenders = scanOffenders();

  it('finds a non-trivial number of route files (sanity)', () => {
    expect(walk(ROUTES_ROOT).length).toBeGreaterThan(50);
  });

  it('no NEW route file uses a module-level in-memory store for writes', () => {
    const fresh = offenders.filter(f => !BASELINE_INMEMORY_ROUTES.has(f));
    if (fresh.length > 0) {
      throw new Error(
        `Found ${fresh.length} route file(s) that accept writes but persist to a ` +
          `module-level in-memory store instead of MongoDB (data is lost on restart):\n` +
          fresh.map(f => `  routes/${f}`).join('\n') +
          `\n\nReplace the in-memory container with a Mongoose model + await Model.create(...). ` +
          `See routes/community-service.routes.js for the canonical pattern. ` +
          `If this is intentional dead/unmounted code, add it to BASELINE_INMEMORY_ROUTES with a reason.`
      );
    }
    expect(fresh).toEqual([]);
  });

  it('every BASELINE_INMEMORY_ROUTES entry still exists and still matches (ratchet-down)', () => {
    const stale = [];
    for (const rel of BASELINE_INMEMORY_ROUTES) {
      const full = path.join(ROUTES_ROOT, rel);
      if (!fs.existsSync(full)) {
        stale.push(`${rel} (file no longer exists)`);
        continue;
      }
      const src = stripComments(fs.readFileSync(full, 'utf8'));
      if (!isInMemoryStoreRoute(src)) {
        stale.push(`${rel} (no longer an in-memory store — now persists)`);
      }
    }
    if (stale.length > 0) {
      throw new Error(
        `BASELINE_INMEMORY_ROUTES is stale — remove these entries in the same commit ` +
          `that fixed/deleted them:\n` +
          stale.map(s => `  ${s}`).join('\n')
      );
    }
    expect(stale).toEqual([]);
  });
});
