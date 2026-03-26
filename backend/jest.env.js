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
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-minimum-32-chars!';
process.env.CSRF_DISABLE = 'true';
process.env.DISABLE_REDIS = 'true';
