'use strict';

/**
 * W324 drift guard — canonical `beneficiaryId` ref.
 *
 * Every Mongoose model field literally named `beneficiaryId` MUST reference
 * the canonical model `'Beneficiary'` (see
 * backend/intelligence/canonical/schemas/beneficiary.canonical.js → mongooseModelName).
 *
 * Pre-W324 the codebase had 8 broken / divergent refs:
 *   - 5 × ref: 'BeneficiaryProfile' (no such Mongoose model — populate returns null)
 *   - 2 × ref: 'User' (Assessment, smartScheduler)
 *   - 1 × ref: 'Patient' (CommunityReferral — no such model)
 *
 * This guard prevents the class of bug returning. Any future deviation must be
 * added to ALLOWLIST with a one-line justification.
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'models');
const REPO_ROOT = path.join(__dirname, '..', '..');

// Legitimate exceptions. Currently empty. To add: provide the repo-relative
// posix path and a one-line // reason comment above the entry.
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

// Capture every `beneficiaryId: { ... }` field-declaration block, then pull
// its `ref:` value if present. We deliberately scope to one brace-pair to
// avoid cross-field bleed.
const BENEFICIARY_FIELD_RE = /beneficiaryId\s*:\s*\{([^{}]*)\}/g;
const REF_RE = /\bref\s*:\s*['"]([^'"]+)['"]/;

describe('W324 canonical beneficiaryId ref drift guard', () => {
  it('every Mongoose `beneficiaryId` field MUST ref the canonical Beneficiary model', () => {
    const violations = [];
    const checked = [];
    const files = walkJs(MODELS_DIR);

    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
      const matches = [...src.matchAll(BENEFICIARY_FIELD_RE)];
      for (const m of matches) {
        const body = m[1];
        const refMatch = body.match(REF_RE);
        if (!refMatch) continue; // some declarations omit ref entirely — skip
        const refValue = refMatch[1];
        checked.push({ file: rel, ref: refValue });
        if (refValue !== 'Beneficiary' && !ALLOWLIST.has(rel)) {
          violations.push({ file: rel, foundRef: refValue });
        }
      }
    }

    // Sanity floor: the codebase has ~75 legitimate refs to Beneficiary. If
    // we found dramatically fewer, the regex / walker is broken — fail loudly
    // rather than silently passing.
    expect(checked.length).toBeGreaterThan(50);

    if (violations.length > 0) {
      const lines = violations
        .map(v => `  - ${v.file}  →  ref: '${v.foundRef}'  (must be 'Beneficiary')`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} model(s) with non-canonical beneficiaryId ref:\n${lines}\n\n` +
          `Fix: change the ref to 'Beneficiary' per ` +
          `backend/intelligence/canonical/schemas/beneficiary.canonical.js ` +
          `(mongooseModelName: 'Beneficiary'). ` +
          `If a deviation is genuinely required, add the path to ALLOWLIST in this test ` +
          `with a one-line justification.`
      );
    }
  });
});
