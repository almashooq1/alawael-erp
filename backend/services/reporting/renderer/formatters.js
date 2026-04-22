/**
 * formatters.js — locale-aware formatters for the reporting renderer.
 *
 * Phase 10 Commit 3.
 *
 * Pure functions. No external template engine. Arabic numerals stay
 * in Western digits by default (easier for downstream CSV / ops); the
 * `useArabicDigits` flag flips to Eastern Arabic-Indic digits for
 * consumer-facing PDFs / emails when the recipient expects them.
 *
 * All functions are null-safe and return a predictable empty string
 * ("—") for missing values so templates don't need to guard every
 * interpolation.
 */

'use strict';

const EMPTY = '—';

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicDigits(s) {
  return String(s).replace(/[0-9]/g, d => AR_DIGITS[+d]);
}

function isNumberish(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function pickLocale(locale) {
  return locale === 'en' ? 'en' : 'ar';
}

// ─── Date formatters ─────────────────────────────────────────────

const MONTHS_AR = [
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

const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDate(value, { locale = 'ar', useArabicDigits = false } = {}) {
  if (!value) return EMPTY;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const loc = pickLocale(locale);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = (loc === 'ar' ? MONTHS_AR : MONTHS_EN)[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  let out;
  if (loc === 'ar') out = `${day} ${month} ${year}`;
  else out = `${day} ${month} ${year}`;
  return useArabicDigits ? toArabicDigits(out) : out;
}

function formatDateTime(value, opts = {}) {
  if (!value) return EMPTY;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return EMPTY;
  const base = formatDate(value, opts);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;
  const out = `${base} — ${time}`;
  return opts.useArabicDigits ? toArabicDigits(out) : out;
}

function formatPeriodKey(periodKey, { locale = 'ar' } = {}) {
  if (!periodKey || typeof periodKey !== 'string') return EMPTY;
  const loc = pickLocale(locale);
  if (/^\d{4}$/.test(periodKey)) return periodKey;
  const w = periodKey.match(/^(\d{4})-W(\d{2})$/);
  if (w) return loc === 'ar' ? `الأسبوع ${w[2]} من ${w[1]}` : `Week ${w[2]} of ${w[1]}`;
  const m = periodKey.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const month = (loc === 'ar' ? MONTHS_AR : MONTHS_EN)[+m[2] - 1] || m[2];
    return `${month} ${m[1]}`;
  }
  const q = periodKey.match(/^(\d{4})-Q(\d)$/);
  if (q) return loc === 'ar' ? `الربع ${q[2]} من ${q[1]}` : `Q${q[2]} ${q[1]}`;
  const h = periodKey.match(/^(\d{4})-H(\d)$/);
  if (h) return loc === 'ar' ? `النصف ${h[2]} من ${h[1]}` : `H${h[2]} ${h[1]}`;
  return periodKey;
}

// ─── Number / percent / currency ─────────────────────────────────

function formatNumber(
  value,
  { locale = 'ar', maxFractionDigits = 2, useArabicDigits = false } = {}
) {
  if (!isNumberish(value)) return EMPTY;
  const factor = Math.pow(10, maxFractionDigits);
  const rounded = Math.round(value * factor) / factor;
  const parts = String(rounded).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const out = parts[1] ? `${intPart}.${parts[1]}` : intPart;
  if (locale === 'ar' && useArabicDigits) return toArabicDigits(out);
  return out;
}

function formatPercent(value, opts = {}) {
  if (!isNumberish(value)) return EMPTY;
  // Accept either a ratio (0..1) or an already-scaled percent (0..100).
  const asPercent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${formatNumber(asPercent, { ...opts, maxFractionDigits: opts.maxFractionDigits ?? 1 })}%`;
}

function formatCurrencySar(value, { locale = 'ar', useArabicDigits = false } = {}) {
  if (!isNumberish(value)) return EMPTY;
  const n = formatNumber(value, { locale, maxFractionDigits: 2, useArabicDigits });
  return locale === 'ar' ? `${n} ر.س` : `SAR ${n}`;
}

function formatDurationHours(hours, { locale = 'ar', useArabicDigits = false } = {}) {
  if (!isNumberish(hours)) return EMPTY;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const out = locale === 'ar' ? `${h} س ${m} د` : `${h}h ${m}m`;
  return useArabicDigits ? toArabicDigits(out) : out;
}

function formatList(items, { locale = 'ar', fallback = '' } = {}) {
  if (!Array.isArray(items) || !items.length) return fallback;
  const sep = locale === 'ar' ? '، ' : ', ';
  return items.filter(Boolean).join(sep);
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  EMPTY,
  toArabicDigits,
  formatDate,
  formatDateTime,
  formatPeriodKey,
  formatNumber,
  formatPercent,
  formatCurrencySar,
  formatDurationHours,
  formatList,
  escapeHtml,
};
