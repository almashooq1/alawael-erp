'use strict';

/**
 * W433 — anti-regression guard for atomic blockchain certificate issuance.
 *
 * Pre-W433 `issueCertificate(certId)` was findById → check status ===
 * 'draft' → adapter.anchor() (SLOW blockchain RPC) → set status='issued'
 * → save. Two concurrent issueCertificate(certId) calls would both pass
 * the status check and BOTH call adapter.anchor() — submitting TWO
 * blockchain transactions for the same cert with different
 * transactionHash values. Wasted gas, divergent on-chain history, lost
 * audit trail.
 *
 * W433 introduced a CAS reservation: atomic findOneAndUpdate flips
 * status draft → issuing BEFORE the anchor call. The second concurrent
 * caller errors out before paying for a duplicate blockchain
 * transaction. On anchor failure, the reservation reverts to 'draft'
 * so a future retry can succeed.
 *
 * Added 'issuing' to the BlockchainCertificate status enum to support
 * the intermediate state.
 */

const fs = require('fs');
const path = require('path');

const SERVICE = path.join(__dirname, '..', 'services', 'blockchainCertService.js');
const MODEL = path.join(__dirname, '..', 'models', 'blockchain.model.js');

describe('W433 atomic blockchain certificate issuance (CAS reservation)', () => {
  describe('blockchain.model.js — status enum', () => {
    let src;
    beforeAll(() => {
      src = fs.readFileSync(MODEL, 'utf8');
    });

    it("includes 'issuing' as an intermediate state in the status enum", () => {
      expect(src).toMatch(
        /enum:\s*\[\s*'draft'\s*,\s*'issuing'\s*,\s*'issued'\s*,\s*'verified'\s*,\s*'revoked'\s*,\s*'expired'\s*\]/
      );
    });

    it('W433 marker comment present (catches accidental revert)', () => {
      expect(src).toMatch(/W433/);
    });
  });

  describe('blockchainCertService.js — issueCertificate CAS reservation', () => {
    let src;
    beforeAll(() => {
      src = fs.readFileSync(SERVICE, 'utf8');
    });

    it('no longer uses findById-then-check-status pattern in issueCertificate', () => {
      // Strip comment lines so doc-references to the old pattern don't trip us.
      const noComments = src.replace(/^\s*\/\/.*$/gm, '');
      const fn = noComments.match(/async function issueCertificate\([\s\S]*?\n\}/);
      expect(fn).toBeTruthy();
      // Pre-W433: `const cert = await BlockchainCertificate.findById(certId);`
      // immediately followed by `if (cert.status !== 'draft')` check.
      // After W433 both are gone — replaced by findOneAndUpdate CAS.
      expect(fn[0]).not.toMatch(/findById\(certId\);[\s\S]{0,100}status\s*!==\s*['"]draft['"]/);
    });

    it("uses findOneAndUpdate with status: 'draft' filter to flip to 'issuing'", () => {
      // The atomic reservation: filter requires status==='draft', $set
      // flips to 'issuing'. Must appear inside issueCertificate.
      expect(src).toMatch(
        /findOneAndUpdate\(\s*\{\s*_id:\s*certId\s*,\s*status:\s*['"]draft['"][\s\S]{0,200}\$set:\s*\{\s*status:\s*['"]issuing['"]/
      );
    });

    it('reverts status back to draft on adapter.anchor() failure (retry support)', () => {
      // After anchor fails, the catch branch must $set status back to
      // 'draft' so a future retry can re-claim the reservation.
      expect(src).toMatch(
        /findByIdAndUpdate\(\s*certId\s*,\s*\{\s*\$set:\s*\{\s*status:\s*['"]draft['"]/
      );
    });

    it('W433 marker comment present (catches accidental revert)', () => {
      expect(src).toMatch(/W433/);
    });

    it('still throws 404 / 400 errors with the original Arabic messages', () => {
      // Behavioural compat — UI strings preserved.
      expect(src).toMatch(/الشهادة غير موجودة/);
      expect(src).toMatch(/لا يمكن إصدار شهادة ليست في حالة مسودة/);
    });
  });
});
