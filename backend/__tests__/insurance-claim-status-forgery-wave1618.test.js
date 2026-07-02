'use strict';
/**
 * W1618 — status/adjudication mass-assignment on InsuranceClaim create. `new InsuranceClaim(
 * { ...req.body })` spread the client body raw; the model's `status` enum includes
 * approved/partially_approved/paid, so a caller could create a claim already status:'approved'/'paid'
 * with forged adjudicated totals → an unsubmitted claim appears approved/paid (insurance fraud),
 * bypassing the submit/adjudication flow. Fixed with the file's own stripFinanceFields pattern
 * (W1599) + a CLAIM_PROTECTED list; status now defaults to 'draft'.
 */
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'finance-module.routes.js'), 'utf8');

describe('W1618 InsuranceClaim create strips lifecycle/adjudication fields', () => {
  test('CLAIM_PROTECTED declares status + adjudicated totals + external workflow states', () => {
    const m = SRC.match(/const CLAIM_PROTECTED\s*=\s*\[([^\]]*)\]/);
    expect(m).toBeTruthy();
    const list = m[1];
    for (const f of ['status', 'total_approved', 'total_rejected', 'prior_auth_status', 'nphies_status', 'submitted_at']) {
      expect(list).toContain("'" + f + "'");
    }
  });

  test('InsuranceClaim create wraps body in stripFinanceFields(req.body, CLAIM_PROTECTED), no bare body', () => {
    const i = SRC.indexOf('new InsuranceClaim({');
    expect(i).toBeGreaterThan(-1);
    const region = SRC.slice(i, i + 140);
    expect(region).toMatch(/\.\.\.\s*stripFinanceFields\(req\.body,\s*CLAIM_PROTECTED\)/);
    expect(region).not.toMatch(/\.\.\.\s*req\.body\b/);
  });
});
