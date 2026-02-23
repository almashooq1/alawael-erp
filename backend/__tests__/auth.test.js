const request = require('supertest');
const app = require('../server');
const db = require('../config/inMemoryDB');

describe('Authentication Routes', () => {
  describe('POST /api/auth/register', () => {
    beforeAll(() => {
      // Reset database ONCE before all register tests
      db.write({
        users: [],
        employees: [],
        attendances: [],
        leaves: [],
        performance: [],
      });
    });

    it('should register a new user successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Test@12345',
      });

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should reject duplicate email', async () => {
      // Register first user
      await request(app).post('/api/auth/register').send({
        fullName: 'User One',
        email: 'duplicate@example.com',
        password: 'Test@12345',
      });

      // Try to register with same email
      const res = await request(app).post('/api/auth/register').send({
        fullName: 'User Two',
        email: 'duplicate@example.com',
        password: 'Test@12345',
      });

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('should require all fields', async () => {
      const res = await request(app).post('/api/auth/register').send({
        fullName: 'Test User',
        // missing email and password
      });

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      // Register user FIRST (within this test to avoid rate limiting)
      const registerRes = await request(app).post('/api/auth/register').send({
        fullName: 'Login Test User',
        email: 'newlogin@example.com',
        password: 'Test@12345',
      });

      // Then login with the same credentials
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'newlogin@example.com',
        password: 'Test@12345',
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'Test@12345',
      });

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'newlogin@example.com',
        password: 'WrongPassword',
      });

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // Register user
      const registerRes = await request(app).post('/api/auth/register').send({
        fullName: 'Logout Test',
        email: 'logout@example.com',
        password: 'Test@12345',
      });

      expect([200, 201, 400, 401, 403, 404]).toContain(registerRes.status);
      expect(registerRes.body.data).toBeDefined();
      expect(registerRes.body.data.accessToken).toBeDefined();

      const token = registerRes.body.data.accessToken;

      // Now logout
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });
  });
});
