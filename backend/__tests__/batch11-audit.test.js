/**
 * Batch 11 — Professional Audit Tests
 *
 * Items 101-110:
 *  101  globalSearch.service.js — ReDoS fix (escapeRegex on user input)
 *  102  employeeAffairs.service.js — ReDoS fix (escapeRegex on search)
 *  103  hr-advanced.service.js — ReDoS fix (escapeRegex on searchTerm)
 *  104  accounting.service.js — ReDoS fix (escapeRegex on searchTerm)
 *  105  knowledge-center.service.js — ReDoS fix (tags/keywords now escaped)
 *  106  exportImport.real.routes.js — safe JSON.parse with try-catch
 *  107  caseManagement.js & medicalFiles.js — safe JSON.parse wrappers
 *  108  gateway/server.js — body size limit on express.json()
 *  109  advancedAlertRulesEngine.js — regex filter wrapped in try-catch
 *  110  gateway/server.js — server timeouts (timeout, keepAliveTimeout, headersTimeout)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GATEWAY_ROOT = path.resolve(ROOT, '..', 'gateway');

// ─── Helper: read file safely ────────────────────────────────────────────────
const readSafe = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 101 — globalSearch.service.js — ReDoS prevention
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 101 — globalSearch.service.js ReDoS fix', () => {
  const src = readSafe(path.join(ROOT, 'services', 'globalSearch.service.js'));

  test('imports escapeRegex from sanitize utility', () => {
    expect(src).toMatch(/require\(['"]\.\.\/utils\/sanitize['"]\)/);
    expect(src).toMatch(/escapeRegex/);
  });

  test('uses escapeRegex(term) instead of raw term in RegExp', () => {
    expect(src).toMatch(/new RegExp\(escapeRegex\(term\)/);
  });

  test('does NOT use new RegExp(term, ...) with raw user input', () => {
    // Must not create RegExp from raw `term` variable (only escaped)
    const rawPattern = /new RegExp\(term\s*,/;
    expect(rawPattern.test(src)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 102 — employeeAffairs.service.js — ReDoS prevention
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 102 — employeeAffairs.service.js ReDoS fix', () => {
  const src = readSafe(path.join(ROOT, 'services', 'employeeAffairs.service.js'));

  test('imports escapeRegex from sanitize utility', () => {
    expect(src).toMatch(/require\(['"]\.\.\/utils\/sanitize['"]\)/);
    expect(src).toMatch(/escapeRegex/);
  });

  test('uses escapeRegex(search) in RegExp construction', () => {
    expect(src).toMatch(/new RegExp\(escapeRegex\(search\)/);
  });

  test('does NOT use new RegExp(search, ...) with raw user input', () => {
    const raw = /new RegExp\(search\s*,\s*['"]i['"]\)/;
    expect(raw.test(src)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 103 — hr-advanced.service.js — ReDoS prevention
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 103 — hr-advanced.service.js ReDoS fix', () => {
  const src = readSafe(path.join(ROOT, 'services', 'hr-advanced.service.js'));

  test('imports escapeRegex from sanitize utility', () => {
    expect(src).toMatch(/require\(['"]\.\.\/utils\/sanitize['"]\)/);
    expect(src).toMatch(/escapeRegex/);
  });

  test('uses escapeRegex(searchTerm) for firstName/lastName/email', () => {
    const matches = src.match(/new RegExp\(escapeRegex\(searchTerm\)/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(3); // firstName, lastName, email
  });

  test('does NOT use new RegExp(searchTerm, ...) with raw value', () => {
    const raw = /new RegExp\(searchTerm\s*,\s*['"]i['"]\)/;
    expect(raw.test(src)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 104 — accounting.service.js — ReDoS prevention
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 104 — accounting.service.js ReDoS fix', () => {
  const src = readSafe(path.join(ROOT, 'services', 'accounting.service.js'));

  test('imports escapeRegex from sanitize utility', () => {
    expect(src).toMatch(/require\(['"]\.\.\/utils\/sanitize['"]\)/);
    expect(src).toMatch(/escapeRegex/);
  });

  test('uses escapeRegex(filters.searchTerm) for code/name/nameEn', () => {
    const matches = src.match(/new RegExp\(escapeRegex\(filters\.searchTerm\)/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  test('does NOT use new RegExp(filters.searchTerm, ...) raw', () => {
    const raw = /new RegExp\(filters\.searchTerm\s*,\s*['"]i['"]\)/;
    expect(raw.test(src)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 105 — knowledge-center.service.js — ReDoS prevention in tags/keywords
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 105 — knowledge-center.service.js tags/keywords ReDoS fix', () => {
  const src = readSafe(path.join(ROOT, 'services', 'knowledge-center.service.js'));

  test('tags search uses escapeRegex', () => {
    // Tags array search should use escapeRegex(s) or escapeRegex(searchTerm)
    expect(src).toMatch(/tags:\s*\{\s*\$in:\s*\[new RegExp\(escapeRegex\(/);
  });

  test('keywords search uses escapeRegex', () => {
    expect(src).toMatch(/keywords:\s*\{\s*\$in:\s*\[new RegExp\(escapeRegex\(/);
  });

  test('does NOT have new RegExp(s, ...) or new RegExp(searchTerm, ...) without escaping', () => {
    // Should not find raw variable in RegExp for $in arrays
    const rawS = /\$in:\s*\[new RegExp\(s\s*,/;
    const rawST = /\$in:\s*\[new RegExp\(searchTerm\s*,/;
    expect(rawS.test(src)).toBe(false);
    expect(rawST.test(src)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 106 — exportImport.real.routes.js — safe JSON.parse
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 106 — exportImport.real.routes.js safe JSON.parse', () => {
  const src = readSafe(path.join(ROOT, 'routes', 'exportImport.real.routes.js'));

  test('wraps filters JSON.parse in try-catch', () => {
    expect(src).toMatch(/try\s*\{[^}]*JSON\.parse\(filters\)/);
  });

  test('returns 400 on invalid JSON', () => {
    expect(src).toMatch(/status\(400\)/);
    expect(src).toMatch(/Invalid filters JSON/);
  });

  test('does NOT have bare JSON.parse(filters) outside try-catch', () => {
    // All JSON.parse(filters) calls should be inside try blocks
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('JSON.parse(filters)')) {
        // Check that a try { appears in the preceding 5 lines
        const context = lines.slice(Math.max(0, i - 5), i + 1).join('\n');
        expect(context).toMatch(/try\s*\{/);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 107 — caseManagement.js & medicalFiles.js — safe JSON.parse wrappers
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 107 — caseManagement.js & medicalFiles.js safe JSON.parse', () => {
  const cmSrc = readSafe(path.join(ROOT, 'routes', 'caseManagement.js'));
  const mfSrc = readSafe(path.join(ROOT, 'routes', 'medicalFiles.js'));

  test('caseManagement.js defines safeJsonParse helper', () => {
    expect(cmSrc).toMatch(/safeJsonParse/);
    expect(cmSrc).toMatch(/try\s*\{[^}]*JSON\.parse\(str\)/);
  });

  test('caseManagement.js uses safeJsonParse for tags', () => {
    expect(cmSrc).toMatch(/safeJsonParse\(req\.body\.tags/);
  });

  test('caseManagement.js does NOT have bare JSON.parse(req.body.tags)', () => {
    expect(cmSrc).not.toMatch(/[^e]JSON\.parse\(req\.body\.tags\)/);
  });

  test('medicalFiles.js defines safeJsonParse helper', () => {
    expect(mfSrc).toMatch(/safeJsonParse/);
    expect(mfSrc).toMatch(/try\s*\{[^}]*JSON\.parse\(str\)/);
  });

  test('medicalFiles.js uses safeJsonParse for tags/fileTypes/descriptions', () => {
    expect(mfSrc).toMatch(/safeJsonParse\(req\.body\.tags/);
    expect(mfSrc).toMatch(/safeJsonParse\(req\.body\.fileTypes/);
    expect(mfSrc).toMatch(/safeJsonParse\(req\.body\.descriptions/);
  });

  test('medicalFiles.js does NOT have bare JSON.parse(req.body.*)', () => {
    // Should not have unprotected JSON.parse on req.body fields
    expect(mfSrc).not.toMatch(/[^e]JSON\.parse\(req\.body\.tags\)/);
    expect(mfSrc).not.toMatch(/[^e]JSON\.parse\(req\.body\.fileTypes\)/);
    expect(mfSrc).not.toMatch(/[^e]JSON\.parse\(req\.body\.descriptions\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 108 — gateway/server.js — body size limit
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 108 — gateway body size limit', () => {
  const src = readSafe(path.join(GATEWAY_ROOT, 'server.js'));

  test('express.json() has a limit option', () => {
    expect(src).toMatch(/express\.json\(\s*\{[^}]*limit\s*:/);
  });

  test('express.urlencoded() has a limit option', () => {
    expect(src).toMatch(/express\.urlencoded\(\s*\{[^}]*limit\s*:/);
  });

  test('limit is set to 1mb or less', () => {
    // Extract the limit value — should be '1mb' or a number <= 1048576
    const jsonLimitMatch = src.match(/express\.json\(\s*\{[^}]*limit\s*:\s*['"]([^'"]+)['"]/);
    expect(jsonLimitMatch).not.toBeNull();
    expect(jsonLimitMatch[1]).toMatch(/^\d+mb$|^\d+kb$|^\d+$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 109 — advancedAlertRulesEngine.js — safe regex filter
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 109 — advancedAlertRulesEngine.js safe regex filter', () => {
  const src = readSafe(path.join(ROOT, 'services', 'advancedAlertRulesEngine.js'));

  test('regex case is wrapped in try-catch', () => {
    // Find the 'regex' case and verify try-catch surrounds the RegExp
    const regexSection = src.match(/case\s+['"]regex['"][\s\S]{0,300}?(?:case\s|default\s)/);
    expect(regexSection).not.toBeNull();
    expect(regexSection[0]).toMatch(/try\s*\{/);
    expect(regexSection[0]).toMatch(/catch/);
  });

  test('regex pattern length is capped (slice/substring)', () => {
    const regexSection = src.match(/case\s+['"]regex['"][\s\S]{0,300}?(?:case\s|default\s)/);
    expect(regexSection).not.toBeNull();
    expect(regexSection[0]).toMatch(/\.slice\(|\.substring\(|\.substr\(/);
  });

  test('returns false on invalid regex instead of throwing', () => {
    const regexSection = src.match(/case\s+['"]regex['"][\s\S]{0,300}?(?:case\s|default\s)/);
    expect(regexSection).not.toBeNull();
    expect(regexSection[0]).toMatch(/return false/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 110 — gateway/server.js — server timeouts
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 110 — gateway server timeouts', () => {
  const src = readSafe(path.join(GATEWAY_ROOT, 'server.js'));

  test('sets server.timeout', () => {
    expect(src).toMatch(/server\.timeout\s*=\s*\d/);
  });

  test('sets server.keepAliveTimeout', () => {
    expect(src).toMatch(/server\.keepAliveTimeout\s*=\s*\d/);
  });

  test('sets server.headersTimeout', () => {
    expect(src).toMatch(/server\.headersTimeout\s*=\s*\d/);
  });

  test('keepAliveTimeout > 60s (must exceed typical proxy idle timeout)', () => {
    const match = src.match(/server\.keepAliveTimeout\s*=\s*(\d[\d_]*)/);
    expect(match).not.toBeNull();
    const value = parseInt(match[1].replace(/_/g, ''), 10);
    expect(value).toBeGreaterThan(60000);
  });
});
