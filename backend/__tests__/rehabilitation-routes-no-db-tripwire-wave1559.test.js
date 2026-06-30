'use strict';

/**
 * rehabilitation-routes-no-db-tripwire-wave1559.test.js — W1559
 *
 * `rehabilitation-services/rehabilitation-routes.js` (330 routes, /api/disability-rehab)
 * is a PURE in-memory delegation layer: every one of its ~61 imported services stores
 * into a process-local `Map`, and the route file itself performs NO Mongoose query and
 * requires NO model. W1556 added router-level authenticate + requireBranchAccess, which
 * closed the only real exposure (anonymous reach). There is therefore NO per-query DB
 * cross-branch IDOR to scope here today — unlike the sibling routers fixed in W1557
 * (mdt-transition-quality) and W1558 (early-warning), which DO persist.
 *
 * This is a TRIPWIRE: the moment this file is wired to a real Mongoose model / DB query,
 * this test fails — forcing the author to add per-query branch scoping (effectiveBranchScope/
 * branchFilter, the W1557/W1558 pattern) and then update this guard. It prevents a silent
 * regression of the W1555/W1556 anonymous/IDOR class on this large clinical surface.
 *
 * (Caveat documented in the W1559 note: because the backing services are in-memory Maps
 * shared across the single Node process, data is visible cross-branch within a process
 * lifetime — but it is ephemeral, not persisted PHI; the real fix is the future
 * persistence migration, where scoping must be designed in. Not an IDOR of current code.)
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(
  __dirname,
  '..',
  'rehabilitation-services',
  'rehabilitation-routes.js'
);

describe('W1559 — rehabilitation-routes.js is DB-free (tripwire for future persistence)', () => {
  const src = fs.readFileSync(FILE, 'utf8');

  it('performs no Mongoose / DB queries inline', () => {
    const dbOps =
      src.match(
        /\.(find|findOne|findById|findByIdAndUpdate|findOneAndUpdate|updateOne|updateMany|deleteOne|deleteMany|aggregate|countDocuments)\(|\.save\(\)|\bnew [A-Z]\w*\(req\.body\)/g
      ) || [];
    // If this fails: the file now touches the DB. You MUST add per-query branch scoping
    // (effectiveBranchScope/branchFilter — see W1557 mdt / W1558 early-warning) before
    // updating this tripwire. Do NOT just delete the assertion.
    expect(dbOps).toEqual([]);
  });

  it('requires no Mongoose model and does not reference mongoose', () => {
    expect(src).not.toMatch(/\bmongoose\b/);
    expect(src).not.toMatch(/require\(['"][^'"]*\/models\//);
  });

  it('still applies router-level authentication + branch access (W1556 must not regress)', () => {
    expect(src).toMatch(/router\.use\(authenticate\)/);
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
  });
});
