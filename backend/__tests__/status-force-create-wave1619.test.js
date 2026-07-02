'use strict';
/**
 * W1619 — status-forgery on create for two workflow docs whose files were unblocked by #972.
 * ContractAmendment (enum draft|approved|signed|rejected) and CpdRecord (enum pending|verified|
 * rejected) previously took the client's status via the body spread → a caller could create an
 * amendment already 'approved'/'signed' or a CPD record already 'verified', bypassing the
 * approve/verify workflow. Both now force the safe initial status after the spread.
 */
const fs = require('fs');
const path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');

describe('W1619 create forces safe initial status', () => {
  test('ContractAmendment.create forces status:draft after the body spread', () => {
    const src = R('contract-management.routes.js');
    const i = src.indexOf('ContractAmendment.create');
    expect(i).toBeGreaterThan(-1);
    const region = src.slice(i, i + 180);
    expect(region).toMatch(/\.\.\.\s*stripApprovalAttribution\(req\.body\)/);
    expect(region).toMatch(/status:\s*'draft'/);
  });

  test('CpdRecord.create forces status:pending after the body spread', () => {
    const src = R('elearning-enhanced.routes.js');
    const i = src.indexOf('const record = await CpdRecord.create');
    expect(i).toBeGreaterThan(-1);
    const region = src.slice(i, i + 180);
    expect(region).toMatch(/\.\.\.\s*stripApprovalAttribution\(req\.body\)/);
    expect(region).toMatch(/status:\s*'pending'/);
  });
});
