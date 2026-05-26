'use strict';

/**
 * W465 drift guard — Complaint reasonable-adjustments + advocate linkage.
 *
 * Locks the additive Phase B extension to the existing Complaint model.
 * Per CRPD Article 13 (Access to justice) + Article 21 (Freedom of
 * expression) — complaint mechanisms must be accessible to persons
 * with disabilities.
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'Complaint.js'), 'utf8');

describe('W465 — Complaint reasonable-adjustments extension', () => {
  it('declares reasonableAdjustments[] subdoc array', () => {
    expect(SRC).toMatch(/reasonableAdjustments\s*:\s*\[/);
  });

  it('reasonableAdjustments entries declare type + description + grantedBy + grantedAt', () => {
    const block = SRC.match(/reasonableAdjustments\s*:\s*\[[\s\S]+?\]/)[0];
    expect(block).toMatch(/type\s*:/);
    expect(block).toMatch(/description\s*:/);
    expect(block).toMatch(/grantedBy\s*:/);
    expect(block).toMatch(/grantedAt\s*:/);
  });

  it('header documents CRPD Articles 13 + 21', () => {
    expect(SRC).toMatch(/CRPD Article 13/);
    expect(SRC).toMatch(/Article 21/);
  });
});

describe('W465 — Complaint advocate linkage', () => {
  it('declares advocateInvolved Boolean field with default false', () => {
    expect(SRC).toMatch(
      /advocateInvolved\s*:\s*\{\s*type:\s*Boolean[\s\S]+?default:\s*false/
    );
  });

  it('declares advocateUserId ref to User', () => {
    expect(SRC).toMatch(/advocateUserId\s*:[\s\S]+?ref:\s*['"]User['"]/);
  });

  it('declares advocateNotifiedAt Date field', () => {
    expect(SRC).toMatch(/advocateNotifiedAt\s*:[\s\S]+?type:\s*Date/);
  });
});

describe('W465 — Complaint voice-log + beneficiary linkages', () => {
  it('declares originVoiceLogId ref to BeneficiaryVoiceLog (W460)', () => {
    expect(SRC).toMatch(/originVoiceLogId\s*:[\s\S]+?ref:\s*['"]BeneficiaryVoiceLog['"]/);
  });

  it('declares beneficiaryId ref to Beneficiary', () => {
    expect(SRC).toMatch(/beneficiaryId\s*:[\s\S]+?ref:\s*['"]Beneficiary['"]/);
  });
});

describe('W465 — new indexes for query patterns', () => {
  it('declares index on beneficiaryId + status', () => {
    expect(SRC).toMatch(/index\(\s*\{\s*beneficiaryId:\s*1,\s*status:\s*1/);
  });

  it('declares index on advocateInvolved + status', () => {
    expect(SRC).toMatch(/index\(\s*\{\s*advocateInvolved:\s*1,\s*status:\s*1/);
  });
});

describe('W465 — Wave-18 invariant (advocate-required for beneficiary complaints)', () => {
  it('declares pre-save hook enforcing advocate on resolution', () => {
    expect(SRC).toMatch(/pre\(\s*['"]save['"]/);
    expect(SRC).toMatch(/beneficiary-related complaint cannot be resolved\/closed without advocateInvolved=true/);
  });

  it('checks both beneficiaryId AND source in {student, parent}', () => {
    expect(SRC).toMatch(/beneficiaryId\s*\|\|\s*\[['"]student['"],\s*['"]parent['"]/);
  });

  it('only blocks on terminal status (resolved + closed)', () => {
    const hookBlock = SRC.match(/closingWithoutAdvocate[\s\S]+?\}/)[0];
    expect(hookBlock).toMatch(/'resolved'/);
    expect(hookBlock).toMatch(/'closed'/);
  });

  it('references CRPD Article 12 + W464', () => {
    expect(SRC).toMatch(/CRPD Article 12[\s\S]+?W464/);
  });
});

describe('W465 — backward compatibility (additive only)', () => {
  it('Complaint still registers as model "Complaint"', () => {
    expect(SRC).toMatch(/mongoose\.model\(\s*['"]Complaint['"]/);
  });

  it('existing complaintId auto-generation preserved', () => {
    expect(SRC).toMatch(/complaintId\s*:\s*\{\s*type:\s*String,\s*unique:\s*true/);
    expect(SRC).toMatch(/await mongoose\.model\(['"]Complaint['"]\)\.countDocuments/);
  });

  it('existing required fields unchanged (subject + description + source + type)', () => {
    expect(SRC).toMatch(/subject\s*:\s*\{[^}]*required:\s*true/);
    expect(SRC).toMatch(/description\s*:\s*\{[^}]*required:\s*true/);
    expect(SRC).toMatch(/source\s*:\s*\{[^}]*required:\s*true/);
    expect(SRC).toMatch(/type\s*:\s*\{[^}]*required:\s*true/);
  });

  it('existing 4 indexes still present', () => {
    expect(SRC).toMatch(/index\(\s*\{\s*source:\s*1,\s*status:\s*1/);
    expect(SRC).toMatch(/index\(\s*\{\s*type:\s*1,\s*priority:\s*1/);
    expect(SRC).toMatch(/index\(\s*\{\s*assignedTo:\s*1/);
    expect(SRC).toMatch(/index\(\s*\{\s*createdAt:\s*-1/);
  });
});
