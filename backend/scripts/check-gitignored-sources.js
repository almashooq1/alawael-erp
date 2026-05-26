#!/usr/bin/env node
/**
 * check-gitignored-sources.js — fail when a tracked source file matches a
 * `.gitignore` pattern. This is exactly the W444-class bug:
 * `intelligence/canonical/_primitives.js` was required by 22 canonical
 * schemas, lived on the local FS, was tracked in git, AND matched the
 * `_*.js` rule in `.gitignore` — so a `git clean -fdx` (or any fresh
 * clone with strict ignore enforcement) would silently delete it and
 * break 22 schema loads in CI. Local sprint passed; CI broke.
 *
 * Fix layer: baseline the current 31 tracked-ignored entries (all
 * archived/dev artifacts) + fail on any NEW addition + fail on stale
 * baseline entries that are no longer tracked-ignored (ratchet-DOWN
 * pattern from W325c).
 *
 * Usage:
 *   node scripts/check-gitignored-sources.js        # human-readable
 *   node scripts/check-gitignored-sources.js --json # machine-readable
 *
 * Exit: 0 = baseline matches current; 1 = drift detected.
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');

const JSON_MODE = process.argv.includes('--json');

// Baseline as of 2026-05-26 (Cycle 11 final layer). Every entry below
// is intentionally tracked-ignored: _archived/ historical dumps, dev
// artifacts (.env.*, jest-results.json), generator scripts (_gen_*.js,
// _relax_*.js), and the routes/_registry.js index. Add a NEW entry
// here ONLY with a comment explaining why ignore-pattern overlap is
// intentional + safe (the file isn't required by tracked production
// code). Better: add a `!path/to/file` negation to .gitignore instead.
const BASELINE_TRACKED_IGNORED = new Set([
  // _archived/* — historical dead-model snapshots, intentionally kept
  // in git as documentation but matched by `_archived/` ignore rule.
  '_archived/dead-models/2026-05-01/BeneficiaryManagement_Beneficiary.js',
  '_archived/dead-models/assessmentScales-ClinicalAssessment.js',
  '_archived/dead-models/domains-assessments-ClinicalAssessment.js',
  '_archived/dead-models/domains-core-Beneficiary.js',
  '_archived/dead-models/domains-programs-Program.js',
  '_archived/dead-models/domains-research-ResearchStudy.js',
  '_archived/dead-tests/assessmentScales-ClinicalAssessment.model.test.js',
  '_archived/dead-tests/assessments-models-ClinicalAssessment.domain.test.js',
  '_archived/root-artifacts/2026-05-01/missing_imports.txt',
  // backend/_archived/* — same pattern, scoped to backend repo
  'backend/_archived/dead-models/ELearning.js',
  'backend/_archived/dead-models/EnterpriseRisk.js',
  'backend/_archived/dead-models/EventManagement.js',
  'backend/_archived/dead-models/PublicRelations.js',
  'backend/_archived/dead-models/Training.js',
  'backend/_archived/dead-models/schemas.js',
  'backend/_archived/dead-tests/ELearning.model.test.js',
  'backend/_archived/dead-tests/EnterpriseRisk.model.test.js',
  'backend/_archived/dead-tests/EventManagement.model.test.js',
  'backend/_archived/dead-tests/PublicRelations.model.test.js',
  'backend/_archived/dead-tests/Training.model.test.js',
  'backend/_archived/dead-tests/schemas.model.test.js',
  'backend/_archived/scripts/verify-ddd-platform.js',
  // Generated index — matches `_*.js` but is required by route loader.
  // Safe because git tracks it + CI installs do `git checkout`, not
  // `git clean -fdx`. If we ever migrate to a Dockerfile that runs
  // `git clean`, this needs a `!` negation in .gitignore.
  'backend/routes/_registry.js',
  // Frontend dev artifacts — checked in for the auto-test scaffold +
  // env templates. The `_*.js` rule catches the two generator scripts
  // and `*.env*` rule catches the env templates, but they're intentional.
  'frontend/.env.development',
  'frontend/.env.production',
  'frontend/jest-results.json',
  'frontend/scripts/_gen_frontend_tests.js',
  'frontend/scripts/_relax_p107_assertions.js',
  // Ops shell scripts ignored by a broad ops/ rule — kept tracked
  // because they're the deploy/healthcheck entrypoints.
  'ops/deploy-docker-compose.sh',
  'ops/health-check-all.sh',
  // SCM sub-module env template
  'supply-chain-management/backend/.env.development',
]);

function repoRoot() {
  return execSync('git rev-parse --show-toplevel', {
    encoding: 'utf8',
  }).trim();
}

function listTrackedIgnored(cwd) {
  // -c = tracked, -i = ignored, --exclude-standard = honor .gitignore
  const out = execSync('git ls-files -ci --exclude-standard', {
    cwd,
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .filter(Boolean)
    .map(s => s.replace(/\\/g, '/'));
}

function main() {
  const cwd = repoRoot();
  const current = new Set(listTrackedIgnored(cwd));
  const baseline = BASELINE_TRACKED_IGNORED;

  const added = [...current].filter(f => !baseline.has(f)).sort();
  const removed = [...baseline].filter(f => !current.has(f)).sort();

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify(
        {
          baselineSize: baseline.size,
          currentSize: current.size,
          added,
          removed,
        },
        null,
        2
      ) + '\n'
    );
  } else {
    console.log(`Tracked-ignored files: ${current.size} (baseline: ${baseline.size}).`);
    if (added.length > 0) {
      console.log(`✗ ${added.length} NEW tracked-ignored file(s) — likely silent breakage risk:`);
      for (const f of added) console.log(`  + ${f}`);
      console.log('');
      console.log('Each of these is a tracked file that ALSO matches a .gitignore rule.');
      console.log('CI clones get the file, but any `git clean -fdx` deletes it — and');
      console.log('local sprint runs may silently pass while CI fails. Fix one of:');
      console.log('  (a) preferred — add `!path/to/file` negation to .gitignore');
      console.log('  (b) if file is legitimately archived/dev — add to BASELINE');
      console.log('      in scripts/check-gitignored-sources.js with a comment.');
    }
    if (removed.length > 0) {
      console.log(
        `✗ ${removed.length} STALE baseline entr(y/ies) — file no longer tracked-ignored:`
      );
      for (const f of removed) console.log(`  - ${f}`);
      console.log('');
      console.log(
        'Remove these from BASELINE_TRACKED_IGNORED in scripts/check-gitignored-sources.js'
      );
      console.log('(ratchet-DOWN per W325c pattern).');
    }
    if (added.length === 0 && removed.length === 0) {
      console.log('✓ Baseline matches current state.');
    }
  }

  process.exit(added.length + removed.length === 0 ? 0 : 1);
}

main();
