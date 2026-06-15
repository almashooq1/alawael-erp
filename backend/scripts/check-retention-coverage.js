#!/usr/bin/env node
/**
 * check-retention-coverage.js — surface which Mongoose models declare a
 * TTL / retention policy and which do NOT (W1307, GAPS Item 10).
 *
 * WHY (the gap this closes):
 *   CLAUDE.md documents a real convention — "all PII-touching collections
 *   use 30-day TTL minimum (aligns PDPL)" — and the codebase already has
 *   ~40 TTL indexes (LlmTelemetryCall, HikvisionJobRun, CctvEvent, …). But
 *   NOTHING surfaces the inventory: a reviewer cannot answer "which
 *   collections auto-expire, and which transient/log-like collections are
 *   silently retaining data forever?" without grepping by hand. The GAPS
 *   assessment (Item 10) flagged the absence of any automated
 *   retention/destruction visibility beyond `dsar:hash`.
 *
 *   This is a READ-ONLY INVENTORY REPORT. It does NOT:
 *     - delete anything,
 *     - enforce a policy, or
 *     - fail CI by default.
 *   Auto-classifying a collection as "PII-touching" is error-prone (the
 *   GAPS doc itself warned about overstated claims), so this script makes
 *   ZERO such judgement — it only reports the objective fact "has TTL /
 *   has no TTL" per model. A human applies the retention policy.
 *
 * WHAT COUNTS AS "HAS RETENTION":
 *   Any of the following appearing in the model source:
 *     1. `.index({...}, { expireAfterSeconds: N })`   (TTL index)
 *     2. `expires: <number|string>` in a field/schema option
 *     3. `{ index: { expireAfterSeconds: N } }`       (inline field index)
 *
 * USAGE:
 *   node scripts/check-retention-coverage.js            # human-readable
 *   node scripts/check-retention-coverage.js --json     # machine-readable
 *   node scripts/check-retention-coverage.js --dir=...  # override models dir
 *   node scripts/check-retention-coverage.js --strict   # exit 1 if ANY model
 *                                                        # lacks TTL (opt-in;
 *                                                        # NOT for CI — most
 *                                                        # canonical records
 *                                                        # must NEVER expire)
 * EXIT:
 *   0 by default (report-only).
 *   1 only under --strict when at least one model lacks retention.
 *
 * INTENTIONALLY ON-DEMAND (not wired into pre-push): retention is a
 * product/compliance decision per collection, not a mechanical drift class.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');
const STRICT = ARGS.includes('--strict');
const DIR_ARG = ARGS.find(a => a.startsWith('--dir='));

const MODELS_DIR = DIR_ARG
  ? path.resolve(DIR_ARG.slice('--dir='.length))
  : path.resolve(__dirname, '..', 'models');

// ── Pure helpers (exported for the self-test) ───────────────────────────────

/** Recursively list *.js files under dir (skips node_modules + dotdirs). */
function listModelFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listModelFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

// Detection patterns. Conservative: only positive TTL signals match.
const TTL_PATTERNS = Object.freeze([
  /expireAfterSeconds\s*:/, // .index({...}, { expireAfterSeconds: N })
  /\bexpires\s*:\s*['"\d]/, // field option: expires: 900 | '30d'
]);

/**
 * Given model source text, return true iff it declares any retention/TTL.
 * Strips // line comments + block comments first so a commented-out example
 * (e.g. NafathRequest.js's "can set expireAfterSeconds:0 — don't duplicate")
 * does NOT count as a real policy.
 */
function hasRetention(source) {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // line comments (avoid http://)
  return TTL_PATTERNS.some(re => re.test(stripped));
}

/** Build the per-file coverage report from a list of {file, source}. */
function buildReport(entries) {
  const withTtl = [];
  const withoutTtl = [];
  for (const { file, source } of entries) {
    (hasRetention(source) ? withTtl : withoutTtl).push(file);
  }
  withTtl.sort();
  withoutTtl.sort();
  const total = withTtl.length + withoutTtl.length;
  return {
    total,
    withTtlCount: withTtl.length,
    withoutTtlCount: withoutTtl.length,
    coveragePct: total === 0 ? 0 : Math.round((withTtl.length / total) * 1000) / 10,
    withTtl,
    withoutTtl,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const files = listModelFiles(MODELS_DIR);
  const entries = files.map(file => ({
    file: path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/'),
    source: fs.readFileSync(file, 'utf8'),
  }));
  const report = buildReport(entries);

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 2) + '\n'
    );
  } else {
    console.log('\nRetention / TTL coverage report (read-only)\n');
    console.log(`  Models scanned:     ${report.total}`);
    console.log(`  With TTL/retention: ${report.withTtlCount}`);
    console.log(`  Without TTL:        ${report.withoutTtlCount}`);
    console.log(`  Coverage:           ${report.coveragePct}%`);
    console.log(
      '\n  NOTE: "without TTL" is NOT a defect list — most canonical records' +
        '\n  (Beneficiary, CarePlan, clinical history) MUST be retained. This is' +
        '\n  an inventory to help a human apply a per-collection PDPL policy.\n'
    );
  }

  if (STRICT && report.withoutTtlCount > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { listModelFiles, hasRetention, buildReport, MODELS_DIR };
