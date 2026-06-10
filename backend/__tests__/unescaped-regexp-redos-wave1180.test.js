/**
 * W1180 — Unescaped user-input RegExp ratchet (ReDoS guard)
 *
 * الثغرة: تمرير مدخل المستخدم خاماً إلى new RegExp() يسمح بـ:
 *   - ReDoS — نمط كارثي مثل (a+)+$ يجمّد الـevent loop
 *   - حقن regex — `.*` يطابق كل السجلات متجاوزاً منطق البحث
 *
 * الإصلاحات في W1180:
 *   - routes/search.js     — 5 مواقع new RegExp(q) → new RegExp(escapeRegex(q))
 *   - routes/hrUnified.routes.js — 3 مواقع كذلك
 *
 * الأداة القانونية: utils/escapeRegex.js (موجودة سلفاً ومستخدمة في 20+ ملفاً).
 *
 * Ratchet: أي new RegExp(<identifier>) جديد في routes/ أو domains/ يُفشل CI
 * ما لم يكن المعامل مُهرَّباً (escapeRegex/escapeRegExp/.replace) أو literal.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SCAN_DIRS = [path.join(__dirname, '..', 'routes'), path.join(__dirname, '..', 'domains')];

// لا استثناءات معروفة حالياً — baseline فارغ
const KNOWN_UNESCAPED_BASELINE = new Set([]);

function listJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * يلتقط new RegExp(<arg>) حيث <arg> يبدأ بمعرّف مرتبط بمدخل مستخدم
 * (q / search / term / req.query / req.body / req.params) وغير مُهرَّب.
 */
function findUnescapedRegExpSites(src) {
  const cleaned = stripComments(src);
  const sites = [];
  const re = /new\s+RegExp\(\s*/g;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    // نافذة بعد الفتح — الالتقاط الساذج للمعامل تخدعه أقواس متداخلة مثل q.trim().replace(...)
    const win = cleaned.slice(m.index + m[0].length, m.index + m[0].length + 160);
    // literal أو template ثابت → آمن
    if (/^['"`/]/.test(win)) continue;
    // مُهرَّب صراحةً داخل النافذة → آمن
    if (/escapeReg/i.test(win) || /\.replace\(/.test(win)) continue;
    // مرتبط بمدخل مستخدم؟
    if (/^(q\b|search|term|query|req\.(query|body|params))/.test(win)) {
      sites.push(win.slice(0, 40).replace(/\s+/g, ' ').trim());
    }
  }
  return sites;
}

describe('W1180 — unescaped user-input RegExp ratchet (ReDoS)', () => {
  const files = SCAN_DIRS.flatMap((d) => listJsFiles(d));

  test('sanity — scan surface is non-trivial', () => {
    expect(files.length).toBeGreaterThan(300);
  });

  test('no unescaped user-input RegExp outside baseline', () => {
    const violations = [];
    const seenBaseline = new Set();

    for (const file of files) {
      const rel = path
        .relative(path.join(__dirname, '..'), file)
        .replace(/\\/g, '/');
      const sites = findUnescapedRegExpSites(fs.readFileSync(file, 'utf8'));
      for (const site of sites) {
        const key = `${rel}:${site}`;
        if (KNOWN_UNESCAPED_BASELINE.has(key)) seenBaseline.add(key);
        else violations.push(key);
      }
    }

    expect(violations).toEqual([]);

    const stale = [...KNOWN_UNESCAPED_BASELINE].filter((k) => !seenBaseline.has(k));
    expect(stale).toEqual([]);
  });
});

describe('W1180 — fixed files use escapeRegex', () => {
  test.each([
    ['routes/search.js', 7],
    ['routes/hrUnified.routes.js', 3],
  ])('%s wraps all user-input RegExp args with escapeRegex (%i sites)', (rel, count) => {
    const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    expect(src).toMatch(/require\(['"]\.\.\/utils\/escapeRegex['"]\)/);
    const escaped = src.match(/new RegExp\(escapeRegex\(q\)/g) || [];
    expect(escaped.length).toBe(count);
    expect(src).not.toMatch(/new RegExp\(q,/);
  });
});

describe('W1180 — detector self-test', () => {
  test('flags raw q', () => {
    expect(findUnescapedRegExpSites("new RegExp(q, 'i')")).toHaveLength(1);
  });
  test('flags raw req.query.search', () => {
    expect(findUnescapedRegExpSites("new RegExp(req.query.search, 'i')")).toHaveLength(1);
  });
  test('accepts escapeRegex-wrapped', () => {
    expect(findUnescapedRegExpSites("new RegExp(escapeRegex(q), 'i')")).toEqual([]);
  });
  test('accepts inline .replace escaping', () => {
    expect(
      findUnescapedRegExpSites("new RegExp(q.trim().replace(/[.*]/g, '\\\\$&'), 'i')")
    ).toEqual([]);
  });
  test('accepts string literals', () => {
    expect(findUnescapedRegExpSites("new RegExp('^abc$', 'i')")).toEqual([]);
  });
});
