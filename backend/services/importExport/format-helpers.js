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

module.exports = { resolveColumns, getNestedValue };
