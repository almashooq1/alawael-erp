#!/usr/bin/env node
'use strict';

/**
 * audit-stub-routes.js — "hollow surface" detector (Phase 0 — de-bloat).
 * ════════════════════════════════════════════════════════════════════
 * The platform mounts 500+ route files, but a number of them are STUBS:
 * handlers that return hard-coded empty/zeroed literals (or echo the
 * request body) with NO database access, NO controller/service/model
 * wiring, and NO `req.app` store. They make the API look comprehensive
 * while exposing nothing real — the most dangerous kind of tech debt
 * because it hides the true completion state.
 *
 * This READ-ONLY, PURE-SOURCE scan classifies every route file under
 * backend/routes into:
 *   - STUB        — defines routes but has zero real-data signals
 *                   (no DB ops, no controllers/models/services require,
 *                    no mongoose, no `await`, no req.app store/service)
 *   - WIRED       — has at least one real-data signal
 *
 * Output is a triage inventory for a wire-or-delete decision per stub.
 * It is INFORMATIONAL (always exits 0); it is not a CI gate. Promote a
 * subset to a ratchet drift-guard later (W340 pattern) once the stub
 * count has been driven down deliberately.
 *
 * Usage:
 *   node scripts/audit-stub-routes.js          # human-readable
 *   node scripts/audit-stub-routes.js --json   # machine-readable
 */

const fs = require('fs');
const path = require('path');

const JSON_OUT = process.argv.includes('--json');
const BACKEND = path.join(__dirname, '..');
const ROUTES_DIR = path.join(BACKEND, 'routes');

function readSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function walkJs(dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '__tests__' || e.name === '_archived') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkJs(full));
    else if (e.isFile() && e.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// Defines at least one HTTP route (router.get/post/... or app.get/...).
const ROUTE_DEF = /\b(router|app)\.(get|post|put|patch|delete|all|use)\s*\(/;

// Real-data signals — ANY of these means the file is NOT a hollow stub.
const SIGNALS = {
  // requires a controller / model / service / domain / repository / lib
  realRequire:
    /require\(\s*['"][^'"]*\/(controllers|models|services|domains|repositories|intelligence|workflow|students|vehicles)\//,
  mongoose: /\bmongoose\b/,
  dbOps:
    /\.(find|findOne|findById|findByIdAndUpdate|findOneAndUpdate|aggregate|countDocuments|count|create|insertMany|updateOne|updateMany|deleteOne|deleteMany|save|populate)\s*\(/,
  awaitUse: /\bawait\b/,
  // pulls a wired store/service off the app (e.g. req.app._savedViewStore)
  appStore: /req\.app\.(_[A-Za-z]|get\s*\()/,
  // factory that receives wired collaborators (createXRouter({ service, ... }))
  factory: /function\s+create[A-Za-z0-9]*Router\s*\(/,
};

// Stubs that are intentionally hollow placeholders by design (documented).
// Keep this list tiny + justified — the goal is to drive STUBs to a
// deliberate wire-or-delete decision, not to silence the audit.
const KNOWN_INTENTIONAL = new Set([
  // returns empty {data:[]} placeholders for unimplemented endpoints so the
  // SPA does not 404 — explicitly a placeholder surface.
  'stub-missing.routes.js',
]);

function classify(src) {
  const present = Object.keys(SIGNALS).filter(k => SIGNALS[k].test(src));
  return { isStub: present.length === 0, signals: present };
}

const stubs = [];
const wired = [];
for (const file of walkJs(ROUTES_DIR)) {
  const baseName = path.basename(file);
  if (baseName.startsWith('_')) continue; // helpers / registries internals
  const rel = path.relative(BACKEND, file).split(path.sep).join('/');
  const routeRel = path.relative(ROUTES_DIR, file).split(path.sep).join('/');
  // registries/ are mount orchestrators, not endpoint files.
  if (routeRel.startsWith('registries/')) continue;
  if (KNOWN_INTENTIONAL.has(routeRel)) continue;
  const src = readSafe(file);
  if (!ROUTE_DEF.test(src)) continue;
  // A real stub DEFINES endpoints (METHOD handlers). Files with only
  // `router.use(require(...))` mounts (handlerCount 0) are sub-router
  // composers, not hollow endpoints — skip them.
  const handlerCount = (src.match(/\b(router|app)\.(get|post|put|patch|delete|all)\s*\(/g) || [])
    .length;
  if (handlerCount === 0) continue;
  const { isStub, signals } = classify(src);
  const echoesBody = /\.\.\.req\.body/.test(src);
  const rec = { file: rel, handlerCount, signals, echoesBody };
  (isStub ? stubs : wired).push(rec);
}

stubs.sort((a, b) => b.handlerCount - a.handlerCount);

if (JSON_OUT) {
  console.log(
    JSON.stringify({ stubCount: stubs.length, wiredCount: wired.length, stubs }, null, 2)
  );
  process.exit(0);
}

console.log('');
console.log('Hollow-route (stub) audit — routes/ with no real-data signals');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`Scanned: ${stubs.length + wired.length} route files with HTTP routes.`);
console.log(`WIRED:   ${wired.length}    STUB: ${stubs.length}`);
console.log('');
if (stubs.length === 0) {
  console.log('✅ No hollow stub route files.');
} else {
  console.log(`STUBS (${stubs.length}) — decide wire-or-delete per file:`);
  stubs.forEach(s =>
    console.log(
      `  ${s.file}   [${s.handlerCount} handler(s)${s.echoesBody ? ', echoes req.body' : ''}]`
    )
  );
}
console.log('');
console.log('Heuristic — a "stub" returns only hard-coded literals (no DB, no');
console.log('service, no await, no app store). Verify before deleting; some may');
console.log('be deliberate placeholders worth wiring instead.');
console.log('');
process.exit(0);
