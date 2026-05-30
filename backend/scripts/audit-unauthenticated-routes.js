#!/usr/bin/env node
'use strict';

/**
 * audit-unauthenticated-routes.js — R4 follow-up (surfaced by W657).
 * ════════════════════════════════════════════════════════════════════
 * This repo applies auth PER-MOUNT, via two registry helpers:
 *   dualMountAuth(app, 'x', router)  → mounts WITH `authenticate`
 *   dualMount(app, 'x', router)      → mounts with NO auth
 * A route file mounted via plain dualMount AND with no in-file auth
 * (router.use(authenticate…)) is reachable by an anonymous attacker.
 * W657 found exactly this on therapy-sessions-analytics (KPIs/billing).
 *
 * READ-ONLY, PURE-SOURCE. Cross-references the registry mount type with
 * each route file's in-file auth, and flags the un-authed intersection.
 * Heuristic: a file may still be authed by a mount this scan doesn't
 * model (a bespoke app.use). Triage, not verdict.
 *
 * Usage:
 *   node scripts/audit-unauthenticated-routes.js          # report
 *   node scripts/audit-unauthenticated-routes.js --json
 */

const fs = require('fs');
const path = require('path');

const JSON_OUT = process.argv.includes('--json');
const BACKEND = path.join(__dirname, '..');

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

// ── 1. Classify each route file's MOUNT auth from the registries ─────
const registrySrc = [
  path.join(BACKEND, 'routes', '_registry.js'),
  ...walkJs(path.join(BACKEND, 'routes', 'registries')),
  path.join(BACKEND, 'app.js'),
]
  .map(readSafe)
  .join('\n');

const authedAtMount = new Set();
const noAuthAtMount = new Set();
let m;

// Variable → route-file map: `const fooRoutes = safeRequire('../routes/foo.routes')`
const varToFile = {};
const varRe =
  /(?:const|let|var)\s+(\w+)\s*=\s*(?:safeRequire|require)\(\s*['"]\.\.\/routes\/([\w-]+)\.routes['"]/g;
while ((m = varRe.exec(registrySrc))) varToFile[m[1]] = `${m[2]}.routes.js`;

const mark = (authed, file) => (authed ? authedAtMount : noAuthAtMount).add(file);

// (A) dualMount(Auth)?(app, 'name', safeRequire('../routes/X.routes')) — literal, bounded span
const literalRe =
  /dualMount(Auth)?\s*\([^]{0,200}?(?:safeRequire|require)\(\s*['"]\.\.\/routes\/([\w-]+)\.routes['"]/g;
while ((m = literalRe.exec(registrySrc))) mark(!!m[1], `${m[2]}.routes.js`);

// (B) dualMount(Auth)?(app, 'name', preAssignedVar) — resolve the variable
const varMountRe = /dualMount(Auth)?\s*\(\s*app\s*,\s*['"][^'"]+['"]\s*,\s*(\w+)\s*\)/g;
while ((m = varMountRe.exec(registrySrc))) {
  if (varToFile[m[2]]) mark(!!m[1], varToFile[m[2]]);
}

// (C) safeMount(app, paths, './X.routes' | var) → NO auth (app.use without authenticate)
const safeMountRe = /safeMount\s*\(\s*app\s*,[^]{0,160}?['"]\.\/([\w-]+)\.routes['"]/g;
while ((m = safeMountRe.exec(registrySrc))) mark(false, `${m[1]}.routes.js`);
const safeMountVarRe = /safeMount\s*\(\s*app\s*,\s*[^,]+,\s*(\w+)\s*\)/g;
while ((m = safeMountVarRe.exec(registrySrc))) {
  if (varToFile[m[1]]) mark(false, varToFile[m[1]]);
}

// (D) app.use('/api/..', [authenticate,] require('../routes/X')) → authed iff `authenticate` present before the require
const appUseRe =
  /app\.use\(\s*(\[[^\]]*\]|['"][^'"]*['"])\s*,([^]{0,120}?)(?:safeRequire|require)\(\s*['"]\.\.\/routes\/([\w-]+)/g;
while ((m = appUseRe.exec(registrySrc))) {
  mark(/\bauthenticate\b/.test(m[2]), `${m[3]}.routes.js`);
}

// ── 2. In-file auth signal per route file ────────────────────────────
const AUTH_TOKENS = /\b(authenticate|authenticateToken|requireAuth|requireRole|requireMfaTier)\b/;
const ROUTE_DEF = /\brouter\.(get|post|put|patch|delete)\s*\(/;
const PUBLIC_HINT = /public|webhook|health|status|nps|nafath|callback/i;
// Verified intentionally-public (no-auth by design, self-guarded). Excluded
// from high-confidence so the audit stays actionable.
//   setup.routes.js — first-run bootstrap; /init-admin self-guards with 403
//   once an admin exists (you cannot authenticate before the first admin).
const KNOWN_PUBLIC = new Set(['setup.routes.js']);

const findings = [];
for (const file of walkJs(path.join(BACKEND, 'routes'))) {
  if (path.basename(file).startsWith('_')) continue;
  const base = path.basename(file);
  const src = readSafe(file);
  if (!ROUTE_DEF.test(src)) continue; // no HTTP routes defined
  if (KNOWN_PUBLIC.has(base)) continue; // verified intentionally public
  const inFileAuth = AUTH_TOKENS.test(src);
  if (inFileAuth) continue; // authed in-file → fine

  // No in-file auth. Authed at mount? → fine. Otherwise flag.
  if (authedAtMount.has(base)) continue;
  const mounted = noAuthAtMount.has(base);
  findings.push({
    file: path.relative(BACKEND, file).split(path.sep).join('/'),
    mount: mounted ? 'no-auth mount (dualMount/safeMount/app.use)' : 'unknown mount',
    likelyPublic: PUBLIC_HINT.test(base),
  });
}

// positively-identified no-auth mount + no in-file auth = highest confidence
const confirmed = findings.filter(f => f.mount.startsWith('no-auth') && !f.likelyPublic);
const review = findings.filter(f => !f.mount.startsWith('no-auth') || f.likelyPublic);

if (JSON_OUT) {
  console.log(JSON.stringify({ confirmedCount: confirmed.length, confirmed, review }, null, 2));
  process.exit(0);
}

console.log('');
console.log('Unauthenticated-route audit (mounted via dualMount + no in-file auth)');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`Mount map: ${authedAtMount.size} authed-at-mount, ${noAuthAtMount.size} no-auth-at-mount.`);
console.log('');
if (confirmed.length === 0) {
  console.log('✅ No high-confidence unauthenticated route files.');
} else {
  console.log(`HIGH CONFIDENCE — anonymous-reachable (${confirmed.length}) — add auth at mount or in-file:`);
  confirmed.forEach(f => console.log(`  ${f.file}   [${f.mount}]`));
}
if (review.length) {
  console.log('');
  console.log(`REVIEW (${review.length}) — no in-file auth, mount not modeled or looks intentionally public:`);
  review.forEach(f => console.log(`  ${f.file}   [${f.mount}${f.likelyPublic ? ', public-ish name' : ''}]`));
}
console.log('');
console.log('Heuristic — a file may be authed by a bespoke app.use this scan does not model. Verify each.');
console.log('');
process.exit(0);
