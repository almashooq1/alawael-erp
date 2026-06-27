/**
 * Tests for Dashboard Endpoints
 * فحوصات نقاط نهاية Dashboard
 */

const request = require('supertest');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Dashboard Endpoints', () => {
  describe('GET /api/v1/dashboard/health', () => {
    test('should return 200', async () => {
      const res = await request(API_BASE).get('/api/v1/dashboard/health');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/dashboard/summary', () => {
    test('should return 200 or 401', async () => {
      const res = await request(API_BASE).get('/api/v1/dashboard/summary');
      // 401 if auth required, 200 if public or with token
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/v1/dashboard/summary-systems', () => {
    test('should return 200 or 401', async () => {
      const res = await request(API_BASE).get('/api/v1/dashboard/summary-systems');
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/v1/dashboard/services', () => {
    test('should return 200 or 401', async () => {
      const res = await request(API_BASE).get('/api/v1/dashboard/services');
      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/v1/dashboard/top-kpis', () => {
    test('should return 200 or 401 with default limit', async () => {
      const res = await request(API_BASE).get('/api/v1/dashboard/top-kpis');
      expect([200, 401]).toContain(res.status);
    });

    test('should accept limit parameter', async () => {
      const res = await request(API_BASE).get('/api/v1/dashboard/top-kpis?limit=10');
      expect([200, 401]).toContain(res.status);
    });
  });
});
