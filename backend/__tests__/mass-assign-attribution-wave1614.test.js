'use strict';
/**
 * W1614 — approval/signature/verification ATTRIBUTION mass-assignment on create.
 *
 * `Model.create({ ...req.body, ... })` spread the client body into models whose approval /
 * signature / verification state is owned by a dedicated transition endpoint. `stripUpdateMeta`
 * only blocks identity/RBAC fields (role/permissions/password/createdBy) — it does NOT strip the
 * "who approved/signed/verified this and when" attribution. So a caller could POST a record already
 * stamped `approvedBy` / `signedBy` / `verifiedBy` — approval-workflow and clinical-signature
 * forgery. Fixed by wrapping the body in `stripApprovalAttribution()` at each create site.
 *
 * Two layers: (1) behavioral unit tests for the helper, (2) static drift guard on the 4 route files.
 */
const fs = require('fs');
const path = require('path');
const { stripApprovalAttribution, APPROVAL_ATTRIBUTION_FIELDS } = require('../utils/sanitize');

describe('W1614 stripApprovalAttribution helper', () => {
  test('strips approval + signature + verification attribution fields', () => {
    const out = stripApprovalAttribution({
      note: 'ok', amount: 5,
      approvedBy: 'x', approvedAt: new Date(), signedBy: 'y', signedAt: new Date(),
      verifiedBy: 'z', reviewedBy: 'w', finalizedBy: 'f', rejectedBy: 'r',
      endorsedBy: 'e', witnessedBy: 'v', closedBy: 'c', lockedBy: 'l',
    });
    expect(out).toEqual({ note: 'ok', amount: 5 });
    for (const f of ['approvedBy', 'signedBy', 'verifiedBy', 'reviewedBy', 'finalizedBy', 'rejectedBy']) {
      expect(out).not.toHaveProperty(f);
    }
  });

  test('keeps legitimate non-attribution fields incl. status/branchId (context-dependent, not stripped here)', () => {
    const out = stripApprovalAttribution({ status: 'pending', branchId: 'b1', title: 't', isActive: true });
    expect(out).toEqual({ status: 'pending', branchId: 'b1', title: 't', isActive: true });
  });

  test('non-object input passes through unchanged; returns a copy (no mutation)', () => {
    expect(stripApprovalAttribution(null)).toBeNull();
    expect(stripApprovalAttribution('x')).toBe('x');
    const src = { approvedBy: 'x', a: 1 };
    const out = stripApprovalAttribution(src);
    expect(src).toHaveProperty('approvedBy'); // original untouched
    expect(out).not.toHaveProperty('approvedBy');
  });

  test('field set covers the core actor+time attribution vocabulary', () => {
    for (const f of ['approvedBy', 'approvedAt', 'signedBy', 'signedAt', 'verifiedBy', 'reviewedBy']) {
      expect(APPROVAL_ATTRIBUTION_FIELDS.has(f)).toBe(true);
    }
    // status / signature payload deliberately NOT included (per-model context)
    expect(APPROVAL_ATTRIBUTION_FIELDS.has('status')).toBe(false);
    expect(APPROVAL_ATTRIBUTION_FIELDS.has('signature')).toBe(false);
  });
});

describe('W1614 create sites strip attribution', () => {
  const R = (f) => fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');
  const CASES = [
    ['branch-enhanced.routes.js', 'BeneficiaryTransfer.create'],
    ['eStamp.routes.js', 'new EStamp'],
    ['integratedCare.routes.js', 'TherapySession.create'],
    ['integratedCare.routes.js', 'CarePlan.create'],
    ['cpe-admin.routes.js', 'CpeRecord.create'],
  ];
  test.each(CASES)('%s — %s wraps body in stripApprovalAttribution, no bare ...req.body', (file, marker) => {
    const src = R(file);
    expect(src).toMatch(/stripApprovalAttribution/);
    // the specific create no longer spreads a bare req.body
    const idx = src.indexOf(marker);
    expect(idx).toBeGreaterThan(-1);
    const region = src.slice(idx, idx + 160);
    expect(region).not.toMatch(/\.\.\.\s*req\.body\b/);
    expect(region).toMatch(/\.\.\.\s*stripApprovalAttribution\(req\.body\)/);
  });
});
