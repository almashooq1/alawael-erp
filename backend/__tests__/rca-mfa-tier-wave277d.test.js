'use strict';

/**
 * rca-mfa-tier-wave277d.test.js — Wave 277d.
 *
 * RCA investigations conclude in 3 ways that anchor the audit record:
 *   - transition (move investigation to any terminal status)
 *   - verify (sign off on the conclusion)
 *   - cancel (abandon with documented reason)
 *
 * Investigation iteration (Ishikawa, 5-whys, root-causes, actions)
 * can span days and stays at the existing RBAC gate — gating each
 * row would fatigue users into blind-clicking step-up.
 *
 * Router-stack walk, no DB. Pattern from W273 / W277b / W277c.
 */

function _findRouter() {
  delete require.cache[require.resolve('../routes/rca.routes')];
  return require('../routes/rca.routes');
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

describe('Wave 277d — RCA lifecycle MFA tier-2 wiring', () => {
  let router;

  beforeAll(() => {
    router = _findRouter();
    expect(router).toBeTruthy();
    expect(router.stack.length).toBeGreaterThan(0);
  });

  const LIFECYCLE_TERMINALS = [
    {
      method: 'post',
      pathRe: /^\/:id\/transition$/,
      label: 'POST /:id/transition (state transition)',
    },
    {
      method: 'post',
      pathRe: /^\/:id\/verify$/,
      label: 'POST /:id/verify (conclusion sign-off)',
    },
    {
      method: 'post',
      pathRe: /^\/:id\/cancel$/,
      label: 'POST /:id/cancel (abandon investigation)',
    },
  ];

  for (const { method, pathRe, label } of LIFECYCLE_TERMINALS) {
    test(`${label} carries attachMfaActor + requireMfaTier(2)`, () => {
      const layers = _matchLayer(router.stack, method, pathRe);
      expect(layers.length).toBeGreaterThan(0);
      const layer = layers[0];
      const hasActor = _hasMiddleware(layer, 'attachMfaActor');
      const hasGate = _hasMiddleware(layer, 'mfaTierGuard');
      if (!hasActor || !hasGate) {
        const names = layer.route.stack.map(s => s.name).filter(Boolean);
        throw new Error(
          `${label} missing actor=${hasActor} gate=${hasGate}. Stack: [${names.join(', ')}]`
        );
      }
      expect(hasActor).toBe(true);
      expect(hasGate).toBe(true);
    });
  }

  // ─── Iteration MUST NOT carry the gate ──────────────────────────

  const UNGATED_ITERATION = [
    { method: 'post', pathRe: /^\/$/, label: 'POST / (create investigation)' },
    {
      method: 'post',
      pathRe: /^\/:id\/ishikawa\/:category$/,
      label: 'POST /:id/ishikawa/:category (add cause)',
    },
    {
      method: 'delete',
      pathRe: /^\/:id\/ishikawa\/:category\/:causeId$/,
      label: 'DELETE /:id/ishikawa/:category/:causeId (remove cause)',
    },
    {
      method: 'put',
      pathRe: /^\/:id\/five-whys$/,
      label: 'PUT /:id/five-whys (update chain)',
    },
    {
      method: 'post',
      pathRe: /^\/:id\/root-causes$/,
      label: 'POST /:id/root-causes (add root cause)',
    },
    {
      method: 'post',
      pathRe: /^\/:id\/promote$/,
      label: 'POST /:id/promote (promote candidate to root cause)',
    },
    { method: 'post', pathRe: /^\/:id\/actions$/, label: 'POST /:id/actions (add action)' },
    {
      method: 'patch',
      pathRe: /^\/:id\/actions\/:actionId\/status$/,
      label: 'PATCH /:id/actions/:actionId/status (status update)',
    },
  ];

  for (const { method, pathRe, label } of UNGATED_ITERATION) {
    test(`${label} does NOT carry requireMfaTier (iterative op, design)`, () => {
      const layers = _matchLayer(router.stack, method, pathRe);
      expect(layers.length).toBeGreaterThan(0);
      expect(_hasMiddleware(layers[0], 'mfaTierGuard')).toBe(false);
    });
  }

  test('GET endpoints carry NO MFA gate', () => {
    const getRoutes = router.stack.filter(
      layer => layer.route && layer.route.methods && layer.route.methods.get
    );
    expect(getRoutes.length).toBeGreaterThan(0);
    for (const r of getRoutes) {
      expect(_hasMiddleware(r, 'mfaTierGuard')).toBe(false);
    }
  });
});

describe('Wave 277d — coverage completeness sentinel', () => {
  test('exactly 3 mfaTierGuard middlewares present in RCA routes', () => {
    delete require.cache[require.resolve('../routes/rca.routes')];
    const router = require('../routes/rca.routes');
    let gateCount = 0;
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const sub of layer.route.stack || []) {
        if (sub.name === 'mfaTierGuard') gateCount += 1;
      }
    }
    expect(gateCount).toBe(3);
  });
});
