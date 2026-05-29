/**
 * no-flaky-relative-date-month-math.test.js — drift guard against the
 * month-end date-overflow flaky-test class.
 *
 * Why this guard exists: 2026-05-29 (W560) the canonical sprint gate (and
 * the Deploy-to-Production test job) went red from
 * `__tests__/revenue-forecast-service.test.js`. Its helper built invoice
 * dates with:
 *
 *     const d = new Date();              // "today"
 *     d.setMonth(d.getMonth() - N);      // subtract N months
 *
 * On a month-end "today" (day 29/30/31) the subtraction overflows a SHORTER
 * target month — e.g. on 2026-05-29, `-3 months` lands on Feb 29 (2026 is
 * not a leap year) which JS rolls forward to Mar 1 — silently merging two
 * ISO month-buckets. `monthsObserved` then drops from 3 to 2, so the
 * assertions failed ONLY on certain calendar days → classic intermittent
 * flake. Fix (W560): anchor the day-of-month to a value present in every
 * month BEFORE subtracting (`d.setDate(15)`), which makes the math
 * deterministic regardless of run date.
 *
 * This guard fails CI if a test reintroduces the EXACT unsafe shape:
 *   a bare `new Date()` (zero-arg, i.e. "now") whose day-of-month is then
 *   shifted by MONTH SUBTRACTION (`x.setMonth(x.getMonth() - …)`) WITHOUT a
 *   `setDate()`/`setUTCDate()` day-anchor in between.
 *
 * Deliberately NARROW to avoid false positives:
 *   • Only `new Date()` with ZERO args is treated as the unsafe anchor —
 *     `new Date('2026-05-20')` / `new Date(FIXED)` / `new Date(y,m,d)` are
 *     safe (fixed, or the constructor normalizes correctly) and ignored.
 *   • Only SUBTRACTION is flagged (the overflow-into-shorter-month case the
 *     incident hit); additive expiry/scheduling math is left alone.
 *   • A `setDate()`/`setUTCDate()` anchor before the `setMonth()` clears it.
 *   • Scope is the hand-written test suite (`__tests__/`), where this class
 *     reddens CI; production expiry calculators are out of scope.
 *
 * Baseline is EMPTY: a 2026-05-29 full sweep of `__tests__/` found the suite
 * already clean (every other date-math test anchors to a fixed constant or
 * passes an explicit `now`). Adding a new offender fails here; if a genuinely
 * safe edge case ever needs to land, add it to ALLOWLIST with a comment.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TESTS_ROOT = __dirname;

// Files intentionally exempt (none today). Format: relative-to-__dirname path.
const ALLOWLIST = new Set([
  // e.g. 'some-legitimate-edge-case.test.js',  // why it's safe
]);

/**
 * Pure detector. Given JS source text, returns an array of
 * { name, line } for each variable assigned a zero-arg `new Date()` that is
 * later month-SUBTRACTED via `name.setMonth(name.getMonth() - …)` with no
 * intervening `name.setDate(`/`name.setUTCDate(` day-anchor.
 */
function findUnsafeMonthMath(source) {
  const hits = [];
  // Every `<name> = new Date()` (zero-arg). Covers const/let/var and
  // destructure param defaults (`{ now = new Date() }`).
  const assignRe = /(\b[A-Za-z_$][\w$]*)\s*=\s*new\s+Date\(\s*\)/g;
  let m;
  while ((m = assignRe.exec(source)) !== null) {
    const name = m[1];
    const fromIdx = m.index + m[0].length;
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // First month-SUBTRACTION on this var after the assignment.
    const subRe = new RegExp(`${esc}\\.setMonth\\(\\s*${esc}\\.getMonth\\(\\)\\s*-`);
    const tail = source.slice(fromIdx);
    const subM = subRe.exec(tail);
    if (!subM) continue;
    const between = tail.slice(0, subM.index);
    // A day-anchor before the subtraction makes it safe.
    const anchorRe = new RegExp(`${esc}\\.set(?:UTC)?Date\\(`);
    if (anchorRe.test(between)) continue;
    const absIdx = fromIdx + subM.index;
    const line = source.slice(0, absIdx).split('\n').length;
    hits.push({ name, line });
  }
  return hits;
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '_archived') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.test.js')) out.push(full);
  }
  return out;
}

describe('findUnsafeMonthMath (pure detector)', () => {
  it('flags bare new Date() then month subtraction with no day-anchor', () => {
    const src = 'const d = new Date();\nd.setMonth(d.getMonth() - 3);';
    expect(findUnsafeMonthMath(src)).toEqual([{ name: 'd', line: 2 }]);
  });

  it('flags the destructure-param-default form', () => {
    const src = 'function f({ now = new Date() }) {\n  now.setMonth(now.getMonth() - n);\n}';
    expect(findUnsafeMonthMath(src).map(h => h.name)).toEqual(['now']);
  });

  it('clears it when setDate() anchors the day first (the W560 fix)', () => {
    const src = 'const d = new Date();\nd.setDate(15);\nd.setMonth(d.getMonth() - 3);';
    expect(findUnsafeMonthMath(src)).toEqual([]);
  });

  it('ignores a fixed-constant anchor (new Date("..."))', () => {
    const src = "const d = new Date('2026-05-20');\nd.setMonth(d.getMonth() - 3);";
    expect(findUnsafeMonthMath(src)).toEqual([]);
  });

  it('ignores additive month math (only subtraction is the overflow class)', () => {
    const src = 'const d = new Date();\nd.setMonth(d.getMonth() + 6);';
    expect(findUnsafeMonthMath(src)).toEqual([]);
  });

  it('ignores setUTCDate as a valid anchor too', () => {
    const src = 'const d = new Date();\nd.setUTCDate(1);\nd.setMonth(d.getMonth() - 2);';
    expect(findUnsafeMonthMath(src)).toEqual([]);
  });
});

describe('no flaky relative-date month-subtraction in backend/__tests__', () => {
  it('no test does bare new Date() → setMonth(getMonth() - N) without a setDate anchor', () => {
    const offenders = [];
    for (const file of walk(TESTS_ROOT, [])) {
      const rel = path.relative(TESTS_ROOT, file);
      if (ALLOWLIST.has(rel)) continue;
      if (file === __filename) continue; // this guard's own fixtures
      const hits = findUnsafeMonthMath(fs.readFileSync(file, 'utf8'));
      for (const h of hits) offenders.push(`${rel}:${h.line} (var "${h.name}")`);
    }
    if (offenders.length > 0) {
      throw new Error(
        `Found ${offenders.length} flaky month-end date-overflow site(s):\n  ` +
          offenders.join('\n  ') +
          `\n\nFix: anchor the day-of-month BEFORE subtracting months —\n` +
          `  const d = new Date();\n  d.setDate(15);            // any day ≤ 28 is safe\n  d.setMonth(d.getMonth() - N);\n` +
          `(See __tests__/revenue-forecast-service.test.js / W560.)`
      );
    }
    expect(offenders).toEqual([]);
  });
});
