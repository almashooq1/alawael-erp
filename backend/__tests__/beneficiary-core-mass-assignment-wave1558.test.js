'use strict';

/**
 * W1558 — POST/PUT /beneficiaries mass-assignment guard.
 *
 * The DDD create/update passed raw req.body into Model.create/findByIdAndUpdate with
 * no whitelist, so a caller could self-set privileged fields on the canonical PHI
 * entity: status, branchId (the beforeCreate hook only stamps branchId when the body
 * omits it → body WINS), accountVerified/accountStatus, createdBy/lastModifiedBy,
 * isArchived, progress. The routes now strip those before calling the service, and the
 * create branch is server-derived via effectiveBranchScope (req.user.branchId is never set).
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'core', 'routes', 'beneficiary.routes.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1558 beneficiary create/update mass-assignment guard', () => {
  test('the protected set includes the high-risk privileged fields', () => {
    for (const f of ['status', 'branchId', 'accountVerified', 'createdBy', 'isArchived', 'progress']) {
      expect(CODE).toMatch(new RegExp("'" + f + "'"));
    }
  });

  test('create + update strip req.body through stripProtectedFields', () => {
    expect((CODE.match(/stripProtectedFields\(req\.body\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  test('create derives branchId server-side (not the never-set req.user.branchId)', () => {
    const i = CODE.indexOf("router.post('/beneficiaries'");
    expect(i).toBeGreaterThan(-1);
    const createBlock = CODE.slice(i, i + 500);
    expect(createBlock).toMatch(/branchId: effectiveBranchScope\(req\)/);
    expect(createBlock).not.toMatch(/branchId: req\.user\?\.branchId/);
  });
});
