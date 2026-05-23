'use strict';

/**
 * W324 + W329 drift guard — canonical beneficiary-reference fields.
 *
 * Every Mongoose model field whose NAME implies a beneficiary reference MUST
 * resolve to the canonical model `'Beneficiary'` (see
 * backend/intelligence/canonical/schemas/beneficiary.canonical.js → mongooseModelName).
 *
 * Pre-W324 bug class (8 broken refs):
 *   - 5 × ref: 'BeneficiaryProfile' (no such Mongoose model — populate returns null)
 *   - 2 × ref: 'User' (Assessment, smartScheduler)
 *   - 1 × ref: 'Patient' (CommunityReferral — no such model)
 * All fixed in W324; original scope was field name `beneficiaryId` only.
 *
 * W329 extends the scope. Discovered when test-running 04-care-plan-goals-engine
 * against the codebase — 7 more semantic-ref-mismatch bugs that W324's narrow
 * regex missed because the field name wasn't literally `beneficiaryId`:
 *   - 5 × `beneficiary` (singular, no Id suffix): ADLAssessment, CarePlan,
 *         IndependentLivingProgress, IndependentLivingPlan, PlanReview
 *   - 2 × `participantId` (clinical-context participant): Goal, DisabilitySession
 * All 7 had `ref: 'User'` — semantically wrong (User is registered, so W325c's
 * phantom-ref guard couldn't catch them either; new bug class = SEMANTIC
 * MISMATCH where ref target IS registered but conceptually points to the
 * wrong entity).
 *
 * This guard now covers 3 field-name patterns. Any future deviation must be
 * added to ALLOWLIST with a one-line justification.
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'models');
const REPO_ROOT = path.join(__dirname, '..', '..');

// Field names whose semantics imply a beneficiary reference. Extend with
// extreme care — adding a name to this set forces every matching field
// across the codebase to ref 'Beneficiary'.
const TARGETED_FIELD_NAMES = ['beneficiaryId', 'beneficiary', 'participantId'];

// (file, fieldName) tuples that are allowed to deviate from 'Beneficiary'.
// Provide repo-relative posix path + the field name + // reason comment.
// Currently empty — if a `participantId` ever genuinely refers to a User
// (e.g. a workshop where adult staff participate), add it here.
const ALLOWLIST = new Set([
  // (none — keep this set empty unless a deviation is truly required)
]);

function walkJs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJs(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

// Build a regex per targeted field name. We scope to one brace-pair to avoid
// cross-field bleed. The pattern matches `<name>: { ... }` (multi-line) and
// captures the body for ref extraction.
const FIELD_BLOCK_RE_BY_NAME = Object.fromEntries(
  TARGETED_FIELD_NAMES.map(name => [name, new RegExp(`\\b${name}\\s*:\\s*\\{([^{}]*)\\}`, 'g')])
);
const REF_RE = /\bref\s*:\s*['"]([^'"]+)['"]/;

describe('W324+W329 canonical beneficiary-reference fields drift guard', () => {
  it('every targeted field name MUST ref the canonical Beneficiary model', () => {
    const violations = [];
    const checked = [];
    const files = walkJs(MODELS_DIR);

    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');

      for (const name of TARGETED_FIELD_NAMES) {
        const re = FIELD_BLOCK_RE_BY_NAME[name];
        re.lastIndex = 0; // reset since global regexes carry state
        const matches = [...src.matchAll(re)];
        for (const m of matches) {
          const body = m[1];
          const refMatch = body.match(REF_RE);
          if (!refMatch) continue; // some declarations omit ref entirely — skip
          const refValue = refMatch[1];
          checked.push({ file: rel, fieldName: name, ref: refValue });
          const allowKey = `${rel}::${name}`;
          if (refValue !== 'Beneficiary' && !ALLOWLIST.has(allowKey)) {
            violations.push({ file: rel, fieldName: name, foundRef: refValue });
          }
        }
      }
    }

    // Sanity floor: 75+ legitimate refs to Beneficiary across the 3 targeted
    // field names. If we found dramatically fewer, the regex / walker is
    // broken — fail loudly rather than silently passing.
    expect(checked.length).toBeGreaterThan(50);

    if (violations.length > 0) {
      const lines = violations
        .map(
          v =>
            `  - ${v.file}  (field \`${v.fieldName}\`)  →  ref: '${v.foundRef}'  (must be 'Beneficiary')`
        )
        .join('\n');
      throw new Error(
        `Found ${violations.length} model field(s) with non-canonical beneficiary ref:\n${lines}\n\n` +
          `Fix: change the ref to 'Beneficiary' per ` +
          `backend/intelligence/canonical/schemas/beneficiary.canonical.js ` +
          `(mongooseModelName: 'Beneficiary'). ` +
          `If a deviation is genuinely required, add '<file>::<fieldName>' to ALLOWLIST ` +
          `in this test with a one-line justification.`
      );
    }
  });
});
