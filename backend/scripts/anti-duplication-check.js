#!/usr/bin/env node
'use strict';

/**
 * anti-duplication-check.js — Wave 93 (governance rule G1).
 *
 * CI guard that prevents the unification work from Waves 88-92 from
 * silently rotting. For each canonical pattern (e.g., SELF_ATTESTATION
 * as a legacy alias for SELF_APPROVAL_FORBIDDEN), the script grep-walks
 * backend/* and refuses NEW occurrences outside an explicit allow-list.
 *
 * What it catches:
 *   • A new service file that uses 'self_approval_forbidden' snake_case
 *     instead of REASON_CODES.SELF_APPROVAL_FORBIDDEN
 *   • A new file that builds its own MFA_FRESHNESS_MIN map instead of
 *     reading from sensitivity-grade.lib
 *   • A new caller that imports HIGH_SENSITIVITY_TRANSITIONS instead of
 *     calling sensitivityGrade.gradeForLifecycleTransition(t)
 *
 * What it deliberately does NOT catch:
 *   • Refactors of the canonical libs themselves (their files are
 *     allow-listed as the source of truth)
 *   • Existing callers preserved for back-compat (each has a line in
 *     the allow-list with a WHY comment so the next reviewer knows
 *     it's intentional, not a regression)
 *   • Crypto primitives (sha256, etc.) — those are platform infra and
 *     callers under blockchain/* are out of scope (external certs)
 *
 * Usage:
 *   node scripts/anti-duplication-check.js         # human-readable
 *   node scripts/anti-duplication-check.js --json  # machine-readable
 *
 * Exits 0 when clean, 1 when violations found.
 *
 * Adding a new canonical pattern:
 *   1. Add the entry to PATTERNS below with a regex + WHY description
 *      + the FULL list of currently-allowed paths.
 *   2. Run the script — it should pass.
 *   3. Add a test in __tests__/anti-duplication-check-wave93.test.js
 *      to pin the behaviour.
 *
 * Adding a new caller of an existing pattern (e.g., a new feature wave):
 *   • Prefer migrating that caller to the canonical lib instead.
 *   • If back-compat is required, add the path to allowedFiles with
 *     a brief WHY comment in this script. Reviewer of that PR must
 *     ACK the addition.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const SCAN_ROOTS = ['intelligence', 'services', 'models', 'routes', 'middleware', 'api'];

const SKIP_DIRS = new Set(['node_modules', '_archived', '.jest-cache', '_backups']);

const PATTERNS = [
  {
    id: 'SELF_ATTESTATION',
    why: 'Legacy alias — canonical is REASON_CODES.SELF_APPROVAL_FORBIDDEN (sod.lib + reason-codes.registry).',
    regex: /\bSELF_ATTESTATION\b/,
    allowedFiles: [
      'intelligence/reason-codes.registry.js', // canonical alias map
      'intelligence/sod.lib.js', // documents the alias in header
      'intelligence/access-review.service.js', // back-compat output shape (Wave 89)
      'routes/access-review.routes.js', // consumes service reason
    ],
  },
  {
    id: 'self_approval_forbidden_snake',
    why: 'Legacy snake_case spelling — canonical is REASON_CODES.SELF_APPROVAL_FORBIDDEN.',
    regex: /['"]self_approval_forbidden['"]/,
    allowedFiles: [
      'intelligence/reason-codes.registry.js', // canonical alias map
      'intelligence/sod.lib.js', // documents the alias in header
      'services/hr/hrChangeRequestService.js', // Wave 89 back-compat audit log
    ],
  },
  {
    id: 'SOD_SELF_APPROVAL',
    why: 'Legacy error code — canonical is REASON_CODES.SELF_APPROVAL_FORBIDDEN.',
    regex: /\bSOD_SELF_APPROVAL\b/,
    allowedFiles: [
      'intelligence/reason-codes.registry.js', // canonical alias map
      'intelligence/sod.lib.js', // documents the alias in header
      'services/finance/expenseApprovalService.js', // not yet migrated (deferred Wave 89)
      'routes/finance-approvals.routes.js', // consumes service code
    ],
  },
  {
    id: 'MFA_FRESHNESS_MIN',
    why: 'Per-tier freshness should derive from sensitivity-grade.lib SENSITIVITY_GRADES.{HIGH,CRITICAL}.mfaFreshnessMs.',
    regex: /\bMFA_FRESHNESS_MIN\b/,
    allowedFiles: [
      'intelligence/beneficiary-lifecycle.service.js', // Wave 90 — derives from sensitivity-grade.lib
      'intelligence/sensitivity-grade.lib.js', // documents the alias in header
    ],
  },
  {
    id: 'HIGH_SENSITIVITY_TRANSITIONS',
    why: 'Derived Set — call sensitivityGrade.gradeForLifecycleTransition(t).requiresLedgerAnchor instead.',
    regex: /\bHIGH_SENSITIVITY_TRANSITIONS\b/,
    allowedFiles: [
      'intelligence/beneficiary-lifecycle.registry.js', // builds the Set as the canonical source
      'intelligence/care-planning.registry.js', // pre-existing parallel Set for care-plan (different domain — future U4 consolidation)
      'intelligence/sensitivity-grade.lib.js', // documents the alias in header
    ],
  },
  {
    id: 'new_validate_transition_request',
    why: 'State-machine validation belongs in workflow.lib.defineWorkflow().validateTransition (Wave 94). Per-registry validators drift apart.',
    // Matches a NEW DECLARATION of validateTransitionRequest only — not call-sites.
    // The negative lookbehind (?<![.\w]) excludes `.validateTransitionRequest`
    // (method call) and `myValidateTransitionRequest` (similar names).
    regex:
      /(?<![.\w])(function\s+validateTransitionRequest\s*\(|const\s+validateTransitionRequest\s*=)/,
    allowedFiles: [
      'intelligence/workflow.lib.js', // canonical
      'intelligence/beneficiary-lifecycle.registry.js', // Wave 94 — delegates to workflow.lib but keeps public API
      'intelligence/care-planning.registry.js', // U4 candidate — pre-existing, awaiting migration in future wave
      'intelligence/care-plan.service.js', // U4 candidate — pre-existing, awaiting migration in future wave
    ],
  },
  {
    id: 'lifecycle_mfa_disabled',
    why: 'Beneficiary-lifecycle service in app.js must be constructed with enforceMfa:true (Wave 95). Disabling MFA in production opens HIGH/CRITICAL transitions to bypassed step-up.',
    // Catch literal `enforceMfa: false` in app.js. Tests + back-compat
    // callers that opt out are allow-listed below.
    regex: /enforceMfa\s*:\s*false/,
    allowedFiles: [
      'intelligence/beneficiary-lifecycle.service.js', // default in factory signature (back-compat for unit tests)
    ],
  },
  {
    id: 'risk_metrics_literal_counter_name',
    why: 'Wave 311 — risk-metrics counter names must come from NAMES.* in intelligence/risk-metrics.registry.js. String literals copy-pasted into services drift the dashboard contract and bypass the registry alias map.',
    // Match string literals for the 6 canonical counter names. Callers must
    // use `registry.NAMES.GOV_CONSENT` etc, not bare strings.
    regex:
      /['"](?:audit\.append\.attempted|audit\.append\.appended|audit\.append\.failed|audit\.append\.verified|backlink\.attempted|gov\.adapter\.consent|gov\.report\.submission)['"]/,
    allowedFiles: [
      'intelligence/risk-metrics.registry.js', // canonical: defines the NAMES constants
    ],
  },
  {
    id: 'risk_metrics_fork_snapshot',
    why: 'Wave 311 — only intelligence/risk-metrics.registry.js may declare snapshotGrouped() or _key(). A parallel implementation forks the label-sort contract that the W302 Prometheus exporter depends on.',
    regex: /(function\s+snapshotGrouped\s*\(|const\s+snapshotGrouped\s*=)/,
    allowedFiles: [
      'intelligence/risk-metrics.registry.js', // canonical
    ],
  },
  {
    id: 'new_hash_chain_compute',
    why: 'Hash-chain compute helpers belong in intelligence/hash-chain.lib (Wave 88). External cert chains under services/blockchain are out of scope.',
    // Match `function computeHash(` or `const computeHash =` as a declaration
    // — NOT every variable named `computeHash` (would false-flag callers
    // that import the lib and rename).
    regex: /(function\s+computeHash\s*\(|const\s+computeHash\s*=)/,
    allowedFiles: [
      'intelligence/hash-chain.lib.js', // canonical
      'intelligence/access-review.service.js', // Wave 88 wrapper preserving public API
      'models/CarePlanVersion.js', // model static — separate concern, future 88.B
    ],
  },
];

function walk(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      acc.push(full);
    }
  }
  return acc;
}

function relPosix(abs, baseDir) {
  return path.relative(baseDir, abs).split(path.sep).join('/');
}

function checkFile(file, content, baseDir) {
  const rel = relPosix(file, baseDir);
  const violations = [];
  for (const pat of PATTERNS) {
    if (pat.allowedFiles.includes(rel)) continue;
    if (!pat.regex.test(content)) continue;
    // Capture line numbers of matches for actionable output
    const lines = content.split('\n');
    const lineNumbers = [];
    for (let i = 0; i < lines.length; i++) {
      if (pat.regex.test(lines[i])) lineNumbers.push(i + 1);
    }
    violations.push({
      patternId: pat.id,
      why: pat.why,
      file: rel,
      lineNumbers,
    });
  }
  return violations;
}

function runCheck({ rootDir = REPO_ROOT } = {}) {
  const allFiles = [];
  for (const root of SCAN_ROOTS) {
    walk(path.join(rootDir, root), allFiles);
  }
  const violations = [];
  for (const file of allFiles) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    violations.push(...checkFile(file, content, rootDir));
  }
  return { violations, scannedCount: allFiles.length };
}

function formatHuman(result) {
  const { violations, scannedCount } = result;
  const lines = [];
  lines.push(`Anti-Duplication Check (Wave 93 / G1)`);
  lines.push(`Scanned ${scannedCount} .js files under: ${SCAN_ROOTS.join(', ')}`);
  lines.push('');
  if (violations.length === 0) {
    lines.push('✅ Clean — no new occurrences of canonical patterns outside allow-list.');
    return lines.join('\n');
  }
  lines.push(`❌ ${violations.length} violation(s) found:`);
  lines.push('');
  for (const v of violations) {
    lines.push(`  [${v.patternId}] ${v.file}`);
    lines.push(`    Lines: ${v.lineNumbers.join(', ')}`);
    lines.push(`    Why:   ${v.why}`);
    lines.push(
      `    Fix:   Migrate to the canonical lib, or add ${v.file} to the allow-list in scripts/anti-duplication-check.js with a WHY comment.`
    );
    lines.push('');
  }
  return lines.join('\n');
}

if (require.main === module) {
  const json = process.argv.includes('--json');
  const result = runCheck();
  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(formatHuman(result) + '\n');
  }
  process.exit(result.violations.length > 0 ? 1 : 0);
}

module.exports = { runCheck, PATTERNS, formatHuman };
