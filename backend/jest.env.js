// Ensure test environment variables are available before any modules load
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.USE_MOCK_DB = 'true';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/alawael_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
