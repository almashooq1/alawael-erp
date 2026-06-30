#!/usr/bin/env node
'use strict';
/**
 * check-mass-assignment-spread.js — drift guard for `req.body` mass-assignment.
 *
 * WHY: the W506/W507 doctrine is "zero `...req.body` spread; whitelist creatable/
 * updatable fields; status transitions via dedicated endpoints". Spreading
 * `req.body` into a Mongoose constructor / `.create()` / `Object.assign()` lets an
 * authenticated caller set ANY schema field — forging status / approval / audit /
 * branch fields. This session alone fixed it on appointments (#716); the parallel
 * stream fixed finance / inventory / insurance / recruitment / complaints. It keeps
 * recurring, so this gate stops NEW occurrences and ratchets the existing ones down.
 *
 * WHAT: counts, per `backend/routes/**` file, the mass-assignment spread patterns
 *   `...req.body`            (object-spread into create/new/assign)
 *   `Object.assign(x, req.body)`
 * and compares the per-file count to a ratcheting baseline.
 *   - a NEW file (count>0, not baselined) OR a file whose count INCREASED → FAIL
 *     (a new mass-assignment was added — whitelist the fields instead).
 *   - a baselined file whose count DECREASED → FAIL asking to ratchet the baseline
 *     down (so the baseline always equals source truth; W325c/W340 pattern).
 *
 * Routes that wrap the handler in `validate(Joi …)` are largely protected (Joi
 * rejects unknown keys), but this guard intentionally tracks the raw spread anyway
 * — the doctrine is to whitelist, not to rely on a validator existing.
 *
 * USAGE:
 *   node scripts/check-mass-assignment-spread.js            # check (exit 0/1)
 *   node scripts/check-mass-assignment-spread.js --json     # machine-readable
 *   node scripts/check-mass-assignment-spread.js --fix-baseline  # rewrite baseline
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');
const BASELINE_FILE = path.join(__dirname, 'check-mass-assignment-spread.baseline.json');
const JSON_MODE = process.argv.includes('--json');
const FIX = process.argv.includes('--fix-baseline');

const SPREAD_RE = /\.\.\.req\.body\b/g;
const ASSIGN_RE = /Object\.assign\(\s*[a-zA-Z_$][\w$]*\s*,\s*req\.body\b/g;

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '__tests__') walk(p, out);
    } else if (e.name.endsWith('.js')) {
      out.push(p);
    }
  }
}

function countFile(src) {
  const spread = (src.match(SPREAD_RE) || []).length;
  const assign = (src.match(ASSIGN_RE) || []).length;
  return spread + assign;
}

function scan() {
  const files = [];
  walk(ROUTES_DIR, files);
  const counts = {};
  for (const f of files) {
    const n = countFile(fs.readFileSync(f, 'utf8'));
    if (n > 0) {
      const rel = path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/');
      counts[rel] = n;
    }
  }
  return counts;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to parse baseline:', err.message);
    process.exit(2);
  }
}

function main() {
  const current = scan();
  if (FIX) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, Object.keys(current).sort(), 2) + '\n');
    console.log(`✓ baseline written: ${Object.keys(current).length} files, ${Object.values(current).reduce((a, b) => a + b, 0)} spreads.`);
    return;
  }
  const baseline = loadBaseline();
  const added = []; // new or increased
  const stale = []; // decreased (ratchet-down)
  for (const [file, n] of Object.entries(current)) {
    const b = baseline[file] || 0;
    if (n > b) added.push({ file, was: b, now: n });
  }
  for (const [file, b] of Object.entries(baseline)) {
    const n = current[file] || 0;
    if (n < b) stale.push({ file, was: b, now: n });
  }
  const totalCur = Object.values(current).reduce((a, b) => a + b, 0);
  const totalBase = Object.values(baseline).reduce((a, b) => a + b, 0);

  if (JSON_MODE) {
    console.log(JSON.stringify({ ok: !added.length && !stale.length, added, stale, totalCur, totalBase }, null, 2));
  } else {
    console.log(`check-mass-assignment-spread — ${Object.keys(current).length} route files, ${totalCur} spreads (baseline ${totalBase}).`);
    if (added.length) {
      console.log(`  ✗ ${added.length} NEW/increased mass-assignment spread(s) (whitelist creatable/updatable fields instead of \`...req.body\`):`);
      for (const a of added) console.log(`      ${a.file}: ${a.was} → ${a.now}`);
    }
    if (stale.length) {
      console.log(`  ✗ ${stale.length} baseline entr(y/ies) now LOWER — ratchet down: run \`npm run check:mass-assign -- --fix-baseline\``);
      for (const s of stale) console.log(`      ${s.file}: baseline ${s.was} → now ${s.now}`);
    }
    if (!added.length && !stale.length) console.log('  ✓ no new mass-assignment spreads; baseline in sync.');
  }
  process.exit(added.length || stale.length ? 1 : 0);
}

if (require.main === module) main();

module.exports = { countFile, scan, loadBaseline, SPREAD_RE, ASSIGN_RE, BASELINE_FILE };
