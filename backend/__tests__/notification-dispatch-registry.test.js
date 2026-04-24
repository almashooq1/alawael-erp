'use strict';

/**
 * notification-dispatch-registry.test.js — Phase 16 C8 (4.0.73).
 */

const {
  PRIORITY_CHANNEL_MATRIX,
  BYPASS_PRIORITIES,
  DIGEST_ELIGIBLE_PRIORITIES,
  DEFAULT_QUIET_HOURS,
  DEFAULT_DIGEST_HOUR,
  SUPPORTED_CHANNELS,
  channelsForPriority,
  bypassesQuietHours,
  isDigestEligible,
  isInQuietHours,
  filterEnabledChannels,
  validate,
} = require('../config/notificationDispatch.registry');

describe('Notification dispatch registry — sanity', () => {
  it('has all four priorities mapped', () => {
    for (const p of ['critical', 'high', 'normal', 'low']) {
      expect(PRIORITY_CHANNEL_MATRIX[p]).toBeDefined();
      expect(PRIORITY_CHANNEL_MATRIX[p].length).toBeGreaterThan(0);
    }
  });

  it('frozen invariants', () => {
    expect(Object.isFrozen(PRIORITY_CHANNEL_MATRIX)).toBe(true);
    expect(Object.isFrozen(BYPASS_PRIORITIES)).toBe(true);
    expect(Object.isFrozen(DIGEST_ELIGIBLE_PRIORITIES)).toBe(true);
    expect(Object.isFrozen(SUPPORTED_CHANNELS)).toBe(true);
  });

  it('validate() passes', () => {
    expect(() => validate()).not.toThrow();
  });

  it('BYPASS_PRIORITIES contains critical', () => {
    expect(BYPASS_PRIORITIES).toContain('critical');
  });

  it('DIGEST_ELIGIBLE_PRIORITIES contains low + normal but not critical', () => {
    expect(DIGEST_ELIGIBLE_PRIORITIES).toContain('low');
    expect(DIGEST_ELIGIBLE_PRIORITIES).toContain('normal');
    expect(DIGEST_ELIGIBLE_PRIORITIES).not.toContain('critical');
  });
});

describe('Notification dispatch registry — helpers', () => {
  it('channelsForPriority returns matrix entry', () => {
    expect(channelsForPriority('critical')).toContain('sms');
    expect(channelsForPriority('normal')).toEqual(expect.arrayContaining(['email']));
  });

  it('channelsForPriority falls back to normal for unknown', () => {
    expect(channelsForPriority('unknown')).toEqual(channelsForPriority('normal'));
  });

  it('bypassesQuietHours true only for critical', () => {
    expect(bypassesQuietHours('critical')).toBe(true);
    expect(bypassesQuietHours('high')).toBe(false);
  });

  it('isDigestEligible true for low + normal', () => {
    expect(isDigestEligible('low')).toBe(true);
    expect(isDigestEligible('normal')).toBe(true);
    expect(isDigestEligible('high')).toBe(false);
    expect(isDigestEligible('critical')).toBe(false);
  });
});

describe('Notification dispatch registry — isInQuietHours', () => {
  it('honours enabled=false', () => {
    expect(isInQuietHours(23, { enabled: false, startHour: 22, endHour: 6 })).toBe(false);
  });

  it('non-wrapping window (09:00 → 12:00) works', () => {
    const w = { enabled: true, startHour: 9, endHour: 12 };
    expect(isInQuietHours(10, w)).toBe(true);
    expect(isInQuietHours(8, w)).toBe(false);
    expect(isInQuietHours(12, w)).toBe(false); // endHour exclusive
  });

  it('wrapping window (22:00 → 06:00) works', () => {
    const w = { enabled: true, startHour: 22, endHour: 6 };
    expect(isInQuietHours(23, w)).toBe(true);
    expect(isInQuietHours(3, w)).toBe(true);
    expect(isInQuietHours(6, w)).toBe(false); // endHour exclusive
    expect(isInQuietHours(12, w)).toBe(false);
  });

  it('empty window (start == end) always false', () => {
    expect(isInQuietHours(0, { enabled: true, startHour: 5, endHour: 5 })).toBe(false);
  });
});

describe('Notification dispatch registry — filterEnabledChannels', () => {
  it('strips channels disabled in prefs', () => {
    const prefs = {
      channelPreferences: { sms: { enabled: false }, email: { enabled: true } },
    };
    const out = filterEnabledChannels(['sms', 'email'], prefs);
    expect(out).toEqual(['email']);
  });

  it('keeps order', () => {
    const prefs = { channelPreferences: {} };
    const out = filterEnabledChannels(['push', 'email'], prefs);
    expect(out).toEqual(['push', 'email']);
  });
});
