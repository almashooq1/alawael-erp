/**
 * CRM-enhanced branch-leak + mass-assignment guards (2026-06-30 hunt).
 * Every CRM model has required camelCase branchId; the :id routes are correctly
 * scoped (findOne({_id,...branchFilter})) but the ~11 list/stats/pipeline handlers
 * forgot it (the #736 "helper used in one handler, forgotten in the others" class):
 * they trusted an OPTIONAL req.query.branchId, so a restricted CRM user omitting
 * ?branchId got ALL branches' lead PII.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/crm-enhanced.routes.js'), 'utf8');

describe('crm-enhanced — every list/stats query is branch-scoped', () => {
  test('no handler trusts an optional client branchId for the filter', () => {
    expect(SRC).not.toMatch(/if \(branchId\) filter\.branchId = branchId/);
    expect(SRC).not.toMatch(/filter = branchId \?/);
    expect(SRC).not.toMatch(/const branchFilter = branchId \?/); // the local-var shadow
  });
  test('list handlers spread the enforced branchFilter(req)', () => {
    expect((SRC.match(/Object\.assign\(filter, branchFilter\(req\)\)/g) || []).length).toBe(8);
    expect((SRC.match(/\{ deletedAt: null, \.\.\.branchFilter\(req\) \}/g) || []).length).toBe(3);
  });
});

describe('crm-enhanced — lead mass-assignment', () => {
  test('create pins branchId to the caller branch (no body-planted cross-branch lead)', () => {
    expect(SRC).toMatch(/if \(req\.branchScope\?\.branchId\) data\.branchId = req\.branchScope\.branchId/);
  });
  test('PUT /leads/:id strips branchId + leadScore from the update body', () => {
    const i = SRC.indexOf("router.put('/leads/:id'");
    const block = SRC.slice(i, i + 1100);
    expect(block).toMatch(/delete updateData\.branchId/);
    expect(block).toMatch(/delete updateData\.leadScore/);
  });
});

describe('crm-enhanced — enroll state machine', () => {
  test('enroll only an active lead (not already-enrolled or lost)', () => {
    const i = SRC.indexOf("/leads/:id/enroll");
    const block = SRC.slice(i, i + 800);
    expect(block).toMatch(/status: \{ \$nin: \['enrolled', 'lost'\] \}/);
  });
});
