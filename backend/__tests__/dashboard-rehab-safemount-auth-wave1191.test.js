/**
 * W1191 — static drift guard: every `safeMount`-ed route is authenticated.
 *
 * ROOT CAUSE (the class W1190 was the first instance of): the registries expose
 * THREE mount helpers — `dualMountAuth` (injects `authenticate`), `dualMount`
 * (none), and `safeMount` (none — and there is NO `safeMountAuth`). `safeMount`
 * is a bare `app.use(path, handler)`, so a route mounted that way is authenticated
 * ONLY if the route file applies its own auth gate. Several dashboard/rehab routes
 * documented "auth is the mount-site's job" yet were `safeMount`-ed → reachable
 * ANONYMOUSLY on their `/api/<slug>` aliases (their app.js mounts DO inject
 * `authenticate`, which is why this hid, and why the canonical
 * `audit-unauthenticated-routes.js` reported confirmedCount:0 — it can't resolve
 * safeMount / app.js / bootstrap mounts).
 *
 * This guard scans EVERY registry for `safeMount(app, …, '<module>')` and asserts
 * the resolved route file is auth-bearing — a router-level OR per-route auth
 * identifier, OR it delegates to self-authenticating sub-routers — unless the slug
 * is in PUBLIC_ALLOWLIST (login flows / health probes / signed webhooks / stateless
 * utilities / deliberately-optional-auth reads). New unauth safeMounts AND stale
 * allowlist entries both fail (ratchet-down, W325c/W340 lineage).
 *
 * Pairs with the behavioral counterpart (bare-mount → 401) for the 3 W1191 fixes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BK = path.join(__dirname, '..');
const REGDIR = path.join(BK, 'routes', 'registries');
const REG_FILES = [
  path.join(BK, 'routes', '_registry.js'),
  ...fs.readdirSync(REGDIR).filter(f => f.endsWith('.js')).map(f => path.join(REGDIR, f)),
];

const SAFEMOUNT_RE = /safeMount\s*\(\s*app\s*,\s*([\s\S]*?),\s*['"]([^'"]+)['"]\s*\)/g;

// Any recognized auth/identity middleware, applied at router-level (`router.use(X)`)
// OR per-route (`'path', X,`). Includes the portal-specific + branch/role guards
// seen across the codebase's diverse auth styles.
const AUTH_NAMES =
  'authenticate|authenticateToken|authMiddleware|authGuard|auth|protect|requireAuth|verifyToken|' +
  'parentAuth|studentAuth|guardianAuth|portalAuth|requireRole|requireMfa|loadMfaActor|' +
  'requireBranchAccess|bodyScopedBeneficiaryGuard|requireAuthOrApiKey|apiKeyAuth';
const APPLIES_AUTH = new RegExp(`router\\.use\\(\\s*(?:${AUTH_NAMES})\\b|\\b(?:${AUTH_NAMES})\\s*,`);
// `router.use('/', require('./x.routes'))` — an orchestrator delegating to
// sub-routers that each self-authenticate (e.g. workflowEnhanced → 10 subs).
const DELEGATES = /router\.use\(\s*['"]\/?['"]\s*,\s*require\(/;

// Public BY DESIGN — login/visitor flows, health probes, signed webhooks,
// stateless utilities, deliberately-optional-auth reads, and pure delegators.
// Each MUST stay public; if its mount disappears the entry goes stale → fails.
const PUBLIC_ALLOWLIST = new Set([
  'health.routes',
  'build-info.routes',
  'otp-auth.routes',
  'dateConverterRoutes',
  'integrations-metrics.routes',
  'integrations-health.routes',
  'blockchain-public.routes',
  'reports-webhooks.routes',
  'nphies-webhook.routes',
  'public-forms.routes',
  'public-uploads.routes',
  'visitor-auth.routes',
  'openapi-integration.routes',
  'push.routes', // device-token register; auth optional by design
  'dashboard.stats', // GET-only aggregate stats, optionalAuth by design
  'workflowEnhanced.routes', // pure delegator → 10 self-authenticating sub-routers
]);

function resolveModule(regFile, mod) {
  return [
    path.resolve(path.join(BK, 'routes'), mod),
    path.resolve(path.dirname(regFile), mod),
  ]
    .map(p => (p.endsWith('.js') ? p : p + '.js'))
    .find(p => fs.existsSync(p)) || null;
}

const slugOf = mod => mod.replace(/^.*\//, '');

// Collect every safeMount target across all registries.
const targets = [];
for (const rf of REG_FILES) {
  const src = fs.readFileSync(rf, 'utf8');
  let m;
  while ((m = SAFEMOUNT_RE.exec(src))) {
    const mod = m[2];
    if (!mod.startsWith('../routes/') && !mod.startsWith('./')) continue;
    targets.push({ registry: path.basename(rf), mod, slug: slugOf(mod), file: resolveModule(rf, mod) });
  }
}

describe('W1191 every safeMount-ed route is authenticated (or explicitly public)', () => {
  test('the scan found a meaningful number of safeMount targets (sanity)', () => {
    expect(targets.length).toBeGreaterThan(100);
  });

  test('no NON-public safeMount target lacks an auth gate', () => {
    const holes = targets
      .filter(t => t.file && !PUBLIC_ALLOWLIST.has(t.slug))
      .filter(t => {
        const src = fs.readFileSync(t.file, 'utf8');
        return !(APPLIES_AUTH.test(src) || DELEGATES.test(src));
      })
      .map(t => `${t.mod}  [${t.registry}]`);
    expect([...new Set(holes)]).toEqual([]);
  });

  test('PUBLIC_ALLOWLIST has no stale entry (every entry is still safeMount-ed)', () => {
    const mountedSlugs = new Set(targets.map(t => t.slug));
    const stale = [...PUBLIC_ALLOWLIST].filter(s => !mountedSlugs.has(s));
    expect(stale).toEqual([]);
  });
});

describe('W1191 the three fixed routes self-authenticate at the router level', () => {
  for (const slug of [
    'rehab-goal-suggestions.routes',
    'dashboard-alerts.routes',
    'dashboards-platform.routes',
  ]) {
    test(`${slug} applies router.use(authenticate)`, () => {
      const src = fs.readFileSync(path.join(BK, 'routes', `${slug}.js`), 'utf8');
      expect(src).toMatch(/require\(\s*['"]\.\.\/middleware\/auth['"]\s*\)/);
      expect(src).toMatch(/router\.use\(\s*authenticate\s*\)/);
    });
  }
});
