'use strict';

/**
 * W1168 — domain mounts authentication + branch-scope activation drift guard.
 *
 * CRITICAL finding behind this wave: `BaseDomainModule.mount(app)` was the
 * ONLY API mount surface in the codebase with NO `authenticate` — legacy
 * registry routers (dualMountAuth) shadow /api/<name> and /api/v1/<name> via
 * Express first-match, but /api/v2/<name> was served SOLELY by the bare
 * domain mount: every domain route (beneficiary, family, quality, research
 * data) was anonymous-reachable, and there is no global JWT middleware
 * (startup/middleware.js only applies apiKeyAuth, which is pass-through
 * without an X-API-KEY header).
 *
 * Compounding it, the W1140 beneficiary guards in six domain routers
 * (ai-recommendations / ar-vr / family / goals-measures / quality / research)
 * were DORMANT: every assertBranchMatch helper silently no-ops when
 * `req.branchScope` is missing, and none of the six routers ever called
 * requireBranchAccess to populate it. The same six files carried 19 raw
 * `req.query.branchId || req.user?.branchId`-style reads (branch spoofing).
 *
 * W1168 fixes, locked here:
 *   1. BaseDomainModule.mount applies `authenticate` on ALL THREE mounts.
 *   2. Each of the 6 routers wires requireBranchAccess BEFORE the W1140
 *      param/body guards (activation order matters: branchScope must exist
 *      when branchScopedBeneficiaryParam / bodyScopedBeneficiaryGuard fire).
 *   3. All 19 branchId reads are pinned `effectiveBranchScope(req) || ...`.
 *
 * Static + behavioral, mirrors the W1160/W1166 guard structure.
 */

const fs = require('fs');
const path = require('path');

const BASE_MODULE = path.resolve(__dirname, '../domains/_base/BaseDomainModule.js');

const GUARDED_ROUTERS = [
  {
    label: 'ai-recommendations',
    file: path.resolve(__dirname, '../domains/ai-recommendations/routes/recommendations.routes.js'),
    pins: 3,
  },
  {
    label: 'ar-vr',
    file: path.resolve(__dirname, '../domains/ar-vr/routes/ar-vr.routes.js'),
    pins: 3,
  },
  {
    label: 'family',
    file: path.resolve(__dirname, '../domains/family/routes/family.routes.js'),
    pins: 5,
  },
  {
    label: 'goals/measures',
    file: path.resolve(__dirname, '../domains/goals/routes/measures.routes.js'),
    pins: 3,
  },
  {
    label: 'quality',
    file: path.resolve(__dirname, '../domains/quality/routes/quality.routes.js'),
    pins: 3,
  },
  {
    label: 'research',
    file: path.resolve(__dirname, '../domains/research/routes/research.routes.js'),
    pins: 2,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. BaseDomainModule — authenticate on every mount (static)
// ─────────────────────────────────────────────────────────────────────────────
describe('W1168 — BaseDomainModule mounts are authenticated (static)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(BASE_MODULE, 'utf8');
  });

  test('mount() lazily requires authenticate from middleware/auth', () => {
    expect(src).toMatch(
      /const\s*\{\s*authenticate\s*\}\s*=\s*require\(['"]\.\.\/\.\.\/middleware\/auth['"]\)/
    );
  });

  test('all three mounts (/api, /api/v1, /api/v2) include authenticate', () => {
    expect(src).toMatch(/app\.use\(`\/api\/\$\{basePath\}`,\s*authenticate,\s*this\.router\)/);
    expect(src).toMatch(/app\.use\(`\/api\/v1\/\$\{basePath\}`,\s*authenticate,\s*this\.router\)/);
    expect(src).toMatch(/app\.use\(`\/api\/v2\/\$\{basePath\}`,\s*authenticate,\s*this\.router\)/);
  });

  test('NO bare (unauthenticated) domain mount remains', () => {
    expect(src).not.toMatch(/app\.use\(`[^`]*`,\s*this\.router\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. BaseDomainModule — authenticate on every mount (behavioral)
// ─────────────────────────────────────────────────────────────────────────────
describe('W1168 — BaseDomainModule.mount behavioral', () => {
  test('mount(app) passes the real authenticate middleware to every app.use', () => {
    const { BaseDomainModule } = require('../domains/_base/BaseDomainModule');
    const { authenticate } = require('../middleware/auth');

    const mod = new BaseDomainModule({ name: 'w1168-probe' });
    // initialize() is async-flagged but body is sync (registerRoutes path).
    mod.initialize();
    expect(mod._initialized).toBe(true);

    const useCalls = [];
    const fakeApp = {
      use: (...args) => useCalls.push(args),
    };
    mod.mount(fakeApp);

    expect(useCalls).toHaveLength(3);
    const paths = useCalls.map(c => c[0]).sort();
    expect(paths).toEqual(['/api/v1/w1168-probe', '/api/v2/w1168-probe', '/api/w1168-probe']);
    for (const call of useCalls) {
      expect(call).toHaveLength(3); // path + authenticate + router
      expect(call[1]).toBe(authenticate);
      expect(call[2]).toBe(mod.router);
    }
  });

  test('authenticate rejects an anonymous request with 401 (fail-closed)', async () => {
    const { authenticate } = require('../middleware/auth');
    const req = { headers: {}, user: undefined };
    let statusCode = null;
    let body = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      },
    };
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(statusCode).toBe(401);
    expect(body && body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Six domain routers — requireBranchAccess activation + pin-first (static)
// ─────────────────────────────────────────────────────────────────────────────
describe.each(GUARDED_ROUTERS)('W1168 — $label router branch-scope wiring', ({ file, pins }) => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(file, 'utf8');
  });

  test('imports requireBranchAccess from branchScope.middleware and applies it', () => {
    expect(src).toMatch(
      /const\s*\{\s*requireBranchAccess\s*\}\s*=\s*require\(['"]\.\.\/\.\.\/\.\.\/middleware\/branchScope\.middleware['"]\)/
    );
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });

  test('requireBranchAccess runs BEFORE the W1140 param/body guards (activation order)', () => {
    const accessIdx = src.indexOf('router.use(requireBranchAccess)');
    const paramIdx = src.indexOf("router.param('beneficiaryId'");
    const bodyGuardIdx = src.indexOf('router.use(bodyScopedBeneficiaryGuard)');
    expect(accessIdx).toBeGreaterThan(-1);
    expect(paramIdx).toBeGreaterThan(-1);
    expect(bodyGuardIdx).toBeGreaterThan(-1);
    expect(accessIdx).toBeLessThan(paramIdx);
    expect(accessIdx).toBeLessThan(bodyGuardIdx);
  });

  test('imports effectiveBranchScope alongside the W1140 guards', () => {
    expect(src).toMatch(/effectiveBranchScope,/);
    expect(src).toMatch(/branchScopedBeneficiaryParam/);
    expect(src).toMatch(/bodyScopedBeneficiaryGuard/);
  });

  test('every req.query/body.branchId read is pinned with effectiveBranchScope', () => {
    const offenders = src
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(
        ({ line }) =>
          /req\.(query|body)\.branchId/.test(line) &&
          !/effectiveBranchScope\(req\)\s*\|\|/.test(line)
      );
    expect(offenders).toEqual([]);
  });

  test(`pin count locked at ${pins} (ratchet — update deliberately on route changes)`, () => {
    const matches = src.match(/effectiveBranchScope\(req\)\s*\|\|/g) || [];
    expect(matches.length).toBe(pins);
  });

  test('no phantom req.branchId read (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. requireBranchAccess semantics the routers now rely on (behavioral)
// ─────────────────────────────────────────────────────────────────────────────
describe('W1168 — requireBranchAccess behavioral contract', () => {
  const { requireBranchAccess } = require('../middleware/branchScope.middleware');
  const { effectiveBranchScope } = require('../middleware/assertBranchMatch');

  function mockRes() {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
  }

  test('no req.user → 401 (fail-closed even if authenticate were bypassed)', async () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();
    await requireBranchAccess(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  test('restricted user → branchScope.restricted=true and effectiveBranchScope pins to own branch', async () => {
    const req = {
      user: { id: 'u1', role: 'therapist', branchId: 'branch-A' },
      query: {},
      body: {},
      params: {},
    };
    const res = mockRes();
    const next = jest.fn();
    await requireBranchAccess(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.branchScope).toBeDefined();
    expect(req.branchScope.restricted).toBe(true);
    // The spoof vector W1168 closes: query asks for branch-B, pin returns branch-A.
    req.query = { branchId: 'branch-B' };
    expect(String(effectiveBranchScope(req))).toBe('branch-A');
  });

  test('cross-branch role → unrestricted scope, effectiveBranchScope yields null (fallback allowed)', async () => {
    const req = { user: { id: 'u2', role: 'admin' }, query: {}, body: {}, params: {} };
    const res = mockRes();
    const next = jest.fn();
    await requireBranchAccess(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.branchScope.restricted).toBe(false);
    expect(effectiveBranchScope(req)).toBeNull();
  });
});
