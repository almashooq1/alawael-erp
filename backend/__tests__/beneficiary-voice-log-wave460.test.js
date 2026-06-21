'use strict';

/**
 * W460 drift guard — BeneficiaryVoiceLog (Phase B Rights & Voice).
 *
 * Locks:
 *   • Model registered as 'BeneficiaryVoiceLog' with mongoose.models guard
 *   • 9 entryKind enum values (preference / dream / fear / dislike /
 *     daily_rating / session_rating / complaint / consent_change / request)
 *   • 4 captureModality enum values (verbal / aac / gesture / proxy)
 *   • 4 capacityGrade enum values (full / supported / shared / absent)
 *   • 6 capturedByRole enum values including 'advocate' (new Phase B role)
 *   • 5 actionTaken enum + linkages to Session + Consent + Complaint
 *   • Pre-save Wave-18 invariants:
 *      - proxy + capacity!=absent ⇒ supportArrangement required (≥10 chars)
 *      - daily_rating/session_rating ⇒ ratingValue + ratingScale
 *      - aac modality ⇒ aacSymbols[] populated
 *   • 3 indexes for query patterns
 *   • Canonical collection beneficiary_voice_logs
 *
 * Static analysis — no DB.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'BeneficiaryVoiceLog.js'), 'utf8');

describe('W460 — BeneficiaryVoiceLog model', () => {
  it('registers as model "BeneficiaryVoiceLog"', () => {
    expect(SRC).toMatch(
      /mongoose\.models\.BeneficiaryVoiceLog\s*\|\|\s*mongoose\.model\(\s*['"]BeneficiaryVoiceLog['"]/
    );
  });

  it('uses canonical collection beneficiary_voice_logs', () => {
    expect(SRC).toMatch(/collection:\s*['"]beneficiary_voice_logs['"]/);
  });

  it('beneficiaryId + branchId are required + indexed', () => {
    expect(SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]+?required:\s*true[\s\S]+?index:\s*true/);
    expect(SRC).toMatch(/branchId\s*:\s*\{[\s\S]+?required:\s*true[\s\S]+?index:\s*true/);
  });

  it('declares 9 entryKind enum values', () => {
    const kinds = [
      'preference',
      'dream',
      'fear',
      'dislike',
      'daily_rating',
      'session_rating',
      'complaint',
      'consent_change',
      'request',
    ];
    for (const k of kinds) {
      expect(SRC).toMatch(new RegExp(`'${k}'`));
    }
  });

  it('declares 4 captureModality values', () => {
    const block = SRC.match(/captureModality\s*:\s*\{[\s\S]+?\}/)[0];
    expect(block).toMatch(/'verbal'/);
    expect(block).toMatch(/'aac'/);
    expect(block).toMatch(/'gesture'/);
    expect(block).toMatch(/'proxy'/);
  });

  it('declares 4 capacityGrade values', () => {
    const block = SRC.match(/capacityGrade\s*:\s*\{[\s\S]+?required:\s*true/)[0];
    expect(block).toMatch(/'full'/);
    expect(block).toMatch(/'supported'/);
    expect(block).toMatch(/'shared'/);
    expect(block).toMatch(/'absent'/);
  });

  it('declares 6 capturedByRole values including "advocate"', () => {
    const block = SRC.match(/capturedByRole\s*:\s*\{[\s\S]+?required:\s*true/)[0];
    expect(block).toMatch(/'beneficiary'/);
    expect(block).toMatch(/'family'/);
    expect(block).toMatch(/'advocate'/);
    expect(block).toMatch(/'therapist'/);
    expect(block).toMatch(/'case_manager'/);
    expect(block).toMatch(/'cultural_officer'/);
  });

  it('declares actionTaken with 5 values + linkage refs to Session/Consent/Complaint', () => {
    expect(SRC).toMatch(/actionTaken\s*:/);
    expect(SRC).toMatch(/'plan_adjusted'/);
    expect(SRC).toMatch(/'complaint_opened'/);
    expect(SRC).toMatch(/'advocate_notified'/);
    expect(SRC).toMatch(/relatedSessionId\s*:[\s\S]+?ref:\s*['"]ClinicalSession['"]/);
    expect(SRC).toMatch(/relatedConsentId\s*:[\s\S]+?ref:\s*['"]Consent['"]/);
    expect(SRC).toMatch(/relatedComplaintId\s*:[\s\S]+?ref:\s*['"]Complaint['"]/);
  });

  it('declares content with text + audioUrl + aacSymbols + ratingValue/ratingScale', () => {
    expect(SRC).toMatch(/content\s*:\s*\{/);
    expect(SRC).toMatch(/aacSymbols\s*:/);
    expect(SRC).toMatch(/ratingValue\s*:[\s\S]+?min:\s*1[\s\S]+?max:\s*5/);
    expect(SRC).toMatch(/ratingScale\s*:/);
  });
});

describe('W460 — Wave-18 invariants (pre-save hooks)', () => {
  it('enforces proxy + non-absent requires supportArrangement ≥10 chars', () => {
    expect(SRC).toMatch(/proxy capture requires supportArrangement/);
  });

  it('enforces rating entries carry ratingValue + ratingScale', () => {
    expect(SRC).toMatch(/requires content\.ratingValue \+ ratingScale/);
  });

  it('enforces aac modality has aacSymbols populated', () => {
    expect(SRC).toMatch(/aac capture requires content\.aacSymbols\[\]/);
  });
});

describe('W460 — indexes', () => {
  it('declares the 3 expected query-pattern indexes', () => {
    expect(SRC).toMatch(/index\(\s*\{\s*beneficiaryId:\s*1,\s*capturedAt:\s*-1/);
    expect(SRC).toMatch(/index\(\s*\{\s*beneficiaryId:\s*1,\s*entryKind:\s*1/);
    expect(SRC).toMatch(/index\(\s*\{\s*branchId:\s*1,\s*entryKind:\s*1/);
  });
});

describe('W460 — Phase B Rights & Voice context', () => {
  it('header explicitly references CRPD Articles 7 + 12 + 21', () => {
    expect(SRC).toMatch(/CRPD/);
    expect(SRC).toMatch(/Article\s+7/);
    expect(SRC).toMatch(/12/);
    expect(SRC).toMatch(/21/);
  });

  it('header documents the anti-substitution doctrine', () => {
    expect(SRC).toMatch(/Anti-substitution doctrine/);
    expect(SRC).toMatch(/CRPD Article 12/);
  });

  it('supersession pattern uses supersededBy ref to self', () => {
    expect(SRC).toMatch(/supersededBy[\s\S]+?ref:\s*['"]BeneficiaryVoiceLog['"]/);
  });
});
