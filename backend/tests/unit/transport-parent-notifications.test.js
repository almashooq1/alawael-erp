/**
 * Phase J — parentNotifications.service.js unit tests
 *
 * Pure-function tests. The dispatch wrapper is tested with an
 * injected notifier (no DB, no network).
 */
'use strict';

const svc = require('../../services/transport/parentNotifications.service');

describe('buildPickupMessage', () => {
  test('includes name + time + plate when available', () => {
    const out = svc.buildPickupMessage({
      beneficiary: { full_name_ar: 'أحمد محمد' },
      vehicle: { license_plate: 'ABC-1234' },
      when: new Date('2026-05-15T07:30:00Z'),
    });
    expect(out).toMatch(/أحمد محمد/);
    expect(out).toMatch(/ABC-1234/);
    expect(out).toMatch(/تم استلام/);
  });

  test('falls back to "الطفل" when name absent', () => {
    const out = svc.buildPickupMessage({});
    expect(out).toMatch(/الطفل/);
  });

  test('omits plate line when no vehicle', () => {
    const out = svc.buildPickupMessage({ beneficiary: { full_name_ar: 'سارة' } });
    expect(out).not.toMatch(/المركبة:/);
  });
});

describe('buildDropoffMessage', () => {
  test('produces Arabic dropoff message', () => {
    const out = svc.buildDropoffMessage({
      beneficiary: { full_name_ar: 'سارة' },
      when: new Date('2026-05-15T13:30:00Z'),
    });
    expect(out).toMatch(/تم توصيل سارة/);
    expect(out).toMatch(/المنزل/);
  });
});

describe('buildTripStartedMessage', () => {
  test('includes tracking URL when provided', () => {
    const out = svc.buildTripStartedMessage({
      trip: { trip_type: 'morning_pickup' },
      route: { route_name_ar: 'مسار حي النخيل' },
      vehicle: { license_plate: 'XYZ-99' },
      trackingUrl: 'https://example.com/track/abc.def.ghi',
    });
    expect(out).toMatch(/انطلقت رحلة/);
    expect(out).toMatch(/XYZ-99/);
    expect(out).toMatch(/https:\/\/example\.com\/track\/abc\.def\.ghi/);
  });

  test('omits tracking URL when absent', () => {
    const out = svc.buildTripStartedMessage({
      trip: { trip_type: 'morning_pickup' },
      route: { route_name_ar: 'مسار 1' },
    });
    expect(out).not.toMatch(/تتبع مباشر/);
  });
});

describe('buildDelayMessage', () => {
  test('shows delay + reason', () => {
    expect(svc.buildDelayMessage({ delayMinutes: 15, reason: 'ازدحام' })).toMatch(/15 دقيقة/);
    expect(svc.buildDelayMessage({ delayMinutes: 15, reason: 'ازدحام' })).toMatch(/ازدحام/);
  });

  test('omits reason line when not provided', () => {
    expect(svc.buildDelayMessage({ delayMinutes: 10 })).not.toMatch(/السبب:/);
  });
});

describe('getGuardianPhones', () => {
  test('extracts primary phones from populated guardians', () => {
    const phones = svc.getGuardianPhones({
      guardians: [
        { phone: '0501234567', name: 'أب' },
        { phone: '0509876543', name: 'أم' },
      ],
    });
    expect(phones).toEqual(['0501234567', '0509876543']);
  });

  test('deduplicates identical phones', () => {
    const phones = svc.getGuardianPhones({
      guardians: [{ phone: '0501234567' }, { phone: '0501234567' }],
    });
    expect(phones).toEqual(['0501234567']);
  });

  test('opts in alternatePhone when requested', () => {
    const phones = svc.getGuardianPhones(
      { guardians: [{ phone: '0501234567', alternatePhone: '0507654321' }] },
      { includeAlternate: true }
    );
    expect(phones).toEqual(['0501234567', '0507654321']);
  });

  test('falls back to legacy guardian_phone field', () => {
    expect(svc.getGuardianPhones({ guardian_phone: '0501111111' })).toEqual(['0501111111']);
  });

  test('returns [] for unpopulated guardians (ObjectIds)', () => {
    expect(svc.getGuardianPhones({ guardians: ['507f1f77bcf86cd799439011'] })).toEqual([]);
  });

  test('returns [] when no beneficiary', () => {
    expect(svc.getGuardianPhones(null)).toEqual([]);
    expect(svc.getGuardianPhones(undefined)).toEqual([]);
  });

  test('rejects too-short phones (< 9 digits)', () => {
    expect(svc.getGuardianPhones({ guardians: [{ phone: '12345' }] })).toEqual([]);
  });
});

describe('isOptedOut', () => {
  test('defaults to false (notifications enabled)', () => {
    expect(svc.isOptedOut({})).toBe(false);
    expect(svc.isOptedOut(null)).toBe(false);
  });

  test('respects transport_notifications_enabled flag', () => {
    expect(svc.isOptedOut({ transport_notifications_enabled: false })).toBe(true);
    expect(svc.isOptedOut({ transport_notifications_enabled: true })).toBe(false);
  });

  test('respects nested notification_preferences.transport', () => {
    expect(svc.isOptedOut({ notification_preferences: { transport: false } })).toBe(true);
    expect(svc.isOptedOut({ notificationPreferences: { transport: false } })).toBe(true);
    expect(svc.isOptedOut({ notification_preferences: { transport: true } })).toBe(false);
  });
});

describe('sendToGuardians (with injected notifier)', () => {
  test('calls notifier once per phone', async () => {
    const calls = [];
    const notifier = async args => {
      calls.push(args);
      return { success: true };
    };
    const out = await svc.sendToGuardians({
      beneficiary: { _id: 'b1', guardians: [{ phone: '0501111111' }, { phone: '0502222222' }] },
      body: 'test',
      templateKey: 'transport.test',
      notifier,
    });
    expect(out.sent).toBe(2);
    expect(calls).toHaveLength(2);
    expect(calls[0].to).toBe('0501111111');
    expect(calls[1].to).toBe('0502222222');
  });

  test('skips silently when opted out', async () => {
    const out = await svc.sendToGuardians({
      beneficiary: { transport_notifications_enabled: false, guardians: [{ phone: '0501111111' }] },
      body: 'test',
      notifier: () => Promise.reject(new Error('should not be called')),
    });
    expect(out.skipped).toBe('opted_out');
  });

  test('skips when no phone numbers', async () => {
    const out = await svc.sendToGuardians({
      beneficiary: { guardians: [] },
      body: 'test',
      notifier: () => Promise.reject(new Error('nope')),
    });
    expect(out.skipped).toBe('no_phone');
  });

  test('skips when missing body or beneficiary', async () => {
    expect((await svc.sendToGuardians({})).skipped).toBe('no_beneficiary_or_body');
    expect((await svc.sendToGuardians({ beneficiary: {}, body: '' })).skipped).toBe(
      'no_beneficiary_or_body'
    );
  });

  test('captures notifier failure as failed result, never throws', async () => {
    const notifier = async () => {
      throw new Error('SMS gateway down');
    };
    const out = await svc.sendToGuardians({
      beneficiary: { _id: 'b1', guardians: [{ phone: '0501111111' }] },
      body: 'test',
      notifier,
    });
    expect(out.sent).toBe(0);
    expect(out.results[0].success).toBe(false);
    expect(out.results[0].error).toMatch(/gateway/);
  });
});

describe('sendAsync (fire-and-forget)', () => {
  test('never throws even with bad inputs', () => {
    expect(() => svc.sendAsync({})).not.toThrow();
    expect(() => svc.sendAsync(null)).not.toThrow();
  });
});
