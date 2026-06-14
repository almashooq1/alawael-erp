#!/usr/bin/env node
'use strict';

/**
 * audit-test-gate.js — test-suite gating inventory.
 *
 * GAPS_ASSESSMENT_2026-06-15 item #1: the CI sprint gate runs only a
 * subset of the backend test files; the rest "rot outside CI". The doc
 * estimated "~1045 of ~2993" and assumed the ungated remainder is "dead
 * (broken import paths)". That second claim needs evidence: the
 * `no-broken-requires.test.js` drift guard (which IS in the sprint gate)
 * already proves every *relative* require across the whole tree resolves.
 * So the real shape of the gap is: how many test files exist, how many
 * are gated, and where the ungated ones live (hand-written __tests__ vs
 * auto-generated tests/unit smoke tests).
 *
 * This script answers that statically (no test execution — fast, safe,
 * reversible). It is the inventory that informs the "fix vs delete vs
 * gate" decision for the rest of item #1.
 *
 * What it reports:
 *   - total *.test.js / *.spec.js under __tests__/ and tests/
 *   - GATED  (path present in sprint-tests.txt) vs UNGATED
 *   - bucketed by directory family (__tests__, tests/unit, tests/other)
 *   - BROKEN-REQUIRE files: any test file with a relative require(...)
 *     that doesn't resolve on disk (the genuinely "dead" ones)
 *   - stale sprint-tests.txt entries (listed but file missing)
 *
 * Usage:
 *   node scripts/audit-test-gate.js          # human-readable summary
 *   node scripts/audit-test-gate.js --json    # machine-readable
 *   node scripts/audit-test-gate.js --list-broken    # print broken files
 *   node scripts/audit-test-gate.js --list-ungated   # print ungated files
 *
 * Exit code is always 0 (this is a reporting tool, not a CI gate).
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..');
const SPRINT_LIST = path.join(BACKEND_DIR, 'sprint-tests.txt');
const TEST_ROOTS = ['__tests__', 'tests'];
const TEST_FILE_RE = /\.(test|spec)\.js$/;

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '_archived',
  'coverage',
  'logs',
  'backups',
  'data',
  'uploads',
  '.jest-cache',
  '.git',
]);

// Files whose "broken requires" are known false positives — the require(...)
// strings live inside quoted fixtures / toContain(...) assertions, not real
// imports. Kept in sync with no-broken-requires.test.js FALSE_POSITIVE_ALLOWLIST
// so this audit doesn't misreport them as genuinely dead.
const BROKEN_REQUIRE_FALSE_POSITIVES = new Set(
  [
    '__tests__/no-duplicate-model-registration-wave340.test.js',
    '__tests__/check-dormant-modules-script.test.js',
    '__tests__/check-authz-consolidation-script.test.js',
    '__tests__/check-can-scope-contract-script.test.js',
    '__tests__/domain-resource-param-guards-wave1175.test.js',
    '__tests__/check-phantom-schema-writes-script.test.js',
    '__tests__/email-migration-digests-wave1246.test.js',
    'tests/unit/check_app.root.test.js',
  ].map(p => p.replace(/\\/g, '/'))
);

function walk(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (TEST_FILE_RE.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function toPosixRel(absFile) {
  return path.relative(BACKEND_DIR, absFile).replace(/\\/g, '/');
}

function readSprintSet() {
  const raw = fs.readFileSync(SPRINT_LIST, 'utf8');
  const set = new Set();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (t && !t.startsWith('#')) set.add(t.replace(/\\/g, '/'));
  }
  return set;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function findRelativeRequires(src) {
  const out = [];
  const re = /require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

function targetResolves(fromFile, target) {
  const resolved = path.resolve(path.dirname(fromFile), target);
  const candidates = [
    resolved,
    `${resolved}.js`,
    `${resolved}.json`,
    path.join(resolved, 'index.js'),
  ];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

function bucketOf(relPosix) {
  if (relPosix.startsWith('tests/unit/')) return 'tests/unit (auto-generated)';
  if (relPosix.startsWith('tests/')) return 'tests/ (other)';
  if (relPosix.startsWith('__tests__/')) return '__tests__ (hand-written)';
  return 'other';
}

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const listBroken = argv.includes('--list-broken');
  const listUngated = argv.includes('--list-ungated');

  const sprintSet = readSprintSet();

  const allTests = [];
  for (const root of TEST_ROOTS) {
    walk(path.join(BACKEND_DIR, root), allTests);
  }

  const buckets = {};
  const broken = [];
  let gatedCount = 0;
  const ungatedFiles = [];

  for (const abs of allTests) {
    const rel = toPosixRel(abs);
    const bucket = bucketOf(rel);
    if (!buckets[bucket]) buckets[bucket] = { total: 0, gated: 0, ungated: 0, broken: 0 };
    buckets[bucket].total += 1;

    const gated = sprintSet.has(rel);
    if (gated) {
      gatedCount += 1;
      buckets[bucket].gated += 1;
    } else {
      buckets[bucket].ungated += 1;
      ungatedFiles.push(rel);
    }

    // Broken-require detection (the genuinely "dead" files).
    let src = '';
    try {
      src = stripComments(fs.readFileSync(abs, 'utf8'));
    } catch {
      /* ignore read error */
    }
    const brokenTargets = BROKEN_REQUIRE_FALSE_POSITIVES.has(rel)
      ? []
      : findRelativeRequires(src).filter(t => !targetResolves(abs, t));
    if (brokenTargets.length > 0) {
      broken.push({ file: rel, gated, targets: [...new Set(brokenTargets)] });
      buckets[bucket].broken += 1;
    }
  }

  // Stale sprint entries: listed in sprint-tests.txt but file absent.
  const stale = [];
  for (const entry of sprintSet) {
    const abs = path.join(BACKEND_DIR, entry);
    if (!fs.existsSync(abs)) stale.push(entry);
  }

  const total = allTests.length;
  const ungatedCount = total - gatedCount;

  const report = {
    generatedAt: new Date().toISOString(),
    total,
    gated: gatedCount,
    ungated: ungatedCount,
    gatedPct: total ? Math.round((gatedCount / total) * 1000) / 10 : 0,
    sprintListEntries: sprintSet.size,
    staleSprintEntries: stale.length,
    brokenRequireFiles: broken.length,
    buckets,
  };

  if (asJson) {
    console.log(
      JSON.stringify(
        { ...report, broken, stale, ungatedFiles: listUngated ? ungatedFiles : undefined },
        null,
        2
      )
    );
    return;
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Test-Gate Inventory  (audit-test-gate.js)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total test files (.test.js/.spec.js) : ${total}`);
  console.log(`  GATED in sprint-tests.txt            : ${gatedCount} (${report.gatedPct}%)`);
  console.log(`  UNGATED (rot outside CI)             : ${ungatedCount}`);
  console.log(`  sprint-tests.txt entries             : ${sprintSet.size}`);
  console.log(`  STALE sprint entries (file missing)  : ${stale.length}`);
  console.log(`  BROKEN-require files (truly dead)    : ${broken.length}`);
  console.log('───────────────────────────────────────────────────────────────');
  console.log(' By bucket:');
  for (const [name, b] of Object.entries(buckets)) {
    console.log(`   ${name}`);
    console.log(
      `     total=${b.total}  gated=${b.gated}  ungated=${b.ungated}  broken=${b.broken}`
    );
  }
  console.log('───────────────────────────────────────────────────────────────');

  if (broken.length > 0) {
    console.log(` ${broken.length} file(s) with UNRESOLVABLE relative require(s):`);
    const show = listBroken ? broken : broken.slice(0, 15);
    for (const b of show) {
      console.log(`   ${b.gated ? '[GATED] ' : '        '}${b.file}`);
      for (const t of b.targets) console.log(`            -> ${t}`);
    }
    if (!listBroken && broken.length > 15)
      console.log(`   ... and ${broken.length - 15} more (use --list-broken)`);
  } else {
    console.log(' No broken-require files — every relative require resolves.');
  }

  if (stale.length > 0) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log(` ${stale.length} STALE sprint-tests.txt entries (remove these):`);
    for (const s of stale.slice(0, 20)) console.log(`   ${s}`);
    if (stale.length > 20) console.log(`   ... and ${stale.length - 20} more`);
  }

  if (listUngated) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log(` ${ungatedCount} UNGATED files:`);
    for (const f of ungatedFiles) console.log(`   ${f}`);
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

main();
