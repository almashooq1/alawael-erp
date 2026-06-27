/**
 * Tests for Auth Endpoints
 * فحوصات نقاط نهاية المصادقة
 */

const request = require('supertest');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Auth Endpoints', () => {
  describe('POST /api/v1/auth/login', () => {
    test('should return 400 for missing credentials', async () => {
      const res = await request(API_BASE)
        .post('/api/v1/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });

    test('should return 401 for invalid credentials', async () => {
      const res = await request(API_BASE)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        });
      expect(res.status).toBe(401);
    });

    test('should return 200 and token for valid credentials', async () => {
      // Note: This test requires a valid test user
      // Skip if no test credentials are configured
      const testEmail = process.env.TEST_USER_EMAIL;
      const testPassword = process.env.TEST_USER_PASSWORD;

      if (!testEmail || !testPassword) {
        console.warn('Skipping valid login test — TEST_USER_EMAIL/PASSWORD not set');
        return;
      }

      const res = await request(API_BASE)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    test('should return 200 even without token', async () => {
      const res = await request(API_BASE).post('/api/v1/auth/logout');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    test('should return 400 for missing refresh token', async () => {
      const res = await request(API_BASE)
        .post('/api/v1/auth/refresh')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
