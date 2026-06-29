/**
 * Insurance-claims integrity guards (2026-06-29 hunt). Static source guards.
 * Model: models/insuranceClaim.model.js (InsuranceClaim/ClaimItem/InsuranceContract).
 * Branch isolation is via the beneficiary ref (fetchScopedByBeneficiary) — that's
 * already correct; these guards lock the money/state-machine/IDOR fixes.
 *
 * - PUT /claims/:id used stripUpdateMeta (a prototype-pollution blacklist, NOT a
 *   field whitelist) → any in-branch user could forge status:'paid' + payment +
 *   adjudication + totalNet (money fabrication + state-machine bypass). Now a
 *   clinical/admin field whitelist (CLAIM_UPDATABLE).
 * - /adjudicate had no status precondition + accepted negative/over amounts.
 * - DELETE /claim-items/:id had no ownership check + no ObjectId guard (IDOR).
 * - contracts GET/DELETE lacked an ObjectId guard (CastError 500).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/insuranceClaims.routes.js'), 'utf8');

describe('PUT /claims/:id — field whitelist (no money/state mass-assignment)', () => {
  test('uses a CLAIM_UPDATABLE whitelist, not stripUpdateMeta passthrough', () => {
    expect(SRC).toMatch(/const CLAIM_UPDATABLE = \[/);
    const put = SRC.slice(SRC.indexOf("router.put('/claims/:id'"), SRC.indexOf("router.put('/claims/:id'") + 600);
    expect(put).toMatch(/for \(const k of CLAIM_UPDATABLE\)/);
    expect(put).not.toMatch(/stripUpdateMeta\(req\.body\)/);
  });
  test('whitelist excludes money + lifecycle + identity fields', () => {
    const start = SRC.indexOf('const CLAIM_UPDATABLE = [');
    const block = SRC.slice(start, SRC.indexOf('];', start));
    for (const forbidden of ['status', 'payment', 'adjudication', 'totalNet', 'totalGross', 'beneficiary', 'contract']) {
      expect(block).not.toMatch(new RegExp(`'${forbidden}'`));
    }
  });
});

describe('/adjudicate — amount + state-machine guards', () => {
  test('approvedAmount validator is non-negative (isFloat min:0)', () => {
    expect(SRC).toMatch(/body\('approvedAmount'\)\.isFloat\(\{ min: 0 \}\)/);
  });
  test('rejects adjudicating a settled/draft claim', () => {
    expect(SRC).toMatch(/NON_ADJUDICABLE\s*=\s*\[/);
    const idx = SRC.indexOf('NON_ADJUDICABLE =');
    const block = SRC.slice(idx, idx + 200);
    for (const s of ['draft', 'paid', 'cancelled', 'voided']) {
      expect(block).toMatch(new RegExp(`'${s}'`));
    }
  });
  test('rejects approvedAmount over the claim net', () => {
    expect(SRC).toMatch(/approvedAmount\) > claim\.totalNet/);
  });
});

describe('DELETE /claim-items/:id — ownership + ObjectId guard', () => {
  test('validates the id and verifies the parent claim beneficiary is in scope', () => {
    const idx = SRC.indexOf("router.delete('/claim-items/:id'");
    const block = SRC.slice(idx, idx + 1200);
    expect(block).toMatch(/mongoId\('id'\), validate/);
    expect(block).toMatch(/assertBeneficiaryInScope\(req, claim\.beneficiary, res\)/);
    expect(block).not.toMatch(/ClaimItem\.findByIdAndUpdate\(\s*req\.params\.id/);
  });
});

describe('contracts GET/DELETE — ObjectId guard', () => {
  test('GET + DELETE /contracts/:id validate the id', () => {
    expect(SRC).toMatch(/router\.get\('\/contracts\/:id', \[mongoId\('id'\), validate\]/);
    expect(SRC).toMatch(/router\.delete\('\/contracts\/:id', \[mongoId\('id'\), validate\]/);
  });
});
