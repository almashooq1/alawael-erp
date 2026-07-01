'use strict';

/**
 * W1579 — group-therapy member-injection + mass-assignment.
 *
 * The route is branch-isolated (param-hook ownership on groupId/groupSessionId/beneficiaryId
 * + bodyScopedBeneficiaryGuard + effectiveBranchScope on lists/dashboard). BUT the body guard
 * only checks the TOP-LEVEL beneficiaryId — so createGroup/updateGroup with a members:[{
 * beneficiaryId: <foreign> }] array, or createGroupSession with a memberAttendance:[{...}]
 * array, would inject cross-branch beneficiaries bypassing the guard (membership is meant to
 * flow through the guarded addMember endpoint; attendance through /complete). The validators
 * don't whitelist either, so status/currentSize/createdBy/isDeleted were also forge-able.
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'group-therapy', 'routes', 'group-therapy.routes.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1579 group-therapy member-injection + mass-assignment', () => {
  test('group create + update strip members[] (block foreign-member injection)', () => {
    expect(CODE).toMatch(/GROUP_SERVER_FIELDS = \[[^\]]*'members'/);
    const n = (CODE.match(/stripFields\(req\.body, GROUP_SERVER_FIELDS\)/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(CODE).not.toMatch(/updateGroup\(req\.params\.groupId, req\.body\)/);
  });

  test('session create strips memberAttendance[] + status', () => {
    expect(CODE).toMatch(/SESSION_SERVER_FIELDS = \[[^\]]*'memberAttendance'/);
    expect(CODE).toMatch(/SESSION_SERVER_FIELDS = \[[^\]]*'status'/);
    expect(CODE).toMatch(/stripFields\(req\.body, SESSION_SERVER_FIELDS\)/);
  });

  test('no raw ...req.body reaches a create/update service call', () => {
    expect(CODE).not.toMatch(/createGroup\(\{\s*\.\.\.req\.body/);
    expect(CODE).not.toMatch(/createGroupSession\(\{\s*\.\.\.req\.body/);
  });
});
