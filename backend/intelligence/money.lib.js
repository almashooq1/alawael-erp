'use strict';

/**
 * Canonical money helper (audit #5 — Money-Type Migration, Phase 1).
 *
 * Money is stored as INTEGER HALALAS (SAR minor units, ×100). Floats
 * (IEEE-754 doubles) can't represent most decimal fractions exactly, so this
 * library is the single, canonical place that converts between display SAR and
 * stored halalas. Do NOT inline `* 100` / `/ 100` anywhere — call these.
 *
 * See docs/architecture/MONEY_TYPE_MIGRATION_PLAN.md.
 */

/**
 * Convert a SAR amount (number or numeric string) to integer halalas.
 * Rounds to the nearest halala (SAR has exactly 2 decimal places, so this is
 * lossless for valid amounts). Returns 0 for null/undefined/empty.
 * @param {number|string} sar
 * @returns {number} integer halalas
 */
function toHalalas(sar) {
  if (sar === null || sar === undefined || sar === '') return 0;
  const n = Number(sar);
  if (!Number.isFinite(n)) {
    throw new TypeError(`toHalalas: not a finite number: ${JSON.stringify(sar)}`);
  }
  // Round AFTER scaling, with a tiny epsilon nudge so values like 19.99 that
  // land at 1998.9999999998 in float land round to 1999, not 1998.
  return Math.round((n + Number.EPSILON * Math.sign(n)) * 100);
}

/**
 * Convert integer halalas to a SAR number (may be fractional only by 0.01).
 * For display prefer formatSar(); use this only when a numeric SAR is needed.
 * @param {number} halalas
 * @returns {number} SAR
 */
function toSar(halalas) {
  if (halalas === null || halalas === undefined || halalas === '') return 0;
  const n = Number(halalas);
  if (!Number.isInteger(n)) {
    throw new TypeError(`toSar: halalas must be an integer: ${JSON.stringify(halalas)}`);
  }
  return n / 100;
}

/**
 * Format integer halalas as a fixed 2-decimal SAR string (for display / external
 * payloads like ZATCA XML and WPS that expect decimal SAR).
 * @param {number} halalas
 * @returns {string} e.g. "1999.00"
 */
function formatSar(halalas) {
  const n = Number(halalas);
  if (!Number.isInteger(n)) {
    throw new TypeError(`formatSar: halalas must be an integer: ${JSON.stringify(halalas)}`);
  }
  return (n / 100).toFixed(2);
}

/**
 * Exact sum of integer-halala amounts. Ignores null/undefined entries.
 * @param {Array<number>} amounts halalas
 * @returns {number} integer halalas
 */
function sumHalalas(amounts) {
  if (!Array.isArray(amounts)) return 0;
  return amounts.reduce((acc, h) => {
    if (h === null || h === undefined) return acc;
    const n = Number(h);
    if (!Number.isInteger(n)) {
      throw new TypeError(`sumHalalas: non-integer entry: ${JSON.stringify(h)}`);
    }
    return acc + n;
  }, 0);
}

/**
 * Apply a percentage (e.g. 15 for 15% VAT) to an integer-halala base, returning
 * integer halalas rounded to the nearest halala. Exact for the base; the rate
 * is a percentage number (rates are NOT money and stay as plain numbers).
 * @param {number} halalas base amount in halalas
 * @param {number} percent e.g. 15
 * @returns {number} integer halalas
 */
function applyPercent(halalas, percent) {
  const base = Number(halalas);
  const pct = Number(percent);
  if (!Number.isInteger(base)) {
    throw new TypeError(`applyPercent: halalas must be an integer: ${JSON.stringify(halalas)}`);
  }
  if (!Number.isFinite(pct)) {
    throw new TypeError(`applyPercent: percent must be finite: ${JSON.stringify(percent)}`);
  }
  return Math.round((base * pct) / 100);
}

module.exports = { toHalalas, toSar, formatSar, sumHalalas, applyPercent };
