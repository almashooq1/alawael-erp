/**
 * W1557 — enterpriseUltra: null-deref 500 + missing runValidators on updates
 * (2026-06-30 hunt).
 *
 * NOTE on scope: all 30 EnterpriseUltra models are scoped by `organization` (ref
 * Organization) — NONE has a branch field. And the JWT never carries `organization`
 * (auth.js generateToken), so `req.user.organization` is undefined and the intended
 * org-isolation is non-functional. In this SINGLE-organization, branch-based
 * deployment that collapses every record into one implicit-org bucket (not a live
 * multi-tenant leak), and the enterprise modules (legal/governance/BCP/ESG/board)
 * are org-wide by design — so fixing the tenancy needs a product decision (add
 * organization to the JWT, or branch-scope the 30 models). DEFERRED to the owner.
 *
 * This PR fixes two non-design correctness bugs:
 *   F5 — PATCH /dt/radar/:id/move read entry.quadrant with no null check → 500 on a
 *        missing/foreign id. Now 404.
 *   F6 — findByIdAndUpdate ran without runValidators → invalid enum/range values
 *        persisted silently (corrupting the dashboards that count by exact enum).
 *        Added runValidators:true to the uniform update option blocks.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/enterpriseUltra.routes.js'), 'utf8');

describe('W1557 — radar/:id/move null-deref guard', () => {
  test('the handler 404s when the entry is missing before reading entry.quadrant', () => {
    const i = SRC.indexOf("'/dt/radar/:id/move'");
    const block = SRC.slice(i, i + 600);
    expect(block).toMatch(/if \(!entry\) return res\.status\(404\)/);
    // the null check must come BEFORE the entry.quadrant read
    expect(block.indexOf('if (!entry)')).toBeLessThan(block.indexOf('entry.quadrant'));
  });
});

describe('W1557 — updates run validators', () => {
  test('every uniform update option block sets runValidators:true', () => {
    expect(SRC).not.toMatch(/\{ returnDocument: 'after' \}/); // no bare option left
    expect((SRC.match(/returnDocument: 'after', runValidators: true/g) || []).length).toBeGreaterThanOrEqual(18);
  });
});
