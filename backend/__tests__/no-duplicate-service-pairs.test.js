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

// Model pairs already tracked in the consolidation roadmap. Each entry
// is the base name in lowercase — the test lowercases before comparing
// so "ZktecoDevice" and "zktecoDevice" collide correctly.
//
// When this test was first added (2026-04-21) it immediately surfaced
// 12 pre-existing duplicate pairs across core business entities. Each
// is a data-fragmentation bug: the two files register Mongoose models
// on different MongoDB collections, so the same business entity gets
// written twice with different schemas. All 12 are documented under
// Phase 6 of docs/technical-debt/consolidation-roadmap.md and need
// independent migration (each requires picking a canonical model,
// writing a collection-merge script, and switching consumers).
const GRANDFATHERED_MODEL_PAIRS = new Set([
  'analytics', // Analytics.js vs analytics.model.js
  'attendance', // Attendance.js vs attendance.model.js
  'auditlog', // AuditLog.js vs auditLog.model.js
  'employee', // Employee.js vs employee.model.js — critical, central entity
  'insuranceclaim', // InsuranceClaim.js vs insuranceClaim.model.js
  'leave', // Leave.js vs leave.model.js
  'notification', // Notification.js vs notification.model.js
  'payment', // Payment.js vs payment.model.js
  'project', // Project.js vs project.model.js
  'training', // Training.js vs training.model.js
  'workshift', // WorkShift.js vs workShift.model.js
  'zktecodevice', // ZktecoDevice.js vs zktecoDevice.model.js — flagged during 2026-04-21 ZKTeco audit
]);

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

  it('no NEW model pair is introduced across naming conventions', () => {
    const canonicalLower = new Set(canonical.map(n => n.toLowerCase()));
    const newPairs = [];
    for (const name of legacy) {
      const lower = name.toLowerCase();
      if (GRANDFATHERED_MODEL_PAIRS.has(lower)) continue;
      if (canonicalLower.has(lower)) newPairs.push(name);
    }
    if (newPairs.length) {
      throw new Error(
        'New duplicate model pair(s) detected:\n  ' +
          newPairs
            .map(
              n =>
                `- models/${n}.js  ↔  models/${n.charAt(0).toLowerCase() + n.slice(1)}.model.js\n` +
                `  Pick ONE — Mongoose registering two models on different collections ` +
                `is a data-fragmentation bug. See docs/technical-debt/consolidation-roadmap.md.`
            )
            .join('\n  ')
      );
    }
  });
});
