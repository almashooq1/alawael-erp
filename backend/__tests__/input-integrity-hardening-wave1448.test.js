'use strict';

/**
 * W1448 — input-integrity + finance-correctness hardening drift guards.
 *
 * Locks four isolated defects fixed together (deep bug-hunt, round 3):
 *
 *  1. complaints-enhanced POST/PUT mass-assignment: the create route is only
 *     `authenticate`-gated, so spreading `...req.body` into `new ComplaintV2(...)`
 *     let any logged-in user self-set status / slaBreached / escalationLevel /
 *     resolved-closed timestamps — filing a complaint already "closed" with a cleared
 *     SLA breach, evading the open-complaint / SLA-breach quality dashboards. Fixed by
 *     field whitelists (status transitions go through POST /:id/status).
 *
 *  2/3. generic HR CRUD PATCH (hr-modules) + employee-goal PATCH (hr-extensions)
 *     omitted `runValidators`, so an invalid enum / negative-money / out-of-range
 *     weight update silently persisted (Mongoose skips validators on updates by default).
 *
 *  4. finance trial-balance summed `line.debit_amount`/`line.credit_amount`, but the
 *     JournalEntry line schema declares `debit`/`credit` — so every balance was 0 and
 *     the report falsely reported "balanced".
 */

const fs = require('fs');
const path = require('path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('W1448 complaints anti-mass-assignment', () => {
  const src = read('routes/complaints-enhanced.routes.js');

  test('ComplaintV2 create + update use the pickFields whitelist, not ...req.body', () => {
    expect(src).toMatch(/pickFields\(req\.body,\s*COMPLAINT_CREATABLE\)/);
    expect(src).toMatch(/pickFields\(req\.body,\s*COMPLAINT_UPDATABLE\)/);
    // the ComplaintV2 constructor must NOT spread raw req.body
    expect(src).not.toMatch(/new ComplaintV2\(\{\s*\.\.\.req\.body/);
  });

  test('sensitive workflow/SLA fields are excluded from both whitelists', () => {
    const grab = n => {
      const m = src.match(new RegExp('const ' + n + ' = \\[([^\\]]*)\\]'));
      return m ? m[1] : '';
    };
    const all = grab('COMPLAINT_CREATABLE') + grab('COMPLAINT_UPDATABLE');
    for (const f of [
      'status',
      'slaBreached',
      'escalationLevel',
      'resolvedAt',
      'closedAt',
      'slaDueAt',
      'satisfactionRating',
      'qualityFlag',
      'complaintNumber',
      'branchId',
    ]) {
      expect(all).not.toContain(`'${f}'`);
    }
  });
});

describe('W1448 HR update runValidators', () => {
  test('generic HR CRUD update enables runValidators', () => {
    const src = read('routes/hr/hr-modules.routes.js');
    expect(src).toMatch(/\$set:\s*stripUpdateMeta\(req\.body\)[\s\S]{0,240}runValidators:\s*true/);
  });

  test('employee-goal update enables runValidators', () => {
    const src = read('routes/hr/hr-extensions.routes.js');
    expect(src).toMatch(/\$set:\s*update[\s\S]{0,240}runValidators:\s*true/);
  });
});

describe('W1448 finance trial-balance field names', () => {
  const src = read('routes/finance-module.routes.js');

  test('reads JournalEntry line.debit / line.credit (not the non-existent *_amount fields)', () => {
    expect(src).toMatch(/balances\[accId\]\.debit \+= line\.debit \|\|/);
    expect(src).toMatch(/balances\[accId\]\.credit \+= line\.credit \|\|/);
    expect(src).not.toMatch(/line\.debit_amount/);
    expect(src).not.toMatch(/line\.credit_amount/);
  });
});
