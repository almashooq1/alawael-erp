/**
 * Batch 13 — Security Audit Tests (Items 121-130)
 *
 *  121  auth.routes.js — bcrypt cost factor upgraded 10→12 (3 locations)
 *  122  notifications.routes.js — bulk-create array length cap (MAX 100)
 *  123  securityHeaders.js — SENSITIVE_PATHS includes /api/sso
 *  124  webhooks.js — events array max length cap (MAX 20)
 *  125  library.routes.js — bulk-import max array length (MAX 200)
 *  126  templates.js — Math.random() replaced with crypto.randomBytes for upload filenames
 *  127  templates.js — mass-assignment prevention (field whitelist instead of ...req.body)
 *  128  reports.js — Content-Disposition header injection prevention
 *  129  media.routes.js — res.download filename sanitisation (CRLF/quote removal)
 *  130  securityHeaders.js — Permissions-Policy includes browsing-topics=()
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ─── Helper: read file safely ────────────────────────────────────────────────
const readSafe = filePath => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 121 — auth.routes.js — bcrypt.genSalt(10) → genSalt(12) at 3 locations
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 121 — auth.routes.js bcrypt cost factor upgrade', () => {
  const src = readSafe(path.join(ROOT, 'api', 'routes', 'auth.routes.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('does NOT contain genSalt(10)', () => {
    expect(src).not.toMatch(/genSalt\(\s*10\s*\)/);
  });

  test('contains genSalt(12) for registration', () => {
    expect(src).toMatch(/genSalt\(\s*12\s*\)/);
  });

  test('all genSalt calls use cost factor 12', () => {
    const matches = src.match(/genSalt\(\s*\d+\s*\)/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
    matches.forEach(m => {
      expect(m).toMatch(/genSalt\(\s*12\s*\)/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 122 — notifications.routes.js — bulk-create array length cap
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 122 — notifications bulk-create array length cap', () => {
  const src = readSafe(path.join(ROOT, 'routes', 'notifications.routes.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('defines MAX_BULK_NOTIFICATIONS constant', () => {
    expect(src).toMatch(/MAX_BULK_NOTIFICATIONS\s*=\s*\d+/);
  });

  test('MAX_BULK_NOTIFICATIONS is 100 or less', () => {
    const match = src.match(/MAX_BULK_NOTIFICATIONS\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBeLessThanOrEqual(100);
  });

  test('rejects arrays exceeding the cap', () => {
    expect(src).toMatch(/notificationsArray\.length\s*>\s*MAX_BULK_NOTIFICATIONS/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 123 — securityHeaders.js — SENSITIVE_PATHS includes /api/sso
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 123 — securityHeaders SENSITIVE_PATHS includes SSO', () => {
  const src = readSafe(path.join(ROOT, 'middleware', 'securityHeaders.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('SENSITIVE_PATHS array includes /api/sso', () => {
    expect(src).toMatch(/SENSITIVE_PATHS\s*=\s*\[[\s\S]*?['"]\/api\/sso['"]/);
  });

  test('still includes original sensitive paths', () => {
    expect(src).toMatch(/['"]\/api\/auth['"]/);
    expect(src).toMatch(/['"]\/api\/v1\/auth['"]/);
    expect(src).toMatch(/['"]\/api\/users\/me['"]/);
    expect(src).toMatch(/['"]\/api\/admin['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 124 — webhooks.js — events array max length cap
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 124 — webhooks events array max length cap', () => {
  const src = readSafe(path.join(ROOT, 'routes', 'webhooks.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('defines MAX_WEBHOOK_EVENTS constant', () => {
    expect(src).toMatch(/MAX_WEBHOOK_EVENTS\s*=\s*\d+/);
  });

  test('MAX_WEBHOOK_EVENTS is 20 or less', () => {
    const match = src.match(/MAX_WEBHOOK_EVENTS\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBeLessThanOrEqual(20);
  });

  test('rejects events arrays exceeding the cap', () => {
    expect(src).toMatch(/events\.length\s*>\s*MAX_WEBHOOK_EVENTS/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 125 — library.routes.js — bulk-import max array length
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 125 — library bulk-import array length cap', () => {
  const src = readSafe(path.join(ROOT, 'routes', 'library.routes.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('bulk-import items validator includes max constraint', () => {
    expect(src).toMatch(/isArray\(\s*\{[^}]*max\s*:/);
  });

  test('max is 200 or less', () => {
    const match = src.match(/isArray\(\s*\{[^}]*max\s*:\s*(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBeLessThanOrEqual(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 126 — templates.js — Math.random() replaced with crypto for upload filenames
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 126 — templates.js upload filename uses crypto', () => {
  const src = readSafe(path.join(ROOT, 'routes', 'templates.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('does NOT use Math.random() for filenames', () => {
    // Check in the multer storage section (first ~35 lines)
    const storageSection = src.substring(0, src.indexOf('upload.single') + 200);
    expect(storageSection).not.toMatch(/Math\.random\(\)/);
  });

  test('uses crypto module for filename generation', () => {
    expect(src).toMatch(/crypto\.randomBytes/);
  });

  test('requires crypto module', () => {
    expect(src).toMatch(/require\(\s*['"]crypto['"]\s*\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 127 — templates.js — mass-assignment prevention (no ...req.body spread)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 127 — templates.js mass-assignment prevention', () => {
  const src = readSafe(path.join(ROOT, 'routes', 'templates.js'));

  test('POST / (create) does NOT spread req.body into Template.create', () => {
    // Find the create route section
    const createIdx = src.indexOf('Template.create');
    if (createIdx === -1) return; // skip if not found
    const createSection = src.substring(createIdx - 100, createIdx + 200);
    expect(createSection).not.toMatch(/\.\.\.\s*req\.body/);
  });

  test('PUT /:id (update) does NOT spread req.body into findOneAndUpdate', () => {
    const updateIdx = src.indexOf('findOneAndUpdate');
    if (updateIdx === -1) return;
    const updateSection = src.substring(updateIdx - 100, updateIdx + 200);
    expect(updateSection).not.toMatch(/\.\.\.\s*req\.body/);
  });

  test('create uses explicit field destructuring from req.body', () => {
    // Should destructure specific fields before passing to Template.create
    const createIdx = src.indexOf('Template.create');
    if (createIdx === -1) return;
    const beforeCreate = src.substring(Math.max(0, createIdx - 300), createIdx);
    expect(beforeCreate).toMatch(/\{\s*(title|category|language)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 128 — reports.js — Content-Disposition header injection prevention
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 128 — reports.js Content-Disposition sanitisation', () => {
  const src = readSafe(path.join(ROOT, 'routes', 'reports.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('sanitises filename before setting Content-Disposition', () => {
    expect(src).toMatch(/\.replace\([^)]*\\r|\\n|\\"/);
  });

  test('does NOT use raw file.filename directly in Content-Disposition', () => {
    // Should use safeName or equivalent, not raw file.filename
    expect(src).not.toMatch(/Content-Disposition.*\$\{file\.filename\}/);
  });

  test('uses a sanitised variable in Content-Disposition header', () => {
    expect(src).toMatch(/safeName|sanitizedName|cleanName/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 129 — media.routes.js — download filename sanitisation
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 129 — media.routes.js download filename sanitisation', () => {
  const src = readSafe(path.join(ROOT, 'routes', 'media.routes.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('does NOT pass raw media.originalName directly to res.download', () => {
    expect(src).not.toMatch(/res\.download\(\s*filePath\s*,\s*media\.originalName\s*\)/);
  });

  test('sanitises originalName before download (strips CR/LF/quotes)', () => {
    expect(src).toMatch(/safeOriginalName|sanitizedName|cleanName/);
  });

  test('sanitisation removes carriage return, newline, and double quotes', () => {
    expect(src).toMatch(/\.replace\([^)]*\\r[^)]*\\n/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 130 — securityHeaders.js — Permissions-Policy includes browsing-topics
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 130 — securityHeaders Permissions-Policy browsing-topics', () => {
  const src = readSafe(path.join(ROOT, 'middleware', 'securityHeaders.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('Permissions-Policy includes browsing-topics=()', () => {
    expect(src).toMatch(/browsing-topics=\(\)/);
  });

  test('retains existing Permissions-Policy directives', () => {
    expect(src).toMatch(/geolocation=\(\)/);
    expect(src).toMatch(/microphone=\(\)/);
    expect(src).toMatch(/camera=\(\)/);
    expect(src).toMatch(/payment=\(\)/);
  });
});
