'use strict';

/**
 * W1181 — security drift guard: timing-unsafe secret comparisons.
 *
 * Plain `===` / `!==` short-circuits on the first differing byte,
 * leaking the matched-prefix length of a secret through response
 * timing. An attacker measuring response latency can recover API
 * keys / HMAC signatures / OTP codes byte-by-byte.
 *
 * Canonical fix: `utils/timingSafeCompare.js` (length-prechecked
 * crypto.timingSafeEqual wrapper, fail-closed on non-strings).
 *
 * This guard scans routes/ + domains/ + services/ + middleware/ for
 * direct equality comparisons where either operand name suggests a
 * secret (signature / otp / apiKey / webhookToken / secretKey).
 * Sites already mediated by timingSafeCompare/timingSafeEqual on the
 * same line-window are exempt, as are pure type-guards
 * (`typeof x !== 'string'`) and boolean-literal comparisons.
 *
 * Ratchet contract (W325c lineage):
 *   - NEW offenders not in KNOWN_TIMING_UNSAFE_BASELINE fail CI.
 *   - STALE baseline entries (fixed in source) also fail CI —
 *     forces baseline pruning in the same commit as the fix.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..');
const SCAN_DIRS = ['routes', 'domains', 'services', 'middleware'];

// Operand names that imply a secret value.
const SECRET_NAME_RE =
  /(signature|otpcode|otphash|\botp\b|apikey|api_key|webhooktoken|secretkey|sharedsecret|hmac)/i;

// Direct equality with a secret-named identifier on the left.
const COMPARE_RE = /([A-Za-z_$][\w.$[\]']*)\s*(===|!==)\s*([A-Za-z_$['"][^;&|)\n]{0,80})/g;

// Only the LAST property segment carries the semantic meaning:
// `signatureRequest.status` is a status check, not a signature compare.
function lastSegment(expr) {
  const cleaned = String(expr)
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*$/, '')
    .trim();
  const parts = cleaned.split('.');
  return (parts[parts.length - 1] || '').replace(/[^\w$]/g, '');
}

const KNOWN_TIMING_UNSAFE_BASELINE = new Map([
  // (empty — W1181 fixed all five real sites:
  //   routes/branch-integration.routes.js verifyIntegrationKey,
  //   routes/visitor-auth.routes.js OTP compare,
  //   services/gpsSecurityService.js verifyGPSDataSignature,
  //   services/documents/documentDigitalCert.service.js integrityOk,
  //   services/documents/documentSignature.service.js documentUnmodified)
]);

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

function listFiles(dir) {
  const out = [];
  const walk = d => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        if (/node_modules|__tests__|_archived|\.git/.test(e.name)) continue;
        walk(full);
      } else if (e.name.endsWith('.js') && !e.name.endsWith('.test.js')) {
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

function findOffenders(src) {
  const clean = stripComments(src);
  const offenders = [];
  let m;
  COMPARE_RE.lastIndex = 0;
  while ((m = COMPARE_RE.exec(clean)) !== null) {
    const [whole, left, , right] = m;
    if (!SECRET_NAME_RE.test(lastSegment(left)) && !SECRET_NAME_RE.test(lastSegment(right)))
      continue;
    // Exemptions:
    // 1. typeof type-guards: `typeof signature !== 'string'`
    const before = clean.slice(Math.max(0, m.index - 12), m.index);
    if (/typeof\s*$/.test(before)) continue;
    // 2. boolean / null / undefined / 'true'/'false' literal comparisons (flag parsing)
    if (/^\s*(true|false|null|undefined|'true'|'false'|"true"|"false")\b/.test(right)) continue;
    // 3. enum-ish string literal comparisons of non-hex short values (e.g. status checks)
    //    — keep only literals that look like secret material is NOT being compared
    //    to a status word. A literal of length < 8 with no hex shape is a status enum.
    const litMatch = right.match(/^\s*['"]([^'"]*)['"]/);
    if (litMatch && litMatch[1].length < 8 && !/^[0-9a-f]+$/i.test(litMatch[1])) continue;
    // 4. already-mediated lines: window contains timingSafe*
    const windowStart = Math.max(0, m.index - 200);
    const window = clean.slice(windowStart, m.index + whole.length + 50);
    if (/timingSafe/i.test(window)) continue;
    // 5. comparisons of `.length` (length pre-checks are fine)
    if (/\.length\s*$/.test(left) || /^\s*[\w.]*\.length\b/.test(right)) continue;
    // 6. function/typeof existence probes: `=== 'function'`
    if (/^\s*['"]function['"]/.test(right)) continue;

    const line = clean.slice(0, m.index).split('\n').length;
    offenders.push({ line, snippet: whole.replace(/\s+/g, ' ').slice(0, 90) });
  }
  return offenders;
}

describe('W1181 — timing-unsafe secret comparison drift guard', () => {
  const allFiles = SCAN_DIRS.flatMap(d => listFiles(path.join(BACKEND, d)));

  test('sanity: scanning a real surface (>400 files)', () => {
    expect(allFiles.length).toBeGreaterThan(400);
  });

  test('no NEW timing-unsafe secret comparisons outside baseline', () => {
    const found = [];
    for (const full of allFiles) {
      const offenders = findOffenders(fs.readFileSync(full, 'utf8'));
      const rel = path.relative(BACKEND, full).replace(/\\/g, '/');
      for (const o of offenders) {
        const key = `${rel}:${o.snippet}`;
        if (!KNOWN_TIMING_UNSAFE_BASELINE.has(key)) {
          found.push(`${rel}:${o.line} → ${o.snippet}`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  test('ratchet-down: stale baseline entries must be pruned', () => {
    const liveKeys = new Set();
    for (const full of allFiles) {
      const rel = path.relative(BACKEND, full).replace(/\\/g, '/');
      for (const o of findOffenders(fs.readFileSync(full, 'utf8'))) {
        liveKeys.add(`${rel}:${o.snippet}`);
      }
    }
    const stale = [...KNOWN_TIMING_UNSAFE_BASELINE.keys()].filter(k => !liveKeys.has(k));
    expect(stale).toEqual([]);
  });

  describe('fixed sites stay fixed', () => {
    test('routes/branch-integration.routes.js uses timingSafeCompare', () => {
      const src = fs.readFileSync(
        path.join(BACKEND, 'routes', 'branch-integration.routes.js'),
        'utf8'
      );
      expect(src).toMatch(/require\(['"]\.\.\/utils\/timingSafeCompare['"]\)/);
      expect(src).toMatch(/timingSafeCompare\(apiKey,\s*process\.env\.INTEGRATION_SECRET_KEY/);
      expect(src).not.toMatch(/apiKey\s*!==\s*process\.env\.INTEGRATION_SECRET_KEY/);
    });

    test('routes/visitor-auth.routes.js uses timingSafeCompare for OTP', () => {
      const src = fs.readFileSync(path.join(BACKEND, 'routes', 'visitor-auth.routes.js'), 'utf8');
      expect(src).toMatch(/require\(['"]\.\.\/utils\/timingSafeCompare['"]\)/);
      expect(src).toMatch(/timingSafeCompare\(String\(record\.code/);
      expect(src).not.toMatch(/record\.code\s*!==\s*otp/);
    });

    test('services/documents/* use timingSafeCompare for integrity checks', () => {
      const cert = fs.readFileSync(
        path.join(BACKEND, 'services', 'documents', 'documentDigitalCert.service.js'),
        'utf8'
      );
      expect(cert).toMatch(/require\(['"]\.\.\/\.\.\/utils\/timingSafeCompare['"]\)/);
      expect(cert).toMatch(/timingSafeCompare\(expectedSig,/);
      const sig = fs.readFileSync(
        path.join(BACKEND, 'services', 'documents', 'documentSignature.service.js'),
        'utf8'
      );
      expect(sig).toMatch(/require\(['"]\.\.\/\.\.\/utils\/timingSafeCompare['"]\)/);
      expect(sig).toMatch(/timingSafeCompare\(\s*currentDocHash,/);
    });

    test('services/gpsSecurityService.js uses timingSafeCompare for GPS signature', () => {
      const src = fs.readFileSync(path.join(BACKEND, 'services', 'gpsSecurityService.js'), 'utf8');
      expect(src).toMatch(/require\(['"]\.\.\/utils\/timingSafeCompare['"]\)/);
      expect(src).toMatch(/timingSafeCompare\(expectedSignature,\s*deviceSignature\)/);
      expect(src).not.toMatch(/return\s+expectedSignature\s*===\s*deviceSignature/);
    });
  });

  describe('utils/timingSafeCompare contract', () => {
    const timingSafeCompare = require('../utils/timingSafeCompare');

    test('equal strings → true', () => {
      expect(timingSafeCompare('abc123', 'abc123')).toBe(true);
    });
    test('different same-length strings → false', () => {
      expect(timingSafeCompare('abc123', 'abc124')).toBe(false);
    });
    test('different lengths → false (no throw)', () => {
      expect(timingSafeCompare('short', 'much-longer-value')).toBe(false);
    });
    test('non-string operands → false (fail closed)', () => {
      expect(timingSafeCompare(undefined, 'x')).toBe(false);
      expect(timingSafeCompare('x', null)).toBe(false);
      expect(timingSafeCompare(123, 123)).toBe(false);
    });
    test('empty vs empty → true (caller must guard empties)', () => {
      expect(timingSafeCompare('', '')).toBe(true);
    });
  });

  describe('detector self-tests', () => {
    test('flags plain === on signature operand', () => {
      const offenders = findOffenders(`if (expectedSignature === providedSignature) { ok(); }`);
      expect(offenders.length).toBe(1);
    });
    test('flags !== on apiKey vs env', () => {
      const offenders = findOffenders(
        `if (apiKey !== process.env.SECRET_KEY) return res.status(401);`
      );
      expect(offenders.length).toBe(1);
    });
    test('exempts typeof type-guard', () => {
      const offenders = findOffenders(`if (typeof signature !== 'string') return false;`);
      expect(offenders).toEqual([]);
    });
    test('exempts timingSafe-mediated window', () => {
      const offenders = findOffenders(
        `if (sig.length !== exp.length) return false;\nreturn crypto.timingSafeEqual(sigBuf, expBuf); // signature === expected handled above`
      );
      expect(offenders).toEqual([]);
    });
    test('exempts boolean flag parsing', () => {
      const offenders = findOffenders(`const v = req.query.signatureVerified === 'true';`);
      expect(offenders).toEqual([]);
    });
    test('exempts short status enum literals', () => {
      const offenders = findOffenders(`if (otpStatus === 'sent') { resend(); }`);
      expect(offenders).toEqual([]);
    });
    test('exempts property-chain whose LAST segment is not secret-like', () => {
      const offenders = findOffenders(
        `if (signatureRequest.status !== 'APPROVED') return;\nif (signatureRequest.documentId !== String(req.params.planId)) return;`
      );
      expect(offenders).toEqual([]);
    });
  });
});
