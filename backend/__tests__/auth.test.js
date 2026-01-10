const request = require('supertest');
const app = require('../server');
const db = require('../config/inMemoryDB');

describe('Authentication Routes', () => {
  beforeEach(() => {
    // إعادة تعيين قاعدة البيانات قبل كل اختبار
    db.write({
      users: [],
      employees: [],
      attendances: [],
      leaves: [],
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app).post('/api/auth/register').send({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'Test@12345',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.email).toBe('test@example.com');
    });

    it('should reject duplicate email', async () => {
      // تسجيل مستخدم أول
      await request(app).post('/api/auth/register').send({
        fullName: 'User One',
        email: 'duplicate@example.com',
        password: 'Test@12345',
      });

      // محاولة تسجيل مستخدم بنفس البريد
      const res = await request(app).post('/api/auth/register').send({
        fullName: 'User Two',
        email: 'duplicate@example.com',
        password: 'Test@12345',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require all fields', async () => {
      const res = await request(app).post('/api/auth/register').send({
        fullName: 'Test User',
        // missing email and password
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // إنشاء مستخدم للاختبار
      await request(app).post('/api/auth/register').send({
        fullName: 'Login Test',
        email: 'login@example.com',
        password: 'Test@12345',
      });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'Test@12345',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data).toHaveProperty('user');
    });

    it('should reject invalid email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'Test@12345',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'WrongPassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
