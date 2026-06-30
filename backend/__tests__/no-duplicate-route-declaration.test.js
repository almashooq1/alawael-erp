/**
 * Drift guard: no two handlers may declare the SAME (method, path) on the same
 * router var within one route file. Express uses the FIRST match, so a later
 * duplicate is a DEAD, shadowed handler — and if it diverges (different response
 * shape / filtering / auth), the intended behavior silently never runs.
 *
 * This complements the W531 route-shadowing gate (literal-vs-`:param`); that gate
 * does NOT catch exact (method,path) duplicates. Found 2 at creation:
 *   - parent-portal-v1  GET /beneficiaries/:id/appointments  (dead handler returned
 *     a `{count,appointments}` envelope incompatible with web-portal's expected
 *     `PortalAppointment[]` array → would have broken the portal if promoted).
 *   - moi-passport      GET /health  (dead handler was the real passportService
 *     health-check; the live one is a static stub).
 * Both dead handlers were removed; baseline is now EMPTY (ratchet-down).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES = path.join(__dirname, '..', 'routes');

function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

function walk(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// (method, path) declarations declared 2+ times on the same router var in one file.
function duplicatesIn(src) {
  const clean = stripComments(src);
  const re = /\b([a-zA-Z_$][\w$]*)\s*\.\s*(get|post|put|patch|delete|all)\s*\(\s*(['"`])([^'"`]+)\3/g;
  const seen = new Map();
  let x;
  while ((x = re.exec(clean))) {
    const routerVar = x[1];
    if (!/^(router|app|r)$/i.test(routerVar) && !/rout/i.test(routerVar)) continue;
    const key = `${routerVar} ${x[2].toUpperCase()} ${x[4]}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n >= 2).map(([k]) => k);
}

describe('no duplicate (method, path) route declarations (shadowed dead handlers)', () => {
  const files = walk(ROUTES);

  test('every route file declares each (method, path) at most once', () => {
    const offenders = [];
    for (const f of files) {
      const dups = duplicatesIn(fs.readFileSync(f, 'utf8'));
      if (dups.length) {
        offenders.push(`${path.relative(ROUTES, f).replace(/\\/g, '/')}: ${dups.join(' | ')}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the two fixed files now declare their formerly-duplicated route exactly once', () => {
    const pp = fs.readFileSync(path.join(ROUTES, 'parent-portal-v1.routes.js'), 'utf8');
    const moi = fs.readFileSync(path.join(ROUTES, 'moi-passport.routes.js'), 'utf8');
    const count = (s, re) => (s.match(re) || []).length;
    expect(count(pp, /router\.get\(\s*'\/beneficiaries\/:id\/appointments'/g)).toBe(1);
    expect(count(moi, /router\.get\(\s*'\/health'/g)).toBe(1);
    // and the surviving parent-portal handler is the array-shaped one web-portal consumes
    expect(pp).toMatch(/programNameAr|canReschedule/);
  });
});
