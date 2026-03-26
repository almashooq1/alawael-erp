/**
 * Batch 15 — Security & Quality Audit Tests (Items 141–150)
 *
 *  141  templates.js — static file serving security headers (nosniff, CSP, cache)
 *  142  backup.service.js — URI credential masking in log output
 *  143  automated-backup.routes.js — error message redaction (safeErrorMsg)
 *  144  enhanced-backup.service.js — URI credential masking (backup + restore)
 *  145  database.js — MongoDB connection error credential masking
 *  146  templates.js — generic error messages (no e.message leak)
 *  147  blockchain.routes.js — open-redirect prevention via hash validation
 *  148  app.js — static file cache headers + nosniff
 *  149  templates.js — multer upload file-size limit
 *  150  community.js — input length validation (COMMUNITY_FIELD_LIMITS)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const read = relPath => fs.readFileSync(path.resolve(ROOT, relPath), 'utf8');

// ============================================================
// 141 — templates.js — static attachment serving security headers
// ============================================================
describe('Item 141 — templates.js static file serving security headers', () => {
  const src = read('routes/templates.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('sets X-Content-Type-Options nosniff on static attachments', () => {
    expect(src).toMatch(/X-Content-Type-Options.*nosniff/);
  });

  test('sets X-Download-Options noopen on static attachments', () => {
    expect(src).toMatch(/X-Download-Options.*noopen/);
  });

  test('sets Cache-Control header on static attachment responses', () => {
    expect(src).toMatch(/Cache-Control.*private.*max-age/);
  });

  test('sets Content-Security-Policy default-src none on attachments', () => {
    expect(src).toMatch(/Content-Security-Policy.*default-src\s+'none'/);
  });
});

// ============================================================
// 142 — backup.service.js — URI credential masking
// ============================================================
describe('Item 142 — backup.service.js URI credential masking', () => {
  const src = read('services/backup.service.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('defines maskedUri variable', () => {
    expect(src).toMatch(/const\s+maskedUri\s*=/);
  });

  test('replaces user:pass with <user>:<hidden> in URI', () => {
    expect(src).toMatch(/<user>:<hidden>@/);
  });

  test('logger.info uses maskedUri not raw URI', () => {
    expect(src).toMatch(/logger\.info\(.*maskedUri/);
  });
});

// ============================================================
// 143 — automated-backup.routes.js — error message redaction
// ============================================================
describe('Item 143 — automated-backup.routes.js error message redaction (safeErrorMsg)', () => {
  const src = read('routes/automated-backup.routes.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('defines safeErrorMsg helper function', () => {
    expect(src).toMatch(/const\s+safeErrorMsg\s*=\s*\(?err\)?\s*=>/);
  });

  test('safeErrorMsg checks for file paths and stack traces in production', () => {
    // The function tests for forward/back-slashes, node_modules, and stack-trace markers
    expect(src).toMatch(/node_modules/);
    expect(src).toMatch(/isProd/);
  });

  test('does NOT send raw error.message in any JSON response', () => {
    const rawLeaks = src.match(/json\(\s*\{[^}]*error:\s*error\.message/g);
    expect(rawLeaks).toBeNull();
  });

  test('uses safeErrorMsg in at least 15 catch blocks', () => {
    const matches = src.match(/safeErrorMsg\(error\)/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(15);
  });

  test('safeErrorMsg truncates long messages via length check', () => {
    expect(src).toMatch(/msg\.length\s*>\s*200/);
  });
});

// ============================================================
// 144 — enhanced-backup.service.js — URI credential masking (backup & restore)
// ============================================================
describe('Item 144 — enhanced-backup.service.js URI credential masking', () => {
  const src = read('services/enhanced-backup.service.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('defines _maskedUri in performDatabaseBackup method definition', () => {
    // Use the method definition, not its call site
    const backupIdx = src.indexOf('async performDatabaseBackup');
    expect(backupIdx).toBeGreaterThan(-1);
    const block = src.substring(backupIdx, backupIdx + 600);
    expect(block).toMatch(/_maskedUri/);
  });

  test('defines _maskedUri in restore section', () => {
    // _maskedUri is defined shortly BEFORE mongorestore — search backwards
    const restoreIdx = src.indexOf('mongorestore');
    expect(restoreIdx).toBeGreaterThan(-1);
    const block = src.substring(Math.max(0, restoreIdx - 300), restoreIdx + 600);
    expect(block).toMatch(/_maskedUri/);
  });

  test('uses <user>:<hidden> placeholder in both locations', () => {
    const matches = src.match(/<user>:<hidden>@/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('credential masking regex matches //user:pass@ pattern', () => {
    expect(src).toMatch(/replace\(\/\\\/\\\/\(\[\^:\]\+\):\(\[\^@\]\+\)@\//);
  });
});

// ============================================================
// 145 — database.js — connection error credential masking
// ============================================================
describe('Item 145 — config/database.js connection error credential masking', () => {
  const src = read('config/database.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('masks MongoDB URIs in error event listener', () => {
    expect(src).toMatch(/credentials-hidden/);
  });

  test('uses regex to match mongodb(+srv):// URI scheme', () => {
    expect(src).toMatch(/mongodb\(\\\+srv\)\?/);
  });

  test('stores masked message in connectionHealth.lastErrorMessage', () => {
    expect(src).toMatch(/connectionHealth\.lastErrorMessage\s*=\s*safeMsg/);
  });

  test('defines safeMsg variable in error handler', () => {
    expect(src).toMatch(/const\s+safeMsg\s*=/);
  });
});

// ============================================================
// 146 — templates.js — generic safe error messages
// ============================================================
describe('Item 146 — templates.js generic error messages (no e.message leak)', () => {
  const src = read('routes/templates.js');

  test('uses Arabic safe error message in catch blocks', () => {
    expect(src).toMatch(/حدث خطأ داخلي/);
  });

  test('does NOT leak e.message to client in JSON responses', () => {
    const leaks = src.match(/res\.status\(\d+\)\.json\(\s*\{[^}]*error:\s*e\.message/g);
    expect(leaks).toBeNull();
  });

  test('has at least 3 catch blocks returning safe error messages', () => {
    const safeErrors = src.match(/حدث خطأ داخلي/g) || [];
    expect(safeErrors.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================
// 147 — blockchain.routes.js — open-redirect prevention via hash validation
// ============================================================
describe('Item 147 — blockchain.routes.js open-redirect prevention', () => {
  const src = read('routes/blockchain.routes.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('defines safeHash with hex validation regex', () => {
    expect(src).toMatch(/safeHash/);
    expect(src).toMatch(/\^?\[a-fA-F0-9\]/);
  });

  test('validates hash length is bounded (max 128 chars)', () => {
    expect(src).toMatch(/\{1,128\}/);
  });

  test('returns 400 when hash is invalid', () => {
    expect(src).toMatch(/res\.status\(400\).*json/);
  });

  test('uses safeHash in redirect instead of raw cert.hash', () => {
    expect(src).toMatch(/redirect\(.*safeHash/);
  });

  test('does NOT use raw cert.hash in redirect', () => {
    const redirectLines = src.match(/redirect\(`[^`]*cert\.hash/g);
    expect(redirectLines).toBeNull();
  });
});

// ============================================================
// 148 — app.js — static file serving cache headers + nosniff
// ============================================================
describe('Item 148 — app.js static file serving cache & security headers', () => {
  const src = read('app.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('express.static uses maxAge option', () => {
    // Find express.static('public') block
    const staticIdx = src.indexOf("express.static('public'");
    expect(staticIdx).toBeGreaterThan(-1);
    const block = src.substring(staticIdx, staticIdx + 400);
    expect(block).toMatch(/maxAge/);
  });

  test('setHeaders callback sets X-Content-Type-Options nosniff', () => {
    const staticIdx = src.indexOf("express.static('public'");
    const block = src.substring(staticIdx, staticIdx + 400);
    expect(block).toMatch(/X-Content-Type-Options.*nosniff/);
  });

  test('fingerprinted assets get immutable cache-control', () => {
    const staticIdx = src.indexOf("express.static('public'");
    const block = src.substring(staticIdx, staticIdx + 400);
    expect(block).toMatch(/immutable/);
  });

  test('setHeaders callback is defined in static options', () => {
    const staticIdx = src.indexOf("express.static('public'");
    const block = src.substring(staticIdx, staticIdx + 400);
    expect(block).toMatch(/setHeaders\s*:/);
  });
});

// ============================================================
// 149 — templates.js — multer upload file-size limit
// ============================================================
describe('Item 149 — templates.js multer file-size limit', () => {
  const src = read('routes/templates.js');

  test('multer configuration includes limits object', () => {
    expect(src).toMatch(/multer\(\s*\{[\s\S]*?limits\s*:/);
  });

  test('fileSize limit is set to 10 MB (10 * 1024 * 1024)', () => {
    expect(src).toMatch(/fileSize\s*:\s*10\s*\*\s*1024\s*\*\s*1024/);
  });

  test('limits block is inside the multer() config call', () => {
    const multerIdx = src.indexOf('multer({');
    expect(multerIdx).toBeGreaterThan(-1);
    const block = src.substring(multerIdx, multerIdx + 300);
    expect(block).toMatch(/limits\s*:\s*\{\s*fileSize/);
  });
});

// ============================================================
// 150 — community.js — input length validation
// ============================================================
describe('Item 150 — community.js input length validation (COMMUNITY_FIELD_LIMITS)', () => {
  const src = read('routes/community.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('defines COMMUNITY_FIELD_LIMITS constant', () => {
    expect(src).toMatch(/const\s+COMMUNITY_FIELD_LIMITS\s*=/);
  });

  test('COMMUNITY_FIELD_LIMITS includes title, description, name limits', () => {
    expect(src).toMatch(/title\s*:\s*\d+/);
    expect(src).toMatch(/description\s*:\s*\d+/);
    expect(src).toMatch(/name\s*:\s*\d+/);
  });

  test('defines validateFieldLengths helper function', () => {
    expect(src).toMatch(/function\s+validateFieldLengths\s*\(/);
  });

  test('validateFieldLengths is called in POST /content route', () => {
    const contentIdx = src.indexOf("'/content'");
    expect(contentIdx).toBeGreaterThan(-1);
    const block = src.substring(contentIdx, contentIdx + 600);
    expect(block).toMatch(/validateFieldLengths/);
  });

  test('validateFieldLengths is called in POST /sessions route', () => {
    const sessionsIdx = src.indexOf("'/sessions'");
    expect(sessionsIdx).toBeGreaterThan(-1);
    const block = src.substring(sessionsIdx, sessionsIdx + 600);
    expect(block).toMatch(/validateFieldLengths/);
  });

  test('returns 400 when field exceeds limit', () => {
    const src2 = src;
    // There should be a pattern that returns 400 for length errors
    expect(src2).toMatch(/return\s+res\.status\(400\).*lengthErr/);
  });
});
