/**
 * إعداد Jest للاختبارات
 * Jest Setup Configuration
 */

// إعداد متغيرات البيئة للاختبار
process.env.NODE_ENV = 'test';
process.env.MONGO_TEST_URI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/audit_test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.USE_MOCK_DB = 'true';
process.env.SMART_TEST_MODE = 'true';
process.env.CSRF_PROTECTION_ENABLED = 'false';
process.env.DISABLE_REDIS = 'true';

// زيادة وقت الانتظار للاختبارات
jest.setTimeout(30000);

// Mock console.log في الاختبارات (اختياري)
if (process.env.SILENT_TESTS) {
  global.console.log = jest.fn();
  global.console.info = jest.fn();
  global.console.warn = jest.fn();
}

// Helper functions للاختبارات
global.createMockRequest = (overrides = {}) => {
  return {
    method: 'GET',
    originalUrl: '/api/test',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'content-type': 'application/json',
      ...overrides.headers,
    },
    ip: '127.0.0.1',
    body: {},
    query: {},
    params: {},
    user: null,
    ...overrides,
  };
};

global.createMockResponse = () => {
  const res = {
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
};

global.createMockUser = (overrides = {}) => {
  return {
    _id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
  };
};

global.delay = ms => new Promise(resolve => setTimeout(resolve, ms));

console.log('✅ Jest setup complete');
