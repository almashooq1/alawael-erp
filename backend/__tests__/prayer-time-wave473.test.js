'use strict';

/**
 * W473 drift guard — Prayer-time aware scheduling (Phase E).
 *
 * Locks 5-prayer windows + Friday Khutbah extension + conflict detection
 * + slot suggestion + approximate Hijri month resolver.
 */

const lib = require('../intelligence/prayer-time.lib');

describe('W473 — module surface', () => {
  it('exports public API', () => {
    expect(typeof lib.buildPrayerWindows).toBe('function');
    expect(typeof lib.detectConflict).toBe('function');
    expect(typeof lib.detectPrayerBreaks).toBe('function');
    expect(typeof lib.suggestSlot).toBe('function');
    expect(typeof lib.approximateHijriMonth).toBe('function');
    expect(typeof lib.isApproximatelyRamadan).toBe('function');
  });

  it('exposes 5 canonical prayers + Friday Khutbah buffer', () => {
    expect(lib.PRAYERS).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
    expect(lib.FRIDAY_KHUTBAH_BUFFER_MINUTES).toBe(90);
    expect(lib.DEFAULT_AROUND_PRAYER_BUFFER).toBe(20);
  });

  it('module is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });
});

describe('W473 — buildPrayerWindows', () => {
  const sampleDate = new Date('2026-05-27T00:00:00Z');
  const sampleTimes = {
    fajr: '04:30',
    dhuhr: '12:00',
    asr: '15:30',
    maghrib: '18:45',
    isha: '20:15',
  };

  it('returns 5 windows for 5 prayer times', () => {
    const r = lib.buildPrayerWindows(sampleDate, sampleTimes);
    expect(r).toHaveLength(5);
  });

  it('each window has prayer + start + end', () => {
    const r = lib.buildPrayerWindows(sampleDate, sampleTimes);
    for (const w of r) {
      expect(lib.PRAYERS).toContain(w.prayer);
      expect(w.start).toBeInstanceOf(Date);
      expect(w.end).toBeInstanceOf(Date);
      expect(w.end.getTime()).toBeGreaterThan(w.start.getTime());
    }
  });

  it('default buffer is 20 min around each prayer (so window = 40 min wide)', () => {
    const r = lib.buildPrayerWindows(sampleDate, sampleTimes);
    const dhuhr = r.find(w => w.prayer === 'dhuhr');
    const widthMin = (dhuhr.end - dhuhr.start) / 60000;
    expect(widthMin).toBe(40);
  });

  it('honors custom buffer option', () => {
    const r = lib.buildPrayerWindows(sampleDate, sampleTimes, { bufferMinutes: 30 });
    const dhuhr = r.find(w => w.prayer === 'dhuhr');
    const widthMin = (dhuhr.end - dhuhr.start) / 60000;
    expect(widthMin).toBe(60);
  });

  it('Friday extends dhuhr window by Khutbah buffer (90 min)', () => {
    // Need a Friday — use 2026-05-29 which is a Friday
    const friday = new Date('2026-05-29T00:00:00Z');
    expect(friday.getDay()).toBe(5);
    const r = lib.buildPrayerWindows(friday, sampleTimes);
    const dhuhr = r.find(w => w.prayer === 'dhuhr');
    const widthMin = (dhuhr.end - dhuhr.start) / 60000;
    expect(widthMin).toBeGreaterThan(40); // extended
  });

  it('returns empty for null/missing prayer times', () => {
    expect(lib.buildPrayerWindows(sampleDate, null)).toEqual([]);
    expect(lib.buildPrayerWindows(sampleDate, {})).toEqual([]);
  });
});

describe('W473 — detectConflict (local-time semantics)', () => {
  // Use local-time Date constructor so prayer "12:00" + session "11:30"
  // share the same timezone interpretation. The lib treats "HH:MM"
  // prayer times as local; tests should match.
  const sampleDate = new Date(2026, 4, 27); // 27 May 2026 local
  const windows = lib.buildPrayerWindows(sampleDate, {
    fajr: '04:30',
    dhuhr: '12:00',
    asr: '15:30',
    maghrib: '18:45',
    isha: '20:15',
  });

  it('returns conflict when session crosses dhuhr', () => {
    const sStart = new Date(2026, 4, 27, 11, 30);
    const sEnd = new Date(2026, 4, 27, 12, 30);
    const r = lib.detectConflict(sStart, sEnd, windows);
    expect(r.conflicts).toBe(true);
    expect(r.conflictingPrayers).toContain('dhuhr');
  });

  it('returns no conflict for session in clear time', () => {
    const sStart = new Date(2026, 4, 27, 9, 0);
    const sEnd = new Date(2026, 4, 27, 10, 0);
    const r = lib.detectConflict(sStart, sEnd, windows);
    expect(r.conflicts).toBe(false);
    expect(r.conflictingPrayers).toEqual([]);
  });

  it('detects multiple-prayer conflict for long session', () => {
    const sStart = new Date(2026, 4, 27, 11, 0);
    const sEnd = new Date(2026, 4, 27, 16, 30);
    const r = lib.detectConflict(sStart, sEnd, windows);
    expect(r.conflicts).toBe(true);
    expect(r.conflictingPrayers.length).toBeGreaterThan(1);
  });

  it('returns no conflict for empty windows', () => {
    const sStart = new Date(2026, 4, 27, 11, 0);
    const sEnd = new Date(2026, 4, 27, 12, 0);
    const r = lib.detectConflict(sStart, sEnd, []);
    expect(r.conflicts).toBe(false);
  });
});

describe('W473 — detectPrayerBreaks', () => {
  const sampleDate = new Date(2026, 4, 27);
  const windows = lib.buildPrayerWindows(sampleDate, {
    fajr: '04:30',
    dhuhr: '12:00',
    asr: '15:30',
    maghrib: '18:45',
    isha: '20:15',
  });

  it('returns empty for sessions <60min', () => {
    const sStart = new Date(2026, 4, 27, 11, 30);
    const sEnd = new Date(2026, 4, 27, 12, 15);
    expect(lib.detectPrayerBreaks(sStart, sEnd, windows)).toEqual([]);
  });

  it('returns embedded break for long session crossing dhuhr', () => {
    const sStart = new Date(2026, 4, 27, 11, 0);
    const sEnd = new Date(2026, 4, 27, 13, 0);
    const breaks = lib.detectPrayerBreaks(sStart, sEnd, windows);
    expect(breaks.length).toBeGreaterThanOrEqual(1);
    expect(breaks[0].prayer).toBe('dhuhr');
    expect(breaks[0].breakAt).toBeInstanceOf(Date);
  });

  it('returns multiple breaks for very long sessions', () => {
    const sStart = new Date(2026, 4, 27, 11, 0);
    const sEnd = new Date(2026, 4, 27, 17, 0);
    const breaks = lib.detectPrayerBreaks(sStart, sEnd, windows);
    expect(breaks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('W473 — suggestSlot', () => {
  const sampleDate = new Date(2026, 4, 27);
  const windows = lib.buildPrayerWindows(sampleDate, {
    fajr: '04:30',
    dhuhr: '12:00',
    asr: '15:30',
    maghrib: '18:45',
    isha: '20:15',
  });

  it('returns desired slot when no conflict', () => {
    const desired = new Date(2026, 4, 27, 9, 0);
    const r = lib.suggestSlot(desired, 30, windows);
    expect(r.shiftedMinutes).toBe(0);
    expect(r.adjustedStart.getTime()).toBe(desired.getTime());
  });

  it('shifts slot forward past conflicting prayer', () => {
    const desired = new Date(2026, 4, 27, 11, 45); // crosses dhuhr 12:00
    const r = lib.suggestSlot(desired, 30, windows);
    expect(r.shiftedMinutes).toBeGreaterThan(0);
    expect(r.adjustedStart).not.toBeNull();
  });

  it('returns null adjustedStart when no slot within lookAhead', () => {
    const fakeWindows = [
      { prayer: 'fajr', start: new Date(2026, 4, 27, 0, 0), end: new Date(2026, 4, 28, 0, 0) },
    ];
    const r = lib.suggestSlot(new Date(2026, 4, 27, 8, 0), 30, fakeWindows, 120);
    expect(r.adjustedStart).toBeNull();
  });
});

describe('W473 — Hijri approximation', () => {
  it('returns month + year + approximate flag', () => {
    const r = lib.approximateHijriMonth(new Date('2026-05-27T00:00:00Z'));
    expect(r).not.toBeNull();
    expect(typeof r.month).toBe('number');
    expect(typeof r.year).toBe('number');
    expect(r.approximate).toBe(true);
    expect(r.month).toBeGreaterThanOrEqual(1);
    expect(r.month).toBeLessThanOrEqual(12);
  });

  it('returns null for invalid date', () => {
    expect(lib.approximateHijriMonth('not a date')).toBeNull();
    expect(lib.approximateHijriMonth(null)).toBeNull();
  });

  it('isApproximatelyRamadan returns boolean', () => {
    const r = lib.isApproximatelyRamadan(new Date('2026-05-27T00:00:00Z'));
    expect(typeof r).toBe('boolean');
  });
});
