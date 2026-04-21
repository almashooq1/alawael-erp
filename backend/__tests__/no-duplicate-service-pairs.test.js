/**
 * no-duplicate-service-pairs.test.js — prevents new service duplicates.
 *
 * The 2026-04-21 consolidation audit found 5 document-service pairs
 * that look like duplicates but are NOT safe to delete — they back
 * live parallel APIs (/api/documents-advanced legacy vs
 * /api/documents-pro/* canonical). See
 * docs/technical-debt/consolidation-roadmap.md for details.
 *
 * To stop the debt from growing, this test fails if any NEW pair of
 * duplicate-looking services appears — i.e. both
 *   services/document{Thing}Service.js      (old pattern)
 *   services/documents/document{Thing}.service.js  (canonical)
 * exist at the same time for a name that wasn't already in the
 * grandfathered set.
 *
 * If the sprint gate catches a new duplicate, the options are:
 *   1. Implement against the canonical services/documents/ path only.
 *   2. If the duplication is intentional, add the name to
 *      GRANDFATHERED (with a comment explaining why) and update
 *      the consolidation roadmap to track the new pair.
 *
 * Drift detection, not a grand refactor — it just holds the line.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const ROOT_SERVICES = path.join(BACKEND_ROOT, 'services');
const DOCUMENTS_DIR = path.join(ROOT_SERVICES, 'documents');

// Pairs that already exist and are tracked in the consolidation
// roadmap. These are allowed to stay until the migration plan in
// docs/technical-debt/consolidation-roadmap.md is executed.
const GRANDFATHERED = new Set([
  'documentAudit',
  'documentComparison',
  'documentFavorites',
  'documentWatermark',
  'documentQR', // root spells it "QR"; canonical spells it "QRCode"
  'documentExport', // root is Export; canonical is ImportExport
]);

/**
 * Extract the "base name" from a service filename by stripping the
 * suffix conventions used in the two patterns:
 *   - root pattern: documentFooService.js → "documentFoo"
 *   - canonical pattern: documentFoo.service.js → "documentFoo"
 */
function baseName(fileName, pattern) {
  if (pattern === 'root') {
    const m = fileName.match(/^(.+?)Service\.js$/);
    return m ? m[1] : null;
  }
  if (pattern === 'canonical') {
    const m = fileName.match(/^(.+?)\.service\.js$/);
    return m ? m[1] : null;
  }
  return null;
}

function listRootDocServices() {
  if (!fs.existsSync(ROOT_SERVICES)) return [];
  return fs
    .readdirSync(ROOT_SERVICES)
    .filter(f => /^document[A-Z][\w]*Service\.js$/.test(f))
    .map(f => baseName(f, 'root'))
    .filter(Boolean);
}

function listCanonicalDocServices() {
  if (!fs.existsSync(DOCUMENTS_DIR)) return [];
  return fs
    .readdirSync(DOCUMENTS_DIR)
    .filter(f => /^document[A-Z][\w]*\.service\.js$/.test(f))
    .map(f => baseName(f, 'canonical'))
    .filter(Boolean);
}

describe('no-duplicate-service-pairs (document namespace)', () => {
  const roots = listRootDocServices();
  const canonical = listCanonicalDocServices();

  it('at least one canonical document service exists (sanity check)', () => {
    expect(canonical.length).toBeGreaterThan(0);
  });

  it('no NEW duplicate document-service pair is introduced', () => {
    // A pair exists when the same base name shows up in BOTH
    // root (`documentFooService.js`) and canonical
    // (`documentFoo.service.js`). Special case: root `documentQR` vs
    // canonical `documentQRCode` and root `documentExport` vs canonical
    // `documentImportExport` are known mismatches recorded in
    // GRANDFATHERED by their root name; skip those during direct
    // matching.
    const canonicalSet = new Set(canonical);
    const newPairs = [];
    for (const name of roots) {
      if (GRANDFATHERED.has(name)) continue;
      if (canonicalSet.has(name)) newPairs.push(name);
    }
    if (newPairs.length) {
      throw new Error(
        'New duplicate document-service pair(s) detected:\n  ' +
          newPairs
            .map(
              n =>
                `- services/${n}Service.js  ↔  services/documents/${n}.service.js\n` +
                `  Pick ONE. Canonical lives under services/documents/. See ` +
                `docs/technical-debt/consolidation-roadmap.md.`
            )
            .join('\n  ')
      );
    }
  });

  it('the grandfathered set matches reality (fails if a pair is resolved)', () => {
    // If a developer resolves a grandfathered pair (deletes the root
    // file), they should also remove the name from GRANDFATHERED in
    // this test. This assertion fails when the grandfathered set
    // contains a name whose root service no longer exists — a nudge
    // to keep the safety-list in sync with the migration work.
    const rootSet = new Set(roots);
    const stale = [...GRANDFATHERED].filter(name => !rootSet.has(name));
    if (stale.length) {
      throw new Error(
        'Grandfathered entries are stale (root service was deleted):\n  ' +
          stale
            .map(
              n =>
                `- "${n}" — remove from GRANDFATHERED in ${path.basename(__filename)} ` +
                `and update the roadmap to mark the pair resolved.`
            )
            .join('\n  ')
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Model namespace — extends the drift guard to backend/models/.
//
//  Real-world case that prompted this: backend/models/ZktecoDevice.js
//  (53-line legacy) vs backend/models/zktecoDevice.model.js (308-line
//  canonical) — both live in production on different Mongo collections.
//  This is data fragmentation, not just a code duplicate.
//
//  Pattern: a model with name `FooModel.js` (PascalCase, no suffix) vs
//  `fooModel.model.js` (camelCase, .model suffix). Not every file in
//  /models uses one pattern or the other — only the duplicates do. So
//  this test looks for base-name collisions across those two naming
//  conventions.
// ═══════════════════════════════════════════════════════════════════════

const MODELS_DIR = path.join(BACKEND_ROOT, 'models');

// Genuine data-fragmentation pairs: two Mongoose schemas on different
// MongoDB collections, tracked in Phase 6 of the consolidation roadmap.
// Each needs a migration script + per-consumer rewiring.
//
// Full audit history (2026-04-21): the drift test first flagged 12 pairs
// by filename collision. Deeper inspection showed 9 of those were already
// code-level unified via proxy re-export (e.g. `Employee.js` does
// `module.exports = require('./HR/Employee')`). Only these 3 are genuine
// splits where both files register a different Mongoose model on a
// different collection:
const GRANDFATHERED_MODEL_PAIRS = new Set([
  // Resolved 2026-04-21: Project.js converted to proxy of project.model.js.
  // 'project' — no longer needed here.
  'training', // Training.js vs training.model.js — both Mongoose, different schemas
  'zktecodevice', // ZktecoDevice.js vs zktecoDevice.model.js — both Mongoose, different schemas
]);

/**
 * Returns true if the file looks like a proxy/re-export rather than a
 * genuine schema definition. Heuristic:
 *   • Direct re-export form: `module.exports = require('./X')`
 *   • Two-step form: `const X = require('./X'); module.exports = X;`
 *   • Test-mock wrapper: NODE_ENV check that forwards to a real model
 * The proxy signal is always a `require('./<sibling>')` on a file that
 * does NOT itself register a Mongoose model (no `mongoose.Schema(` or
 * `mongoose.model(`). Genuine schemas always have those calls.
 */
function isProxyFile(absPath) {
  if (!fs.existsSync(absPath)) return false;
  const content = fs.readFileSync(absPath, 'utf8');
  const hasSiblingRequire = /require\s*\(\s*['"`]\.\/[^'"`]+['"`]/.test(content);
  if (!hasSiblingRequire) return false;
  const registersMongooseModel =
    /mongoose\.Schema\s*\(/.test(content) || /mongoose\.model\s*\(/.test(content);
  return !registersMongooseModel;
}

function listLegacyModelNames() {
  if (!fs.existsSync(MODELS_DIR)) return [];
  return fs
    .readdirSync(MODELS_DIR)
    .filter(f => /^[A-Z][\w]+\.js$/.test(f)) // PascalCase, no .model suffix
    .map(f => f.replace(/\.js$/, ''))
    .filter(Boolean);
}

function listCanonicalModelNames() {
  if (!fs.existsSync(MODELS_DIR)) return [];
  return fs
    .readdirSync(MODELS_DIR)
    .filter(f => /^[a-z][\w]+\.model\.js$/.test(f)) // camelCase with .model suffix
    .map(f => f.replace(/\.model\.js$/, ''))
    .filter(Boolean);
}

describe('no-duplicate-model-pairs', () => {
  const legacy = listLegacyModelNames();
  const canonical = listCanonicalModelNames();

  it('at least one model in each naming convention exists (sanity check)', () => {
    expect(legacy.length).toBeGreaterThan(0);
    expect(canonical.length).toBeGreaterThan(0);
  });

  it('no NEW genuine split is introduced (proxy re-exports are OK)', () => {
    const canonicalByLower = new Map(canonical.map(n => [n.toLowerCase(), n]));
    const newSplits = [];
    for (const legacyName of legacy) {
      const lower = legacyName.toLowerCase();
      if (GRANDFATHERED_MODEL_PAIRS.has(lower)) continue;
      const canonicalName = canonicalByLower.get(lower);
      if (!canonicalName) continue;
      // Both filenames exist. Check if EITHER is a proxy — if yes, the
      // pair is already code-level unified (same Mongoose model). Only
      // flag if BOTH files are full schemas → genuine fragmentation.
      const legacyPath = path.join(MODELS_DIR, `${legacyName}.js`);
      const canonicalPath = path.join(MODELS_DIR, `${canonicalName}.model.js`);
      if (isProxyFile(legacyPath) || isProxyFile(canonicalPath)) continue;
      newSplits.push(legacyName);
    }
    if (newSplits.length) {
      throw new Error(
        'New duplicate model pair(s) detected (both sides look like genuine schemas):\n  ' +
          newSplits
            .map(
              n =>
                `- models/${n}.js  ↔  models/${n.charAt(0).toLowerCase() + n.slice(1)}.model.js\n` +
                `  One should re-export the other (proxy pattern). Otherwise ` +
                `Mongoose registers two models on different collections — ` +
                `data fragmentation. See docs/technical-debt/consolidation-roadmap.md.`
            )
            .join('\n  ')
      );
    }
  });
});
