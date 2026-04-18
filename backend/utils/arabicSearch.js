/**
 * arabicSearch.js — text normalization for Arabic prefix + substring matches.
 *
 * Why not just `{ name: new RegExp(q, 'i') }`: Arabic text in production
 * data is messy. The same name gets typed as:
 *   • أحمد / احمد / إحمد     (alef variants)
 *   • فاطمة / فاطمه           (ta marbuta vs ha)
 *   • يحيى / يحيي             (alef-maksura vs ya)
 *   • Arabic-Indic vs ASCII digits in numeric IDs
 *   • Stray tashkeel (diacritics) from some keyboards
 *
 * `normalize(q)` folds all of those to a canonical form. Regex-escapes
 * the result so it's safe to drop into a Mongo `$regex`.
 *
 * Usage in a Mongo query:
 *
 *   const q = normalize(rawInput);
 *   const rx = new RegExp('^' + q, 'i'); // prefix match
 *   await Beneficiary.find({ $or: [
 *     { _searchName: rx },      // pre-normalized field (preferred)
 *     { firstName_ar: rx },     // fallback for un-backfilled rows
 *   ]});
 *
 * Pair with a schema-level pre('save') hook that writes `_searchName`
 * = normalize(firstName_ar + ' ' + lastName_ar) for efficient indexing.
 * This helper is intentionally dependency-free so it can also run
 * client-side for optimistic typeahead.
 */

'use strict';

// Arabic-Indic numerals → ASCII
const DIGIT_MAP = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

// Letter normalizations — all variants → canonical
const LETTER_MAP = {
  آ: 'ا',
  أ: 'ا',
  إ: 'ا',
  ٱ: 'ا', // alef variants
  ؤ: 'و', // hamza-on-waw
  ئ: 'ي', // hamza-on-ya
  ة: 'ه', // ta marbuta → ha
  ى: 'ي', // alef maksura → ya
};

// U+064B–U+065F = tashkeel/harakat, U+0670 = alef khanjariya, U+0640 = tatweel
const DIACRITIC_RE = /[\u064B-\u065F\u0670\u0640]/g;

function normalize(input) {
  if (input == null) return '';
  let s = String(input).trim().toLowerCase();

  // Strip diacritics first — they never carry search intent
  s = s.replace(DIACRITIC_RE, '');

  // Digit + letter folds in one pass
  let out = '';
  for (const ch of s) {
    out += DIGIT_MAP[ch] ?? LETTER_MAP[ch] ?? ch;
  }

  // Collapse runs of whitespace (user double-tapped space in RTL keyboard)
  return out.replace(/\s+/g, ' ');
}

// Regex escape — Mongo $regex is a real regex, so user input needs escaping.
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a Mongo $or clause that prefix-matches the normalized query
 * against a list of candidate field names. Falls back to substring
 * match (.*q.*) if `mode: 'substring'` is passed.
 */
function buildOrClause(query, fields, { mode = 'prefix' } = {}) {
  const q = normalize(query);
  if (!q) return null;
  const escaped = escapeRegex(q);
  const pattern = mode === 'substring' ? escaped : `^${escaped}`;
  const rx = new RegExp(pattern, 'i');
  return fields.map(f => ({ [f]: rx }));
}

module.exports = { normalize, escapeRegex, buildOrClause };
