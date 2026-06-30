/**
 * Contract-management mass-assignment + state-machine guards (2026-06-29 hunt).
 * Model Contract.model.js (camelCase branchId); branch isolation on reads is
 * already sound (scopedById/listScope). These lock the body-mass-assignment and
 * the renew/terminate/sign lifecycle.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '../routes/contract-management.routes.js'),
  'utf8'
);

describe('contract create/update — field whitelist', () => {
  test('POST + PUT use pickWritable, not raw ...req.body', () => {
    expect((SRC.match(/pickWritable\(req\.body\)/g) || []).length).toBe(2);
    // the contract create/update must not spread the raw body
    expect(SRC).not.toMatch(/Contract\.create\(\{\s*\.\.\.req\.body/);
    const putIdx = SRC.indexOf("router.put('/contracts/:id'");
    const putBlock = SRC.slice(putIdx, putIdx + 600);
    expect(putBlock).not.toMatch(/\.\.\.req\.body/);
    expect(putBlock).toMatch(/pickWritable\(req\.body\)/);
  });
  test('the writable whitelist excludes lifecycle/identity/audit fields', () => {
    const start = SRC.indexOf('const CONTRACT_WRITABLE = [');
    const block = SRC.slice(start, SRC.indexOf('];', start));
    for (const forbidden of ['status', 'branchId', 'contractNumber', 'executionDate', 'approvals', 'createdBy']) {
      expect(block).not.toMatch(new RegExp(`'${forbidden}'`));
    }
  });
});

describe('contract lifecycle — preconditions', () => {
  test('renew requires active/expired + validates months (positive integer, year units)', () => {
    const i = SRC.indexOf("router.post('/contracts/:id/renew'");
    const block = SRC.slice(i, i + 1800);
    expect(block).toMatch(/\['ACTIVE', 'EXPIRED'\]\.includes\(contract\.status\)/);
    expect(block).toMatch(/Number\.isInteger\(months\)/);
    expect(block).toMatch(/year\|annual\|سن/);
  });
  test('terminate requires active/suspended + stores reason in termination (not notes)', () => {
    const i = SRC.indexOf("/contracts/:id/terminate");
    const block = SRC.slice(i, i + 900);
    expect(block).toMatch(/status: \{ \$in: \['ACTIVE', 'SUSPENDED'\] \}/);
    expect(block).toMatch(/'termination\.terminationForCause': reason/);
    expect(block).not.toMatch(/status: 'TERMINATED', notes: reason/);
  });
  test('sign rejects terminated/expired contracts + validates partyId', () => {
    const i = SRC.indexOf("/contracts/:id/sign");
    const block = SRC.slice(i, i + 900);
    expect(block).toMatch(/\['TERMINATED', 'EXPIRED'\]\.includes\(contract\.status\)/);
    expect(block).toMatch(/isValidObjectId\(partyId\)/);
  });
});
