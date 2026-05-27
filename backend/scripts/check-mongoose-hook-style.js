#!/usr/bin/env node
/**
 * check-mongoose-hook-style.js — fail when a Mongoose model has multiple
 * pre/post hooks for the SAME event with MIXED dispatch styles
 * (async/Promise-returning vs callback-with-next).
 *
 * This is the W465 → W483 silent-break class. Complaint.js had two
 * pre('save', …) hooks: one async, one callback-style with `next`.
 * Mongoose's Kareem middleware dispatches the chain via Promise
 * adapters when any hook is async, which leaves `next` undefined for
 * the callback siblings — they throw TypeError on every doc.save().
 * Blast radius was every parent-portal-v2 + complaint-creation flow;
 * CI parent-portal-v2.api.test.js was RED on main for ~24h before the
 * pattern was identified + fixed.
 *
 * Recipe (per memory feedback_mongoose_mixed_pre_save_hook_styles):
 *   "grep existing pre('save'/etc.) hooks BEFORE adding a new one +
 *    match their style"
 * This script is the static gate that enforces the recipe at push time.
 *
 * Usage:
 *   node scripts/check-mongoose-hook-style.js        # human-readable
 *   node scripts/check-mongoose-hook-style.js --json # machine-readable
 *
 * Exit: 0 = all model files use consistent style per event; 1 = drift.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const JSON_MODE = process.argv.includes('--json');

// Directories where Mongoose schemas can be declared. backend/models/ is
// the canonical home but pre/post hooks also live in domain-specific
// folders (domains/*/models/), plugins (database/plugins/), authorization
// (tenantScope.plugin), privacy (data-subject-request.model), and a few
// services that declare their own schemas inline.
const SCAN_DIRS = [
  path.resolve(__dirname, '..', 'models'),
  path.resolve(__dirname, '..', 'domains'),
  path.resolve(__dirname, '..', 'database'),
  path.resolve(__dirname, '..', 'authorization'),
  path.resolve(__dirname, '..', 'privacy'),
  path.resolve(__dirname, '..', 'integration'),
  path.resolve(__dirname, '..', 'intelligence'),
  path.resolve(__dirname, '..', 'rehabilitation-services'),
  path.resolve(__dirname, '..', 'services'),
];
const SKIP_DIR_NAMES = new Set([
  '_archived',
  '_backups',
  'node_modules',
  '__tests__',
  'tests',
  'scripts',
]);

// Match `<Schema>.pre('event', <opts?>, <fn>)` or .post(...). Capture
// event name + signature start. We need to read forward to see whether
// the function is `async function` / `function (next)` / arrow.
const HOOK_RE =
  /(\w+(?:Schema|schema))\s*\.\s*(pre|post)\s*\(\s*['"]([a-zA-Z]+)['"]\s*(?:,\s*\{[^}]*\}\s*)?,\s*(async\s+)?function\s*\(([^)]*)\)/g;

function listSchemaFiles(roots) {
  const out = [];
  function walk(d) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return; // dir may not exist (e.g. fresh checkout missing one of SCAN_DIRS)
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIR_NAMES.has(e.name)) continue;
        walk(full);
      } else if (e.isFile() && e.name.endsWith('.js')) {
        out.push(full);
      }
    }
  }
  for (const root of roots) walk(root);
  return out;
}

// Classify a hook by signature:
//   async-no-next      — `async function ()`              SAFE
//   async-with-next    — `async function (next)`          INCONSISTENT but harmless
//   callback           — `function (next)` + body calls `next(...)`  DANGEROUS when mixed w/ async
//   sync-no-next       — `function ()`                    SAFE (Mongoose handles)
// Returns one of: 'async' | 'callback' | 'sync'
function classifyHook(isAsync, params, bodyAhead) {
  const paramsTrim = params.trim();
  const hasNext = /\bnext\b/.test(paramsTrim);
  if (isAsync) return 'async';
  if (!hasNext) return 'sync';
  // sync with `next` param — check if body actually calls next(). If it
  // does, it's the dangerous callback style. If it doesn't, treat as sync.
  if (/\bnext\s*\(/.test(bodyAhead)) return 'callback';
  return 'sync';
}

function analyze(file) {
  const src = fs.readFileSync(file, 'utf8');
  const hooks = [];
  let m;
  // Reset regex state for each file
  HOOK_RE.lastIndex = 0;
  while ((m = HOOK_RE.exec(src)) !== null) {
    const [, schemaName, when, event, asyncKw, params] = m;
    // Peek the next ~600 chars to detect `next(...)` calls in the body
    const bodyAhead = src.slice(m.index + m[0].length, m.index + m[0].length + 600);
    const style = classifyHook(!!asyncKw, params, bodyAhead);
    hooks.push({ schemaName, when, event, style, line: lineOf(src, m.index) });
  }
  // Group by (schema, when, event) and check for mixed callback ↔ async
  const groups = {};
  for (const h of hooks) {
    const key = `${h.schemaName}.${h.when}('${h.event}')`;
    (groups[key] ||= []).push(h);
  }
  const drift = [];
  for (const [key, list] of Object.entries(groups)) {
    if (list.length < 2) continue;
    const styles = new Set(list.map(h => h.style));
    if (styles.has('async') && styles.has('callback')) {
      drift.push({
        file: path.relative(path.resolve(__dirname, '..'), file),
        key,
        hooks: list.map(h => ({ line: h.line, style: h.style })),
      });
    }
  }
  return drift;
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

function main() {
  const files = listSchemaFiles(SCAN_DIRS);
  const allDrift = [];
  for (const f of files) {
    const d = analyze(f);
    if (d.length) allDrift.push(...d);
  }

  if (JSON_MODE) {
    process.stdout.write(
      JSON.stringify({ scanned: files.length, drift: allDrift }, null, 2) + '\n'
    );
  } else {
    console.log(`Scanned ${files.length} model files.`);
    if (allDrift.length === 0) {
      console.log('✓ No mixed async/callback hook styles found.');
    } else {
      console.log(
        `✗ ${allDrift.length} mixed-style hook group(s) — TypeError on every save() risk:`
      );
      for (const d of allDrift) {
        console.log(`  ${d.file}: ${d.key}`);
        for (const h of d.hooks) console.log(`    line ${h.line}: ${h.style}`);
      }
      console.log('');
      console.log('Mongoose Kareem middleware dispatches the WHOLE hook chain via Promise');
      console.log('adapters when ANY hook on an event is async — callback-style siblings');
      console.log('then receive undefined for `next`, throwing TypeError on doc.save().');
      console.log('');
      console.log('Fix: convert ALL hooks for that event to the same style.');
      console.log('  Async pattern:    pre("save", async function () { … throw new Error(…) })');
      console.log('  Callback pattern: pre("save", function (next) { … next(new Error(…)) })');
      console.log('');
      console.log('See memory entry feedback_mongoose_mixed_pre_save_hook_styles + W483.');
    }
  }
  process.exit(allDrift.length === 0 ? 0 : 1);
}

// Pure helpers exported for unit tests (check-mongoose-hook-style-script.test.js).
// Only invoke main() when run as CLI — required-as-module needs the helpers
// without auto-executing the filesystem scan.
module.exports = { classifyHook, analyze, listSchemaFiles, SCAN_DIRS };

if (require.main === module) {
  main();
}
