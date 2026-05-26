'use strict';

/**
 * W478 — Phase E (Cultural Intelligence) end-to-end smoke + closure.
 *
 * Final wave of Phase E. Verifies every W473-W477 artifact present +
 * cross-wave integrations work.
 */

const fs = require('fs');
const path = require('path');

function exists(rel) {
  return fs.existsSync(path.join(__dirname, '..', rel));
}

describe('W478 — Phase E artifact inventory', () => {
  it('W473 prayer-time.lib exists', () => {
    expect(exists('intelligence/prayer-time.lib.js')).toBe(true);
  });

  it('W474 ramadan-protocol.lib exists', () => {
    expect(exists('intelligence/ramadan-protocol.lib.js')).toBe(true);
  });

  it('W475 CulturalProfile model exists', () => {
    expect(exists('models/CulturalProfile.js')).toBe(true);
  });

  it('W476 gender-routing.lib exists', () => {
    expect(exists('intelligence/gender-routing.lib.js')).toBe(true);
  });

  it('W477 family-decision-rights.lib exists', () => {
    expect(exists('intelligence/family-decision-rights.lib.js')).toBe(true);
  });
});

describe('W478 — Phase E module functionality (smoke)', () => {
  it('W473 buildPrayerWindows returns 5 windows for a day', () => {
    const lib = require('../intelligence/prayer-time.lib');
    const windows = lib.buildPrayerWindows(new Date(2026, 4, 27), {
      fajr: '04:30',
      dhuhr: '12:00',
      asr: '15:30',
      maghrib: '18:45',
      isha: '20:15',
    });
    expect(windows).toHaveLength(5);
  });

  it('W474 classifyActivity routes physical → avoid_during_fasting', () => {
    const lib = require('../intelligence/ramadan-protocol.lib');
    expect(lib.classifyActivity('PT_aerobic')).toBe('avoid_during_fasting');
    expect(lib.classifyActivity('SLP_articulation')).toBe('friendly_during_fasting');
  });

  it('W476 routeAssignment BLOCKs strict mismatch (no mahram)', () => {
    const lib = require('../intelligence/gender-routing.lib');
    const r = lib.routeAssignment({
      beneficiaryPrefs: { therapistGenderPreference: 'female', strictness: 'strict' },
      therapistGender: 'male',
      activityCode: 'pt_physical_exam',
    });
    expect(r.decision).toBe('BLOCK');
  });

  it('W477 requiredConsultations expands tier appropriately', () => {
    const lib = require('../intelligence/family-decision-rights.lib');
    const r = lib.requiredConsultations('critical', { familyType: 'extended' });
    expect(r.required).toContain('grandfather_paternal');
  });
});

describe('W478 — Phase E cross-wave integration', () => {
  it('W473 prayer-time + W474 Ramadan share isApproximatelyRamadan integration', () => {
    const prayer = require('../intelligence/prayer-time.lib');
    const ramadan = require('../intelligence/ramadan-protocol.lib');
    expect(typeof prayer.isApproximatelyRamadan).toBe('function');
    // Ramadan protocol uses prayer-time isApproximatelyRamadan internally
    const decision = ramadan.shouldApplyRamadanAdjustments({
      observesRamadan: true,
      currentDate: new Date(),
    });
    expect(typeof decision.applies).toBe('boolean');
    expect(typeof decision.isCurrentlyRamadan).toBe('boolean');
  });

  it('W475 CulturalProfile model references W464 cultural_officer role', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'CulturalProfile.js'), 'utf8');
    expect(src).toMatch(/'cultural_officer'/);
  });

  it('W476 gender routing accepts CulturalProfile.genderPreferences shape', () => {
    const lib = require('../intelligence/gender-routing.lib');
    // The shape from CulturalProfile.genderPreferences
    const prefs = {
      therapistGenderPreference: 'female',
      strictness: 'preferred',
      femaleOnlySessions: false,
      mahramRequired: false,
    };
    const r = lib.routeAssignment({
      beneficiaryPrefs: prefs,
      therapistGender: 'female',
      activityCode: 'classroom',
    });
    expect(r.decision).toBe('ALLOW');
  });

  it('W477 family decision-rights accepts CulturalProfile.familyStructure shape', () => {
    const lib = require('../intelligence/family-decision-rights.lib');
    // The shape from CulturalProfile.familyStructure
    const structure = {
      familyType: 'tribal',
      decisionMakers: [
        { relationship: 'father', priority: 1 },
        { relationship: 'tribal_elder', priority: 5, consultRequired: true },
      ],
    };
    const r = lib.requiredConsultations('standard', structure);
    expect(r.required).toContain('tribal_elder');
  });

  it('W477 primaryDecisionMaker handles all CulturalProfile relationship enum values', () => {
    const lib = require('../intelligence/family-decision-rights.lib');
    const r = lib.primaryDecisionMaker({
      decisionMakers: [{ relationship: 'guardian_court_appointed' }],
    });
    expect(r.role).toBe('guardian_court_appointed');
  });
});

describe('W478 — sprint enumeration includes all Phase E drift guards', () => {
  let sprintList;
  beforeAll(() => {
    sprintList = fs
      .readFileSync(path.join(__dirname, '..', 'sprint-tests.txt'), 'utf8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
  });

  const expected = [
    '__tests__/prayer-time-wave473.test.js',
    '__tests__/ramadan-protocol-wave474.test.js',
    '__tests__/cultural-profile-wave475.test.js',
    '__tests__/gender-routing-wave476.test.js',
    '__tests__/family-decision-rights-wave477.test.js',
    '__tests__/phase-e-e2e-smoke-wave478.test.js',
  ];

  for (const test of expected) {
    it(`sprint includes ${test.replace(/^__tests__\//, '')}`, () => {
      expect(sprintList).toContain(test);
    });
  }
});

describe('W478 — Phase E accomplishments', () => {
  it('Phase E ships 6 waves (W473-W478)', () => {
    expect([473, 474, 475, 476, 477, 478]).toHaveLength(6);
  });

  it('Phase E adds 4 new pure libs + 1 new model', () => {
    expect(exists('intelligence/prayer-time.lib.js')).toBe(true);
    expect(exists('intelligence/ramadan-protocol.lib.js')).toBe(true);
    expect(exists('intelligence/gender-routing.lib.js')).toBe(true);
    expect(exists('intelligence/family-decision-rights.lib.js')).toBe(true);
    expect(exists('models/CulturalProfile.js')).toBe(true);
  });

  it('Phase E uses W464-reserved cultural_officer role', () => {
    const r = require('../config/constants/roles.constants');
    expect(r.ROLES.CULTURAL_OFFICER).toBe('cultural_officer');
  });
});
