/**
 * Drift guard — generalizes W269h (`req.branchId`) to the whole class:
 * a route/service that READS `req.<field>` for a field NO middleware ever SETS
 * gets `undefined` → a silent leak/bug. Found by a load-based scan that diffed
 * every `req.X` read in routes against every `req.X =` write backend-wide + the
 * Express built-ins.
 *
 * Two never-set fields surfaced (besides the W269h `req.branchId`, guarded
 * separately):
 *
 *   1. `req.effectiveBranchId` — set by no middleware. iq-assessments used it for
 *      the new assessment's branchId (`req.effectiveBranchId || req.user?.branchId`,
 *      and `req.user.branchId` is ALSO never populated) → branchId persisted as
 *      undefined. FIXED to the canonical `effectiveBranchScope(req)`. This guard
 *      keeps it at ZERO.
 *
 *   2. `req.mfaActor` — SECURITY FINDING, intentionally NOT auto-fixed here.
 *      The canonical MFA context is `req.actor` with `.mfaLevel` (populated by
 *      middleware/mfa-actor.js + middleware/requireMfaTier.js; `mfaLevel` and the
 *      routes' `tier` are the same 0–3 scale). 4 sites read the non-existent
 *      `req.mfaActor.tier` (always undefined) and have since W289 (2026-05-23):
 *        - routes/quality/capa.routes.js  (MFA-tier passed to transitionCapaItem)
 *        - routes/risk-sweep.routes.js     (×3: a tier-2 cross-branch grant + TWO
 *          tier<2 cross-branch DEFENSE-IN-DEPTH checks that never fire)
 *      Correcting them to `req.actor.mfaLevel` ACTIVATES dormant security logic
 *      (one grants access, two add cross-branch restrictions — the latter ALSO
 *      compounded by the never-populated `req.user.branchId`, so they need the full
 *      W269 `effectiveBranchScope` treatment, not just a field rename). That is a
 *      security behaviour change requiring the MFA/branch-isolation owner's review,
 *      so it is BASELINED here (ratchet-down) rather than blind-fixed. When fixed,
 *      remove the file from the baseline in the same commit.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOTS = [path.join(__dirname, '..', 'routes'), path.join(__dirname, '..', 'services')];

function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ''.padEnd(m.length - p1.length, ' '));
}

function walk(dir, out) {
  out = out || [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const FILES = ROOTS.flatMap(r => walk(r));
const rel = f =>
  path.relative(path.join(__dirname, '..'), f).replace(/\\/g, '/');

function filesReading(token) {
  // word-boundary `req.<token>` — strip comments so doc mentions don't trip
  const re = new RegExp('\\breq\\s*\\.\\s*' + token + '\\b', '');
  return FILES.filter(f => re.test(stripComments(fs.readFileSync(f, 'utf8')))).map(rel).sort();
}

describe('never-set req.<field> reads (W269h generalization)', () => {
  test('no route/service reads req.effectiveBranchId (never set — use effectiveBranchScope(req))', () => {
    expect(filesReading('effectiveBranchId')).toEqual([]);
  });

  test('req.mfaActor reads stay confined to the known baseline (canonical is req.actor.mfaLevel)', () => {
    // SECURITY DEBT — ratchet DOWN only. Fixing a file => remove it here same commit.
    // BOTH cleared: capa.routes.js (fixed on main — mfaTier was always tier 0 →
    // CAPA close/reject blocked → req.actor.mfaLevel) AND risk-sweep.routes.js
    // (fixed in #750 — the dead req.mfaActor check was the ONLY branch isolation on
    // /snapshots + /beneficiary/:id/trend → live cross-branch leak → req.actor +
    // effectiveBranchScope). Baseline now EMPTY.
    const KNOWN = [];
    expect(filesReading('mfaActor')).toEqual(KNOWN.sort());
  });
});
