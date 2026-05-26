'use strict';

/**
 * W441 — anti-regression guard for CAS-gated promoteInquiry.
 *
 * `services/care/leadFunnel.service.js promoteInquiry()` pre-W441 did
 * findById → check → createLead (SLOW side-effect creating a Lead doc)
 * → save inquiry. Two concurrent promoteInquiry calls for the same
 * inquiry would both pass the check, BOTH call createLead → two
 * orphaned Lead records (sourceInquiryId points to the same inquiry
 * but only ONE is back-linked via inquiry.promotedLeadId).
 *
 * W441 fix: CAS reservation via the existing `promotedAt` field on
 * Inquiry. Atomic findOneAndUpdate with filter
 * `{_id, promotedAt: null, status: {\$ne: 'promoted_to_lead'}}` claims
 * the promotion. Only ONE caller wins; second errors out as
 * ConflictError BEFORE createLead fires. On createLead failure, the
 * reservation rolls back so a retry can succeed.
 *
 * Doesn't require Inquiry schema enum changes (no new 'promoting'
 * state) — uses existing fields.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'services', 'care', 'leadFunnel.service.js');

describe('W441 promoteInquiry CAS reservation', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('uses findOneAndUpdate as the CAS gate before createLead', () => {
    // Strip comments so doc-references don't confuse the match.
    const noComments = src.replace(/^\s*\/\/.*$/gm, '');
    const fn = noComments.match(/async function promoteInquiry\([\s\S]*?\n {2}\}/);
    expect(fn).toBeTruthy();
    // CAS filter has _id + promotedAt:null + status:{\$ne:'promoted_to_lead'}
    expect(fn[0]).toMatch(/findOneAndUpdate\(/);
    expect(fn[0]).toMatch(/promotedAt:\s*null/);
    expect(fn[0]).toMatch(/status:\s*\{\s*\$ne:\s*['"]promoted_to_lead['"]/);
  });

  it('createLead call appears AFTER the CAS reservation, not before', () => {
    const noComments = src.replace(/^\s*\/\/.*$/gm, '');
    const fn = noComments.match(/async function promoteInquiry\([\s\S]*?\n {2}\}/);
    const claimIdx = fn[0].indexOf('findOneAndUpdate');
    const createLeadIdx = fn[0].indexOf('createLead(');
    expect(claimIdx).toBeGreaterThan(-1);
    expect(createLeadIdx).toBeGreaterThan(claimIdx);
  });

  it('rolls back promotedAt on createLead failure (retry support)', () => {
    // The catch around createLead must reset promotedAt to null so a
    // retry can re-claim the reservation. Strip comments first because
    // the catch block has substantial inline docs explaining the
    // rollback rationale.
    const noComments = src.replace(/^\s*\/\/.*$/gm, '');
    expect(noComments).toMatch(
      /catch[\s\S]{0,400}findByIdAndUpdate\(\s*id\s*,\s*\{\s*\$set:\s*\{\s*promotedAt:\s*null/
    );
  });

  it('throws ConflictError when concurrent caller already won the claim', () => {
    // The null-result path must throw — message references "concurrent
    // caller" so callers can route the error as 409.
    expect(src).toMatch(/throw new ConflictError/);
    expect(src).toMatch(/concurrent caller|already being promoted/);
  });

  it('W441 marker comment present (catches accidental revert)', () => {
    expect(src).toMatch(/W441/);
  });

  it('preserves the original "Inquiry not found" and "already promoted" error paths', () => {
    expect(src).toMatch(/Inquiry not found/);
    expect(src).toMatch(/Inquiry already promoted/);
  });
});
