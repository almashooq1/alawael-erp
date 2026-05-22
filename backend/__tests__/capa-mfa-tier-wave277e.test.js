'use strict';

/**
 * capa-mfa-tier-wave277e.test.js — Wave 277e.
 *
 * CAPA (Corrective + Preventive Action) is the audit thread auditors
 * trace from an incident → root cause → action → verification of
 * effectiveness. The lifecycle terminals (resolve / verify / escalate /
 * DELETE) are where the audit record crystallizes; a compromised admin
 * session must not be able to close a CAPA without a second factor.
 *
 * Drafting + administrative ops (create / update / start / list / get
 * / analytics) stay at the existing RBAC gate — those are frequent
 * actions during the iterative life of an open CAPA.
 *
 * Router-stack walk, no DB. Pattern from W273 / W277b / W277c / W277d.
 */

function _findRouter() {
  delete require.cache[require.resolve('../routes/capa-admin.routes')];
  return require('../routes/capa-admin.routes');
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

describe('Wave 277e — CAPA lifecycle MFA tier-2 wiring', () => {
  let router;

  beforeAll(() => {
    router = _findRouter();
    expect(router).toBeTruthy();
    expect(router.stack.length).toBeGreaterThan(0);
  });

  const LIFECYCLE_TERMINALS = [
    { method: 'post', pathRe: /^\/:id\/resolve$/, label: 'POST /:id/resolve' },
    { method: 'post', pathRe: /^\/:id\/verify$/, label: 'POST /:id/verify (close — final)' },
    { method: 'post', pathRe: /^\/:id\/escalate$/, label: 'POST /:id/escalate' },
    { method: 'delete', pathRe: /^\/:id$/, label: 'DELETE /:id (soft delete)' },
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

  const UNGATED_OPS = [
    { method: 'post', pathRe: /^\/$/, label: 'POST / (create CAPA)' },
    { method: 'patch', pathRe: /^\/:id$/, label: 'PATCH /:id (update fields)' },
    { method: 'post', pathRe: /^\/:id\/start$/, label: 'POST /:id/start (open → in_progress)' },
  ];

  for (const { method, pathRe, label } of UNGATED_OPS) {
    test(`${label} does NOT carry requireMfaTier (admin/drafting op)`, () => {
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

describe('Wave 277e — coverage completeness sentinel', () => {
  test('exactly 4 mfaTierGuard middlewares present in CAPA routes', () => {
    delete require.cache[require.resolve('../routes/capa-admin.routes')];
    const router = require('../routes/capa-admin.routes');
    let gateCount = 0;
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const sub of layer.route.stack || []) {
        if (sub.name === 'mfaTierGuard') gateCount += 1;
      }
    }
    expect(gateCount).toBe(4);
  });
});
