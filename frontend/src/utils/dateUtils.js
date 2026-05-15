/**
 * dateUtils — Date formatting, Hijri conversion, and relative time helpers.
 * مكتبة أدوات التاريخ — التنسيق، التحويل الهجري، والتاريخ النسبي
 */

// ---------------------------------------------------------------------------
// Internal helpers shared by calendar-aware APIs
// ---------------------------------------------------------------------------

/**
 * Resolve a raw date input (string | Date | null | undefined) to a valid Date
 * object, or null if the value is empty / invalid.
 * @param {string|Date|null|undefined} date
 * @returns {Date|null}
 */
function _resolve(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return isNaN(d.getTime()) ? null : d;
}

// Hijri locale tag used by Intl.DateTimeFormat
const HIJRI_LOCALE = 'ar-SA-u-ca-islamic-umalqura';
const GREGORIAN_LOCALE = 'ar-SA';

/**
 * Read the active calendar preference directly from localStorage.
 * Fallback: 'gregorian'. Safe to call outside React (services, utils, etc.).
 * @returns {'gregorian'|'hijri'}
 */
function _getActiveCalendar() {
  try {
    return localStorage.getItem('calendarType') || 'gregorian';
  } catch {
    return 'gregorian';
  }
}

// ---------------------------------------------------------------------------
// Calendar-aware formatting — accept calendarType directly (no hook dependency)
// ---------------------------------------------------------------------------

/**
 * Format a date according to the given calendarType.
 * Safe to call from anywhere (no hook required).
 *
 * @param {string|Date} date
 * @param {'gregorian'|'hijri'} calendarType
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export const formatDateByCalendar = (date, calendarType = 'gregorian', options = {}) => {
  const d = _resolve(date);
  if (!d) return '—';
  try {
    const locale = calendarType === 'hijri' ? HIJRI_LOCALE : GREGORIAN_LOCALE;
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    });
  } catch {
    return '—';
  }
};

/**
 * Format a date + time according to the given calendarType.
 *
 * @param {string|Date} date
 * @param {'gregorian'|'hijri'} calendarType
 * @returns {string}
 */
export const formatDateTimeByCalendar = (date, calendarType = 'gregorian') => {
  const d = _resolve(date);
  if (!d) return '—';
  try {
    const locale = calendarType === 'hijri' ? HIJRI_LOCALE : GREGORIAN_LOCALE;
    return d.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

/**
 * Return both Gregorian and Hijri representations for a dual-display label.
 * e.g. "15 مايو 2026 | 17 ذو القعدة 1447"
 *
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateDual = date => {
  const d = _resolve(date);
  if (!d) return '—';
  try {
    const greg = d.toLocaleDateString(GREGORIAN_LOCALE, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const hijri = d.toLocaleDateString(HIJRI_LOCALE, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `${greg} | ${hijri}`;
  } catch {
    return '—';
  }
};

// ---------------------------------------------------------------------------
// Hook re-export — use useDateFormatter() inside React components for
// auto re-render when the user toggles the calendar.
// ---------------------------------------------------------------------------

/**
 * React hook — returns calendar-aware formatting functions bound to the
 * current CalendarContext preference.
 * Must be used inside a React component.
 *
 * @returns {{ fmt: Function, fmtDT: Function, fmtDual: Function, calendarType: string, isHijri: boolean }}
 */
export { useDateFormatter } from '../contexts/CalendarContext';

// ---------------------------------------------------------------------------
// Auto calendar-aware shorthands (read localStorage, no hook required)
// ---------------------------------------------------------------------------

/**
 * Format a date — automatically uses the active calendar type (Hijri or Gregorian)
 * as stored in localStorage. No hook required; safe to call from anywhere.
 * @param {string|Date} date
 * @param {object} [options] — Intl.DateTimeFormat options
 * @returns {string}
 */
export const formatDate = (date, options = {}) =>
  formatDateByCalendar(date, _getActiveCalendar(), options);

/**
 * Format a date to Hijri calendar (always Hijri, regardless of preference).
 * Use this when you explicitly need the Hijri representation.
 * @param {string|Date} date
 * @param {object} [options]
 * @returns {string}
 */
export const formatHijri = (date, options = {}) =>
  formatDateByCalendar(date, 'hijri', { month: 'long', ...options });

/**
 * Format a date with time — automatically uses the active calendar type.
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateTime = date => formatDateTimeByCalendar(date, _getActiveCalendar());

// ---------------------------------------------------------------------------
// Relative time helpers
// ---------------------------------------------------------------------------

/**
 * Format time only (HH:MM).
 * @param {string|Date} date
 * @returns {string}
 */
export const formatTime = date => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

/**
 * Return a relative Arabic time string ("منذ 3 أيام", "منذ ساعة", etc.).
 * @param {string|Date} date
 * @returns {string}
 */
export const timeAgo = date => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);
    if (diffMin < 1) return 'الآن';
    if (diffMin < 60)
      return `منذ ${diffMin} ${diffMin === 1 ? 'دقيقة' : diffMin <= 10 ? 'دقائق' : 'دقيقة'}`;
    if (diffHour < 24)
      return `منذ ${diffHour} ${diffHour === 1 ? 'ساعة' : diffHour <= 10 ? 'ساعات' : 'ساعة'}`;
    if (diffDay < 30)
      return `منذ ${diffDay} ${diffDay === 1 ? 'يوم' : diffDay <= 10 ? 'أيام' : 'يوم'}`;
    if (diffMonth < 12)
      return `منذ ${diffMonth} ${diffMonth === 1 ? 'شهر' : diffMonth <= 10 ? 'أشهر' : 'شهر'}`;
    return `منذ ${diffYear} ${diffYear === 1 ? 'سنة' : diffYear <= 10 ? 'سنوات' : 'سنة'}`;
  } catch {
    return '';
  }
};

/**
 * Get start and end of a date (midnight to 23:59:59).
  const d = new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return { start, end };
};

/**
 * Get difference between two dates in days.
 * @param {string|Date} date1
 * @param {string|Date} date2
 * @returns {number}
 */
export const daysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
};

/**
 * Check if a date is today.
 * @param {string|Date} date
 * @returns {boolean}
 */
export const isToday = date => {
  const d = new Date(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a date is in the past.
 * @param {string|Date} date
 * @returns {boolean}
 */
export const isPast = date => new Date(date) < new Date();

/**
 * Check if a date is in the future.
 * @param {string|Date} date
 * @returns {boolean}
 */
export const isFuture = date => new Date(date) > new Date();

/**
 * Format date to YYYY-MM-DD for input fields.
 * @param {string|Date} date
 * @returns {string}
 */
export const toInputDate = date => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

/**
 * Arabic day names.
 */
export const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

/**
 * Arabic month names.
 */
export const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

/**
 * Hijri month names.
 */
export const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];

export default {
  formatDate,
  formatHijri,
  formatDateTime,
  formatTime,
  timeAgo,
  daysBetween,
  isToday,
  isPast,
  isFuture,
  toInputDate,
  ARABIC_DAYS,
  ARABIC_MONTHS,
  HIJRI_MONTHS,
};
