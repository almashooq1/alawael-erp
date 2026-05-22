'use strict';

/**
 * quality-incident-mfa-tier-wave277b.test.js — Wave 277b.
 *
 * Adverse-event records anchor regulatory audits (Saudi MOH, JCI),
 * CAPA chains, and incident-investigation timelines. Closing an
 * incident, escalating it, archiving it, or deleting it are all
 * mutations whose value to an attacker is HIGH: a compromised
 * admin session could quietly mark a serious safety event as
 * "resolved" with no real corrective action, or delete evidence
 * before discovery.
 *
 * W277b mirrors the W273 biometric pattern for the quality domain:
 *   - attachMfaActor mounted router-wide so req.actor carries mfaLevel
 *   - requireMfaTier(2) on the 5 lifecycle terminals:
 *       DELETE /incidents/:id           — irreversible removal
 *       POST   /incidents/:id/escalate  — severity bump
 *       POST   /incidents/:id/resolve   — anchors CAPA
 *       POST   /incidents/:id/close     — locks the record
 *       POST   /incidents/:id/archive   — moves to cold storage
 *
 * Reads (GET) + create/update/comments/attachments stay at the
 * existing authorize() RBAC gate without step-up — they are
 * non-terminal operations that the original incident author or
 * supervisor needs frictionless access to.
 *
 * This test walks the Express router stack (no DB, no supertest)
 * and asserts that:
 *   1. attachMfaActor sits at router level
 *   2. each lifecycle terminal carries requireMfaTier(2)
 *   3. NON-terminal mutations (POST /, PUT /:id, /assign, /responder,
 *      /status, /comments, /attachments) do NOT carry the tier-2 gate
 *      (regression net: don't accidentally over-gate)
 *   4. GETs are untouched
 */

const express = require('express');

function _findRouter() {
  // The router is constructed at module load. Re-require fresh per
  // test run so middleware references are stable.
  delete require.cache[require.resolve('../routes/incidentRoutes')];
  return require('../routes/incidentRoutes');
}

function _matchLayer(stack, method, pathRe) {
  return stack.filter(layer => {
    if (!layer.route) return false;
    if (!layer.route.methods || !layer.route.methods[method]) return false;
    return pathRe.test(layer.route.path);
  });
}

function _hasMiddleware(layer, name) {
  // express layer.route.stack is the array of (middleware, handler)
  // functions for that route. We match by function.name.
  const stack = layer.route ? layer.route.stack : [];
  return stack.some(s => s.name === name);
}

function _routerLevelHas(router, name) {
  // Router-level middleware lives on router.stack[i].handle (no .route).
  return router.stack.some(layer => !layer.route && layer.handle && layer.handle.name === name);
}

describe('Wave 277b — incident lifecycle MFA tier-2 wiring', () => {
  let router;

  beforeAll(() => {
    router = _findRouter();
    expect(router).toBeTruthy();
    expect(typeof router.stack).toBe('object');
    expect(router.stack.length).toBeGreaterThan(0);
  });

  test('attachMfaActor is mounted at the router level', () => {
    // The middleware lazy-reads req.app._mfaChallengeService at
    // request time — see middleware/requireMfaTier.js. Mounted via
    // router.use() so every route below receives a populated req.actor.
    expect(_routerLevelHas(router, 'attachMfaActor')).toBe(true);
  });

  // ─── Lifecycle terminals MUST carry requireMfaTier(2) ────────────

  const LIFECYCLE_TERMINALS = [
    { method: 'delete', pathRe: /^\/:id$/, label: 'DELETE /:id (evidence removal)' },
    { method: 'post', pathRe: /^\/:id\/escalate$/, label: 'POST /:id/escalate' },
    { method: 'post', pathRe: /^\/:id\/resolve$/, label: 'POST /:id/resolve' },
    { method: 'post', pathRe: /^\/:id\/close$/, label: 'POST /:id/close' },
    { method: 'post', pathRe: /^\/:id\/archive$/, label: 'POST /:id/archive' },
  ];

  for (const { method, pathRe, label } of LIFECYCLE_TERMINALS) {
    test(`${label} carries requireMfaTier (tier 2)`, () => {
      const layers = _matchLayer(router.stack, method, pathRe);
      expect(layers.length).toBeGreaterThan(0);
      const layer = layers[0];
      // requireMfaTier returns an anonymous middleware named via the
      // factory — we look for the canonical guard name.
      const hasGate = _hasMiddleware(layer, 'mfaTierGuard');
      if (!hasGate) {
        // Diagnostic: dump the actual middleware names on the route
        const names = layer.route.stack.map(s => s.name).filter(Boolean);
        throw new Error(
          `${label} is missing requireMfaTier(2). Route middleware stack: [${names.join(', ')}]`
        );
      }
      expect(hasGate).toBe(true);
    });
  }

  // ─── Non-terminal mutations MUST NOT carry the tier-2 gate ───────
  //
  // Negative cases catch over-gating: future contributors copy-pasting
  // requireMfaTier onto every line would slow operations + fatigue
  // users into approving every step-up prompt blindly. The W273
  // design explicitly keeps step-up SCARCE.

  const UNGATED_MUTATIONS = [
    { method: 'post', pathRe: /^\/$/, label: 'POST / (create)' },
    { method: 'put', pathRe: /^\/:id$/, label: 'PUT /:id (update)' },
    { method: 'patch', pathRe: /^\/:id\/status$/, label: 'PATCH /:id/status' },
    { method: 'post', pathRe: /^\/:id\/assign$/, label: 'POST /:id/assign' },
    { method: 'post', pathRe: /^\/:id\/responder$/, label: 'POST /:id/responder' },
    { method: 'post', pathRe: /^\/:id\/comments$/, label: 'POST /:id/comments' },
    { method: 'post', pathRe: /^\/:id\/attachments$/, label: 'POST /:id/attachments' },
  ];

  for (const { method, pathRe, label } of UNGATED_MUTATIONS) {
    test(`${label} does NOT carry requireMfaTier (frequent operation, design)`, () => {
      const layers = _matchLayer(router.stack, method, pathRe);
      expect(layers.length).toBeGreaterThan(0);
      const layer = layers[0];
      const hasGate = _hasMiddleware(layer, 'mfaTierGuard');
      expect(hasGate).toBe(false);
    });
  }

  // ─── All GETs untouched ──────────────────────────────────────────

  test('GET endpoints carry NO MFA gate (reads are always allowed at tier 1)', () => {
    const getRoutes = router.stack.filter(
      layer => layer.route && layer.route.methods && layer.route.methods.get
    );
    expect(getRoutes.length).toBeGreaterThan(0);
    for (const r of getRoutes) {
      expect(_hasMiddleware(r, 'mfaTierGuard')).toBe(false);
    }
  });
});

// ─── Coverage completeness ────────────────────────────────────────

describe('Wave 277b — coverage completeness sentinel', () => {
  test('every requireMfaTier in incidentRoutes is accounted for in the test', () => {
    // If a future commit adds requireMfaTier to a NEW endpoint, the
    // expected-count check below fails — forcing the contributor to
    // also add a positive-case test above (proving the gate works)
    // OR a negative-case test (documenting why this is a frequent op).
    delete require.cache[require.resolve('../routes/incidentRoutes')];
    const router = require('../routes/incidentRoutes');
    let gateCount = 0;
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const sub of layer.route.stack || []) {
        if (sub.name === 'mfaTierGuard') gateCount += 1;
      }
    }
    // Wave 277b lands 5 gates (DELETE + escalate + resolve + close + archive).
    // Future passes (e.g., W277c adding gates to FMEA verify, RCA sign,
    // CAPA approve) belong to DIFFERENT route files and update THEIR
    // wave-tests — they don't change this count.
    expect(gateCount).toBe(5);
  });
});
