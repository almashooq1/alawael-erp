/**
 * Batch 10 — Professional Audit Tests
 *
 * Items 91-100:
 *  91  SCM Shipments upload: fileFilter + size limits
 *  92  SCM Products upload: fileFilter + size limits
 *  93  PII masking — national_id in disabilityCard.service.js
 *  94  PII masking — phone/email in notificationSystem & emailService
 *  95  Hardcoded password removed from User.memory.js log
 *  96  SCM Server — request timeout, graceful shutdown, keepAliveTimeout
 *  97  SCM Server — express-async-errors + global error handler
 *  98  SCM Auth /me — uses authMiddleware instead of manual JWT parsing
 *  99  SCM Auth register — bcrypt cost factor 12 (up from 10)
 * 100  SCM Auth login — JWT includes jti claim for blacklisting
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCM_ROOT = path.resolve(ROOT, '..', 'supply-chain-management', 'backend');

// ─── Helper: read file safely ────────────────────────────────────────────────
const readSafe = filePath => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 91 — SCM Shipments upload: fileFilter + size limits
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 91 — SCM Shipments upload validation', () => {
  const src = readSafe(path.join(SCM_ROOT, 'routes', 'shipments.js'));

  test('has a MIME whitelist (ALLOWED_MIMES)', () => {
    expect(src).toMatch(/ALLOWED_MIMES/);
  });

  test('has an extension whitelist (ALLOWED_EXTS)', () => {
    expect(src).toMatch(/ALLOWED_EXTS/);
  });

  test('enforces fileSize limit in multer config', () => {
    expect(src).toMatch(/fileSize\s*:\s*\d+/);
  });

  test('uses fileFilter in multer', () => {
    expect(src).toMatch(/fileFilter\s*:\s*shipmentFileFilter/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 92 — SCM Products upload: fileFilter + size limits
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 92 — SCM Products upload validation', () => {
  const src = readSafe(path.join(SCM_ROOT, 'routes', 'products.js'));

  test('has a MIME whitelist (PRODUCT_ALLOWED_MIMES)', () => {
    expect(src).toMatch(/PRODUCT_ALLOWED_MIMES/);
  });

  test('has an extension whitelist (PRODUCT_ALLOWED_EXTS)', () => {
    expect(src).toMatch(/PRODUCT_ALLOWED_EXTS/);
  });

  test('enforces fileSize limit in multer config', () => {
    expect(src).toMatch(/fileSize\s*:\s*\d+/);
  });

  test('uses fileFilter in multer', () => {
    expect(src).toMatch(/fileFilter\s*:\s*productFileFilter/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 93 — PII masking: national_id in disabilityCard.service.js
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 93 — PII masking in disabilityCard.service.js', () => {
  const src = readSafe(path.join(ROOT, 'services', 'disabilityCard.service.js'));

  test('defines maskNID helper', () => {
    expect(src).toMatch(/const maskNID/);
  });

  test('uses maskNID in MOHR API logger', () => {
    expect(src).toMatch(/maskNID\(data\.national_id\)/);
  });

  test('does NOT log raw national_id', () => {
    // Should not contain ${data.national_id} in logger calls
    expect(src).not.toMatch(/logger\.\w+\(.*\$\{data\.national_id\}/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 94 — PII masking: phone/email in notification & email services
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 94 — PII masking in notification & email services', () => {
  const notifSrc = readSafe(path.join(ROOT, 'services', 'notificationSystem.js'));
  const emailSrc = readSafe(path.join(ROOT, 'services', 'emailService.js'));

  test('notificationSystem masks phone number (last 4 digits only)', () => {
    expect(notifSrc).toMatch(/slice\(-4\)/);
    expect(notifSrc).not.toMatch(
      /logger\.info\(`📱 Sending SMS to \$\{notification\.phoneNumber\}`/
    );
  });

  test('notificationSystem masks email recipient', () => {
    expect(notifSrc).toMatch(/\.replace\(/);
  });

  test('emailService masks recipient email in success log', () => {
    expect(emailSrc).toMatch(/maskedTo/);
  });

  test('emailService masks recipient email in error log', () => {
    // Should use .replace() pattern, not raw ${to}
    expect(emailSrc).toMatch(/to \? to\.replace\(/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 95 — Hardcoded password removed from User.memory.js log
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 95 — No hardcoded password in User.memory.js log', () => {
  const src = readSafe(path.join(ROOT, 'models', 'User.memory.js'));

  test('does NOT log literal "Admin@123456"', () => {
    expect(src).not.toMatch(/logger\.info.*Admin@123456/);
  });

  test('points to env var for password', () => {
    expect(src).toMatch(/ADMIN_INITIAL_PASS env var/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 96 — SCM Server: request timeouts + graceful shutdown
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 96 — SCM server timeouts & graceful shutdown', () => {
  const src = readSafe(path.join(SCM_ROOT, 'server.js'));

  test('sets server.timeout', () => {
    expect(src).toMatch(/\.timeout\s*=\s*30000/);
  });

  test('sets keepAliveTimeout', () => {
    expect(src).toMatch(/\.keepAliveTimeout\s*=\s*65000/);
  });

  test('sets headersTimeout', () => {
    expect(src).toMatch(/\.headersTimeout\s*=\s*66000/);
  });

  test('listens for SIGTERM', () => {
    expect(src).toMatch(/process\.on\('SIGTERM'/);
  });

  test('listens for SIGINT', () => {
    expect(src).toMatch(/process\.on\('SIGINT'/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 97 — SCM Server: express-async-errors + global error handler
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 97 — SCM server async error safety net', () => {
  const src = readSafe(path.join(SCM_ROOT, 'server.js'));

  test('requires express-async-errors', () => {
    expect(src).toMatch(/require\('express-async-errors'\)/);
  });

  test('has a global error handler (4-arg middleware)', () => {
    // (err, _req, res, _next) => { ... }
    expect(src).toMatch(/app\.use\(\(err,/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 98 — SCM Auth /me uses authMiddleware
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 98 — SCM Auth /me uses authMiddleware', () => {
  const src = readSafe(path.join(SCM_ROOT, 'routes', 'auth.js'));

  test('GET /me includes authMiddleware', () => {
    expect(src).toMatch(/router\.get\('\/me',\s*authMiddleware/);
  });

  test('does NOT manually parse Authorization header in /me', () => {
    // Old pattern: req.headers.authorization inside /me handler
    expect(src).not.toMatch(/\/me'.*\n[^}]*req\.headers\.authorization/s);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 99 — SCM Auth register bcrypt cost factor ≥ 12
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 99 — SCM Auth bcrypt cost factor', () => {
  const src = readSafe(path.join(SCM_ROOT, 'routes', 'auth.js'));

  test('uses bcrypt.hash with cost factor 12', () => {
    expect(src).toMatch(/bcrypt\.hash\(password,\s*12\)/);
  });

  test('does NOT use cost factor 10', () => {
    expect(src).not.toMatch(/bcrypt\.hash\(password,\s*10\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 100 — SCM Auth JWT includes jti claim
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 100 — SCM Auth JWT jti claim', () => {
  const src = readSafe(path.join(SCM_ROOT, 'routes', 'auth.js'));

  test('imports crypto module', () => {
    expect(src).toMatch(/require\('crypto'\)/);
  });

  test('generates a jti (randomUUID)', () => {
    expect(src).toMatch(/crypto\.randomUUID\(\)/);
  });

  test('includes jti in JWT payload', () => {
    expect(src).toMatch(/jwt\.sign\(\{.*jti/s);
  });
});
