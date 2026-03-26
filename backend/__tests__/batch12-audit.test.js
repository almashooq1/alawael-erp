/**
 * Batch 12 — Professional Audit Tests
 *
 * Items 111-120:
 *  111  AuthService.js — bcrypt cost factor upgraded 10→12
 *  112  AuthenticationService.js — bcrypt cost factor upgraded 10→12
 *  113  SCM security.js — Math.random()→crypto.randomInt for OTP & temp password
 *  114  SCM middleware.js — Math.random()→crypto.randomUUID() for request IDs
 *  115  SCM middleware/logging.js — Math.random()→crypto.randomUUID() for request IDs
 *  116  SCM middleware/logging.js — error logger redacts req.body sensitive fields & stack in prod
 *  117  sso.routes.js — open redirect prevention (redirect_uri host whitelist)
 *  118  SCM middleware/errorHandler.js — stack trace leak prevention in production logs
 *  119  AuthenticationService.js — PII (phone, idNumber) removed from JWT payload
 *  120  SCM middleware/logging.js — log injection prevention (newline/control char sanitisation)
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
// 111 — AuthService.js — bcrypt cost factor 10→12
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 111 — AuthService.js bcrypt cost factor upgrade', () => {
  const src = readSafe(path.join(ROOT, 'services', 'AuthService.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('bcrypt saltRounds is 12 (not 10)', () => {
    expect(src).toMatch(/saltRounds\s*=\s*12/);
  });

  test('does NOT contain saltRounds = 10', () => {
    expect(src).not.toMatch(/saltRounds\s*=\s*10/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 112 — AuthenticationService.js — bcrypt cost factor 10→12
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 112 — AuthenticationService.js bcrypt cost factor upgrade', () => {
  const src = readSafe(path.join(ROOT, 'services', 'AuthenticationService.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('BCRYPT_ROUNDS is 12', () => {
    expect(src).toMatch(/BCRYPT_ROUNDS\s*=\s*12/);
  });

  test('does NOT contain BCRYPT_ROUNDS = 10', () => {
    expect(src).not.toMatch(/BCRYPT_ROUNDS\s*=\s*10/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 113 — SCM security.js — Math.random()→crypto.randomInt for OTP & temp password
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 113 — SCM security.js crypto-safe random for OTP & temp password', () => {
  const src = readSafe(path.join(SCM_ROOT, 'utils', 'security.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('generateTemporary uses crypto.randomInt instead of Math.random', () => {
    // Find the generateTemporary function block
    const funcMatch = src.match(/generateTemporary[\s\S]*?return password;/);
    expect(funcMatch).not.toBeNull();
    const funcBody = funcMatch[0];
    expect(funcBody).toMatch(/crypto\.randomInt/);
    expect(funcBody).not.toMatch(/Math\.random/);
  });

  test('generateOTP uses crypto.randomInt instead of Math.random', () => {
    const funcMatch = src.match(/generateOTP[\s\S]*?return otp;/);
    expect(funcMatch).not.toBeNull();
    const funcBody = funcMatch[0];
    expect(funcBody).toMatch(/crypto\.randomInt/);
    expect(funcBody).not.toMatch(/Math\.random/);
  });

  test('crypto module is imported', () => {
    expect(src).toMatch(/import\s+crypto\s+from\s+['"]crypto['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 114 — SCM middleware.js — crypto.randomUUID() for request IDs
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 114 — SCM middleware.js crypto-safe request IDs', () => {
  const src = readSafe(path.join(SCM_ROOT, 'middleware.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('imports crypto module', () => {
    expect(src).toMatch(/require\(['"]crypto['"]\)/);
  });

  test('requestIdMiddleware uses crypto.randomUUID()', () => {
    expect(src).toMatch(/crypto\.randomUUID\(\)/);
  });

  test('requestIdMiddleware does NOT use Math.random()', () => {
    // The requestIdMiddleware section should not use Math.random
    const reqIdSection = src.match(/requestIdMiddleware[\s\S]*?next\(\);[\s\S]*?\};/);
    if (reqIdSection) {
      expect(reqIdSection[0]).not.toMatch(/Math\.random/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 115 — SCM middleware/logging.js — crypto.randomUUID() for request IDs
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 115 — SCM logging middleware crypto-safe request IDs', () => {
  const src = readSafe(path.join(SCM_ROOT, 'middleware', 'logging.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('imports crypto module', () => {
    expect(src).toMatch(/require\(['"]crypto['"]\)/);
  });

  test('requestLoggingMiddleware uses crypto.randomUUID()', () => {
    const section = src.match(/requestLoggingMiddleware[\s\S]*?next\(\);/);
    expect(section).not.toBeNull();
    expect(section[0]).toMatch(/crypto\.randomUUID\(\)/);
  });

  test('requestLoggingMiddleware does NOT use Math.random()', () => {
    const section = src.match(/requestLoggingMiddleware[\s\S]*?next\(\);/);
    expect(section).not.toBeNull();
    expect(section[0]).not.toMatch(/Math\.random/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 116 — SCM logging.js errorLoggingMiddleware — redacts sensitive body & stack
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 116 — SCM errorLoggingMiddleware sensitive data redaction', () => {
  const src = readSafe(path.join(SCM_ROOT, 'middleware', 'logging.js'));

  test('defines SENSITIVE_KEYS array', () => {
    expect(src).toMatch(/SENSITIVE_KEYS/);
  });

  test('defines redactSensitive helper', () => {
    expect(src).toMatch(/redactSensitive/);
  });

  test('errorLoggingMiddleware uses redactSensitive on req.body', () => {
    expect(src).toMatch(/redactSensitive\(req\.body\)/);
  });

  test('errorLoggingMiddleware conditionally includes stack (not in prod)', () => {
    // Should check NODE_ENV before including stack
    const section = src.match(/errorLoggingMiddleware[\s\S]*?next\(err\);/);
    expect(section).not.toBeNull();
    expect(section[0]).toMatch(/isProd/);
    expect(section[0]).toMatch(/stack/);
  });

  test('SENSITIVE_KEYS includes password and token', () => {
    expect(src).toMatch(/['"]password['"]/);
    expect(src).toMatch(/['"]token['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 117 — sso.routes.js — open redirect prevention
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 117 — sso.routes.js open redirect prevention', () => {
  const src = readSafe(path.join(ROOT, 'routes', 'sso.routes.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('validates redirect_uri hostname against allowed list', () => {
    expect(src).toMatch(/allowedRedirectHosts/);
  });

  test('references OAUTH_ALLOWED_REDIRECT_HOSTS or CORS_ORIGINS for whitelist', () => {
    expect(src).toMatch(/OAUTH_ALLOWED_REDIRECT_HOSTS|CORS_ORIGINS/);
  });

  test('rejects redirect_uri with hostname not in allowed list', () => {
    expect(src).toMatch(/redirect_uri hostname is not in the allowed list/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 118 — SCM errorHandler.js — stack trace leak prevention in production
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 118 — SCM errorHandler.js production stack trace leak prevention', () => {
  const src = readSafe(path.join(SCM_ROOT, 'middleware', 'errorHandler.js'));

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('checks NODE_ENV before logging stack', () => {
    // The error handler should conditionally include stack
    expect(src).toMatch(/isProd/);
  });

  test('does NOT unconditionally log err.stack in console.error', () => {
    // The old pattern `stack: err.stack` without condition should not exist
    // The new pattern uses spread with isProd check
    const consoleSection = src.match(/console\.error[\s\S]*?\}\)/);
    expect(consoleSection).not.toBeNull();
    // Should NOT have bare `stack: err.stack` — should be conditional
    expect(consoleSection[0]).toMatch(/isProd\s*\?/);
  });

  test('production error response hides internal details', () => {
    // For custom app errors and default 500, production masks message
    expect(src).toMatch(/production.*An.*error occurred|production.*unexpected/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 119 — AuthenticationService.js — PII removed from JWT payload
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 119 — AuthenticationService.js PII removed from JWT payload', () => {
  const src = readSafe(path.join(ROOT, 'services', 'AuthenticationService.js'));

  test('generateToken function exists', () => {
    expect(src).toMatch(/generateToken\s*\(/);
  });

  test('JWT payload does NOT include phone field', () => {
    // Find the generateToken payload definition
    const payloadMatch = src.match(/generateToken[\s\S]*?jwt\.sign/);
    expect(payloadMatch).not.toBeNull();
    const payloadSection = payloadMatch[0];
    // phone should not be in the payload object, only in comment
    expect(payloadSection).not.toMatch(/phone:\s*user\.phone/);
  });

  test('JWT payload does NOT include idNumber field', () => {
    const payloadMatch = src.match(/generateToken[\s\S]*?jwt\.sign/);
    expect(payloadMatch).not.toBeNull();
    const payloadSection = payloadMatch[0];
    expect(payloadSection).not.toMatch(/idNumber:\s*user\.idNumber/);
  });

  test('JWT payload still includes required fields (id, email, roles)', () => {
    const payloadMatch = src.match(/generateToken[\s\S]*?jwt\.sign/);
    expect(payloadMatch).not.toBeNull();
    const payloadSection = payloadMatch[0];
    expect(payloadSection).toMatch(/id:\s*user\.id/);
    expect(payloadSection).toMatch(/email:\s*user\.email/);
    expect(payloadSection).toMatch(/roles:/);
  });

  test('has a comment explaining PII exclusion', () => {
    expect(src).toMatch(/PII.*excluded|PII.*removed/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 120 — SCM middleware/logging.js — log injection prevention
// ═══════════════════════════════════════════════════════════════════════════════
describe('Item 120 — SCM logging.js log injection prevention', () => {
  const src = readSafe(path.join(SCM_ROOT, 'middleware', 'logging.js'));

  test('defines sanitizeLogString helper', () => {
    expect(src).toMatch(/sanitizeLogString/);
  });

  test('sanitizeLogString strips newlines', () => {
    expect(src).toMatch(/\\r\\n|\\n|\\r/);
  });

  test('Logger.log() sanitises message before writing', () => {
    // The log method should sanitise the message
    const logMethod = src.match(/log\(level,\s*message[\s\S]*?return logEntry;/);
    expect(logMethod).not.toBeNull();
    expect(logMethod[0]).toMatch(/safeMessage|sanitize/i);
  });

  test('errorLoggingMiddleware sanitises err.message before logging', () => {
    expect(src).toMatch(/sanitizeLogString\(err\.message\)/);
  });

  test('errorLoggingMiddleware sanitises req.originalUrl before logging', () => {
    expect(src).toMatch(/sanitizeLogString\(req\.originalUrl\)/);
  });
});
