/**
 * Tests for Health Endpoints
 * فحوصات نقاط نهاية Health
 */

const request = require('supertest');

// Skip if no server instance is exported — we'll test against a running server
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

describe('Health Endpoints', () => {
  test('GET /health should return 200 and status ok', async () => {
    const res = await request(API_BASE).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  test('GET /api/v1/health should return 200 and status ok', async () => {
    const res = await request(API_BASE).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  test('GET /api/v1/health should include timestamp', async () => {
    const res = await request(API_BASE).get('/api/v1/health');
    expect(res.body).toHaveProperty('timestamp');
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
  });

  test('GET /api/v1/health should include uptime', async () => {
    const res = await request(API_BASE).get('/api/v1/health');
    expect(res.body).toHaveProperty('uptime');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThan(0);
  });

  test('GET /api/v1/health should include version', async () => {
    const res = await request(API_BASE).get('/api/v1/health');
    expect(res.body).toHaveProperty('version');
  });
});
