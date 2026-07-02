/**
 * escape-user-regex-input-wave1622.test.js
 * ════════════════════════════════════════════════════════════════════
 * W1622 — escape user-controlled input before it reaches a MongoDB `$regex`.
 *
 * Four search endpoints fed raw `req.query` straight into `$regex`:
 *   routes/rehab.routes.js               /disciplines/suggest ?q=
 *   routes/student-management.routes.js  student list ?search=
 *   routes/insurance-tariffs-admin.js    tariff list ?provider= / ?q=
 *   services/attendanceManagement.js     searchEmployees(query)
 *
 * An unescaped user regex is a triple problem: (1) ReDoS — a crafted pattern
 * like `(a+)+$` pins the CPU during evaluation; (2) forced full collection scan
 * (the pattern defeats any index); (3) regex injection — metacharacters change
 * which documents match. All four now wrap the input in `escapeRegex()` (the
 * same util blockchain.routes.js already uses as the reference pattern).
 *
 * Static per-file assertions + a behavioral test of the escapeRegex primitive.
 * Static-only file; NOT enumerated in sprint-tests.txt.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const FILES = [
  'routes/rehab.routes.js',
  'routes/student-management.routes.js',
  'routes/insurance-tariffs-admin.routes.js',
  'services/attendanceManagement.service.js',
];

describe('W1622 — user regex input is escaped', () => {
  it.each(FILES)('%s imports escapeRegex', (f) => {
    const src = read(f);
    expect(src).toMatch(/require\(\s*['"][^'"]*(escapeRegex|sanitize)['"]\s*\)/);
  });

  it.each(FILES)('%s has no raw user input passed to $regex', (f) => {
    const src = read(f);
    // No `$regex: q` / `$regex: search` / `$regex: String(...)` — the raw forms.
    expect(src).not.toMatch(/\$regex:\s*q\b/);
    expect(src).not.toMatch(/\$regex:\s*search\b/);
    expect(src).not.toMatch(/\$regex:\s*String\(/);
  });

  it('rehab + attendance + student route the escaped value through $regex', () => {
    expect(read('routes/rehab.routes.js')).toMatch(/escapeRegex\(String\(q\)\)/);
    expect(read('services/attendanceManagement.service.js')).toMatch(/escapeRegex\(q\)/);
    expect(read('routes/student-management.routes.js')).toMatch(/escapeRegex\(String\(search\)\)/);
    expect(read('routes/insurance-tariffs-admin.routes.js')).toMatch(/escapeRegex\(String\(/);
  });
});

describe('W1622 — escapeRegex behavioral', () => {
  const escapeRegex = require('../utils/escapeRegex');

  it('escapes every regex metacharacter so the input matches literally', () => {
    const raw = 'a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o';
    const escaped = escapeRegex(raw);
    // The escaped string, used as a pattern, matches the literal raw string.
    expect(new RegExp(`^${escaped}$`).test(raw)).toBe(true);
    // …and does NOT match a string the metacharacters would have matched raw.
    expect(new RegExp(`^${escaped}$`).test('axbxcd')).toBe(false);
  });

  it('neutralizes a catastrophic-backtracking (ReDoS) pattern into a literal', () => {
    const evil = '(a+)+$';
    const escaped = escapeRegex(evil);
    // As a literal it only matches the literal text, evaluated in linear time.
    expect(new RegExp(escaped).test('(a+)+$')).toBe(true);
    expect(new RegExp(escaped).test('aaaaaaaaaaaaaaaaaaaa')).toBe(false);
  });

  it('returns empty string for non-string / empty input (safe default)', () => {
    expect(escapeRegex(undefined)).toBe('');
    expect(escapeRegex(null)).toBe('');
    expect(escapeRegex('')).toBe('');
  });
});
