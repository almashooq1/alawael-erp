'use strict';

/**
 * W427 — anti-regression guard for atomic InsuranceClaim submission.
 *
 * Continuation of the W424/W425/W426 race-fix arc. `InsuranceClaim
 * .submitClaim()` was findById-then-mutate-then-save. Concurrent submit-
 * clicks (UI double-tap, API retry, automation race) could both pass the
 * `status === 'draft'` check, both flip to 'submitted', and both fire
 * downstream side-effects (audit log entry, NPHIES notification, etc.).
 *
 * W427 converted submitClaim to atomic
 *   findOneAndUpdate({_id, status: 'draft'}, {$set: ...})
 * which guarantees only ONE caller wins the transition.
 *
 * This guard prevents the pattern from coming back.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'services', 'finance', 'FinanceService.js');

describe('W427 InsuranceClaim submission atomic state-flip', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('submitClaim no longer uses findById-then-mutate-then-save', () => {
    // Strip comment lines so doc-references to the old pattern don't trip us.
    const noComments = src.replace(/^\s*\/\/.*$/gm, '');
    // The pre-W427 race pattern: `claim.status = 'submitted'` followed
    // shortly by `claim.save()`. After W427 both are gone — replaced by
    // findOneAndUpdate with the filter doing the gate.
    const submitClaimBody = noComments.match(
      /async\s+submitClaim\([^)]*\)\s*\{[\s\S]*?\n\s{0,4}\}/
    );
    expect(submitClaimBody).toBeTruthy();
    expect(submitClaimBody[0]).not.toMatch(/claim\.status\s*=\s*['"]submitted['"]/);
    expect(submitClaimBody[0]).not.toMatch(/claim\.save\(\)/);
  });

  it('submitClaim uses findOneAndUpdate with status:"draft" in the filter', () => {
    // Atomic state-flip: filter must include `status: 'draft'` to gate.
    expect(src).toMatch(
      /findOneAndUpdate\(\s*\{[^}]*_id:\s*claimId[^}]*status:\s*['"]draft['"][^}]*\}/
    );
  });

  it('submitClaim sets status to "submitted" in the $set update', () => {
    expect(src).toMatch(/\$set:\s*\{[^}]*status:\s*['"]submitted['"][^}]*\}/);
  });

  it('W427 marker comment present (catches accidental revert)', () => {
    expect(src).toMatch(/W427/);
  });

  it('still preserves the "already submitted" / "not found" error disambiguation', () => {
    // Caller-visible error messages stay the same so any UI strings keep working.
    expect(src).toMatch(/المطالبة غير موجودة/);
    expect(src).toMatch(/المطالبة تم تقديمها مسبقاً/);
  });

  it('still populates beneficiary_id and insurance_company_id on success', () => {
    // Behavioural compat — the returned doc shape must keep these populated.
    expect(src).toMatch(/\.populate\(['"]beneficiary_id insurance_company_id['"]\)/);
  });
});
