#!/usr/bin/env node
'use strict';

/**
 * sync-sprint-tests-paths.js — auto-fix the recurring sprint-tests.yml
 * drift bug class.
 *
 * Background: parallel-agent commits regularly add new
 * `__tests__/wave*.test.js` files to `backend/sprint-tests.txt`
 * without updating `.github/workflows/sprint-tests.yml`'s `paths:`
 * triggers (which mirror the txt list across both `push:` and
 * `pull_request:` blocks). The CI drift guard `ci-path-triggers-exist`
 * fails as a result — silently red on CI even when local sprint passes.
 *
 * This script READS sprint-tests.txt + ENSURES every entry there
 * also appears in both yml paths-blocks. If any are missing, it
 * APPENDS them (just before the closing `package.json` line) with
 * a "auto-synced" comment marker so they're identifiable.
 *
 * Two modes:
 *   • `node scripts/sync-sprint-tests-paths.js` — check + auto-fix
 *     (exits 0 always, prints "n entries added" or "in sync")
 *   • `node scripts/sync-sprint-tests-paths.js --check` — read-only,
 *     exits 1 with a list if drift found (CI gate use)
 *
 * Discovered Cycle 11 (2026-05-26): fired twice (W269d-g batch + W269h
 * solo). Prevention > detection for this class.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_DIR, '..');
const SPRINT_TXT = path.join(BACKEND_DIR, 'sprint-tests.txt');
const SPRINT_YML = path.join(REPO_ROOT, '.github', 'workflows', 'sprint-tests.yml');

const CHECK_ONLY = process.argv.includes('--check');

function readSprintList() {
  return fs
    .readFileSync(SPRINT_TXT, 'utf8')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(rel => `backend/${rel}`);
}

function findMissing(yml, entries) {
  return entries.filter(e => !yml.includes(`'${e}'`) && !yml.includes(`"${e}"`));
}

function appendBeforeAnchor(yml, anchor, items) {
  // Anchor: `      - 'backend/package.json'\n      - '.github/workflows/sprint-tests.yml'`
  // Append items as `      - 'X'` lines BEFORE the anchor.
  const lines = items.map(e => `      - '${e}'`).join('\n');
  const block = `      # Auto-synced from sprint-tests.txt by scripts/sync-sprint-tests-paths.js\n${lines}\n${anchor}`;
  return yml.replace(anchor, block);
}

function main() {
  if (!fs.existsSync(SPRINT_TXT)) {
    console.error('sprint-tests.txt not found at', SPRINT_TXT);
    process.exit(2);
  }
  if (!fs.existsSync(SPRINT_YML)) {
    console.error('sprint-tests.yml not found at', SPRINT_YML);
    process.exit(2);
  }

  const entries = readSprintList();
  const yml = fs.readFileSync(SPRINT_YML, 'utf8');

  // Each test file should appear in BOTH push + pull_request blocks =
  // 2 occurrences in the yml. Find entries with < 2 occurrences.
  const partiallyMissing = entries.filter(e => {
    const re = new RegExp(`['"]${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    const matches = yml.match(re) || [];
    return matches.length < 2;
  });

  if (partiallyMissing.length === 0) {
    console.log(
      `✓ sprint-tests.yml is in sync (${entries.length} entries × 2 blocks = ${entries.length * 2} expected occurrences)`
    );
    process.exit(0);
  }

  console.log(
    `✗ ${partiallyMissing.length} entries in sprint-tests.txt are missing from sprint-tests.yml paths:`
  );
  for (const e of partiallyMissing) console.log(`  - ${e}`);

  if (CHECK_ONLY) {
    console.log('\nRun without --check to auto-fix.');
    process.exit(1);
  }

  // Find the 2 anchors (one per block: `package.json` followed by
  // `sprint-tests.yml` then either `pull_request:` or `workflow_dispatch:`).
  const pushAnchor = `      - 'backend/package.json'\n      - '.github/workflows/sprint-tests.yml'\n  pull_request:`;
  const prAnchor = `      - 'backend/package.json'\n      - '.github/workflows/sprint-tests.yml'\n  workflow_dispatch:`;

  let updated = yml;
  let changed = 0;

  if (yml.includes(pushAnchor)) {
    updated = appendBeforeAnchor(updated, pushAnchor, partiallyMissing);
    changed += partiallyMissing.length;
  } else {
    console.warn('warn: push-block anchor not found; expected literal block before pull_request:');
  }

  if (updated.includes(prAnchor)) {
    updated = appendBeforeAnchor(updated, prAnchor, partiallyMissing);
    changed += partiallyMissing.length;
  } else {
    console.warn(
      'warn: pull_request-block anchor not found; expected literal block before workflow_dispatch:'
    );
  }

  if (changed === 0) {
    console.error(
      'error: no anchors matched; refusing to write. Check sprint-tests.yml structure.'
    );
    process.exit(3);
  }

  fs.writeFileSync(SPRINT_YML, updated, 'utf8');
  console.log(
    `\n✓ Auto-fixed: appended ${partiallyMissing.length} entries × 2 blocks = ${changed} occurrences added.`
  );
  console.log('  Re-run __tests__/ci-path-triggers-exist.test.js to verify.');
  process.exit(0);
}

main();
