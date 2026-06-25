#!/usr/bin/env node
'use strict';

/**
 * check-beneficiary-branch-isolation.js — pre-push gate (W1529).
 *
 * WHY: the W440/W441/W442 drift guard
 * (__tests__/no-unprotected-beneficiary-param-wave440.test.js) catches the
 * cross-branch PHI-leak class — a route reading a beneficiary id from
 * params/body WITHOUT a branch-enforcement signal. But that guard only runs
 * inside the full sprint suite (CI, ~30 min). A push whose 7 fast pre-push
 * gates all pass can still introduce the gap and only learn 30 min later in CI
 * (this is exactly how W1525's /enqueue route shipped a branch-isolation gap).
 *
 * This is the same check, extracted as a fast (<1s) standalone gate so the
 * class is caught BEFORE push. The logic mirrors the canonical test 1:1 (same
 * ENFORCEMENT_SIGNALS + patterns); the canonical test remains the CI backstop.
 *
 * HOW TO FIX a failure: add one branch-enforcement signal to the named route —
 * `router.use(bodyScopedBeneficiaryGuard)` (body/FK), or
 * `router.param('beneficiaryId', branchScopedBeneficiaryParam)` (params), or a
 * per-callsite `enforceBeneficiaryBranch(req, id)` — all from
 * middleware/assertBranchMatch.js. Place AFTER requireBranchAccess.
 *
 * Exit 0 = clean, 1 = offenders. `--json` prints machine-readable findings.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const BACKEND_DIR = path.resolve(__dirname, '..');

function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n\r]*/g, '');
}

// Must stay identical to the canonical guard's ENFORCEMENT_SIGNALS.
const ENFORCEMENT_SIGNALS = [
  { name: 'branchFilter (Layer A)', regex: /\bbranchFilter\s*\(\s*req\s*\)/ },
  { name: 'enforceBeneficiaryBranch', regex: /\benforceBeneficiaryBranch\b/ },
  { name: 'assertBranchMatch', regex: /\bassertBranchMatch\b/ },
  { name: 'branchScopedBeneficiaryParam', regex: /\bbranchScopedBeneficiaryParam\b/ },
  { name: 'bodyScopedBeneficiaryGuard', regex: /\bbodyScopedBeneficiaryGuard\b/ },
  {
    name: 'caseload guard (Appointment count)',
    regex: /Appointment\([^)]*\)\.countDocuments\s*\(\s*\{[^}]*\btherapist\b[^}]*\bbeneficiary\b/m,
  },
  { name: '_ownsCaseloadItem (caseload helper)', regex: /\b_ownsCaseloadItem\s*\(/ },
];

// Files explicitly exempted (security-review decisions). Keep in sync with the
// canonical guard's EXEMPT_PATHS.
const EXEMPT_PATHS = new Set([]);

// Count the beneficiary-id reads (W440 params + W441 body + W442 FK) in stripped source.
function countBeneficiaryReads(stripped) {
  const params = (stripped.match(/\breq\.params\.beneficiaryId\b/g) || []).length;
  const body =
    (stripped.match(/\breq\.body\.beneficiaryId\b/g) || []).length +
    (stripped.match(/\{\s*[^}]*\bbeneficiaryId\b[^}]*\}\s*=\s*req\.body\b/g) || []).length;
  const fk =
    (stripped.match(/\breq\.body\.beneficiary(?!Id\b|_id\b|\w)/g) || []).length +
    (stripped.match(/\breq\.body\.beneficiary_id\b/g) || []).length +
    (stripped.match(/\{\s*[^}]*\bbeneficiary\b(?!Id)[^}]*\}\s*=\s*req\.body\b/g) || []).length +
    (stripped.match(/\{\s*[^}]*\bbeneficiary_id\b[^}]*\}\s*=\s*req\.body\b/g) || []).length;
  return { params, body, fk, total: params + body + fk };
}

// Pure scan — returns offenders[]. Exported for the self-test.
function scanRoutes(backendDir = BACKEND_DIR) {
  const files = glob.sync('routes/**/*.js', { cwd: backendDir, nodir: true });
  const offenders = [];
  for (const rel of files) {
    const norm = rel.replace(/\\/g, '/');
    if (EXEMPT_PATHS.has(norm)) continue;
    const stripped = stripJsComments(fs.readFileSync(path.join(backendDir, rel), 'utf8'));
    const reads = countBeneficiaryReads(stripped);
    if (reads.total === 0) continue;
    const hasSignal = ENFORCEMENT_SIGNALS.some(s => s.regex.test(stripped));
    if (!hasSignal) offenders.push({ file: norm, reads: reads.total });
  }
  return offenders;
}

function main() {
  const asJson = process.argv.includes('--json');
  const offenders = scanRoutes();
  if (asJson) {
    process.stdout.write(JSON.stringify({ ok: offenders.length === 0, offenders }, null, 2) + '\n');
  } else if (offenders.length === 0) {
    process.stdout.write('✓ Branch isolation: every beneficiary-keyed route enforces it.\n');
  } else {
    process.stderr.write(
      `✗ Branch isolation: ${offenders.length} route file(s) read a beneficiary id WITHOUT branch enforcement:\n` +
        offenders.map(o => `  - ${o.file} (${o.reads} read${o.reads === 1 ? '' : 's'})`).join('\n') +
        '\n\nFix: add a branch-enforcement signal from middleware/assertBranchMatch.js —\n' +
        '  router.use(bodyScopedBeneficiaryGuard)  (body/FK, after requireBranchAccess), OR\n' +
        "  router.param('beneficiaryId', branchScopedBeneficiaryParam)  (params), OR\n" +
        '  enforceBeneficiaryBranch(req, id)  (per callsite).\n'
    );
  }
  process.exit(offenders.length ? 1 : 0);
}

if (require.main === module) main();

module.exports = { scanRoutes, countBeneficiaryReads, stripJsComments, ENFORCEMENT_SIGNALS };
