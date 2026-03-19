/**
 * dateUtils — Date formatting, Hijri conversion, and relative time helpers.
 * مكتبة أدوات التاريخ — التنسيق، التحويل الهجري، والتاريخ النسبي
 */

/**
 * Format a date to Arabic locale string.
 * @param {string|Date} date — Date to format
 * @param {object} [options] — Intl.DateTimeFormat options
 * @returns {string}
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-SA', {
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
 * Format a date to Hijri calendar.
 * @param {string|Date} date
 * @param {object} [options]
 * @returns {string}
 */
export const formatHijri = (date, options = {}) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    });
  } catch {
    return '—';
  }
};

/**
 * Format a date with time.
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateTime = date => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('ar-SA', {
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
 * Relative time string (e.g., "منذ 5 دقائق").
 * @param {string|Date} date
 * @returns {string}
 */
export const timeAgo = date => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);

    if (diffSec < 60) return 'الآن';
    if (diffMin < 60)
      return `منذ ${diffMin} ${diffMin === 1 ? 'دقيقة' : diffMin <= 10 ? 'دقائق' : 'دقيقة'}`;
    if (diffHour < 24)
      return `منذ ${diffHour} ${diffHour === 1 ? 'ساعة' : diffHour <= 10 ? 'ساعات' : 'ساعة'}`;
    if (diffDay < 7)
      return `منذ ${diffDay} ${diffDay === 1 ? 'يوم' : diffDay <= 10 ? 'أيام' : 'يوم'}`;
    if (diffWeek < 5) return `منذ ${diffWeek} ${diffWeek === 1 ? 'أسبوع' : 'أسابيع'}`;
    if (diffMonth < 12)
      return `منذ ${diffMonth} ${diffMonth === 1 ? 'شهر' : diffMonth <= 10 ? 'أشهر' : 'شهر'}`;
    return formatDate(d);
  } catch {
    return '';
  }
};

/**
 * Get start and end of a date (midnight to 23:59:59).
 * @param {Date} date
 * @returns {{ start: Date, end: Date }}
 */
export const getDayRange = date => {
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
  getDayRange,
  daysBetween,
  isToday,
  isPast,
  isFuture,
  toInputDate,
  ARABIC_DAYS,
  ARABIC_MONTHS,
  HIJRI_MONTHS,
};
