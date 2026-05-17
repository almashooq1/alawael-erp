'use strict';
/**
 * Tests for the activity-library-seed built-in activity catalogue.
 * Validates structure, required fields, uniqueness, and valid enum values.
 */

const VALID_DISCIPLINES = [
  'speech',
  'ot',
  'pt',
  'behavior',
  'special_ed',
  'psychology',
  'aac',
  'feeding',
  'play',
  'social_skills',
];
const VALID_DOMAINS = [
  'communication',
  'daily_living',
  'socialization',
  'motor_gross',
  'motor_fine',
  'cognitive',
  'behavioral',
  'self_care',
  'vocational',
  'academic',
  'sensory',
  'play',
  'emotional',
];
const VALID_DIFFICULTY = ['beginner', 'intermediate', 'advanced'];

const { BUILT_IN_ACTIVITIES } = require('../../rehabilitation-services/activity-library-seed');

describe('activity-library-seed — BUILT_IN_ACTIVITIES', () => {
  it('exports an array', () => {
    expect(Array.isArray(BUILT_IN_ACTIVITIES)).toBe(true);
  });

  it('contains at least 36 activities', () => {
    expect(BUILT_IN_ACTIVITIES.length).toBeGreaterThanOrEqual(36);
  });

  describe('each activity has required fields', () => {
    test.each(BUILT_IN_ACTIVITIES.map((a, i) => [a.activity_code || `index-${i}`, a]))(
      '%s — required fields present',
      (_code, activity) => {
        expect(typeof activity.activity_code).toBe('string');
        expect(activity.activity_code.length).toBeGreaterThan(0);
        expect(typeof activity.name_ar).toBe('string');
        expect(activity.name_ar.length).toBeGreaterThan(0);
        expect(typeof activity.discipline).toBe('string');
        expect(Array.isArray(activity.target_domains)).toBe(true);
        expect(activity.target_domains.length).toBeGreaterThan(0);
      }
    );
  });

  describe('each activity has valid enum values', () => {
    test.each(BUILT_IN_ACTIVITIES.map((a, i) => [a.activity_code || `index-${i}`, a]))(
      '%s — valid discipline',
      (_code, activity) => {
        expect(VALID_DISCIPLINES).toContain(activity.discipline);
      }
    );

    test.each(BUILT_IN_ACTIVITIES.map((a, i) => [a.activity_code || `index-${i}`, a]))(
      '%s — valid target_domains',
      (_code, activity) => {
        for (const domain of activity.target_domains) {
          expect(VALID_DOMAINS).toContain(domain);
        }
      }
    );

    test.each(
      BUILT_IN_ACTIVITIES.filter(a => a.difficulty).map((a, i) => [
        a.activity_code || `index-${i}`,
        a,
      ])
    )('%s — valid difficulty', (_code, activity) => {
      expect(VALID_DIFFICULTY).toContain(activity.difficulty);
    });
  });

  it('all activity_codes are unique', () => {
    const codes = BUILT_IN_ACTIVITIES.map(a => a.activity_code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('each activity with age_range has min_months <= max_months', () => {
    for (const a of BUILT_IN_ACTIVITIES) {
      if (a.age_range) {
        expect(a.age_range.min_months).toBeLessThanOrEqual(a.age_range.max_months);
      }
    }
  });

  it('each activity with instructions_steps has at least 2 steps', () => {
    for (const a of BUILT_IN_ACTIVITIES) {
      if (a.instructions_steps) {
        expect(a.instructions_steps.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('each activity with mastery_indicators has at least one indicator', () => {
    for (const a of BUILT_IN_ACTIVITIES) {
      if (a.mastery_indicators) {
        expect(a.mastery_indicators.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('contains at least one speech activity', () => {
    expect(BUILT_IN_ACTIVITIES.some(a => a.discipline === 'speech')).toBe(true);
  });

  it('contains at least one OT activity', () => {
    expect(BUILT_IN_ACTIVITIES.some(a => a.discipline === 'ot')).toBe(true);
  });

  it('contains at least one PT activity', () => {
    expect(BUILT_IN_ACTIVITIES.some(a => a.discipline === 'pt')).toBe(true);
  });

  it('contains at least one behavior activity', () => {
    expect(BUILT_IN_ACTIVITIES.some(a => a.discipline === 'behavior')).toBe(true);
  });
});
