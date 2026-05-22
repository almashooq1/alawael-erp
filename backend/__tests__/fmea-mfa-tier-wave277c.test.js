'use strict';

/**
 * fmea-mfa-tier-wave277c.test.js — Wave 277c.
 *
 * FMEA / HFMEA worksheets are the documents auditors (Saudi MOH, JCI,
 * ISO 31000) quote when proving the org rated the risk + a qualified
 * cross-functional team signed off + the quality manager verified.
 * The 5 lifecycle terminals — submit, sign, verify, archive, cancel —
 * are the moments where that audit trail crystallizes. A compromised
 * quality_manager session could quietly verify a worksheet to ship a
 * change with no real review.
 *
 * W277c mirrors W273 / W277b: attachMfaActor + requireMfaTier(2) on
 * the 5 terminals. Drafting operations (worksheet create, add row,
 * update row, delete row, add action, action status, re-rate row)
 * stay at the existing authorize() RBAC gate — frequent during the
 * weeks-long FMEA session.
 *
 * Router-stack walk, no DB, no supertest.
 */

function _findRouter() {
  delete require.cache[require.resolve('../routes/fmea.routes')];
  return require('../routes/fmea.routes');
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

describe('Wave 277c — FMEA lifecycle MFA tier-2 wiring', () => {
  let router;

  beforeAll(() => {
    router = _findRouter();
    expect(router).toBeTruthy();
    expect(typeof router.stack).toBe('object');
    expect(router.stack.length).toBeGreaterThan(0);
  });

  // ─── Lifecycle terminals MUST carry attachMfaActor + requireMfaTier(2) ─

  const LIFECYCLE_TERMINALS = [
    { method: 'post', pathRe: /^\/:id\/submit$/, label: 'POST /:id/submit (submit for review)' },
    { method: 'post', pathRe: /^\/:id\/sign$/, label: 'POST /:id/sign (team sign)' },
    {
      method: 'post',
      pathRe: /^\/:id\/verify$/,
      label: 'POST /:id/verify (quality-manager verification)',
    },
    { method: 'post', pathRe: /^\/:id\/archive$/, label: 'POST /:id/archive (lock from edits)' },
    { method: 'post', pathRe: /^\/:id\/cancel$/, label: 'POST /:id/cancel (abandon worksheet)' },
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

  // ─── Drafting operations MUST NOT carry the tier-2 gate ──────────
  //
  // FMEA sessions span weeks. Forcing step-up on every row add /
  // status update would fatigue users into blind-clicking the
  // approval prompt — the exact failure mode step-up exists to prevent.

  const UNGATED_DRAFTING = [
    { method: 'post', pathRe: /^\/$/, label: 'POST / (create worksheet)' },
    { method: 'post', pathRe: /^\/:id\/rows$/, label: 'POST /:id/rows (add row)' },
    { method: 'patch', pathRe: /^\/:id\/rows\/:rowId$/, label: 'PATCH /:id/rows/:rowId (update)' },
    {
      method: 'delete',
      pathRe: /^\/:id\/rows\/:rowId$/,
      label: 'DELETE /:id/rows/:rowId (delete row — frequent during drafting)',
    },
    {
      method: 'post',
      pathRe: /^\/:id\/rows\/:rowId\/actions$/,
      label: 'POST /:id/rows/:rowId/actions (add action)',
    },
    {
      method: 'patch',
      pathRe: /^\/:id\/rows\/:rowId\/actions\/:actionId\/status$/,
      label: 'PATCH .../:actionId/status (action status)',
    },
    {
      method: 'post',
      pathRe: /^\/:id\/rows\/:rowId\/rerate$/,
      label: 'POST /:id/rows/:rowId/rerate (Step 8 — re-rate row)',
    },
  ];

  for (const { method, pathRe, label } of UNGATED_DRAFTING) {
    test(`${label} does NOT carry requireMfaTier (frequent op, design)`, () => {
      const layers = _matchLayer(router.stack, method, pathRe);
      expect(layers.length).toBeGreaterThan(0);
      const layer = layers[0];
      expect(_hasMiddleware(layer, 'mfaTierGuard')).toBe(false);
    });
  }

  // ─── GETs untouched ─────────────────────────────────────────────

  test('GET endpoints carry NO MFA gate (reads always allowed at tier 1)', () => {
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

describe('Wave 277c — coverage completeness sentinel', () => {
  test('exactly 5 mfaTierGuard middlewares present in FMEA routes', () => {
    // If a future commit adds a 6th gate (e.g. on row rerate later
    // when re-rating implies re-signing), this count fails until the
    // contributor adds a positive test above documenting which
    // terminal it gates.
    delete require.cache[require.resolve('../routes/fmea.routes')];
    const router = require('../routes/fmea.routes');
    let gateCount = 0;
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const sub of layer.route.stack || []) {
        if (sub.name === 'mfaTierGuard') gateCount += 1;
      }
    }
    expect(gateCount).toBe(5);
  });
});
