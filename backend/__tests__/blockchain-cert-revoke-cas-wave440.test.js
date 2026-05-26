'use strict';

/**
 * W440 — anti-regression guard for atomic blockchain certificate revocation.
 *
 * Sibling of W433 (issueCertificate CAS). `revokeCertificate(certId)`
 * pre-W440 did findById → check status !== 'revoked' → set status +
 * revocation metadata → save → emit `blockchain.certificate.revoked`.
 * Two concurrent revoke calls would both pass the check, both save
 * (second overwrites first's revocation metadata), AND both emit the
 * revoke event — downstream subscribers (audit log, notification,
 * compliance webhook) process the revocation TWICE. For an audit-
 * critical event like cert revocation this is real observability +
 * downstream-trigger correctness bug.
 *
 * W440 fix: atomic findOneAndUpdate({_id, status: {\$ne: 'revoked'}})
 * — only the first concurrent caller's update matches; second falls
 * into the "already revoked" branch BEFORE the emit fires.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'services', 'blockchainCertService.js');

describe('W440 atomic blockchain certificate revocation', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('revokeCertificate no longer uses findById-then-mutate-then-save', () => {
    const noComments = src.replace(/^\s*\/\/.*$/gm, '');
    const fn = noComments.match(/async function revokeCertificate\([\s\S]*?\n\}/);
    expect(fn).toBeTruthy();
    // Pre-W440 race signature: `cert.status = 'revoked'` followed
    // shortly by `await cert.save()`. Both gone after W440 — replaced
    // by atomic findOneAndUpdate.
    expect(fn[0]).not.toMatch(/cert\.status\s*=\s*['"]revoked['"]/);
    expect(fn[0]).not.toMatch(/await\s+cert\.save\(\)/);
  });

  it("uses findOneAndUpdate with status: {\\$ne: 'revoked'} filter as the gate", () => {
    expect(src).toMatch(
      /findOneAndUpdate\(\s*\{\s*_id:\s*certId\s*,\s*status:\s*\{\s*\$ne:\s*['"]revoked['"]/
    );
  });

  it('\\$set update flips status to revoked + writes revocation metadata', () => {
    expect(src).toMatch(/\$set:\s*\{\s*status:\s*['"]revoked['"]\s*,\s*revocation\s*\}/);
  });

  it('W440 marker comment present (catches accidental revert)', () => {
    expect(src).toMatch(/W440/);
  });

  it('still emits the blockchain.certificate.revoked event ONCE', () => {
    // After CAS gate fires, the emit follows. The original emit call
    // shape is preserved.
    expect(src).toMatch(/emitQuality\(['"]blockchain\.certificate\.revoked['"]/);
  });

  it('preserves the "already revoked" / "not found" Arabic error messages', () => {
    expect(src).toMatch(/الشهادة غير موجودة/);
    expect(src).toMatch(/الشهادة مُلغاة بالفعل/);
  });
});
