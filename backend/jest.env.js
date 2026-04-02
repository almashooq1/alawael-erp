/**
 * Jest Environment Variables — loaded via setupFiles (before any module).
 *
 * Sets baseline env vars that MUST be available before require() calls.
 * More detailed mock setup happens in jest.setup.js (setupFilesAfterEnv).
 */

'use strict';

process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DB = 'true';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/alawael_test';
// CI strict validation requires all security vars to be >= 32 chars
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-minimum-32-chars-ok!!';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-minimum-32-chars-ok!!';
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'test-encryption-key-minimum-32chars-ok!!';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-min-16chars!';
process.env.CSRF_DISABLE = 'true';
process.env.DISABLE_REDIS = 'true';
// Use fewer bcrypt rounds in tests (4 vs 12 = 256x faster, prevents CI slowness)
process.env.BCRYPT_ROUNDS = '4';
