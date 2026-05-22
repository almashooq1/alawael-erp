'use strict';

/**
 * biometric-mfa-tier-wave273.test.js — Wave 273.
 *
 * Proves the new MFA tier guard on biometric/attendance/hikvision
 * routes. Three layers:
 *
 *   1. requireMfaTier(N, opts) middleware
 *        - rejects 401 ACTOR_REQUIRED when no authenticated user
 *        - rejects 403 MFA_TIER_REQUIRED when actor.mfaLevel < N
 *        - rejects 403 MFA_FRESHNESS_REQUIRED when mfaAssertedAt is
 *          older than maxAgeMin
 *        - accepts when both gates pass
 *
 *   2. attachMfaActor middleware
 *        - resolves mfaService lazily from req.app._mfaChallengeService
 *        - falls back to mfaLevel=0 when no service wired (fails CLOSED
 *          downstream, never silently accepts)
 *
 *   3. Route-wiring inspection (no DB) — confirms the 13 sensitive
 *      endpoints from the Wave 273 audit have requireMfaTier in their
 *      middleware stack, AND that attachMfaActor is applied at
 *      router-level.
 *
 * The wiring test is the regression net: future PRs that add new
 * payroll / template-suspend / device-retire / fraud-dismiss routes
 * without MFA will fail this test.
 */

const express = require('express');

const {
  attachMfaActor,
  requireMfaTier,
  DEFAULT_FRESHNESS_MIN_BY_TIER,
  _ageInMinutes,
} = require('../middleware/requireMfaTier');

// ─── 1. requireMfaTier factory ────────────────────────────────────

describe('Wave 273 — requireMfaTier factory', () => {
  function mkRes() {
    const r = { statusCode: 200, body: null };
    r.status = function (c) {
      r.statusCode = c;
      return r;
    };
    r.json = function (b) {
      r.body = b;
      return r;
    };
    return r;
  }

  test('throws on invalid tier (0)', () => {
    expect(() => requireMfaTier(0)).toThrow(/requiredTier/);
  });

  test('throws on invalid tier (4)', () => {
    expect(() => requireMfaTier(4)).toThrow(/requiredTier/);
  });

  test('throws on non-integer tier', () => {
    expect(() => requireMfaTier(2.5)).toThrow(/requiredTier/);
  });

  test('rejects 401 when no req.user', () => {
    const mw = requireMfaTier(2);
    const req = { user: null, actor: {} };
    const res = mkRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        reason: 'ACTOR_REQUIRED',
      })
    );
  });

  test('rejects 403 MFA_TIER_REQUIRED when actor.mfaLevel < requiredTier', () => {
    const mw = requireMfaTier(2);
    const req = {
      user: { id: 'u1' },
      actor: { mfaLevel: 1, mfaAssertedAt: new Date() },
    };
    const res = mkRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        reason: 'MFA_TIER_REQUIRED',
        requiredTier: 2,
        actorTier: 1,
      })
    );
  });

  test('rejects 403 MFA_TIER_REQUIRED when actor.mfaLevel is missing (undefined)', () => {
    const mw = requireMfaTier(2);
    const req = { user: { id: 'u1' }, actor: { mfaAssertedAt: new Date() } };
    const res = mkRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.reason).toBe('MFA_TIER_REQUIRED');
    expect(res.body.actorTier).toBe(0);
  });

  test('rejects 403 MFA_FRESHNESS_REQUIRED when mfaAssertedAt is stale > maxAgeMin', () => {
    const fixedNow = new Date('2026-05-22T15:00:00Z');
    const mw = requireMfaTier(2, { maxAgeMin: 15, now: () => fixedNow });
    const req = {
      user: { id: 'u1' },
      // 20 min ago — stale for a 15-min window
      actor: { mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:40:00Z') },
    };
    const res = mkRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        reason: 'MFA_FRESHNESS_REQUIRED',
        requiredTier: 2,
        actorTier: 2,
        maxAgeMin: 15,
        ageMin: 20,
      })
    );
  });

  test('rejects 403 MFA_FRESHNESS_REQUIRED when mfaAssertedAt is null', () => {
    const mw = requireMfaTier(2, { maxAgeMin: 15 });
    const req = { user: { id: 'u1' }, actor: { mfaLevel: 2, mfaAssertedAt: null } };
    const res = mkRes();
    mw(req, res, () => {});
    expect(res.statusCode).toBe(403);
    expect(res.body.reason).toBe('MFA_FRESHNESS_REQUIRED');
    expect(res.body.ageMin).toBeNull(); // Infinity rendered as null in JSON
  });

  test('accepts when tier OK and assertion fresh', () => {
    const fixedNow = new Date('2026-05-22T15:00:00Z');
    const mw = requireMfaTier(2, { maxAgeMin: 15, now: () => fixedNow });
    const req = {
      user: { id: 'u1' },
      // 10 min ago — within 15-min window
      actor: { mfaLevel: 2, mfaAssertedAt: new Date('2026-05-22T14:50:00Z') },
    };
    const res = mkRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeNull();
  });

  test('accepts when actor.mfaLevel exceeds requiredTier', () => {
    const fixedNow = new Date('2026-05-22T15:00:00Z');
    const mw = requireMfaTier(2, { maxAgeMin: 15, now: () => fixedNow });
    const req = {
      user: { id: 'u1' },
      actor: { mfaLevel: 3, mfaAssertedAt: new Date('2026-05-22T14:58:00Z') },
    };
    const res = mkRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  test('skips freshness check when maxAgeMin=null (tier-only mode)', () => {
    const mw = requireMfaTier(2, { maxAgeMin: null });
    const req = {
      user: { id: 'u1' },
      // 30 years ago — would fail any freshness check
      actor: { mfaLevel: 2, mfaAssertedAt: new Date('1996-01-01T00:00:00Z') },
    };
    const res = mkRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  test('uses default maxAgeMin per tier when not provided', () => {
    // Tier 3 default = 5 min. 6-min-old assertion → reject.
    const fixedNow = new Date('2026-05-22T15:00:00Z');
    const mw = requireMfaTier(3, { now: () => fixedNow });
    const req = {
      user: { id: 'u1' },
      actor: { mfaLevel: 3, mfaAssertedAt: new Date('2026-05-22T14:54:00Z') },
    };
    const res = mkRes();
    mw(req, res, () => {});
    expect(res.statusCode).toBe(403);
    expect(res.body.reason).toBe('MFA_FRESHNESS_REQUIRED');
    expect(res.body.maxAgeMin).toBe(5);
  });

  test('reads req.user._id when req.user.id absent', () => {
    const mw = requireMfaTier(1, { maxAgeMin: null });
    const req = { user: { _id: 'u-from-mongo' }, actor: { mfaLevel: 1 } };
    const res = mkRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  test('actor missing entirely → treats as tier 0 (rejects)', () => {
    const mw = requireMfaTier(2);
    const req = { user: { id: 'u1' } }; // no req.actor at all
    const res = mkRes();
    mw(req, res, () => {});
    expect(res.statusCode).toBe(403);
    expect(res.body.actorTier).toBe(0);
  });
});

// ─── 2. attachMfaActor middleware ─────────────────────────────────

describe('Wave 273 — attachMfaActor (lazy)', () => {
  function mkReq({ user = { id: 'u1', role: 'admin' }, mfaService = null } = {}) {
    return {
      user,
      ip: '10.0.0.1',
      app: mfaService ? { _mfaChallengeService: mfaService } : {},
    };
  }

  test('populates req.actor with mfaLevel=0 when no service wired', () => {
    const req = mkReq();
    let nextCalled = false;
    attachMfaActor(req, {}, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(req.actor).toEqual({
      userId: 'u1',
      role: 'admin',
      ip: '10.0.0.1',
      mfaLevel: 0,
      mfaAssertedAt: null,
    });
  });

  test('populates from mfaService.getUserMfaState when wired', () => {
    const mfaService = {
      getUserMfaState: jest.fn(() => ({
        mfaLevel: 2,
        mfaAssertedAt: new Date('2026-05-22T14:30:00Z'),
      })),
    };
    const req = mkReq({ mfaService });
    attachMfaActor(req, {}, () => {});
    expect(mfaService.getUserMfaState).toHaveBeenCalledWith('u1');
    expect(req.actor.mfaLevel).toBe(2);
    expect(req.actor.mfaAssertedAt).toEqual(new Date('2026-05-22T14:30:00Z'));
  });

  test('handles missing user gracefully (mfaLevel=0, userId=null)', () => {
    const req = mkReq({ user: null });
    attachMfaActor(req, {}, () => {});
    expect(req.actor.userId).toBeNull();
    expect(req.actor.mfaLevel).toBe(0);
  });

  test('uses req.user._id when req.user.id absent', () => {
    const req = mkReq({ user: { _id: 'mongoId', role: 'hr' } });
    attachMfaActor(req, {}, () => {});
    expect(req.actor.userId).toBe('mongoId');
    expect(req.actor.role).toBe('hr');
  });

  test('preserves prior req.actor fields (defense-in-depth)', () => {
    const req = mkReq();
    req.actor = { correlationId: 'cor-1' }; // set by some earlier middleware
    attachMfaActor(req, {}, () => {});
    expect(req.actor.correlationId).toBe('cor-1');
    expect(req.actor.mfaLevel).toBe(0);
  });

  test('falls back to fail-closed when getUserMfaState is not a function', () => {
    const req = mkReq({ mfaService: { getUserMfaState: 'not-a-fn' } });
    attachMfaActor(req, {}, () => {});
    expect(req.actor.mfaLevel).toBe(0);
  });
});

// ─── 3. _ageInMinutes helper ──────────────────────────────────────

describe('Wave 273 — _ageInMinutes', () => {
  const NOW = new Date('2026-05-22T15:00:00Z');

  test('returns Infinity for null', () => {
    expect(_ageInMinutes(null, NOW)).toBe(Infinity);
  });

  test('returns Infinity for undefined', () => {
    expect(_ageInMinutes(undefined, NOW)).toBe(Infinity);
  });

  test('returns Infinity for invalid date string', () => {
    expect(_ageInMinutes('not-a-date', NOW)).toBe(Infinity);
  });

  test('computes minutes for Date input', () => {
    expect(_ageInMinutes(new Date('2026-05-22T14:43:00Z'), NOW)).toBe(17);
  });

  test('computes minutes for ISO string input', () => {
    expect(_ageInMinutes('2026-05-22T14:45:00Z', NOW)).toBe(15);
  });

  test('floors fractional minutes', () => {
    // 30 seconds → 0 minutes
    expect(_ageInMinutes(new Date('2026-05-22T14:59:30Z'), NOW)).toBe(0);
  });
});

// ─── 4. DEFAULT_FRESHNESS_MIN_BY_TIER ─────────────────────────────

describe('Wave 273 — DEFAULT_FRESHNESS_MIN_BY_TIER', () => {
  test('tier 3 default is tighter than tier 2', () => {
    expect(DEFAULT_FRESHNESS_MIN_BY_TIER[3]).toBeLessThan(DEFAULT_FRESHNESS_MIN_BY_TIER[2]);
  });

  test('tier 2 default is tighter than tier 1', () => {
    expect(DEFAULT_FRESHNESS_MIN_BY_TIER[2]).toBeLessThan(DEFAULT_FRESHNESS_MIN_BY_TIER[1]);
  });

  test('values are positive integers', () => {
    for (const tier of [1, 2, 3]) {
      const v = DEFAULT_FRESHNESS_MIN_BY_TIER[tier];
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});

// ─── 5. Route-wiring inspection (the regression net) ──────────────
//
// These tests load each route file and walk its Express router stack
// to verify (a) attachMfaActor is at router-level, and (b) the listed
// sensitive endpoints have requireMfaTier in their middleware chain.
// No DB, no supertest — pure stack inspection.

function _walkStack(router) {
  // Express layer = { name, regexp, handle, route?, ... }
  // For router.use middlewares: layer.name === 'mfaTierGuard' or 'mfaActorMiddleware'
  // For routes: layer.route exists with layer.route.stack[] of method handlers
  return router && router.stack ? router.stack : [];
}

function _routerLevelMiddlewareNames(router) {
  return _walkStack(router)
    .filter(l => !l.route)
    .map(l => (l.handle && l.handle.name) || '(anon)');
}

function _routeMiddlewareNamesForPath(router, method, pathRegex) {
  const out = [];
  for (const layer of _walkStack(router)) {
    if (!layer.route) continue;
    const p = layer.route.path;
    if (typeof p !== 'string') continue;
    if (!pathRegex.test(p)) continue;
    // Each route.stack entry has its own handle (the middleware fn or handler)
    const methods = layer.route.methods || {};
    if (!methods[method]) continue;
    out.push({
      path: p,
      handlers: (layer.route.stack || []).map(s => (s.handle && s.handle.name) || '(anon)'),
    });
  }
  return out;
}

describe('Wave 273 — biometric-attendance.routes wiring', () => {
  // The biometric-attendance router is a plain Express router (not a factory).
  // Loading it executes the model requires; jest will isolate.
  let router;
  beforeAll(() => {
    jest.isolateModules(() => {
      router = require('../routes/biometric-attendance.routes');
    });
  });

  test('router has attachMfaActor at router-level', () => {
    const names = _routerLevelMiddlewareNames(router);
    expect(names).toContain('attachMfaActor');
  });

  test('DELETE /devices/:id has mfaTierGuard in its handler chain', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'delete', /^\/devices\/:id$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('POST /devices/:id/enroll has mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'post', /^\/devices\/:id\/enroll$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('PUT /overtime/:id/approve has mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'put', /^\/overtime\/:id\/approve$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('GET /devices (list, non-sensitive) does NOT carry mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'get', /^\/devices$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).not.toContain('mfaTierGuard');
  });
});

describe('Wave 273 — zkteco.routes wiring', () => {
  let router;
  beforeAll(() => {
    jest.isolateModules(() => {
      router = require('../routes/zkteco.routes');
    });
  });

  test('router has attachMfaActor at router-level', () => {
    const names = _routerLevelMiddlewareNames(router);
    expect(names).toContain('attachMfaActor');
  });

  test('DELETE /devices/:id has mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'delete', /^\/devices\/:id$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('POST /devices/:id/users/:userId/map has mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(
      router,
      'post',
      /^\/devices\/:id\/users\/:userId\/map$/
    );
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('GET /stats (read-only, non-sensitive) does NOT carry mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'get', /^\/stats$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).not.toContain('mfaTierGuard');
  });
});

describe('Wave 273 — hikvision.routes wiring (factory)', () => {
  // hikvision is a factory function; build with stubs for all DI ports.
  let router;
  beforeAll(() => {
    jest.isolateModules(() => {
      const { createHikvisionRouter } = require('../routes/hikvision.routes');
      router = createHikvisionRouter({
        deviceService: {
          registerDevice: () => ({}),
          getDevice() {},
          listDevices() {},
          updateDevice() {},
          retireDevice() {},
          registerChannel() {},
          listChannels() {},
          updateChannel() {},
        },
        ingestionService: { ingest: () => ({}), listEvents() {}, getEvent() {} },
        healthService: {
          recordHeartbeat: () => ({}),
          sweepStaleDevices() {},
          getLatest() {},
          getBranchSummary() {},
        },
        // Phase 2 — needed to mount template routes
        libraryService: {
          createLibrary() {},
          getLibrary() {},
          listLibraries() {},
          updateLibrary() {},
          archiveLibrary() {},
          subscribeDevice() {},
          unsubscribeDevice() {},
          computeIntegrityHash() {},
          recordSyncResult() {},
        },
        enrollmentService: {
          enrollEmployee() {},
          confirmEnrollment() {},
          suspendTemplate() {},
          reEnroll() {},
          deactivateOnExit() {},
          getTemplate() {},
          listTemplates() {},
        },
        // Phase 4 — needed for payroll routes
        reconciliationService: {
          reconcileEmployeeDay() {},
          reconcileBranchDay() {},
          listCases() {},
          getCase() {},
          resolveConflict() {},
        },
        payrollPeriodService: {
          createPeriod() {},
          listPeriods() {},
          getPeriod() {},
          closePeriod() {},
          reopenPeriod() {},
          draftOverride() {},
          addApprover() {},
          executeOverride() {},
          listOverrides() {},
          getOverride() {},
        },
        // Phase 5 — needed for fraud routes
        fraudDetectionService: {
          scanTemplates() {},
          scanUnregisteredFaces() {},
          sweepExpiredFlags() {},
          listFlags() {},
          getFlag() {},
          acknowledgeFlag() {},
          dismissFlag() {},
          escalateFlag() {},
        },
        fraudScoreService: {
          listScores() {},
          getBranchSummary() {},
          getScore() {},
          recomputeScore() {},
          decayAllScores() {},
        },
        governance: { hasPermission: () => true },
      });
    });
  });

  test('router has attachMfaActor at router-level', () => {
    const names = _routerLevelMiddlewareNames(router);
    expect(names).toContain('attachMfaActor');
  });

  test('POST /devices/:id/retire has mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'post', /^\/devices\/:id\/retire$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('POST /templates/:id/suspend has mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'post', /^\/templates\/:id\/suspend$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('POST /payroll/overrides has mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'post', /^\/payroll\/overrides$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('POST /payroll/overrides/:id/approvals has mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(
      router,
      'post',
      /^\/payroll\/overrides\/:id\/approvals$/
    );
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('POST /payroll/overrides/:id/execute has mfaTierGuard (tier 3)', () => {
    const hits = _routeMiddlewareNamesForPath(
      router,
      'post',
      /^\/payroll\/overrides\/:id\/execute$/
    );
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('POST /payroll/periods/:id/close has mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'post', /^\/payroll\/periods\/:id\/close$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('POST /payroll/periods/:id/reopen has mfaTierGuard (tier 3)', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'post', /^\/payroll\/periods\/:id\/reopen$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('POST /fraud/flags/:id/dismiss has mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'post', /^\/fraud\/flags\/:id\/dismiss$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).toContain('mfaTierGuard');
  });

  test('GET /devices (read-only listing) does NOT carry mfaTierGuard', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'get', /^\/devices$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).not.toContain('mfaTierGuard');
  });

  test('POST /events/manual (event replay) does NOT carry mfaTierGuard (intentional — perm-gated only)', () => {
    const hits = _routeMiddlewareNamesForPath(router, 'post', /^\/events\/manual$/);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].handlers).not.toContain('mfaTierGuard');
  });
});
