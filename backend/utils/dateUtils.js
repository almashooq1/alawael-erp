/**
 * dateUtils.js — Backend date formatting helpers (Hijri + Gregorian).
 * أدوات التاريخ في الخادم — التنسيق الهجري والميلادي
 *
 * Uses the native Intl.DateTimeFormat API (Node ≥ 13 with full ICU data).
 * No external dependencies required.
 *
 * Usage:
 *   const { formatDateHijri, formatDateGregorian, formatDateAuto } = require('@utils/dateUtils');
 *
 *   // In report generation — pass calendarType from user/org preferences:
 *   formatDateAuto(record.date, calendarType);   // 'hijri' | 'gregorian'
 *
 *   // Always Hijri:
 *   formatDateHijri(record.date);
 *
 *   // Always Gregorian:
 *   formatDateGregorian(record.date);
 */

'use strict';

const HIJRI_LOCALE = 'ar-SA-u-ca-islamic-umalqura';
const GREGORIAN_LOCALE = 'ar-SA';

/**
 * @param {string|Date|null} date
 * @returns {Date|null}
 */
function _resolve(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date to Arabic Gregorian.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
function formatDateGregorian(date, options = {}) {
  const d = _resolve(date);
  if (!d) return '—';
  try {
    return d.toLocaleDateString(GREGORIAN_LOCALE, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    });
  } catch {
    return d.toISOString().split('T')[0];
  }
}

/**
 * Format a date to Hijri (Umm al-Qura calendar).
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
function formatDateHijri(date, options = {}) {
  const d = _resolve(date);
  if (!d) return '—';
  try {
    return d.toLocaleDateString(HIJRI_LOCALE, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    });
  } catch {
    return formatDateGregorian(date, options);
  }
}

/**
 * Format date according to the provided calendarType.
 * Falls back to Gregorian if calendarType is unknown.
 *
 * @param {string|Date} date
 * @param {'gregorian'|'hijri'} [calendarType]
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
function formatDateAuto(date, calendarType = 'gregorian', options = {}) {
  return calendarType === 'hijri'
    ? formatDateHijri(date, options)
    : formatDateGregorian(date, options);
}

/**
 * Format a date + time according to calendarType.
 * @param {string|Date} date
 * @param {'gregorian'|'hijri'} [calendarType]
 * @returns {string}
 */
function formatDateTimeAuto(date, calendarType = 'gregorian') {
  const d = _resolve(date);
  if (!d) return '—';
  const locale = calendarType === 'hijri' ? HIJRI_LOCALE : GREGORIAN_LOCALE;
  try {
    return d.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d.toISOString().replace('T', ' ').slice(0, 16);
  }
}

/**
 * Return both Gregorian and Hijri representations.
 * Useful for official PDF reports that must show both.
 * e.g. "15 مايو 2026 | 17 ذو القعدة 1447"
 *
 * @param {string|Date} date
 * @returns {string}
 */
function formatDateDual(date) {
  const d = _resolve(date);
  if (!d) return '—';
  const greg = formatDateGregorian(d, { month: 'long' });
  const hijri = formatDateHijri(d);
  return `${greg} | ${hijri}`;
}

/**
 * Format a date to YYYY-MM-DD (ISO date part only).
 * Always Gregorian — used for DB queries and API params.
 * @param {string|Date} date
 * @returns {string}
 */
function toISODate(date) {
  const d = _resolve(date);
  if (!d) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Return the Hijri year for a given date.
 * Useful for fiscal/academic year labels in Saudi context.
 * @param {string|Date} [date] — defaults to now
 * @returns {number}
 */
function getHijriYear(date = new Date()) {
  const d = _resolve(date) || new Date();
  try {
    const parts = new Intl.DateTimeFormat(HIJRI_LOCALE, { year: 'numeric' })
      .formatToParts(d)
      .find(p => p.type === 'year');
    return parts ? parseInt(parts.value, 10) : new Date().getFullYear();
  } catch {
    return new Date().getFullYear();
  }
}

module.exports = {
  formatDateGregorian,
  formatDateHijri,
  formatDateAuto,
  formatDateTimeAuto,
  formatDateDual,
  toISODate,
  getHijriYear,
};
