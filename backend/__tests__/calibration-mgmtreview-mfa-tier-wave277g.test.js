'use strict';

/**
 * calibration-mgmtreview-mfa-tier-wave277g.test.js — Wave 277g.
 *
 * Final pass of the quality-domain MFA closure roadmap. Combined
 * test for two route files because both file changes ship in one
 * atomic commit (cohesive: both gate "asset/process integrity"
 * mutations the JCI/Saudi-MOH auditor would inspect).
 *
 * Calibration (2 gates):
 *   POST /:id/status      — asset status change (in_service / out_of_service / retired)
 *   POST /sweep-overdue   — bulk sweep over entire asset inventory
 *
 * Management Review (3 gates) — ISO 9001 §9.3:
 *   POST /:id/close       — locks the review record
 *   POST /:id/cancel      — abandons scheduled review
 *   POST /:id/approvals   — multi-role sign-off (CEO / medical director / etc.)
 *
 * Drafting / iteration ops (record input/output/decision/action/agenda/
 * minutes/start/recordCalibration) stay ungated — those are the
 * frequent in-meeting actions.
 *
 * Router-stack walk, no DB. Pattern from W273 + W277b–f.
 */

function _findCalibration() {
  delete require.cache[require.resolve('../routes/calibration.routes')];
  return require('../routes/calibration.routes');
}
function _findMgmtReview() {
  delete require.cache[require.resolve('../routes/managementReview.routes')];
  return require('../routes/managementReview.routes');
}

function _matchLayer(stack, method, pathRe) {
  return stack.filter(layer => {
    if (!layer.route) return false;
    if (!layer.route.methods || !layer.route.methods[method]) return false;
    return pathRe.test(layer.route.path);
  });
}
function _hasMiddleware(layer, name) {
  const stack = layer.route ? layer.route.stack : [];
  return stack.some(s => s.name === name);
}

// ─── Calibration ─────────────────────────────────────────────────

describe('Wave 277g — calibration lifecycle MFA tier-2 wiring', () => {
  let router;
  beforeAll(() => {
    router = _findCalibration();
    expect(router.stack.length).toBeGreaterThan(0);
  });

  const TERMINALS = [
    { method: 'post', pathRe: /^\/:id\/status$/, label: 'POST /:id/status' },
    { method: 'post', pathRe: /^\/sweep-overdue$/, label: 'POST /sweep-overdue' },
  ];
  for (const { method, pathRe, label } of TERMINALS) {
    test(`${label} carries attachMfaActor + requireMfaTier(2)`, () => {
      const layers = _matchLayer(router.stack, method, pathRe);
      expect(layers.length).toBeGreaterThan(0);
      const layer = layers[0];
      expect(_hasMiddleware(layer, 'attachMfaActor')).toBe(true);
      expect(_hasMiddleware(layer, 'mfaTierGuard')).toBe(true);
    });
  }

  const UNGATED = [
    { method: 'post', pathRe: /^\/$/, label: 'POST / (register asset)' },
    {
      method: 'post',
      pathRe: /^\/:id\/calibrations$/,
      label: 'POST /:id/calibrations (record measurement)',
    },
  ];
  for (const { method, pathRe, label } of UNGATED) {
    test(`${label} does NOT carry requireMfaTier`, () => {
      const layers = _matchLayer(router.stack, method, pathRe);
      expect(layers.length).toBeGreaterThan(0);
      expect(_hasMiddleware(layers[0], 'mfaTierGuard')).toBe(false);
    });
  }

  test('GET endpoints carry NO MFA gate', () => {
    const gets = router.stack.filter(l => l.route && l.route.methods && l.route.methods.get);
    expect(gets.length).toBeGreaterThan(0);
    for (const r of gets) expect(_hasMiddleware(r, 'mfaTierGuard')).toBe(false);
  });

  test('exactly 2 mfaTierGuard middlewares in calibration', () => {
    let n = 0;
    for (const l of router.stack) {
      if (!l.route) continue;
      for (const s of l.route.stack || []) if (s.name === 'mfaTierGuard') n += 1;
    }
    expect(n).toBe(2);
  });
});

// ─── Management Review ───────────────────────────────────────────

describe('Wave 277g — management-review lifecycle MFA tier-2 wiring', () => {
  let router;
  beforeAll(() => {
    router = _findMgmtReview();
    expect(router.stack.length).toBeGreaterThan(0);
  });

  const TERMINALS = [
    { method: 'post', pathRe: /^\/:id\/close$/, label: 'POST /:id/close (lock review)' },
    {
      method: 'post',
      pathRe: /^\/:id\/cancel$/,
      label: 'POST /:id/cancel (abandon scheduled review)',
    },
    {
      method: 'post',
      pathRe: /^\/:id\/approvals$/,
      label: 'POST /:id/approvals (multi-role sign-off)',
    },
  ];
  for (const { method, pathRe, label } of TERMINALS) {
    test(`${label} carries attachMfaActor + requireMfaTier(2)`, () => {
      const layers = _matchLayer(router.stack, method, pathRe);
      expect(layers.length).toBeGreaterThan(0);
      const layer = layers[0];
      expect(_hasMiddleware(layer, 'attachMfaActor')).toBe(true);
      expect(_hasMiddleware(layer, 'mfaTierGuard')).toBe(true);
    });
  }

  const UNGATED = [
    { method: 'post', pathRe: /^\/$/, label: 'POST / (schedule review)' },
    { method: 'post', pathRe: /^\/:id\/agenda$/, label: 'POST /:id/agenda' },
    { method: 'post', pathRe: /^\/:id\/start$/, label: 'POST /:id/start' },
    { method: 'post', pathRe: /^\/:id\/inputs$/, label: 'POST /:id/inputs' },
    { method: 'post', pathRe: /^\/:id\/outputs$/, label: 'POST /:id/outputs' },
    { method: 'post', pathRe: /^\/:id\/decisions$/, label: 'POST /:id/decisions' },
    { method: 'post', pathRe: /^\/:id\/actions$/, label: 'POST /:id/actions' },
    {
      method: 'patch',
      pathRe: /^\/:id\/actions\/:actionId$/,
      label: 'PATCH /:id/actions/:actionId',
    },
    { method: 'patch', pathRe: /^\/:id\/minutes$/, label: 'PATCH /:id/minutes' },
  ];
  for (const { method, pathRe, label } of UNGATED) {
    test(`${label} does NOT carry requireMfaTier`, () => {
      const layers = _matchLayer(router.stack, method, pathRe);
      expect(layers.length).toBeGreaterThan(0);
      expect(_hasMiddleware(layers[0], 'mfaTierGuard')).toBe(false);
    });
  }

  test('GET endpoints carry NO MFA gate', () => {
    const gets = router.stack.filter(l => l.route && l.route.methods && l.route.methods.get);
    expect(gets.length).toBeGreaterThan(0);
    for (const r of gets) expect(_hasMiddleware(r, 'mfaTierGuard')).toBe(false);
  });

  test('exactly 3 mfaTierGuard middlewares in management-review', () => {
    let n = 0;
    for (const l of router.stack) {
      if (!l.route) continue;
      for (const s of l.route.stack || []) if (s.name === 'mfaTierGuard') n += 1;
    }
    expect(n).toBe(3);
  });
});

// ─── Roadmap-closure sentinel ────────────────────────────────────

describe('Wave 277g — quality-domain MFA roadmap closure', () => {
  test('combined W277b–g gate counts add up to 25 across 7 route files', () => {
    // Tracks the totality of the quality-domain MFA closure roadmap.
    // If any of W277b–g regresses (gate removed), this aggregate fails
    // BEFORE the per-file count failure, so the diagnostic is loud.
    const files = [
      ['../routes/incidentRoutes', 5], // W277b
      ['../routes/fmea.routes', 5], // W277c
      ['../routes/rca.routes', 3], // W277d
      ['../routes/capa-admin.routes', 4], // W277e
      ['../routes/controlledDocument.routes', 3], // W277f
      ['../routes/calibration.routes', 2], // W277g part 1
      ['../routes/managementReview.routes', 3], // W277g part 2
    ];
    let total = 0;
    const perFile = [];
    for (const [path, expected] of files) {
      delete require.cache[require.resolve(path)];
      const router = require(path);
      let n = 0;
      for (const l of router.stack) {
        if (!l.route) continue;
        for (const s of l.route.stack || []) if (s.name === 'mfaTierGuard') n += 1;
      }
      perFile.push({ path, expected, actual: n });
      total += n;
    }
    const mismatched = perFile.filter(p => p.actual !== p.expected);
    if (mismatched.length) {
      throw new Error(
        'Quality-domain MFA roadmap regression detected:\n' +
          mismatched.map(p => `  ${p.path}: expected ${p.expected}, got ${p.actual}`).join('\n')
      );
    }
    expect(total).toBe(25);
  });
});
