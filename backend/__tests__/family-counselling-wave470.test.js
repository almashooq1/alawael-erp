'use strict';

/**
 * W470 drift guard — FamilyCounsellingSession model.
 *
 * Locks the Family Counsellor workflow entity that:
 *   • tracks per-session encounters delivered by family_counsellor role (W464)
 *   • links to W467 FamilyWellbeingSnapshot via triggerSnapshotId
 *   • links to W460 BeneficiaryVoiceLog via triggerVoiceLogId
 *   • tracks 10 sessionType values + 9 triggerSource values
 *   • PDPL-aware (isSensitive flag + notesArchivedAt for TTL)
 *   • follow-up actions with status workflow
 *
 * Static analysis only.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'FamilyCounsellingSession.js'),
  'utf8'
);

describe('W470 — FamilyCounsellingSession registration', () => {
  it('registers as model "FamilyCounsellingSession"', () => {
    expect(SRC).toMatch(
      /mongoose\.models\.FamilyCounsellingSession\s*\|\|\s*mongoose\.model\(\s*['"]FamilyCounsellingSession['"]/
    );
  });

  it('uses canonical collection family_counselling_sessions', () => {
    expect(SRC).toMatch(/collection:\s*['"]family_counselling_sessions['"]/);
  });

  it('beneficiaryId + branchId + counsellorUserId all required', () => {
    expect(SRC).toMatch(/beneficiaryId\s*:[\s\S]+?required:\s*true/);
    expect(SRC).toMatch(/branchId\s*:[\s\S]+?required:\s*true/);
    expect(SRC).toMatch(/counsellorUserId\s*:[\s\S]+?required:\s*true/);
  });
});

describe('W470 — session metadata', () => {
  it('declares sessionDate required + indexed', () => {
    expect(SRC).toMatch(/sessionDate\s*:[\s\S]+?required:\s*true[\s\S]+?index:\s*true/);
  });

  it('declares durationMinutes bounded 5-240', () => {
    expect(SRC).toMatch(/durationMinutes\s*:[\s\S]+?min:\s*5[\s\S]+?max:\s*240/);
  });

  it('declares 10 sessionType enum values', () => {
    expect(SRC).toMatch(/'crisis_intervention'/);
    expect(SRC).toMatch(/'periodic_checkin'/);
    expect(SRC).toMatch(/'wbci_trigger_followup'/);
    expect(SRC).toMatch(/'sibling_support'/);
    expect(SRC).toMatch(/'caregiver_burnout'/);
    expect(SRC).toMatch(/'financial_consultation'/);
    expect(SRC).toMatch(/'extended_family_meeting'/);
    expect(SRC).toMatch(/'bereavement_support'/);
    expect(SRC).toMatch(/'pre_transition_planning'/);
    expect(SRC).toMatch(/'other'/);
  });

  it('declares 9 triggerSource enum values', () => {
    expect(SRC).toMatch(/'wbci_low_score'/);
    expect(SRC).toMatch(/'caregiver_burden_high'/);
    expect(SRC).toMatch(/'sibling_adjustment_low'/);
    expect(SRC).toMatch(/'financial_stress_high'/);
    expect(SRC).toMatch(/'family_self_requested'/);
    expect(SRC).toMatch(/'case_manager_referral'/);
    expect(SRC).toMatch(/'voice_log_complaint'/);
    expect(SRC).toMatch(/'safeguarding_followup'/);
    expect(SRC).toMatch(/'scheduled_routine'/);
  });

  it('declares 5 status enum values', () => {
    expect(SRC).toMatch(/'scheduled'/);
    expect(SRC).toMatch(/'in_progress'/);
    expect(SRC).toMatch(/'completed'/);
    expect(SRC).toMatch(/'no_show'/);
    expect(SRC).toMatch(/'cancelled'/);
  });
});

describe('W470 — attendees subdoc', () => {
  it('attendee role enum includes 9 values incl advocate + cultural_officer', () => {
    // attendees subdoc has nested enum array; check each value at file level
    expect(SRC).toMatch(/'primary_caregiver'/);
    expect(SRC).toMatch(/'secondary_caregiver'/);
    expect(SRC).toMatch(/'extended_family'/);
    expect(SRC).toMatch(/'sibling'/);
    expect(SRC).toMatch(/'beneficiary'/);
    expect(SRC).toMatch(/'advocate'/);
    expect(SRC).toMatch(/'social_worker'/);
    expect(SRC).toMatch(/'case_manager'/);
    expect(SRC).toMatch(/'cultural_officer'/);
  });

  it('attendee supports both registered userId and nameDisplay for non-registered', () => {
    // Locate attendees block by matching its end (nameDisplay line)
    expect(SRC).toMatch(/attendees\s*:\s*\[[\s\S]+?nameDisplay/);
    expect(SRC).toMatch(/userId\s*:\s*\{[^}]*ref:\s*['"]User['"]/);
    expect(SRC).toMatch(/nameDisplay\s*:\s*\{/);
  });
});

describe('W470 — trigger linkages (Phase B + C integration)', () => {
  it('triggerSnapshotId refs FamilyWellbeingSnapshot (W467)', () => {
    expect(SRC).toMatch(/triggerSnapshotId\s*:[\s\S]+?ref:\s*['"]FamilyWellbeingSnapshot['"]/);
  });

  it('triggerVoiceLogId refs BeneficiaryVoiceLog (W460)', () => {
    expect(SRC).toMatch(/triggerVoiceLogId\s*:[\s\S]+?ref:\s*['"]BeneficiaryVoiceLog['"]/);
  });
});

describe('W470 — outcome tracking', () => {
  it('declares preSessionWbci 0-100', () => {
    expect(SRC).toMatch(/preSessionWbci\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
  });

  it('declares postSessionConcernsAddressed 0-100', () => {
    expect(SRC).toMatch(/postSessionConcernsAddressed\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*100/);
  });

  it('declares followUpActions subdoc with status workflow', () => {
    expect(SRC).toMatch(/followUpActions\s*:\s*\[/);
    expect(SRC).toMatch(/'pending'/);
    expect(SRC).toMatch(/'in_progress'/);
    expect(SRC).toMatch(/'completed'/);
    expect(SRC).toMatch(/'cancelled'/);
  });
});

describe('W470 — Wave-18 invariants', () => {
  it('cancelled/no_show requires cancellationReason ≥5 chars', () => {
    expect(SRC).toMatch(/requires cancellationReason/);
  });

  it('completed session cannot have sessionDate in future', () => {
    expect(SRC).toMatch(/completed session cannot have sessionDate in future/);
  });

  it('followUpActions completion auto-fills completedAt', () => {
    expect(SRC).toMatch(/fa\.completedAt\s*=\s*new Date/);
  });
});

describe('W470 — PDPL awareness', () => {
  it('declares isSensitive default true (session notes are sensitive)', () => {
    expect(SRC).toMatch(/isSensitive\s*:\s*\{[^}]*default:\s*true/);
  });

  it('declares notesArchivedAt for TTL/retention tracking', () => {
    expect(SRC).toMatch(/notesArchivedAt/);
  });
});

describe('W470 — cultural sensitivity (Phase E forward-compat)', () => {
  it('declares culturalAccommodations array', () => {
    expect(SRC).toMatch(/culturalAccommodations\s*:\s*\[/);
  });
});

describe('W470 — indexes', () => {
  it('declares 3 query-pattern indexes', () => {
    expect(SRC).toMatch(/index\(\s*\{\s*beneficiaryId:\s*1,\s*sessionDate:\s*-1/);
    expect(SRC).toMatch(/index\(\s*\{\s*branchId:\s*1,\s*sessionDate:\s*-1,\s*sessionType:\s*1/);
    expect(SRC).toMatch(/index\(\s*\{\s*counsellorUserId:\s*1,\s*sessionDate:\s*-1/);
  });
});
