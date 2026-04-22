/**
 * translator.js — tiny locale lookup for the reporting renderer.
 *
 * Phase 10 Commit 3.
 *
 * Loads `locales/reporting.ar.json` + `locales/reporting.en.json` once
 * and exposes `t(key, locale, vars)`:
 *
 *   - `key` is a dotted path: 'reports.ben.progress.weekly.headline'.
 *     Because our catalog ids already contain dots, the translator
 *     treats the segment path array as opaque — no magic merging.
 *     Callers should use `getReportKey(reportId, subkey)` helper.
 *
 *   - falls back to `en` when `ar` missing, and to the key itself as
 *     last-ditch fallback (so a missing translation never blocks a
 *     report from being sent).
 *
 *   - `vars` substitutes `{name}` etc. via simple brace replacement.
 *     No conditionals / loops — that logic lives in templates.
 */

'use strict';

const path = require('path');

let _ar, _en;

function loadLocales() {
  if (_ar && _en) return;
  const base = path.join(__dirname, '..', '..', '..', 'locales');
  _ar = require(path.join(base, 'reporting.ar.json'));
  _en = require(path.join(base, 'reporting.en.json'));
}

function lookup(store, segments) {
  let node = store;
  for (const seg of segments) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[seg];
  }
  return typeof node === 'string' ? node : undefined;
}

function substitute(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => {
    const v = vars[k];
    return v == null ? m : String(v);
  });
}

/**
 * Look up a translation.
 *
 * `key` may be a dotted string OR an array of segments. Use the array
 * form when any segment itself contains a dot (like catalog report ids
 * — `reports.ben.progress.weekly.headline` has 5 dots but only 3
 * logical levels: reports → ben.progress.weekly → headline).
 */
function t(key, locale = 'ar', vars = null) {
  loadLocales();
  const segments = Array.isArray(key) ? key : String(key).split('.');
  const primary = locale === 'en' ? _en : _ar;
  const fallback = locale === 'en' ? _ar : _en;
  let value = lookup(primary, segments);
  if (!value) value = lookup(fallback, segments);
  if (!value) return String(Array.isArray(key) ? key.join('.') : key);
  return substitute(value, vars);
}

/**
 * Helper to build the array-form key for a report-specific translation,
 * since catalog ids (`ben.progress.weekly`) contain dots that the
 * dotted-string form would split incorrectly.
 */
function getReportKey(reportId, subkey) {
  return ['reports', reportId, subkey];
}

function has(key, locale = 'ar') {
  loadLocales();
  const segments = Array.isArray(key) ? key : String(key).split('.');
  const primary = locale === 'en' ? _en : _ar;
  return typeof lookup(primary, segments) === 'string';
}

/**
 * Reset the in-memory cache; used by tests that mutate locales at
 * runtime. Never called in production.
 */
function _reset() {
  _ar = undefined;
  _en = undefined;
}

module.exports = { t, getReportKey, has, _reset };
