/**
 * Centralized formatting utilities.
 * Eliminates duplicate formatCurrency / formatNumber functions across the codebase.
 */

// ── Currency ──────────────────────────────────────────────────────
const currencyFormatter = new Intl.NumberFormat('ar-SA', {
  style: 'currency',
  currency: 'SAR',
  minimumFractionDigits: 2,
});

/**
 * Formats a number as Saudi Riyal currency (ر.س).
 * @param {number} value
 * @returns {string}
 */
export const formatCurrency = value => currencyFormatter.format(value || 0);

// ── Number ────────────────────────────────────────────────────────
const numberFormatter = new Intl.NumberFormat('ar-EG');

/**
 * Formats a number with Arabic-Egyptian locale. Returns '—' for non-finite input.
 * @param {number} value
 * @returns {string}
 */
export const formatNumber = value =>
  typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : '—';
