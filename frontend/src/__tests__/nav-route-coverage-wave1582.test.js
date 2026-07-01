/**
 * W1582 — legacy-frontend nav→route coverage guard.
 *
 * WHY: the "لوحة التحكم" tile in the Quality page pointed at `/quality/dashboard`
 * for which no <Route> was ever mounted → clicking it hit the `path="*"` 404
 * (the exact class the owner reported alongside the W1572 login outage). Every
 * navigation target must resolve to a mounted route, or CI fails here instead
 * of a user hitting a dead link. Mirrors web-admin's `check-nav-coverage.mjs`.
 *
 * Static: reads source as text (no React render, no router boot).
 *
 * Coverage model:
 *   - Collect every mounted `<Route path="…">` across routes/ + AuthenticatedShell
 *     + App.js, normalized (leading/trailing slash stripped).
 *   - A nav path is COVERED when it equals a static route, matches a `:param`
 *     route pattern, or falls under a `…/*` wildcard prefix.
 *   - The bare single-`:param` root route (e.g. `:beneficiaryId`) is DELIBERATELY
 *     excluded from coverage — it would otherwise absorb every single-segment
 *     path and hide a genuine broken single-segment link. Single-segment nav
 *     must resolve to a real static route.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..'); // frontend/src

// ── Nav sources (curated, like web-admin's explicit SIDEBARS list) ───────────
const NAV_FILES = [
  'components/Layout/sidebar/sidebarNavConfig.jsx',
  'components/dashboard/QuickActions.jsx',
  'pages/common/Home.js',
  'pages/Quality/QualityPage.jsx',
].map((p) => path.join(SRC, p));

// Nav `path:` targets that legitimately live OUTSIDE the AuthenticatedShell
// route tree (auth routes mounted in App.js, external, or hash anchors). Empty
// today — every curated nav target resolves inside the shell. Keep honest: an
// allowlisted path must still be referenced by a nav source (test below).
const ALLOWLIST = new Set([]);

function readRec(dir, keep) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...readRec(p, keep));
    else if (keep(p)) out.push(p);
  }
  return out;
}

// ── 1. Mounted routes ────────────────────────────────────────────────────────
const routeSourceFiles = [
  ...readRec(path.join(SRC, 'routes'), (f) => f.endsWith('.jsx') || f.endsWith('.js')),
  path.join(SRC, 'AuthenticatedShell.js'),
  path.join(SRC, 'App.js'),
].filter((f) => fs.existsSync(f));

const ROUTE_RE = /<Route\s+[^>]*?\bpath=["'`]([^"'`]+)["'`]/g;
const staticRoutes = new Set();
const paramMatchers = [];
const wildcardPrefixes = [];

function norm(p) {
  return p.replace(/^\/+/, '').replace(/\/+$/, '');
}
function toRegex(p) {
  const rx = p
    .split('/')
    .map((seg) =>
      seg.startsWith(':') ? '[^/]+' : seg === '*' ? '.*' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )
    .join('/');
  return new RegExp('^' + rx + '$');
}

for (const f of routeSourceFiles) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  ROUTE_RE.lastIndex = 0;
  while ((m = ROUTE_RE.exec(src)) !== null) {
    const raw = norm(m[1]);
    if (!raw) continue;
    if (raw === '*') {
      // The bare `path="*"` IS the 404/NotFound fallback — it matches every URL
      // but renders "not found". It must NOT count as coverage (else it hides
      // every dead link). Skip it.
      continue;
    } else if (raw.endsWith('/*')) {
      // Prefix wildcard (e.g. `platform/*`, `mobile/*`) — real coverage for
      // anything under that prefix.
      wildcardPrefixes.push(raw.replace(/\/?\*$/, ''));
    } else if (raw.split('/')[0].startsWith(':')) {
      // A route whose FIRST segment is a `:param` (e.g. `:beneficiaryId` or
      // `:beneficiaryId/:section`) is a context catch-all — it would absorb any
      // literal nav path of the same segment-count and hide a genuine dead link
      // (this is exactly what let `/quality/dashboard` slip through). Deliberately
      // NOT counted as coverage: a literal nav target must resolve to a route
      // with a matching static first segment.
      continue;
    } else if (raw.includes(':')) {
      // param route with a static first segment (e.g. `beneficiary/:id`,
      // `quality/:tab`) — legitimately covers its literal-prefixed paths.
      paramMatchers.push(toRegex(raw));
      staticRoutes.add(raw);
    } else {
      staticRoutes.add(raw);
    }
  }
}

function isCovered(navPath) {
  if (ALLOWLIST.has(navPath)) return true;
  const p = norm(navPath.split('?')[0].split('#')[0]);
  if (!p) return true; // root
  if (staticRoutes.has(p)) return true;
  for (const rx of paramMatchers) if (rx.test(p)) return true;
  for (const wp of wildcardPrefixes) if (wp && (p === wp || p.startsWith(wp + '/'))) return true;
  return false;
}

// ── 2. Nav targets ───────────────────────────────────────────────────────────
const NAV_RE = /\bpath:\s*["'`](\/[^"'`]+)["'`]/g;
const navTargets = []; // {navPath, source}
for (const f of NAV_FILES) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  let m;
  NAV_RE.lastIndex = 0;
  while ((m = NAV_RE.exec(src)) !== null) {
    navTargets.push({ navPath: m[1], source: path.relative(SRC, f) });
  }
}

describe('legacy-frontend nav → route coverage (W1582)', () => {
  test('sanity: found nav targets and mounted routes', () => {
    expect(navTargets.length).toBeGreaterThan(10);
    expect(staticRoutes.size).toBeGreaterThan(50);
  });

  test('every curated nav target resolves to a mounted route (no dead 404 links)', () => {
    const broken = navTargets
      .filter((t) => !isCovered(t.navPath))
      .map((t) => `${t.navPath}  (${t.source})`);
    // If this fails: the listed nav link points at a path with no <Route>.
    // Fix the link (or mount the route). Do NOT add it to ALLOWLIST unless it
    // genuinely resolves outside the AuthenticatedShell tree.
    expect([...new Set(broken)]).toEqual([]);
  });

  test('ALLOWLIST stays honest — every entry is still referenced by a nav source', () => {
    const referenced = new Set(navTargets.map((t) => t.navPath));
    const stale = [...ALLOWLIST].filter((p) => !referenced.has(p));
    expect(stale).toEqual([]);
  });
});
