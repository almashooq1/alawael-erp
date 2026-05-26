'use strict';

/**
 * W475 drift guard — CulturalProfile (Phase E Cultural Intelligence).
 *
 * Locks the per-beneficiary cultural preference profile that drives:
 * religious observance / gender + modesty / family structure / language
 * / communication / stigma sensitivity.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'models', 'CulturalProfile.js'), 'utf8');

describe('W475 — model registration', () => {
  it('registers as model "CulturalProfile"', () => {
    expect(SRC).toMatch(
      /mongoose\.models\.CulturalProfile\s*\|\|\s*mongoose\.model\(\s*['"]CulturalProfile['"]/
    );
  });

  it('uses canonical collection cultural_profiles', () => {
    expect(SRC).toMatch(/collection:\s*['"]cultural_profiles['"]/);
  });

  it('beneficiaryId is required + unique (1 profile per beneficiary)', () => {
    expect(SRC).toMatch(/beneficiaryId\s*:[\s\S]+?required:\s*true[\s\S]+?unique:\s*true/);
  });
});

describe('W475 — religious observance subdoc', () => {
  it('declares 6 fields including school of thought + medical exemption', () => {
    expect(SRC).toMatch(/observesRamadan/);
    expect(SRC).toMatch(/observesDailyPrayers/);
    expect(SRC).toMatch(/hasMedicalExemptionFromFasting/);
    expect(SRC).toMatch(/medicalExemptionDetails/);
    expect(SRC).toMatch(/observesFridayKhutbah/);
    expect(SRC).toMatch(/schoolOfThought/);
  });

  it('schoolOfThought enum includes 4 Sunni schools + other + unspecified', () => {
    expect(SRC).toMatch(/'hanafi'/);
    expect(SRC).toMatch(/'maliki'/);
    expect(SRC).toMatch(/'shafii'/);
    expect(SRC).toMatch(/'hanbali'/);
    expect(SRC).toMatch(/'unspecified'/);
  });

  it('default school is hanbali (Saudi)', () => {
    expect(SRC).toMatch(/schoolOfThought\s*:\s*\{[^}]*default:\s*['"]hanbali['"]/);
  });
});

describe('W475 — gender preferences subdoc', () => {
  it('therapistGenderPreference enum: male / female / no_preference', () => {
    expect(SRC).toMatch(
      /therapistGenderPreference[\s\S]+?'male'[\s\S]+?'female'[\s\S]+?'no_preference'/
    );
  });

  it('strictness enum: strict / preferred / flexible', () => {
    expect(SRC).toMatch(/strictness[\s\S]+?'strict'[\s\S]+?'preferred'[\s\S]+?'flexible'/);
  });

  it('declares femaleOnlySessions + mahramRequired + mahramRelationship', () => {
    expect(SRC).toMatch(/femaleOnlySessions/);
    expect(SRC).toMatch(/mahramRequired/);
    expect(SRC).toMatch(/mahramRelationship/);
  });
});

describe('W475 — modesty subdoc', () => {
  it('declares 6 modesty flags', () => {
    expect(SRC).toMatch(/hijabDuringTherapy/);
    expect(SRC).toMatch(/privateExamRoom/);
    expect(SRC).toMatch(/modestyDrapes/);
    expect(SRC).toMatch(/photoConsent/);
    expect(SRC).toMatch(/videoConsent/);
    expect(SRC).toMatch(/familyMembersInPhotosConsent/);
  });
});

describe('W475 — family structure subdoc', () => {
  it('declares decisionMakers array', () => {
    expect(SRC).toMatch(/decisionMakers\s*:\s*\[/);
  });

  it('decisionMaker relationship enum includes Saudi-context roles', () => {
    expect(SRC).toMatch(/'father'/);
    expect(SRC).toMatch(/'mother'/);
    expect(SRC).toMatch(/'grandfather_paternal'/);
    expect(SRC).toMatch(/'uncle_paternal'/);
    expect(SRC).toMatch(/'older_brother'/);
    expect(SRC).toMatch(/'tribal_elder'/);
    expect(SRC).toMatch(/'guardian_court_appointed'/);
  });

  it('declares 5 familyType values', () => {
    expect(SRC).toMatch(/'nuclear'/);
    expect(SRC).toMatch(/'extended'/);
    expect(SRC).toMatch(/'single_parent'/);
    expect(SRC).toMatch(/'guardian_only'/);
    expect(SRC).toMatch(/'tribal'/);
  });

  it('default familyType is extended (Saudi default)', () => {
    expect(SRC).toMatch(/familyType\s*:[\s\S]+?default:\s*['"]extended['"]/);
  });

  it('culturallySignificantEvents includes hajj + umrah + eids + national_day', () => {
    expect(SRC).toMatch(/'hajj'/);
    expect(SRC).toMatch(/'umrah'/);
    expect(SRC).toMatch(/'eid_al_fitr'/);
    expect(SRC).toMatch(/'eid_al_adha'/);
    expect(SRC).toMatch(/'national_day'/);
  });
});

describe('W475 — language + dialect', () => {
  it('arabicDialect enum includes Saudi regional variants', () => {
    expect(SRC).toMatch(/'najdi'/);
    expect(SRC).toMatch(/'hejazi'/);
    expect(SRC).toMatch(/'eastern'/);
    expect(SRC).toMatch(/'southern'/);
    expect(SRC).toMatch(/'bedouin'/);
    expect(SRC).toMatch(/'msa'/);
  });

  it('default dialect is najdi (Saudi central default)', () => {
    expect(SRC).toMatch(/arabicDialect\s*:[\s\S]+?default:\s*['"]najdi['"]/);
  });

  it('declares preferredCommunicationLanguage enum (ar/en/both)', () => {
    expect(SRC).toMatch(/preferredCommunicationLanguage[\s\S]+?'ar'[\s\S]+?'en'[\s\S]+?'both'/);
  });
});

describe('W475 — communication preferences', () => {
  it('declares whatsappAccepted + preferredChannel + acceptableContactHours', () => {
    expect(SRC).toMatch(/whatsappAccepted/);
    expect(SRC).toMatch(/preferredChannel/);
    expect(SRC).toMatch(/acceptableContactHours/);
  });

  it('preferredChannel enum includes 6 channels', () => {
    expect(SRC).toMatch(/'phone'/);
    expect(SRC).toMatch(/'sms'/);
    expect(SRC).toMatch(/'whatsapp'/);
    expect(SRC).toMatch(/'email'/);
    expect(SRC).toMatch(/'app_notification'/);
    expect(SRC).toMatch(/'in_person'/);
  });

  it('declares callRoutingThroughMaleGuardian (Saudi cultural context)', () => {
    expect(SRC).toMatch(/callRoutingThroughMaleGuardian/);
  });

  it('contact hours bounded 0-23', () => {
    expect(SRC).toMatch(/startHour\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*23/);
    expect(SRC).toMatch(/endHour\s*:\s*\{[^}]*min:\s*0[^}]*max:\s*23/);
  });
});

describe('W475 — stigma sensitivity', () => {
  it('declares 4 stigma flags', () => {
    expect(SRC).toMatch(/shareWithExtendedFamily/);
    expect(SRC).toMatch(/sharePhotosPublicly/);
    expect(SRC).toMatch(/anonymousResearchParticipation/);
    expect(SRC).toMatch(/protectSiblingPrivacy/);
  });
});

describe('W475 — Wave-18 invariants', () => {
  it('mahramRequired=true requires mahramRelationship', () => {
    expect(SRC).toMatch(/mahramRequired=true requires mahramRelationship/);
  });

  it('medical fasting exemption requires details ≥10 chars', () => {
    expect(SRC).toMatch(/hasMedicalExemptionFromFasting=true requires medicalExemptionDetails/);
  });

  it('acceptable contact hours: startHour < endHour', () => {
    expect(SRC).toMatch(/startHour must be < endHour/);
  });
});

describe('W475 — capturedByRole + indexes', () => {
  it('capturedByRole includes cultural_officer (W464 reservation)', () => {
    expect(SRC).toMatch(/'cultural_officer'/);
    expect(SRC).toMatch(/'social_worker'/);
    expect(SRC).toMatch(/'case_manager'/);
    expect(SRC).toMatch(/'family_self_report'/);
  });

  it('declares 2 query indexes (dialect + therapist gender)', () => {
    expect(SRC).toMatch(/index\(\s*\{\s*branchId:\s*1,\s*['"]language\.arabicDialect['"]/);
    expect(SRC).toMatch(
      /index\(\s*\{\s*branchId:\s*1,\s*['"]genderPreferences\.therapistGenderPreference['"]/
    );
  });
});
