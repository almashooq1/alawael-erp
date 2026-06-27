/**
 * Tests for RBAC Endpoints
 * فحوصات نقاط نهاية RBAC
 */

const request = require('supertest');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

describe('RBAC Endpoints', () => {
  describe('GET /api/v1/rbac-admin/roles', () => {
    test('should return 200 or 401', async () => {
      const res = await request(API_BASE).get('/api/v1/rbac-admin/roles');
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/v1/rbac-admin/permissions', () => {
    test('should return 200 or 401', async () => {
      const res = await request(API_BASE).get('/api/v1/rbac-admin/permissions');
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/v1/rbac-admin/roles/:role', () => {
    test('should return 200 or 401 or 404 for test role', async () => {
      const res = await request(API_BASE).get('/api/v1/rbac-admin/roles/test-role');
      expect([200, 401, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/rbac-admin/users/:userId/permissions', () => {
    test('should return 200 or 401 or 404 for test user', async () => {
      const res = await request(API_BASE).get('/api/v1/rbac-admin/users/test-user/permissions');
      expect([200, 401, 404]).toContain(res.status);
    });
  });
});
