/**
 * Enterprise-risk IDOR + mass-assignment + score-integrity guards (2026-06-29).
 * EnterpriseRisk is branch-scoped (camelCase branchId); the dashboard scoped
 * correctly but every other query omitted branchFilter. These lock the sweep +
 * the riskScore/branchId mass-assignment + the ObjectId guards.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/enterprise-risk.routes.js'), 'utf8');

describe('enterprise-risk — branch isolation', () => {
  test('GET /risks list is branch-scoped', () => {
    expect(SRC).toMatch(/const filter = \{ \.\.\.branchFilter\(req\) \}/);
  });
  test('PUT/DELETE/mitigations scope by branch on the :id lookup (3 sites)', () => {
    const count = (SRC.match(/_id: req\.params\.id, \.\.\.branchFilter\(req\)/g) || []).length;
    expect(count).toBe(3);
    // the old unscoped patterns are gone
    expect(SRC).not.toMatch(/Risk\.findByIdAndUpdate\(req\.params\.id/);
    expect(SRC).not.toMatch(/Risk\.findByIdAndDelete\(req\.params\.id\)/);
    expect(SRC).not.toMatch(/Risk\.findById\(req\.params\.id\)/);
  });
  test('dashboard risk counts are branch-scoped', () => {
    expect(SRC).toMatch(/Risk\.countDocuments\(\{ \.\.\._rs \}\)/);
    expect(SRC).not.toMatch(/Risk\.countDocuments\(\)\.catch/);
  });
});

describe('enterprise-risk — mass-assignment + score integrity', () => {
  test('create/update use the RISK_WRITABLE whitelist, not stripUpdateMeta on Risk', () => {
    expect((SRC.match(/pick\(req\.body, RISK_WRITABLE\)/g) || []).length).toBe(2);
  });
  test('the writable whitelist excludes computed/identity fields', () => {
    const start = SRC.indexOf('const RISK_WRITABLE = [');
    const block = SRC.slice(start, SRC.indexOf('];', start));
    for (const forbidden of ['riskScore', 'branchId', 'organizationId', 'createdBy', 'isDeleted']) {
      expect(block).not.toMatch(new RegExp(`'${forbidden}'`));
    }
  });
  test('PUT re-saves via .save() so the pre-save hook recomputes riskScore', () => {
    const i = SRC.indexOf("router.put(\n  '/risks/:id'");
    const block = SRC.slice(i >= 0 ? i : SRC.indexOf("'/risks/:id'"), (i >= 0 ? i : 0) + 1200);
    expect(SRC).toMatch(/Object\.assign\(risk, pick\(req\.body, RISK_WRITABLE\)\)/);
    expect(SRC).toMatch(/await risk\.save\(\)/);
  });
});

describe('enterprise-risk — ObjectId guards', () => {
  test('every :id mutation validates the id (4 sites)', () => {
    const count = (SRC.match(/mongoose\.isValidObjectId\(req\.params\.id\)/g) || []).length;
    expect(count).toBe(4);
  });
});
