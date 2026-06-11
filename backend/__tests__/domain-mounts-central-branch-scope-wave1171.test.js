'use strict';

/**
 * W1171 — central branch-scope activation on ALL domain mounts + repo-wide
 * unpinned-branchId drift guard for domains/ routers.
 *
 * W1168 fixed authentication on the domain mounts and wired
 * requireBranchAccess into SIX domain routers — but the Wave-E re-sweep
 * found that 13 OTHER domain routers (assessments, behavior, care-plans,
 * core, dashboards, episodes, field-training, goals, group-therapy,
 * programs, sessions, tele-rehab, timeline) carry W1138-W1160 guard wiring
 * (router.param hooks + bodyScopedBeneficiaryGuard + effectiveBranchScope
 * pins) that was STILL DORMANT: every assertBranchMatch helper silently
 * no-ops without req.branchScope, and none of those 13 ever called
 * requireBranchAccess.
 *
 * W1171 fixes, locked here:
 *   1. BaseDomainModule.mount chains requireBranchAccess after authenticate
 *      on all three mount paths — req.branchScope now exists on EVERY
 *      domain route, activating every per-router guard at once, and
 *      foreign ?branchId=/body.branchId requests are rejected 403
 *      fail-closed for branch-restricted callers (idempotent for the 6+
 *      routers that also self-wire it).
 *   2. 8 spoofable `branchId: req.user?.branchId || req.body.branchId`
 *      create-path reads pinned with effectiveBranchScope(req) across 5
 *      routers (behavior 2, field-training 1, group-therapy 2, programs 2,
 *      tele-rehab 1).
 *   3. Repo-wide ratchet: NO line in ANY domains/ router may read
 *      req.query/body.branchId without an effectiveBranchScope pin on the
 *      same line (assignment-into-query lines and scoped-guard lines are
 *      recognized as safe).
 *
 * Static + behavioral, sibling of the wave1168 guard.
 */

const fs = require('fs');
const path = require('path');

const BASE_MODULE = path.resolve(__dirname, '../domains/_base/BaseDomainModule.js');
const DOMAINS_DIR = path.resolve(__dirname, '../domains');

function collectRouteFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectRouteFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.routes.js')) out.push(full);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Central requireBranchAccess on every domain mount (static)
// ─────────────────────────────────────────────────────────────────────────────
describe('W1171 — BaseDomainModule mounts populate branchScope (static)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(BASE_MODULE, 'utf8');
  });

  test('mount() requires requireBranchAccess from branchScope.middleware', () => {
    expect(src).toMatch(
      /const\s*\{\s*requireBranchAccess\s*\}\s*=\s*require\(['"]\.\.\/\.\.\/middleware\/branchScope\.middleware['"]\)/
    );
  });

  test('all three mounts chain authenticate → requireBranchAccess → router', () => {
    expect(src).toMatch(
      /app\.use\(`\/api\/\$\{basePath\}`,\s*authenticate,\s*requireBranchAccess,\s*this\.router\)/
    );
    expect(src).toMatch(
      /app\.use\(`\/api\/v1\/\$\{basePath\}`,\s*authenticate,\s*requireBranchAccess,\s*this\.router\)/
    );
    expect(src).toMatch(
      /app\.use\(`\/api\/v2\/\$\{basePath\}`,\s*authenticate,\s*requireBranchAccess,\s*this\.router\)/
    );
  });

  test('NO mount without the full guard chain remains', () => {
    expect(src).not.toMatch(/app\.use\(`[^`]*`,\s*this\.router\)/);
    expect(src).not.toMatch(/app\.use\(`[^`]*`,\s*authenticate,\s*this\.router\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Central activation (behavioral) — branchScope reaches a domain route
// ─────────────────────────────────────────────────────────────────────────────
describe('W1171 — central branchScope activation behavioral', () => {
  test('mount() chain order is authenticate then requireBranchAccess then router', () => {
    const { BaseDomainModule } = require('../domains/_base/BaseDomainModule');
    const { authenticate } = require('../middleware/auth');
    const { requireBranchAccess } = require('../middleware/branchScope.middleware');

    const mod = new BaseDomainModule({ name: 'w1171-probe' });
    mod.initialize();

    const useCalls = [];
    mod.mount({ use: (...args) => useCalls.push(args) });

    expect(useCalls).toHaveLength(3);
    for (const call of useCalls) {
      expect(call).toHaveLength(4);
      expect(call[1]).toBe(authenticate);
      expect(call[2]).toBe(requireBranchAccess);
      expect(call[3]).toBe(mod.router);
    }
  });

  test('requireBranchAccess rejects a foreign body.branchId fail-closed (403)', async () => {
    const { requireBranchAccess } = require('../middleware/branchScope.middleware');
    const req = {
      user: { id: 'u1', role: 'therapist', branchId: 'branch-A' },
      query: {},
      body: { branchId: 'branch-B' },
      params: {},
    };
    let statusCode = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };
    const next = jest.fn();
    await requireBranchAccess(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(statusCode).toBe(403);
  });

  test('the formerly-dormant per-router guards now receive req.branchScope', async () => {
    const { requireBranchAccess } = require('../middleware/branchScope.middleware');
    const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
    const req = {
      user: { id: 'u2', role: 'therapist', branchId: 'branch-A' },
      query: {},
      body: {},
      params: {},
    };
    const res = { status: () => res, json: () => res };
    const next = jest.fn();
    await requireBranchAccess(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.branchScope).toEqual(
      expect.objectContaining({ restricted: true, branchId: 'branch-A' })
    );
    expect(String(effectiveBranchScope(req))).toBe('branch-A');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. W1171 pins — the 8 create-path reads (static, per-file ratchet)
// ─────────────────────────────────────────────────────────────────────────────
const PINNED_FILES = [
  { label: 'behavior', rel: 'behavior/routes/behavior.routes.js', w1170Pins: 2 },
  { label: 'field-training', rel: 'field-training/routes/field-training.routes.js', w1170Pins: 1 },
  { label: 'group-therapy', rel: 'group-therapy/routes/group-therapy.routes.js', w1170Pins: 2 },
  { label: 'programs', rel: 'programs/routes/programs.routes.js', w1170Pins: 2 },
  { label: 'tele-rehab', rel: 'tele-rehab/routes/tele-rehab.routes.js', w1170Pins: 1 },
];

describe.each(PINNED_FILES)('W1171 — $label create-path pins', ({ rel, w1170Pins }) => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(path.join(DOMAINS_DIR, rel), 'utf8');
  });

  test('no bare `branchId: req.user?.branchId || req.body.branchId` remains', () => {
    expect(src).not.toMatch(/branchId:\s*req\.user\?\.branchId\s*\|\|\s*req\.body\.branchId/);
  });

  test(`exactly ${w1170Pins} W1171 pin(s) present (ratchet)`, () => {
    const pins =
      src.match(
        /branchId:\s*effectiveBranchScope\(req\)\s*\|\|\s*req\.user\?\.branchId\s*\|\|\s*req\.body\.branchId/g
      ) || [];
    expect(pins.length).toBe(w1170Pins);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Repo-wide ratchet — no unpinned branchId read in ANY domains/ router
// ─────────────────────────────────────────────────────────────────────────────
describe('W1171 — repo-wide unpinned branchId ratchet (domains/ routers)', () => {
  test('every req.query/body.branchId read in domains/**/*.routes.js is pinned', () => {
    const offenders = [];
    for (const file of collectRouteFiles(DOMAINS_DIR)) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!/req\.(query|body)\.branchId/.test(line)) return;
        if (/^\s*(\/\/|\*)/.test(line)) return; // comments
        // Safe shapes:
        //  - pinned read: effectiveBranchScope(req) on the same line
        //  - scope assignment INTO the query (beneficiary.routes pin-write)
        //  - req.branchScope-guarded line
        //  - scoped-first fallback: `!branchId && req.query.branchId` where
        //    branchId came from effectiveBranchScope above (golden-thread /
        //    supervisor-ops pattern — restricted callers can never reach the
        //    fallback because scoped is non-null for them), plus the local
        //    assignment line inside that guard.
        if (/effectiveBranchScope/.test(line)) return;
        if (/req\.query\.branchId\s*=/.test(line)) return;
        if (/req\.branchScope/.test(line)) return;
        if (/!branchId\s*&&\s*req\.query\.branchId/.test(line)) return;
        if (/^\s*branchId\s*=\s*req\.query\.branchId;\s*$/.test(line)) return;
        offenders.push(
          `${path.relative(DOMAINS_DIR, file).replace(/\\/g, '/')}:${i + 1}: ${line.trim()}`
        );
      });
    }
    // Ratchet — baseline is EMPTY as of W1171. Any new raw read must be
    // pinned with effectiveBranchScope(req) in the same PR.
    expect(offenders).toEqual([]);
  });

  test('every domains/ router that wires W1140 param guards is now ACTIVE (central requireBranchAccess)', () => {
    // The central mount chain makes this true by construction; this assertion
    // documents the contract so removing requireBranchAccess from mount()
    // without per-router replacements fails CI twice (here + suite 1).
    const baseSrc = fs.readFileSync(BASE_MODULE, 'utf8');
    expect(baseSrc).toMatch(/requireBranchAccess,\s*this\.router/);
  });
});
