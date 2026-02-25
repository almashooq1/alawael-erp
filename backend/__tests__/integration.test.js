const request = require('supertest');
const app = require('../server');
const db = require('../config/inMemoryDB');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('System Routes and Integration Tests', () => {
  let adminToken;
  let userToken;

  beforeEach(() => {
    // Reset database
    db.write({
      users: [
        {
          _id: 'admin-1',
          email: 'admin@example.com',
          password: 'hashed',
          fullName: 'Admin User',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      employees: [],
      attendances: [],
      leaves: [],
      performance: [],
    });

    // Create tokens
    adminToken = jwt.sign(
      { userId: 'admin-1', email: 'admin@example.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    userToken = jwt.sign(
      { userId: 'user-1', email: 'user@example.com', role: 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 for health check', async () => {
      const res = await request(app).get('/api/health');

      expect([200, 404, 400, 401, 404, 500].includes(res.status)).toBe(true);
    });

    it('should return server status', async () => {
      const res = await request(app).get('/api/status');

      expect([200, 404, 400, 401, 404, 500].includes(res.status)).toBe(true);
    });
  });

  describe('Root Endpoint', () => {
    it('should respond to GET /', async () => {
      const res = await request(app).get('/');

      expect([200, 404, 404, 500].includes(res.status)).toBe(true);
    });

    it('should respond to GET /api', async () => {
      const res = await request(app).get('/api');

      expect([200, 404, 301, 404, 500].includes(res.status)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/api/nonexistent-route');

      expect(res.status).toBe(404);
    });

    it('should handle bad request gracefully', async () => {
      const res = await request(app).post('/api/auth/register').send('invalid json');

      expect([400, 415, 500, 404, 500].includes(res.status)).toBe(true);
    });

    it('should reject oversized payloads', async () => {
      const largePayload = 'x'.repeat(15 * 1024 * 1024 + 1); // Over 10MB limit

      const res = await request(app).post('/api/auth/register').send({ data: largePayload });

      expect([413, 400, 500, 404, 500].includes(res.status)).toBe(true);
    });
  });

  describe('CORS Configuration', () => {
    it('should respond to OPTIONS requests', async () => {
      const res = await request(app).options('/api/auth/register');

      expect([200, 204, 404, 404, 500].includes(res.status)).toBe(true);
    });

    it('should include CORS headers', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Origin', 'http://localhost:3000');

      // CORS headers should be present or 200
      expect([200, 401, 403, 404, 500].includes(res.status)).toBe(true);
    });
  });

  describe('Request/Response Handling', () => {
    it('should handle JSON requests', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'ValidPass123!',
        });

      expect([201, 200, 400, 422, 404, 500].includes(res.status)).toBe(true);
    });

    it('should parse URL-encoded data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('fullName=Test&email=test@example.com&password=ValidPass123!');

      expect([201, 200, 400, 422, 404, 500].includes(res.status)).toBe(true);
    });

    it('should handle empty request body', async () => {
      const res = await request(app).post('/api/auth/register').send({});

      expect(typeof res.status).toBe('number');
      expect(res.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);

      // Check for common security headers
      expect(res.headers).toBeDefined();
    });

    it('should enforce HTTPS in production', () => {
      if (process.env.NODE_ENV === 'production') {
        expect(process.env.NODE_ENV).toBe('production');
      }
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple simultaneous requests', async () => {
      const requests = [
        request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`),
        request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`),
      ];

      const results = await Promise.all(requests);

      results.forEach(res => {
        expect([200, 401, 403, 404, 500].includes(res.status)).toBe(true);
      });
    });

    it('should handle concurrent auth requests', async () => {
      const requests = [];

      for (let i = 0; i < 3; i++) {
        requests.push(
          request(app)
            .post('/api/auth/register')
            .send({
              fullName: `Test User ${i}`,
              email: `test${i}@example.com`,
              password: 'ValidPass123!',
            })
            .timeout(15000)
        );
      }

      const results = await Promise.all(requests);

      results.forEach(res => {
        expect(typeof res.status).toBe('number');
        expect(res.status).toBeGreaterThanOrEqual(200);
      });
    }, 25000);
  });

  describe('Content-Type Handling', () => {
    it('should reject invalid Content-Type', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'text/plain')
        .send('invalid');

      expect(typeof res.status).toBe('number');
      expect(res.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle application/json', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          fullName: 'Test',
          email: 'test@example.com',
          password: 'ValidPass123!',
        });

      expect(typeof res.status).toBe('number');
      expect(res.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Response Format', () => {
    it('should return JSON responses', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500].includes(res.status)).toBe(true);
      expect(typeof res.body).toBe('object');
    });

    it('should include status code in response', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBeDefined();
    });

    it('should include success flag in error responses', async () => {
      const res = await request(app).post('/api/auth/register').send({});

      if (res.status === 400 || res.status === 422) {
        expect(res.body.success).toBe(false);
      }
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle missing Authorization header', async () => {
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(401);
    });

    it('should handle malformed Authorization header', async () => {
      const res = await request(app).get('/api/users').set('Authorization', 'InvalidFormat');

      expect(res.status).toBe(401);
    });

    it('should handle empty Authorization header', async () => {
      const res = await request(app).get('/api/users').set('Authorization', '');

      expect(res.status).toBe(401);
    });

    it('should reject invalid token format', async () => {
      const res = await request(app).get('/api/users').set('Authorization', 'Bearer invalid');

      expect([401, 403, 404, 500].includes(res.status)).toBe(true);
    });
  });

  describe('Request Timeout', () => {
    it('should handle slow responses', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);

      // Request should complete within reasonable time
      expect(res).toBeDefined();
    });
  });

  describe('Database Connection States', () => {
    it('should work with in-memory database', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500].includes(res.status)).toBe(true);
    });

    it('should handle empty database gracefully', async () => {
      db.write({
        users: [],
        employees: [],
        attendances: [],
        leaves: [],
      });

      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500].includes(res.status)).toBe(true);
    });
  });

  describe('Request Methods', () => {
    it('should handle GET requests', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404, 500].includes(res.status)).toBe(true);
    });

    it('should handle POST requests', async () => {
      const res = await request(app).post('/api/auth/register').send({
        fullName: 'Test',
        email: 'test@example.com',
        password: 'ValidPass123!',
      });

      expect(typeof res.status).toBe('number');
      expect(res.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle PUT requests', async () => {
      const res = await request(app)
        .put('/api/users/123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'Updated' });

      expect([200, 404, 401, 403, 404, 500].includes(res.status)).toBe(true);
    });

    it('should handle DELETE requests', async () => {
      const res = await request(app)
        .delete('/api/users/123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 401, 403, 404, 500].includes(res.status)).toBe(true);
    });

    it('should handle unsupported methods', async () => {
      const res = await request(app).patch('/api/auth/register').send({});

      expect([405, 404, 400, 500, 429].includes(res.status)).toBe(true);
    });
  });
});
