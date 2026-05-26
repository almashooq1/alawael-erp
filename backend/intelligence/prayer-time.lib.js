'use strict';

/**
 * prayer-time.lib.js — W473.
 *
 * Pure library for Saudi prayer-time-aware scheduling per Phase E
 * Innovation 9 (Cultural Intelligence Layer) of v3 lifecycle. Implements:
 *   • 5-daily-prayers + Friday-Khutbah-aware scheduling guards
 *   • Per-session prayer-break detection (sessions ≥60min crossing a
 *     prayer window need an embedded break)
 *   • Hijri date conversion helper (extends the existing
 *     DateConverterService finding from gap analysis)
 *
 * No DB calls. Pure functions. Caller passes in the times computed by
 * a real prayer-times provider (Aladhan API / pre-computed cache).
 *
 * Per CLAUDE.md memory: existing codebase already has Hijri converter;
 * this lib adds the prayer-time semantics on top.
 */

const PRAYERS = Object.freeze(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
// Friday-noon prayer (replaces dhuhr); held at the mosque from ~12:00-13:30
const FRIDAY_KHUTBAH_BUFFER_MINUTES = 90;

// Default "around prayer" buffer in minutes (no scheduling within this window)
const DEFAULT_AROUND_PRAYER_BUFFER = 20;

/**
 * Given a date + day's prayer times, return the prayer windows (each
 * with start/end + buffer applied).
 *
 * @param {Date} date
 * @param {Object} prayerTimes — { fajr, dhuhr, asr, maghrib, isha } as ISO times
 * @param {Object} [opts]
 * @param {number} [opts.bufferMinutes=20]
 * @returns {Array<{ prayer, start, end }>}
 */
function buildPrayerWindows(date, prayerTimes, opts = {}) {
  const buffer = opts.bufferMinutes ?? DEFAULT_AROUND_PRAYER_BUFFER;
  if (!prayerTimes || typeof prayerTimes !== 'object') return [];

  const windows = [];
  for (const p of PRAYERS) {
    const t = prayerTimes[p];
    if (!t) continue;
    const prayerTime = _parsePrayerTime(date, t);
    if (!prayerTime) continue;

    const start = new Date(prayerTime.getTime() - buffer * 60000);
    const end = new Date(prayerTime.getTime() + buffer * 60000);
    windows.push({ prayer: p, start, end });
  }

  // Friday Khutbah extends dhuhr window
  if (date.getDay() === 5) {
    const dhuhr = windows.find(w => w.prayer === 'dhuhr');
    if (dhuhr) {
      dhuhr.end = new Date(
        dhuhr.start.getTime() + (FRIDAY_KHUTBAH_BUFFER_MINUTES + buffer) * 60000
      );
    }
  }

  return windows;
}

function _parsePrayerTime(date, timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  // Accepts "HH:MM" 24h or ISO timestamps
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [hh, mm] = timeStr.split(':').map(Number);
    const d = new Date(date);
    d.setHours(hh, mm, 0, 0);
    return d;
  }
  const parsed = new Date(timeStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Check whether a proposed session [start, end] conflicts with any prayer
 * window for that day.
 *
 * @param {Date} sessionStart
 * @param {Date} sessionEnd
 * @param {Array<{prayer,start,end}>} prayerWindows
 * @returns {{ conflicts: boolean, conflictingPrayers: Array<string> }}
 */
function detectConflict(sessionStart, sessionEnd, prayerWindows) {
  if (!Array.isArray(prayerWindows) || prayerWindows.length === 0) {
    return { conflicts: false, conflictingPrayers: [] };
  }
  const conflicting = [];
  for (const w of prayerWindows) {
    if (sessionStart < w.end && sessionEnd > w.start) {
      conflicting.push(w.prayer);
    }
  }
  return { conflicts: conflicting.length > 0, conflictingPrayers: conflicting };
}

/**
 * Detect prayer crossings in a long session (≥60min). The session can
 * be scheduled with an embedded prayer break.
 *
 * @returns {Array<{ prayer, breakAt }>}
 */
function detectPrayerBreaks(sessionStart, sessionEnd, prayerWindows) {
  const duration = (sessionEnd - sessionStart) / 60000;
  if (duration < 60) return [];
  if (!Array.isArray(prayerWindows)) return [];

  const breaks = [];
  for (const w of prayerWindows) {
    // Prayer time falls strictly inside the session
    const prayerMid = new Date((w.start.getTime() + w.end.getTime()) / 2);
    if (prayerMid >= sessionStart && prayerMid <= sessionEnd) {
      breaks.push({ prayer: w.prayer, breakAt: prayerMid });
    }
  }
  return breaks;
}

/**
 * Suggest the nearest acceptable session slot avoiding all prayer windows.
 * Walks forward in 15-minute increments looking for a free slot.
 *
 * @param {Date} desiredStart
 * @param {number} durationMinutes
 * @param {Array<{prayer,start,end}>} prayerWindows
 * @param {number} [maxLookAheadMinutes=240]
 * @returns {{ adjustedStart: Date|null, adjustedEnd: Date|null, shiftedMinutes: number }}
 */
function suggestSlot(desiredStart, durationMinutes, prayerWindows, maxLookAheadMinutes = 240) {
  let candidateStart = new Date(desiredStart);
  let shifted = 0;
  while (shifted <= maxLookAheadMinutes) {
    const candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60000);
    const { conflicts } = detectConflict(candidateStart, candidateEnd, prayerWindows);
    if (!conflicts) {
      return { adjustedStart: candidateStart, adjustedEnd: candidateEnd, shiftedMinutes: shifted };
    }
    candidateStart = new Date(candidateStart.getTime() + 15 * 60000);
    shifted += 15;
  }
  return { adjustedStart: null, adjustedEnd: null, shiftedMinutes: shifted };
}

/**
 * Best-effort Hijri month resolver from Gregorian date. Returns the
 * approximate Hijri month-of-year (1-12). For exact Hijri conversion,
 * callers should use the existing DateConverterService (which uses a
 * proper Umm al-Qura calculation library).
 *
 * This helper is sufficient for Ramadan-detection use cases — the
 * Ramadan window (lunar month 9) overlaps slightly differently each
 * Gregorian year, so we expose a date-based prediction with explicit
 * `approximate: true` flag.
 */
function approximateHijriMonth(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  // Approximate Hijri epoch: 16 Jul 622 CE = 1 Muharram 1 AH
  // Average lunar month = 29.530588 days
  // Use Math floor + modulo to map to 1-12
  const HIJRI_EPOCH_MS = -42521817600000; // 622-07-16T00:00:00Z approximate
  const LUNAR_MONTH_MS = 29.530588 * 86400000;
  const monthsSinceEpoch = Math.floor((date.getTime() - HIJRI_EPOCH_MS) / LUNAR_MONTH_MS);
  const month = (monthsSinceEpoch % 12) + 1;
  const year = Math.floor(monthsSinceEpoch / 12) + 1;
  return { month, year, approximate: true };
}

function isApproximatelyRamadan(date) {
  const h = approximateHijriMonth(date);
  return h && h.month === 9;
}

module.exports = Object.freeze({
  buildPrayerWindows,
  detectConflict,
  detectPrayerBreaks,
  suggestSlot,
  approximateHijriMonth,
  isApproximatelyRamadan,
  // Constants
  PRAYERS,
  FRIDAY_KHUTBAH_BUFFER_MINUTES,
  DEFAULT_AROUND_PRAYER_BUFFER,
});
