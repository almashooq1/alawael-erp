'use strict';

/**
 * cctv-alert-rules.test.js — Phase 27.
 *
 * Validates the DEFAULT_RULES shape so the alert engine has a sane
 * baseline. No DB.
 */

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const alertService = require('../services/cctv/alertService');

describe('alertService.DEFAULT_RULES', () => {
  test('covers the critical event types', () => {
    const types = alertService.DEFAULT_RULES.map(r => r.matchType);
    expect(types).toEqual(
      expect.arrayContaining([
        'fall_detected',
        'fight_detected',
        'fire_smoke',
        'intrusion',
        'video_loss',
        'disk_failure',
        'tampering',
      ])
    );
  });

  test('every rule has id/threshold/windowMs/severity/category/title_ar', () => {
    for (const r of alertService.DEFAULT_RULES) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.threshold).toBe('number');
      expect(r.threshold).toBeGreaterThan(0);
      expect(typeof r.windowMs).toBe('number');
      expect(['low', 'medium', 'high', 'critical']).toContain(r.severity);
      expect(typeof r.category).toBe('string');
      expect(typeof r.title_ar).toBe('string');
      expect(r.title_ar.length).toBeGreaterThan(0);
    }
  });

  test('rule ids are unique', () => {
    const ids = alertService.DEFAULT_RULES.map(r => r.id);
    const uniq = new Set(ids);
    expect(uniq.size).toBe(ids.length);
  });

  test('critical events have threshold=1 (single-shot)', () => {
    const critical = alertService.DEFAULT_RULES.filter(r =>
      ['fall_detected', 'fight_detected', 'fire_smoke', 'intrusion'].includes(r.matchType)
    );
    for (const r of critical) {
      expect(r.threshold).toBe(1);
    }
  });
});
