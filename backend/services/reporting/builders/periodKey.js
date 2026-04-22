/**
 * periodKey.js — shared parser for the engine's periodKey grammar.
 *
 * Phase 10 Commit 7a.
 *
 * The scheduler produces keys in a small grammar that every real
 * builder needs to interpret:
 *
 *   daily       YYYY-MM-DD       '2026-04-22'
 *   weekly      YYYY-Www          '2026-W17'
 *   monthly     YYYY-MM           '2026-04'
 *   quarterly   YYYY-Q<n>         '2026-Q2'
 *   semiannual  YYYY-H<1|2>       '2026-H1'
 *   annual      YYYY              '2026'
 *
 * `parsePeriodKey(key)` returns `{ kind, start, end }` with inclusive
 * `start` (UTC midnight) and exclusive `end` (UTC midnight of the day
 * after the period). This is the form Mongoose `$gte/$lt` queries
 * prefer — callers don't need to know the arithmetic.
 *
 * Unknown shapes return `null` so callers can degrade cleanly.
 */

'use strict';

function utcDate(y, m, d) {
  return new Date(Date.UTC(y, m, d));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 3600 * 1000);
}

function isoWeekRange(year, week) {
  // ISO-8601: week 1 is the week containing the first Thursday of Jan.
  const jan4 = utcDate(year, 0, 4);
  const jan4DOW = jan4.getUTCDay() || 7; // Monday=1 ... Sunday=7
  const week1Monday = addDays(jan4, 1 - jan4DOW);
  const start = addDays(week1Monday, (week - 1) * 7);
  const end = addDays(start, 7);
  return { start, end };
}

function parsePeriodKey(periodKey) {
  if (!periodKey || typeof periodKey !== 'string') return null;
  const pk = periodKey.trim();

  // annual YYYY
  let m = pk.match(/^(\d{4})$/);
  if (m) {
    const y = +m[1];
    return { kind: 'annual', start: utcDate(y, 0, 1), end: utcDate(y + 1, 0, 1) };
  }

  // monthly YYYY-MM
  m = pk.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const y = +m[1];
    const mo = +m[2] - 1;
    return { kind: 'monthly', start: utcDate(y, mo, 1), end: utcDate(y, mo + 1, 1) };
  }

  // daily YYYY-MM-DD
  m = pk.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = +m[1];
    const mo = +m[2] - 1;
    const d = +m[3];
    const start = utcDate(y, mo, d);
    return { kind: 'daily', start, end: addDays(start, 1) };
  }

  // weekly YYYY-Www
  m = pk.match(/^(\d{4})-W(\d{2})$/);
  if (m) {
    const r = isoWeekRange(+m[1], +m[2]);
    return { kind: 'weekly', start: r.start, end: r.end };
  }

  // quarterly YYYY-Q<n>
  m = pk.match(/^(\d{4})-Q([1-4])$/);
  if (m) {
    const y = +m[1];
    const q = +m[2];
    const startMonth = (q - 1) * 3;
    return {
      kind: 'quarterly',
      start: utcDate(y, startMonth, 1),
      end: utcDate(y, startMonth + 3, 1),
    };
  }

  // semiannual YYYY-H<1|2>
  m = pk.match(/^(\d{4})-H([12])$/);
  if (m) {
    const y = +m[1];
    const h = +m[2];
    const startMonth = (h - 1) * 6;
    return {
      kind: 'semiannual',
      start: utcDate(y, startMonth, 1),
      end: utcDate(y, startMonth + 6, 1),
    };
  }

  return null;
}

/**
 * Parse a scopeKey of shape `type:id` or `type:id/sub` — returns
 * `{ type, id }` or null. Shared by every builder so the grammar stays
 * consistent with the recipientResolver.
 */
function parseScopeKey(scopeKey) {
  if (!scopeKey || typeof scopeKey !== 'string') return null;
  const idx = scopeKey.indexOf(':');
  if (idx === -1) return null;
  return { type: scopeKey.slice(0, idx), id: scopeKey.slice(idx + 1) };
}

module.exports = { parsePeriodKey, parseScopeKey, isoWeekRange };
