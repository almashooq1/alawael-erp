'use strict';

/**
 * controlled-document-mfa-tier-wave277f.test.js — Wave 277f.
 *
 * Controlled Documents implement 21 CFR Part 11 electronic-signature
 * requirements. §11.200(a)(1)(i) mandates that the act of signing be
 * authenticated by at least two distinct identification components,
 * with the first signing of a session executed using ALL components
 * and subsequent signings using at least one.
 *
 * requireMfaTier(2) is the server-side enforcement: the route accepts
 * the signature ONLY if the caller has an MFA assertion ≤ 15min old.
 *
 * Gated:
 *   POST /:id/versions/:vn/sign                      — apply signature
 *   POST /:id/versions/:vn/revoke-signature/:sigId   — revoke (audit anchor)
 *   POST /:id/versions/:vn/transition                — publish/effective/retire
 *
 * NOT gated:
 *   POST /                                  — create document
 *   POST /:id/versions                      — draft new version (no sign yet)
 *   POST /:id/versions/:vn/acknowledge      — user read-attestation (auth-only)
 *
 * Router-stack walk, no DB. Pattern from W273 / W277b / W277c / W277d / W277e.
 */

function _findRouter() {
  delete require.cache[require.resolve('../routes/controlledDocument.routes')];
  return require('../routes/controlledDocument.routes');
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

describe('Wave 277f — controlled-document e-signature MFA tier-2 wiring', () => {
  let router;

  beforeAll(() => {
    router = _findRouter();
    expect(router).toBeTruthy();
    expect(router.stack.length).toBeGreaterThan(0);
  });

  const LIFECYCLE_TERMINALS = [
    {
      method: 'post',
      pathRe: /^\/:id\/versions\/:vn\/sign$/,
      label: 'POST /:id/versions/:vn/sign (21 CFR Part 11 e-signature)',
    },
    {
      method: 'post',
      pathRe: /^\/:id\/versions\/:vn\/revoke-signature\/:sigId$/,
      label: 'POST /:id/versions/:vn/revoke-signature/:sigId (audit anchor)',
    },
    {
      method: 'post',
      pathRe: /^\/:id\/versions\/:vn\/transition$/,
      label: 'POST /:id/versions/:vn/transition (publish/effective/retire)',
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

  const UNGATED_OPS = [
    { method: 'post', pathRe: /^\/$/, label: 'POST / (create document)' },
    {
      method: 'post',
      pathRe: /^\/:id\/versions$/,
      label: 'POST /:id/versions (draft new version, no signature yet)',
    },
    {
      method: 'post',
      pathRe: /^\/:id\/versions\/:vn\/acknowledge$/,
      label: 'POST /:id/versions/:vn/acknowledge (user read attestation, auth-only)',
    },
  ];

  for (const { method, pathRe, label } of UNGATED_OPS) {
    test(`${label} does NOT carry requireMfaTier`, () => {
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

describe('Wave 277f — coverage completeness sentinel', () => {
  test('exactly 3 mfaTierGuard middlewares present in controlled-document routes', () => {
    delete require.cache[require.resolve('../routes/controlledDocument.routes')];
    const router = require('../routes/controlledDocument.routes');
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
