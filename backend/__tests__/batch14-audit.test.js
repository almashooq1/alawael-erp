/**
 * Batch 14 — Security & Quality Audit Tests (Items 131–140)
 *
 *  131  sanitize.js — prototype pollution prevention (stripDangerousKeys utility)
 *  132  server.js — unhandledRejection / uncaughtException process handlers
 *  133  SCM server.js — user enumeration prevention (normalised login messages)
 *  134  whatsapp-service.js — timing-safe webhook token comparison
 *  135  knowledge.js — sort field whitelist validation
 *  136  SCM search-filter.js — sort field validation (ALLOWED_SORT_FIELDS)
 *  137  dispatch.controller.js — error details redaction (no error.message to client)
 *  138  fixedAssets.controller.js — prototype pollution via Object.assign guard
 *  139  SCM search-filter.js — regex escaping in parseSearchQuery
 *  140  SCM server.js — CORS preflight caching (maxAge)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCM_BACKEND = path.resolve(ROOT, '..', 'supply-chain-management', 'backend');

const read = relPath => fs.readFileSync(path.resolve(ROOT, relPath), 'utf8');
const readSCM = relPath => fs.readFileSync(path.resolve(SCM_BACKEND, relPath), 'utf8');

// ============================================================
// 131 — sanitize.js — stripDangerousKeys utility
// ============================================================
describe('Item 131 — sanitize.js prototype pollution prevention (stripDangerousKeys)', () => {
  const src = read('utils/sanitize.js');

  test('exports stripDangerousKeys function', () => {
    expect(src).toMatch(/exports\.\s*stripDangerousKeys|stripDangerousKeys/);
    expect(src).toMatch(/module\.exports/);
  });

  test('defines DANGEROUS_KEYS set containing __proto__, constructor, prototype', () => {
    expect(src).toMatch(/__proto__/);
    expect(src).toMatch(/constructor/);
    expect(src).toMatch(/prototype/);
  });

  test('stripDangerousKeys removes __proto__ from object', () => {
    const { stripDangerousKeys } = require('../utils/sanitize');
    // Build with Object.create(null) to actually have __proto__ as own key
    const obj = Object.create(null);
    obj.name = 'test';
    obj['__proto__'] = { admin: true };
    obj.normal = 1;
    const result = stripDangerousKeys(obj);
    expect(Object.keys(result)).not.toContain('__proto__');
    expect(result).toHaveProperty('name', 'test');
    expect(result).toHaveProperty('normal', 1);
  });

  test('stripDangerousKeys removes constructor key', () => {
    const { stripDangerousKeys } = require('../utils/sanitize');
    const obj = Object.create(null);
    obj.constructor = { prototype: { isAdmin: true } };
    obj.title = 'hello';
    const result = stripDangerousKeys(obj);
    expect(Object.keys(result)).not.toContain('constructor');
    expect(result).toHaveProperty('title', 'hello');
  });

  test('stripDangerousKeys returns non-object input unchanged', () => {
    const { stripDangerousKeys } = require('../utils/sanitize');
    expect(stripDangerousKeys(null)).toBeNull();
    expect(stripDangerousKeys(undefined)).toBeUndefined();
    expect(stripDangerousKeys('string')).toBe('string');
    expect(stripDangerousKeys(42)).toBe(42);
  });

  test('still exports escapeRegex', () => {
    const { escapeRegex } = require('../utils/sanitize');
    expect(typeof escapeRegex).toBe('function');
  });
});

// ============================================================
// 132 — server.js — unhandledRejection / uncaughtException
// ============================================================
describe('Item 132 — server.js unhandledRejection / uncaughtException handlers', () => {
  const src = read('server.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('registers process.on unhandledRejection handler', () => {
    expect(src).toMatch(/process\.on\(\s*['"]unhandledRejection['"]/);
  });

  test('registers process.on uncaughtException handler', () => {
    expect(src).toMatch(/process\.on\(\s*['"]uncaughtException['"]/);
  });

  test('unhandledRejection handler logs via logger', () => {
    // Extract the block after 'unhandledRejection'
    const idx = src.indexOf("'unhandledRejection'");
    const block = src.substring(idx, idx + 300);
    expect(block).toMatch(/logger\.error/);
  });
});

// ============================================================
// 133 — SCM server.js — user enumeration prevention
// ============================================================
describe('Item 133 — SCM server.js user enumeration prevention', () => {
  const src = readSCM('server.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('login route does NOT return "User not found" message', () => {
    // Check in the login handler area only (near /api/auth/login)
    const loginIdx = src.indexOf("'/api/auth/login'");
    const loginBlock = src.substring(loginIdx, loginIdx + 800);
    expect(loginBlock).not.toMatch(/['"]User not found['"]/);
  });

  test('login route does NOT return "Wrong password" message', () => {
    const loginIdx = src.indexOf("'/api/auth/login'");
    const loginBlock = src.substring(loginIdx, loginIdx + 800);
    expect(loginBlock).not.toMatch(/['"]Wrong password['"]/);
  });

  test('both failure branches use the same generic message', () => {
    const loginIdx = src.indexOf("'/api/auth/login'");
    const loginBlock = src.substring(loginIdx, loginIdx + 800);
    // Count occurrences of the normalised message
    const matches = loginBlock.match(/Invalid username or password/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// 134 — whatsapp-service.js — timing-safe webhook token comparison
// ============================================================
describe('Item 134 — whatsapp-service.js timing-safe webhook token comparison', () => {
  const src = read('communication/whatsapp-service.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('verifyWebhook uses crypto.timingSafeEqual', () => {
    // Find the verifyWebhook method
    const idx = src.indexOf('verifyWebhook(');
    expect(idx).toBeGreaterThan(-1);
    const block = src.substring(idx, idx + 600);
    expect(block).toMatch(/timingSafeEqual/);
  });

  test('verifyWebhook does NOT use simple === for token comparison', () => {
    const idx = src.indexOf('verifyWebhook(');
    const block = src.substring(idx, idx + 600);
    // Should not have `token === verifyToken` anymore
    expect(block).not.toMatch(/token\s*===\s*verifyToken/);
  });

  test('verifyWebhook requires crypto module', () => {
    const idx = src.indexOf('verifyWebhook(');
    const block = src.substring(idx, idx + 600);
    expect(block).toMatch(/require\(\s*['"]crypto['"]\s*\)/);
  });
});

// ============================================================
// 135 — knowledge.js — sort field whitelist
// ============================================================
describe('Item 135 — knowledge.js sort field whitelist', () => {
  const src = read('routes/knowledge.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('defines ALLOWED_SORT_FIELDS constant', () => {
    expect(src).toMatch(/ALLOWED_SORT_FIELDS\s*=/);
  });

  test('ALLOWED_SORT_FIELDS includes createdAt', () => {
    expect(src).toMatch(/ALLOWED_SORT_FIELDS.*createdAt/s);
  });

  test('uses safeSortBy (validated) instead of raw sortBy in .sort()', () => {
    expect(src).toMatch(/safeSortBy/);
    // The .sort() call should use safeSortBy, not raw sortBy from query
    expect(src).toMatch(/\.sort\(\s*\{\s*\[safeSortBy\]/);
  });

  test('validates sortBy against ALLOWED_SORT_FIELDS', () => {
    expect(src).toMatch(/ALLOWED_SORT_FIELDS\.includes\(\s*sortBy\s*\)/);
  });
});

// ============================================================
// 136 — SCM search-filter.js — sort field validation
// ============================================================
describe('Item 136 — SCM search-filter.js sort field validation', () => {
  const src = readSCM('middleware/search-filter.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('defines ALLOWED_SORT_FIELDS', () => {
    expect(src).toMatch(/ALLOWED_SORT_FIELDS\s*=/);
  });

  test('ALLOWED_SORT_FIELDS includes createdAt and name', () => {
    expect(src).toMatch(/createdAt/);
    expect(src).toMatch(/'name'/);
  });

  test('parseSorting validates sort field against allowed list', () => {
    expect(src).toMatch(/allowed\.includes\(\s*rawField\s*\)/);
  });

  test('falls back to createdAt when sort field is not allowed', () => {
    // The ternary should default to 'createdAt'
    expect(src).toMatch(/\?\s*rawField\s*:\s*'createdAt'/);
  });
});

// ============================================================
// 137 — dispatch.controller.js — error details redaction
// ============================================================
describe('Item 137 — dispatch.controller.js error details redaction', () => {
  const src = read('controllers/dispatch.controller.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('does NOT send error.message to client in JSON responses', () => {
    // Check that no res.status().json() includes error: error.message
    const clientLeaks = src.match(/res\.status\(\d+\)\.json\([^)]*error:\s*error\.message/g);
    expect(clientLeaks).toBeNull();
  });

  test('defines safeErrorMessage helper', () => {
    expect(src).toMatch(/safeErrorMessage/);
  });

  test('uses safeErrorMessage for error handling (at least 5 usages)', () => {
    const matches = src.match(/safeErrorMessage\(/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  test('imports stripDangerousKeys for prototype pollution prevention', () => {
    expect(src).toMatch(/stripDangerousKeys/);
  });
});

// ============================================================
// 138 — fixedAssets.controller.js — prototype pollution guard
// ============================================================
describe('Item 138 — fixedAssets.controller.js prototype pollution prevention', () => {
  const src = read('controllers/fixedAssets.controller.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('imports stripDangerousKeys from sanitize', () => {
    expect(src).toMatch(
      /stripDangerousKeys.*require.*sanitize|require.*sanitize.*stripDangerousKeys/s
    );
  });

  test('createAsset uses stripDangerousKeys on req.body', () => {
    expect(src).toMatch(/stripDangerousKeys\(\s*req\.body\s*\)/);
  });

  test('updateAsset (Object.assign) uses stripDangerousKeys', () => {
    expect(src).toMatch(/Object\.assign\(\s*asset\s*,\s*stripDangerousKeys\(\s*req\.body\s*\)/);
  });

  test('does NOT use raw ...req.body spread in createAsset', () => {
    // After fix, should use ...stripDangerousKeys(req.body), not ...req.body
    const createIdx = src.indexOf('createAsset');
    const createBlock = src.substring(createIdx, createIdx + 300);
    expect(createBlock).not.toMatch(/\.\.\.\s*req\.body(?!\s*\))/);
  });
});

// ============================================================
// 139 — SCM search-filter.js — regex escaping in parseSearchQuery
// ============================================================
describe('Item 139 — SCM search-filter.js regex escaping in parseSearchQuery', () => {
  const src = readSCM('middleware/search-filter.js');

  test('parseSearchQuery escapes regex special characters', () => {
    expect(src).toMatch(/escapedTerm|replace\([^)]*\[.*\+.*\?\.\*.*\]/);
  });

  test('does NOT use raw searchTerm in $regex', () => {
    // After the fix, $regex should use escapedTerm, not searchTerm
    const parseIdx = src.indexOf('parseSearchQuery');
    const block = src.substring(parseIdx, parseIdx + 600);
    // The $regex value should reference escapedTerm, not searchTerm
    expect(block).toMatch(/\$regex:\s*escapedTerm/);
  });

  test('uses standard regex escape pattern', () => {
    // Should have a replace that escapes regex special chars
    expect(src).toMatch(/replace\(/);
    expect(src).toMatch(/\\\$&/);
  });
});

// ============================================================
// 140 — SCM server.js — CORS preflight caching (maxAge)
// ============================================================
describe('Item 140 — SCM server.js CORS preflight caching (maxAge)', () => {
  const src = readSCM('server.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('CORS configuration includes maxAge', () => {
    expect(src).toMatch(/maxAge\s*:/);
  });

  test('maxAge is set to 86400 (24 hours)', () => {
    expect(src).toMatch(/maxAge\s*:\s*86400/);
  });

  test('maxAge is inside the cors() config block', () => {
    const corsIdx = src.indexOf('cors({');
    expect(corsIdx).toBeGreaterThan(-1);
    const corsBlock = src.substring(corsIdx, corsIdx + 400);
    expect(corsBlock).toMatch(/maxAge\s*:\s*86400/);
  });
});
