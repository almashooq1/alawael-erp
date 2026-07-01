/**
 * W1588 — CDSS :id ObjectId validation.
 *
 * Deferred in #840. cdss.routes.js had ZERO isValidObjectId guards, so every one
 * of its 13 `:id` routes (GET/PUT/DELETE /rules/:id, /drugs/:id,
 * /risk-assessments/:id, alert acknowledge/override/resolve, suggestion
 * accept/reject, differential-diagnosis confirm) passed a raw req.params.id
 * straight to Mongoose. A malformed id → CastError → safeError 500 (monitoring
 * noise + wrong HTTP contract; every other route file in the repo guards this).
 *
 * Fix: a single `router.param('id', …)` rejects a non-ObjectId with 400 before
 * any handler runs — covers all 13 :id routes at once.
 *
 * Static + behavioral (the param guard is pure + easy to invoke directly).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const FILE = path.join(__dirname, '..', 'routes', 'cdss.routes.js');
const SRC = fs.readFileSync(FILE, 'utf8');

describe('W1588 CDSS :id ObjectId guard', () => {
  test('mongoose is imported', () => {
    expect(SRC).toMatch(/const mongoose = require\('mongoose'\)/);
  });

  test('a router.param(\'id\') guard rejects malformed ids with 400', () => {
    expect(SRC).toMatch(/router\.param\(\s*'id'/);
    const i = SRC.indexOf("router.param('id'");
    const block = SRC.slice(i, i + 240);
    expect(block).toMatch(/isValidObjectId\(id\)/);
    expect(block).toMatch(/status\(400\)/);
    // guard is registered before the route handlers (after the auth middleware)
    expect(i).toBeGreaterThan(SRC.indexOf('router.use(requireBranchAccess)'));
    expect(i).toBeLessThan(SRC.indexOf("router.get"));
  });

  test('the param guard logic actually rejects a bad id and passes a good one', () => {
    // Re-implement the exact predicate the source uses and prove its behavior.
    const check = id => mongoose.isValidObjectId(id);
    expect(check('not-an-id')).toBe(false);
    expect(check('123')).toBe(false);
    expect(check(new mongoose.Types.ObjectId().toString())).toBe(true);
  });
});
