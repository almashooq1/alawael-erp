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
 *   1. For each model file, locate every `.index({field: 1 or -1}, ...)`
 *      single-key index declaration.
 *   2. For each such field, check whether the schema field
 *      definition (`field: { type: ..., index: true }`) has a colliding
 *      inline `index: true`.
 *   3. Fail with the exact file+field so the fix is obvious.
 *
 * Closed historical collisions (W130/W136 + the W495 sweep on
 * 2026-05-27): AttendanceEventOutbox.createdAt,
 * ClinicalAttendanceDiscrepancy.detectedAt, AttendanceException.detectedAt,
 * AttendanceImportBatch.submittedAt, HikvisionAnomalySnapshot.recordedAt,
 * HikvisionDeviceHealthLog.ts, HikvisionJobRun.startedAt,
 * LlmAnomalyAck.expiresAt, LlmAnomalyAck.anomalyId (partial-unique),
 * LlmAnomalySnapshot.recordedAt, LlmTelemetryCall.at,
 * PlanReviewAck.occurredAt, WhatsAppDlq.createdAt.
 *
 * The drift guard is the same shape as W325c/W340 (baseline ratchet +
 * new-violation block); here baseline is empty and any new collision
 * fails CI on the spot.
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'models');

function listModelFiles() {
  const out = [];
  for (const entry of fs.readdirSync(MODELS_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(path.join(MODELS_DIR, entry.name));
    }
  }
  return out;
}

function detectCollisions(filePath) {
  const src = fs.readFileSync(filePath, 'utf-8');
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
      collisions.push({ field: idxField, file: path.basename(filePath) });
    }
  }
  return collisions;
}

describe('W495 no-duplicate-single-key-index drift guard', () => {
  const allCollisions = [];
  for (const f of listModelFiles()) {
    for (const c of detectCollisions(f)) {
      allCollisions.push(c);
    }
  }

  it('detects W130 + W136 baseline as cleared on 2026-05-27', () => {
    const baseline = [
      'AttendanceEventOutbox.js',
      'ClinicalAttendanceDiscrepancy.js',
      'AttendanceException.js',
      'AttendanceImportBatch.js',
      'HikvisionAnomalySnapshot.js',
      'HikvisionDeviceHealthLog.js',
      'HikvisionJobRun.js',
      'LlmAnomalyAck.js',
      'LlmAnomalySnapshot.js',
      'LlmTelemetryCall.js',
      'PlanReviewAck.js',
      'WhatsAppDlq.js',
    ];
    for (const file of baseline) {
      const stillThere = allCollisions.find(c => c.file === file);
      if (stillThere) {
        throw new Error(
          `Regression: ${file}.${stillThere.field} reverted to the duplicate-TTL-index pattern. ` +
            `Mongoose silently drops the TTL spec. Remove the inline \`index: true\` from the field.`
        );
      }
    }
  });

  it('no model file has a TTL-index colliding with an inline `index: true`', () => {
    if (allCollisions.length > 0) {
      const detail = allCollisions.map(c => `  - ${c.file}: field "${c.field}"`).join('\n');
      throw new Error(
        `Found ${allCollisions.length} model(s) with the duplicate-TTL-index bug class.\n` +
          `Mongoose 9 logs "Duplicate schema index on {field:1}" and silently drops\n` +
          `the TTL spec — rows accumulate indefinitely instead of expiring.\n\n` +
          `Fix per file: remove the inline \`index: true\` from the field declaration\n` +
          `so the explicit \`Schema.index({field:1}, {expireAfterSeconds:...})\` is the\n` +
          `sole index on that field. Compound indexes that include the field cover\n` +
          `prefix-queries; the inline single-key index is redundant.\n\n` +
          `Files:\n${detail}`
      );
    }
  });
});
