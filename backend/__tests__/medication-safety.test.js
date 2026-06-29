/**
 * Medication-safety guards (2026-06-29 medication bug-hunt). Static source guards.
 *
 * MAR (mar.routes.js):
 *  - /administer was read-then-write (findOne → check status → save) → two
 *    concurrent requests both passed the 409 check → DOUBLE administration of a
 *    dose. Now an atomic conditional findOneAndUpdate (status precondition).
 *  - /refuse + /hold had NO status precondition → could refuse an already-
 *    administered dose (overwriting its audit) or hold a given dose (held is
 *    re-administerable → a second dose). Now both carry a status precondition.
 *  - /administer no longer accepts a client-supplied administeredByName.
 *
 * pharmacy (pharmacy.routes.js):
 *  - PUT /prescriptions/:id passed `stripUpdateMeta(req.body)` (NOT a whitelist)
 *    → any caller could forge status/verifiedBy/beneficiary (self-verify, swap
 *    beneficiary, bypass /verify+/cancel). Now a clinical-fields whitelist.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MAR = fs.readFileSync(path.join(__dirname, '../routes/mar.routes.js'), 'utf8');
const PH = fs.readFileSync(path.join(__dirname, '../routes/pharmacy.routes.js'), 'utf8');

describe('MAR — administration state machine', () => {
  test('/administer transitions atomically with a status precondition', () => {
    // an atomic findOneAndUpdate conditioned on still-scheduled/held
    expect(MAR).toMatch(
      /findOneAndUpdate\(\s*\{ _id: req\.params\.id, \.\.\.branchFilter\(req\), status: \{ \$in: \['scheduled', 'held'\] \} \}/
    );
    expect(MAR).toMatch(/تم تعاطي الجرعة بالفعل/); // 409 on lost race
  });
  test('/administer does not accept a client administeredByName', () => {
    expect(MAR).not.toMatch(/administeredByName: req\.user\?\.name \|\| body\.administeredByName/);
  });
  test('/refuse only refuses a not-yet-given dose', () => {
    expect(MAR).toMatch(
      /status: 'refused',[\s\S]*?\}\s*\)/
    );
    // the refuse filter must carry the scheduled/held precondition
    const refuseIdx = MAR.indexOf("status: 'refused'");
    const before = MAR.slice(Math.max(0, refuseIdx - 400), refuseIdx);
    expect(before).toMatch(/status: \{ \$in: \['scheduled', 'held'\] \}/);
  });
  test('/hold only holds a scheduled dose', () => {
    const holdIdx = MAR.indexOf("{ status: 'held', notes:");
    const before = MAR.slice(Math.max(0, holdIdx - 300), holdIdx);
    expect(before).toMatch(/status: 'scheduled' \}/);
  });
});

describe('pharmacy — prescription update mass-assignment', () => {
  test('PUT /prescriptions/:id whitelists clinical fields (no stripUpdateMeta passthrough)', () => {
    expect(PH).toMatch(/PRESCRIPTION_UPDATABLE/);
    expect(PH).toMatch(/pick\(req\.body, PRESCRIPTION_UPDATABLE\)/);
  });
  test('the updatable whitelist excludes lifecycle/identity fields', () => {
    const start = PH.indexOf('const PRESCRIPTION_UPDATABLE = [');
    const block = PH.slice(start, PH.indexOf('];', start));
    expect(block).not.toMatch(/'status'/);
    expect(block).not.toMatch(/'verifiedBy'/);
    expect(block).not.toMatch(/'beneficiary'/);
  });
});
