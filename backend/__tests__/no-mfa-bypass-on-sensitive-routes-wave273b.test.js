'use strict';

/**
 * no-mfa-bypass-on-sensitive-routes-wave273b.test.js — Wave 273b (drift guard).
 *
 * Follow-up to [[wave273-mfa-tier-route-guard]]: Wave 273 wired
 * requireMfaTier(N) on 13 hand-picked sensitive endpoints. This guard
 * generalizes the contract so future PRs adding new payroll/template/
 * fraud/biometric/device-retire routes WITHOUT requireMfaTier fail at
 * CI time instead of silently shipping the same gap W273 just closed.
 *
 * The pattern:
 *   SENSITIVE_RULES describes routes whose path matches a regex AND
 *   whose method is write-shaped (POST/PUT/PATCH/DELETE). Read-only
 *   endpoints (GET) are auto-exempt — they don't mutate state and
 *   the W273 design explicitly chose tier-gating for writes only.
 *
 * Each rule has a `why` field that surfaces in the failure message so
 * the offending PR's author knows WHY the gate is required. Pure
 * additive: existing routes were verified during W273 (49/49 wiring
 * tests in biometric-mfa-tier-wave273.test.js).
 *
 * Adding a new rule:
 *   1. Append { method, pathRe, why } to SENSITIVE_RULES below.
 *   2. Wire requireMfaTier(N) at the matching endpoint in its routes
 *      file (and verify the W273 wiring test catches it via its
 *      negative case).
 *   3. The synthetic-fixture test at the bottom proves the SCANNER
 *      itself catches violations — don't disable it without replacing.
 *
 * Implementation: walks each router's Express stack (no DB, no
 * supertest, ~50ms). For hikvision (factory router), DI stubs mirror
 * the biometric-mfa-tier-wave273 test — see _buildHikvisionRouter().
 */

const express = require('express');

// ─── Sensitive route patterns ─────────────────────────────────────
//
// Each rule:
//   method  — lowercase HTTP verb
//   pathRe  — RegExp on Express route path (with :params). Anchored.
//   why     — short explanation surfaced in failure message
//
// Patterns are deliberately tight — overly broad regexes would force
// false positives for unrelated routes that happen to share path
// prefixes (e.g., GET /payroll/periods is a legitimate read).

const SENSITIVE_RULES = Object.freeze([
  {
    method: 'delete',
    pathRe: /^\/devices\/:id$/,
    why: 'biometric device delete (W273 — biometric-attendance + zkteco)',
  },
  {
    method: 'post',
    pathRe: /^\/devices\/:[a-zA-Z]+\/retire$/,
    why: 'hikvision device retire (W273)',
  },
  {
    method: 'post',
    pathRe: /^\/devices\/:[a-zA-Z]+\/enroll$/,
    why: 'biometric enrollment (W273)',
  },
  {
    method: 'put',
    pathRe: /^\/overtime\/:[a-zA-Z]+\/approve$/,
    why: 'overtime approval — financial impact (W273)',
  },
  {
    method: 'post',
    pathRe: /^\/devices\/:[a-zA-Z]+\/users\/:[a-zA-Z]+\/map$/,
    why: 'device_user → employee mapping — attribution falsification vector (W273)',
  },
  {
    method: 'post',
    pathRe: /^\/payroll\/.+$/,
    why: 'payroll mutation (W273 — execute/approve/close/reopen/draft)',
  },
  {
    method: 'post',
    pathRe: /^\/fraud\/flags\/:[a-zA-Z]+\/dismiss$/,
    why: 'fraud flag dismiss — abuse vector (W273)',
  },
  {
    method: 'post',
    pathRe: /^\/fraud\/flags\/:[a-zA-Z]+\/escalate$/,
    why: 'fraud flag escalate — workflow state mutation, missed by W273, closed by W275b',
  },
  {
    method: 'post',
    pathRe: /^\/templates\/:[a-zA-Z]+\/suspend$/,
    why: 'biometric template suspend (W273)',
  },
  {
    method: 'post',
    pathRe: /^\/templates\/exit-cascade$/,
    why: 'biometric template exit-cascade — missed by W273, closed by W275c',
  },
  {
    method: 'post',
    pathRe: /^\/reconciliation\/cases\/:[a-zA-Z]+\/resolve$/,
    why: 'attendance reconciliation case resolve — missed by W273, closed by W275d',
  },
  {
    method: 'post',
    pathRe: /^\/sync\/all$/,
    why: 'hikvision org-wide sync — missed by W273, closed by W275e (route-only; cron-shaped service)',
  },
  {
    method: 'post',
    pathRe: /^\/sync\/library\/.+$/,
    why: 'hikvision library/device sync — missed by W273, closed by W275e (route-only)',
  },
  {
    method: 'put',
    pathRe: /^\/branch-configs\/:[a-zA-Z]+$/,
    why: 'hikvision per-branch config upsert — missed by W273, closed by W275f',
  },
  {
    method: 'delete',
    pathRe: /^\/branch-configs\/:[a-zA-Z]+$/,
    why: 'hikvision per-branch config reset — missed by W273, closed by W275f',
  },
  {
    method: 'post',
    pathRe: /^\/fraud\/scores\/:[a-zA-Z]+\/recompute$/,
    why: 'fraud score recompute — missed by W273, closed by W275g (route-only)',
  },
  {
    method: 'post',
    pathRe: /^\/fraud\/scores\/decay-all$/,
    why: 'fraud score bulk decay — missed by W273, closed by W275g (route-only; cron-shaped service)',
  },
  // ─── Wave 275h — Administrative CRUD + operator-trigger routes ─
  // These were not in the original W273 audit (which focused on
  // payroll/fraud-dismiss/template-suspend). Adding to drift guard
  // to prevent future regression on admin surface.
  {
    method: 'post',
    pathRe: /^\/devices$/,
    why: 'hikvision device CREATE — adds new device to org infrastructure (W275h)',
  },
  {
    method: 'post',
    pathRe: /^\/devices\/:[a-zA-Z]+\/channels$/,
    why: 'hikvision channel CREATE — adds new camera channel (W275h)',
  },
  {
    method: 'post',
    pathRe: /^\/libraries$/,
    why: 'hikvision face library CREATE (W275h)',
  },
  {
    method: 'post',
    pathRe: /^\/libraries\/:[a-zA-Z]+\/archive$/,
    why: 'hikvision face library ARCHIVE — destructive (W275h)',
  },
  {
    method: 'post',
    pathRe: /^\/libraries\/:[a-zA-Z]+\/subscribe-device$/,
    why: 'hikvision library subscribe new device — pushes biometric data (W275h)',
  },
  {
    method: 'post',
    pathRe: /^\/libraries\/:[a-zA-Z]+\/unsubscribe-device$/,
    why: 'hikvision library unsubscribe device — removes biometric data (W275h)',
  },
  {
    method: 'post',
    pathRe: /^\/jobs\/:[a-zA-Z]+\/run$/,
    why: 'hikvision manual job trigger — operator override of scheduler (W275h)',
  },
  {
    method: 'post',
    pathRe: /^\/stream\/refresh$/,
    why: 'hikvision stream supervisor refresh — operator stream control (W275h)',
  },
]);

// ─── Router-stack walker ──────────────────────────────────────────

/**
 * Walks an Express router's stack and returns the violations: any
 * route layer whose (method, path) matches a SENSITIVE_RULES entry
 * but whose middleware chain does NOT include `mfaTierGuard`.
 *
 * @param {string} source           — friendly router name for messages
 * @param {import('express').Router} router
 * @returns {Array<{source: string, method: string, path: string, why: string, handlers: string[]}>}
 */
function _scanRouter(source, router) {
  const violations = [];
  const stack = (router && router.stack) || [];
  for (const layer of stack) {
    if (!layer.route) continue;
    const path = layer.route.path;
    if (typeof path !== 'string') continue;
    const methods = layer.route.methods || {};
    for (const rule of SENSITIVE_RULES) {
      if (!methods[rule.method]) continue;
      if (!rule.pathRe.test(path)) continue;
      const handlers = (layer.route.stack || []).map(s => (s.handle && s.handle.name) || '(anon)');
      if (!handlers.includes('mfaTierGuard')) {
        violations.push({ source, method: rule.method, path, why: rule.why, handlers });
      }
    }
  }
  return violations;
}

// ─── Hikvision factory router builder (DI stubs) ──────────────────
//
// Mirrors the stub shape from biometric-mfa-tier-wave273.test.js so
// the full factory mounts Phase 1-5 routes including payroll +
// fraud + templates + device retire. Any new DI port added to the
// factory should be reflected here so this scanner doesn't blindfold
// itself to new payroll-shaped surface area.

function _buildHikvisionRouter() {
  const { createHikvisionRouter } = require('../routes/hikvision.routes');
  return createHikvisionRouter({
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
}

// ─── 1. Scan the real routers ─────────────────────────────────────

describe('Wave 273b — no MFA bypass on sensitive routes', () => {
  let biometricRouter;
  let zktecoRouter;
  let hikvisionRouter;

  beforeAll(() => {
    jest.isolateModules(() => {
      biometricRouter = require('../routes/biometric-attendance.routes');
    });
    jest.isolateModules(() => {
      zktecoRouter = require('../routes/zkteco.routes');
    });
    jest.isolateModules(() => {
      hikvisionRouter = _buildHikvisionRouter();
    });
  });

  test('biometric-attendance routes: no sensitive endpoint lacks mfaTierGuard', () => {
    const violations = _scanRouter('biometric-attendance', biometricRouter);
    if (violations.length) {
      throw new Error(
        'MFA bypass on biometric-attendance:\n  ' +
          violations
            .map(
              v =>
                `${v.method.toUpperCase()} ${v.path}\n    why: ${v.why}\n    chain: [${v.handlers.join(', ')}]`
            )
            .join('\n  ')
      );
    }
    expect(violations).toEqual([]);
  });

  test('zkteco routes: no sensitive endpoint lacks mfaTierGuard', () => {
    const violations = _scanRouter('zkteco', zktecoRouter);
    if (violations.length) {
      throw new Error(
        'MFA bypass on zkteco:\n  ' +
          violations
            .map(
              v =>
                `${v.method.toUpperCase()} ${v.path}\n    why: ${v.why}\n    chain: [${v.handlers.join(', ')}]`
            )
            .join('\n  ')
      );
    }
    expect(violations).toEqual([]);
  });

  test('hikvision routes: no sensitive endpoint lacks mfaTierGuard', () => {
    const violations = _scanRouter('hikvision', hikvisionRouter);
    if (violations.length) {
      throw new Error(
        'MFA bypass on hikvision:\n  ' +
          violations
            .map(
              v =>
                `${v.method.toUpperCase()} ${v.path}\n    why: ${v.why}\n    chain: [${v.handlers.join(', ')}]`
            )
            .join('\n  ')
      );
    }
    expect(violations).toEqual([]);
  });

  test('scan covers ≥ 13 sensitive endpoints across the 3 routers (sanity)', () => {
    // Count how many routes ACROSS all three routers match the
    // sensitive patterns. Should be ≥ 13 (the W273 coverage). If a
    // future refactor splits/renames routes and this count drops,
    // the maintainer should re-verify pattern regexes match the
    // renamed paths.
    let totalSensitive = 0;
    for (const [source, router] of [
      ['biometric-attendance', biometricRouter],
      ['zkteco', zktecoRouter],
      ['hikvision', hikvisionRouter],
    ]) {
      void source;
      const stack = (router && router.stack) || [];
      for (const layer of stack) {
        if (!layer.route) continue;
        const path = layer.route.path;
        if (typeof path !== 'string') continue;
        const methods = layer.route.methods || {};
        for (const rule of SENSITIVE_RULES) {
          if (methods[rule.method] && rule.pathRe.test(path)) totalSensitive++;
        }
      }
    }
    expect(totalSensitive).toBeGreaterThanOrEqual(13);
  });
});

// ─── 2. SENSITIVE_RULES shape sanity ──────────────────────────────

describe('Wave 273b — SENSITIVE_RULES shape', () => {
  test('every rule has method, pathRe, why', () => {
    for (const rule of SENSITIVE_RULES) {
      expect(typeof rule.method).toBe('string');
      expect(['get', 'post', 'put', 'patch', 'delete']).toContain(rule.method);
      expect(rule.pathRe).toBeInstanceOf(RegExp);
      expect(typeof rule.why).toBe('string');
      expect(rule.why.length).toBeGreaterThan(10);
    }
  });

  test('no GET rules (read-only is auto-exempt by design)', () => {
    for (const rule of SENSITIVE_RULES) {
      expect(rule.method).not.toBe('get');
    }
  });

  test('pathRe entries are anchored (no /^.../ or /...$/ omissions)', () => {
    for (const rule of SENSITIVE_RULES) {
      const src = rule.pathRe.source;
      expect(src.startsWith('^')).toBe(true);
      expect(src.endsWith('$')).toBe(true);
    }
  });
});

// ─── 3. Synthetic-fixture test (proves the SCANNER itself works) ──
//
// Build a tiny router with a deliberate violation and confirm the
// scanner catches it. Without this, a refactor that breaks the
// scanner could silently turn the real-router tests above into
// no-ops (always-pass).

describe('Wave 273b — synthetic fixture (scanner self-test)', () => {
  test('CATCHES violation: POST /payroll/test with no mfaTierGuard', () => {
    const router = express.Router();
    function someHandler(_req, _res) {}
    router.post('/payroll/test', someHandler);
    const violations = _scanRouter('synthetic', router);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toEqual(
      expect.objectContaining({
        source: 'synthetic',
        method: 'post',
        path: '/payroll/test',
      })
    );
    expect(violations[0].handlers).toContain('someHandler');
    expect(violations[0].handlers).not.toContain('mfaTierGuard');
  });

  test('PASSES when mfaTierGuard IS in the chain', () => {
    const router = express.Router();
    function mfaTierGuard(_req, _res, next) {
      next();
    }
    function someHandler(_req, _res) {}
    router.post('/payroll/test', mfaTierGuard, someHandler);
    const violations = _scanRouter('synthetic', router);
    expect(violations).toEqual([]);
  });

  test('CATCHES violation: DELETE /devices/:id with no mfaTierGuard', () => {
    const router = express.Router();
    function handler(_req, _res) {}
    router.delete('/devices/:id', handler);
    const violations = _scanRouter('synthetic', router);
    expect(violations).toHaveLength(1);
    expect(violations[0].why).toMatch(/biometric device delete/);
  });

  test('CATCHES violation: POST /fraud/flags/:id/dismiss with no mfaTierGuard', () => {
    const router = express.Router();
    function handler(_req, _res) {}
    router.post('/fraud/flags/:flagId/dismiss', handler);
    const violations = _scanRouter('synthetic', router);
    expect(violations).toHaveLength(1);
    expect(violations[0].why).toMatch(/fraud flag dismiss/);
  });

  test('IGNORES GET on sensitive path (read-only is exempt)', () => {
    const router = express.Router();
    function handler(_req, _res) {}
    router.get('/payroll/periods', handler);
    const violations = _scanRouter('synthetic', router);
    expect(violations).toEqual([]);
  });

  test('IGNORES non-matching path (e.g., POST /unrelated)', () => {
    const router = express.Router();
    function handler(_req, _res) {}
    // Note: POST /devices was originally the example here, but W275h
    // promoted it to a SENSITIVE_RULE (device CREATE is itself
    // sensitive — adds biometric hardware to org). Use a genuinely
    // non-matching path to keep the scanner self-test honest.
    router.post('/unrelated/path/that-does-not-match-any-rule', handler);
    const violations = _scanRouter('synthetic', router);
    expect(violations).toEqual([]);
  });
});
