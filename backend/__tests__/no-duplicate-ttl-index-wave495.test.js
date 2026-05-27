'use strict';

/**
 * W495 — No duplicate single-key index that silently drops the explicit spec.
 *
 * Catches the bug class found 2026-05-27: a schema field declares
 * `index: true` inline AND a separate `Schema.index({field: 1}, OPTIONS)`.
 * Mongoose 9 warns "Duplicate schema index on {field:1}" and silently
 * drops the explicit options block. Two real-world failure modes seen:
 *
 *   (a) TTL silently dropped (W130/W136 + 10 more in W495 sweep) — the
 *       documented retention policy was NOT enforced at the DB layer;
 *       rows accumulated indefinitely (PDPL drift).
 *   (b) Unique constraint silently dropped (LlmAnomalyAck.anomalyId
 *       caught in W495 sweep) — the partial-unique index that should
 *       have prevented duplicate active acks was a no-op.
 *
 * Detection: pure-source regex scan, no DB, no mongoose connect.
 *   1. Walk every .js under backend/ (skip node_modules, __tests__,
 *      tests, _archived, coverage, .git). Pre-filter to files that
 *      declare a Mongoose schema so the scanner stays fast.
 *   2. For each schema file, locate every `.index({field: 1 or -1}, ...)`
 *      single-key index declaration.
 *   3. For each such field, check whether the schema field
 *      definition (`field: { type: ..., index: true }`) has a colliding
 *      inline `index: true`.
 *   4. Fail with the exact file+field so the fix is obvious.
 *
 * Closed historical collisions (W130/W136 + the W495 sweep on
 * 2026-05-27): models/AttendanceEventOutbox.createdAt,
 * models/ClinicalAttendanceDiscrepancy.detectedAt, models/AttendanceException.detectedAt,
 * models/AttendanceImportBatch.submittedAt, models/HikvisionAnomalySnapshot.recordedAt,
 * models/HikvisionDeviceHealthLog.ts, models/HikvisionJobRun.startedAt,
 * models/LlmAnomalyAck.expiresAt, models/LlmAnomalyAck.anomalyId (partial-unique),
 * models/LlmAnomalySnapshot.recordedAt, models/LlmTelemetryCall.at,
 * models/PlanReviewAck.occurredAt, models/WhatsAppDlq.createdAt,
 * models/AttendanceNfcCard.cardUid (partial-unique only-1-active),
 * models/GasScale.goalId (partial-unique only-1-active-scale-per-goal),
 * models/HikvisionBranchConfig.branchId (redundant explicit unique vs inline),
 * services/documents/documentQRCode.service.js.code (redundant explicit
 * vs inline unique), models/cctv/CctvEvent.retainUntil (TTL silent drop),
 * models/cctv/CctvHealthCheck.retainUntil (TTL silent drop). 18 total
 * closures across 18 fields.
 *
 * The drift guard is the same shape as W325c/W340 (baseline ratchet +
 * new-violation block); here baseline is empty and any new collision
 * fails CI on the spot.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..');

const SKIP_DIRS = new Set(['node_modules', '__tests__', 'tests', '_archived', 'coverage', '.git']);

function listSchemaFiles() {
  const out = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        // Only scan files that actually declare a Mongoose schema.
        // Cheap pre-filter to keep the scan fast; the deeper
        // regex still runs only on these.
        try {
          const src = fs.readFileSync(p, 'utf-8');
          if (/new\s+mongoose\.Schema\s*\(/.test(src) || /new\s+Schema\s*\(/.test(src)) {
            out.push(p);
          }
        } catch {
          /* skip unreadable */
        }
      }
    }
  }
  walk(BACKEND_DIR);
  return out;
}

function stripComments(src) {
  // Strip /* … */ block comments first, then // line comments.
  // This prevents the index-scanner from matching `.index(...)` calls
  // that appear inside "REMOVED DUPLICATE" cleanup comments.
  let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return out;
}

function detectCollisions(filePath) {
  const rawSrc = fs.readFileSync(filePath, 'utf-8');
  const src = stripComments(rawSrc);
  const collisions = [];

  // Find every `.index({field: 1}, ...)` single-key index declaration.
  // The regex tolerates the call spanning multiple lines; we capture
  // the FIRST and ONLY key inside the spec (single-key index). Compound
  // indexes (`{ field1: 1, field2: 1 }`) are filtered out by requiring
  // the closing `}` to appear immediately after the first key clause.
  const explicitRe = /\.index\(\s*\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*-?1\s*\}/g;
  const seen = new Set();
  let m;
  while ((m = explicitRe.exec(src)) !== null) {
    const idxField = m[1];
    if (seen.has(idxField)) continue;
    seen.add(idxField);

    // Look for inline `field: { ..., index: true }` declaration that
    // collides. Mongoose registers the inline index first; the
    // explicit `.index(...)` call sees the duplicate and silently
    // drops its OPTIONS — TTL, unique, partialFilterExpression, etc.
    const fieldDeclRe = new RegExp(`^\\s+${idxField}\\s*:\\s*\\{[^}]*\\bindex\\s*:\\s*true`, 'm');
    if (fieldDeclRe.test(src)) {
      collisions.push({
        field: idxField,
        file: path.relative(BACKEND_DIR, filePath).replace(/\\/g, '/'),
      });
    }
  }
  return collisions;
}

describe('W495 no-duplicate-single-key-index drift guard', () => {
  const allCollisions = [];
  for (const f of listSchemaFiles()) {
    for (const c of detectCollisions(f)) {
      allCollisions.push(c);
    }
  }

  it('detects all 16 closed-on-2026-05-27 baseline files as still clean', () => {
    const baseline = [
      // W130/W136 + W495 sweep (Wave-18 models)
      'models/AttendanceEventOutbox.js',
      'models/ClinicalAttendanceDiscrepancy.js',
      'models/AttendanceException.js',
      'models/AttendanceImportBatch.js',
      'models/HikvisionAnomalySnapshot.js',
      'models/HikvisionDeviceHealthLog.js',
      'models/HikvisionJobRun.js',
      'models/LlmAnomalyAck.js', // both `expiresAt` (TTL) and `anomalyId` (partial-unique)
      'models/LlmAnomalySnapshot.js',
      'models/LlmTelemetryCall.js',
      'models/PlanReviewAck.js',
      'models/WhatsAppDlq.js',
      'models/AttendanceNfcCard.js', // cardUid only-1-active partial-unique
      'models/GasScale.js', // goalId only-1-active-scale-per-goal partial-unique
      'models/HikvisionBranchConfig.js', // branchId redundant explicit unique
      // W495 cross-directory follow-up — services/ with inline-schemas
      'services/documents/documentQRCode.service.js', // code redundant explicit
      // W495 cross-directory follow-up — nested models/<subdir>/ files
      'models/cctv/CctvEvent.js', // retainUntil TTL silent drop
      'models/cctv/CctvHealthCheck.js', // retainUntil TTL silent drop
    ];
    for (const file of baseline) {
      const stillThere = allCollisions.find(c => c.file === file);
      if (stillThere) {
        throw new Error(
          `Regression: ${file}.${stillThere.field} reverted to the duplicate-single-key-index pattern. ` +
            `Mongoose silently drops the explicit \`.index()\` options block. Remove the inline \`index: true\` from the field, ` +
            `or remove the redundant explicit \`.index({${stillThere.field}: 1})\` call when the inline \`unique: true\` already creates the index.`
        );
      }
    }
  });

  it('no model file has a single-key explicit `.index()` colliding with an inline `index: true`', () => {
    if (allCollisions.length > 0) {
      const detail = allCollisions.map(c => `  - ${c.file}: field "${c.field}"`).join('\n');
      throw new Error(
        `Found ${allCollisions.length} model(s) with the duplicate-single-key-index bug class.\n` +
          `Mongoose 9 logs "Duplicate schema index on {field:1}" and silently drops\n` +
          `the options block of the explicit \`.index(...)\` call — TTL, unique,\n` +
          `partialFilterExpression, etc. are all lost. Two confirmed failure modes:\n` +
          `  (a) TTL spec dropped → PDPL retention violated, rows accumulate forever.\n` +
          `  (b) unique/partial-unique dropped → duplicate rows allowed silently.\n\n` +
          `Fix per file: remove the inline \`index: true\` from the field declaration\n` +
          `so the explicit \`Schema.index({field:1}, OPTIONS)\` is the sole index on\n` +
          `that field. Compound indexes that include the field cover prefix-queries;\n` +
          `the inline single-key index is redundant.\n\n` +
          `Files:\n${detail}`
      );
    }
  });
});
