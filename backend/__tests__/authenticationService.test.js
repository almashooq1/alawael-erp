/**
 * ========================================
 * اختبارات نظام المصادقة
 * Authentication Service Tests
 * ========================================
 *
 * Test suite لخدمة المصادقة المتقدمة
 * Tests for Advanced Authentication Service
 *
 * Uses Jest and Supertest
 */

const request = require('supertest');
const express = require('express');
const AuthenticationService = require('../services/AuthenticationService');
const authenticationRoutes = require('../routes/authenticationRoutes');

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authenticationRoutes);

describe('AuthenticationService - Input Validation', () => {
  /**
   * ====================================
   * اختبارات التحقق من الإدخالات
   * Input Validation Tests
   * ====================================
   */

  describe('Email Validation', () => {
    test('يجب قبول البريد الإلكتروني الصحيح', () => {
      expect(AuthenticationService.isValidEmail('user@example.com')).toBe(true);
      expect(AuthenticationService.isValidEmail('test.user@domain.co.uk')).toBe(true);
    });

    test('يجب رفض البريد الإلكتروني غير الصحيح', () => {
      expect(AuthenticationService.isValidEmail('invalid-email')).toBe(false);
      expect(AuthenticationService.isValidEmail('user@')).toBe(false);
      expect(AuthenticationService.isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('Phone Number Validation', () => {
    test('يجب قبول أرقام الجوال السعودية الصحيحة', () => {
      expect(AuthenticationService.isValidPhoneNumber('0501234567')).toBe(true);
      expect(AuthenticationService.isValidPhoneNumber('+966501234567')).toBe(true);
      expect(AuthenticationService.isValidPhoneNumber('966501234567')).toBe(true);
    });

    test('يجب رفض أرقام الجوال غير الصحيحة', () => {
      expect(AuthenticationService.isValidPhoneNumber('123456789')).toBe(false);
      expect(AuthenticationService.isValidPhoneNumber('050123')).toBe(false);
      expect(AuthenticationService.isValidPhoneNumber('invalid-phone')).toBe(false);
    });
  });

  describe('ID Number Validation', () => {
    test('يجب قبول أرقام الهوية الصحيحة', () => {
      expect(AuthenticationService.isValidIDNumber('1234567890')).toBe(true);
      expect(AuthenticationService.isValidIDNumber('9876543210')).toBe(true);
    });

    test('يجب رفض أرقام الهوية غير الصحيحة', () => {
      expect(AuthenticationService.isValidIDNumber('123456789')).toBe(false); // 9 أرقام
      expect(AuthenticationService.isValidIDNumber('12345678901')).toBe(false); // 11 رقم
      expect(AuthenticationService.isValidIDNumber('invalid-id')).toBe(false);
    });
  });

  describe('Username Validation', () => {
    test('يجب قبول أسماء المستخدمين الصحيحة', () => {
      expect(AuthenticationService.isValidUsername('user123')).toBe(true);
      expect(AuthenticationService.isValidUsername('john_doe')).toBe(true);
      expect(AuthenticationService.isValidUsername('test-user')).toBe(true);
    });

    test('يجب رفض أسماء المستخدمين غير الصحيحة', () => {
      expect(AuthenticationService.isValidUsername('ab')).toBe(false); // قصير جداً
      expect(AuthenticationService.isValidUsername('this_is_a_very_long_username')).toBe(false); // طويل جداً
      expect(AuthenticationService.isValidUsername('user@name')).toBe(false); // رموز غير مسموحة
    });
  });

  describe('Password Strength Validation', () => {
    test('يجب قبول كلمات المرور القوية', () => {
      expect(AuthenticationService.isValidPasswordStrength('SecurePass123!')).toBe(true);
      expect(AuthenticationService.isValidPasswordStrength('MyP@ssw0rd')).toBe(true);
    });

    test('يجب رفض كلمات المرور الضعيفة', () => {
      expect(AuthenticationService.isValidPasswordStrength('weak')).toBe(false);
      expect(AuthenticationService.isValidPasswordStrength('12345678')).toBe(false); // بدون أحرف
      expect(AuthenticationService.isValidPasswordStrength('abcdefgh')).toBe(false); // بدون أرقام
    });
  });
});

describe('AuthenticationService - Input Normalization', () => {
  /**
   * ====================================
   * اختبارات تنظيف الإدخالات
   * Input Normalization Tests
   * ====================================
   */

  describe('Phone Number Normalization', () => {
    test('يجب تحويل أرقام الجوال إلى صيغة موحدة', () => {
      expect(AuthenticationService.normalizePhoneNumber('+966501234567')).toBe('0501234567');
      expect(AuthenticationService.normalizePhoneNumber('966501234567')).toBe('0501234567');
      expect(AuthenticationService.normalizePhoneNumber('050 123 4567')).toBe('0501234567');
    });
  });

  describe('Email Normalization', () => {
    test('يجب تحويل البريد الإلكتروني إلى صيغة موحدة', () => {
      expect(AuthenticationService.normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
      expect(AuthenticationService.normalizeEmail('  test@test.com  ')).toBe('test@test.com');
    });
  });
});

describe('AuthenticationService - Password Hashing', () => {
  /**
   * ====================================
   * اختبارات تشفير كلمة المرور
   * Password Hashing Tests
   * ====================================
   */

  test('يجب تشفير كلمة المرور بشكل آمن', async () => {
    const password = 'TestPassword123!';
    const hashed = await AuthenticationService.hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(hashed.length).toBeGreaterThan(30);
  });

  test('يجب التحقق من كلمة المرور المشفرة', async () => {
    const password = 'TestPassword123!';
    const hashed = await AuthenticationService.hashPassword(password);

    const isMatch = await AuthenticationService.comparePassword(password, hashed);
    expect(isMatch).toBe(true);
  });

  test('يجب رفض كلمة المرور غير الصحيحة', async () => {
    const password = 'TestPassword123!';
    const hashed = await AuthenticationService.hashPassword(password);

    const isMatch = await AuthenticationService.comparePassword('WrongPassword', hashed);
    expect(isMatch).toBe(false);
  });
});

describe('AuthenticationService - JWT Tokens', () => {
  /**
   * ====================================
   * اختبارات JWT Token
   * JWT Token Tests
   * ====================================
   */

  test('يجب إنشاء JWT Token صحيح', () => {
    const user = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      phone: '0501234567',
      idNumber: '1234567890',
      roles: ['user'],
    };

    const token = AuthenticationService.generateToken(user);

    expect(token).toHaveProperty('token');
    expect(token).toHaveProperty('expiresIn');
    expect(token.token.length).toBeGreaterThan(0);
  });

  test('يجب التحقق من صحة JWT Token', () => {
    const user = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      phone: '0501234567',
      idNumber: '1234567890',
      roles: ['user'],
    };

    const tokenData = AuthenticationService.generateToken(user);
    const decoded = AuthenticationService.verifyToken(tokenData.token);

    expect(decoded.id).toBe(user.id);
    expect(decoded.username).toBe(user.username);
  });

  test('يجب رفع خطأ عند التحقق من Token غير صحيح', () => {
    expect(() => {
      AuthenticationService.verifyToken('invalid-token');
    }).toThrow();
  });
});

describe('Authentication API Routes', () => {
  /**
   * ====================================
   * اختبارات API Routes
   * API Routes Tests
   * ====================================
   */

  describe('POST /login', () => {
    test('يجب تسجيل الدخول بالبريد الإلكتروني', async () => {
      const response = await request(app).post('/api/auth/login').send({
        credential: 'test@example.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    test('يجب تسجيل الدخول برقم الجوال', async () => {
      const response = await request(app).post('/api/auth/login').send({
        credential: '0501234567',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('يجب تسجيل الدخول برقم الهوية', async () => {
      const response = await request(app).post('/api/auth/login').send({
        credential: '1234567890',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('يجب تسجيل الدخول باسم المستخدم', async () => {
      const response = await request(app).post('/api/auth/login').send({
        credential: 'testuser',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('يجب إرجاع خطأ للبيانات المفقودة', async () => {
      const response = await request(app).post('/api/auth/login').send({
        credential: 'test@example.com',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('يجب إرجاع خطأ للبيانات غير الصحيحة', async () => {
      const response = await request(app).post('/api/auth/login').send({
        credential: 'invalid-data',
        password: 'WrongPassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /register', () => {
    test('يجب إنشاء حساب جديد بنجاح', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'newuser',
        email: 'newuser@example.com',
        phone: '0502345678',
        idNumber: '9876543210',
        firstName: 'محمد',
        lastName: 'أحمد',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('user');
    });

    test('يجب رفض البيانات الناقصة', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'newuser',
        email: 'newuser@example.com',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('يجب رفض كلمات المرور غير المتطابقة', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'newuser',
        email: 'newuser@example.com',
        phone: '0502345678',
        idNumber: '9876543210',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /validate', () => {
    test('يجب التعرف على البريد الإلكتروني', async () => {
      const response = await request(app).post('/api/auth/validate').send({ credential: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.validationType).toBe('email');
      expect(response.body.isValid).toBe(true);
    });

    test('يجب التعرف على رقم الجوال', async () => {
      const response = await request(app).post('/api/auth/validate').send({ credential: '0501234567' });

      expect(response.status).toBe(200);
      expect(response.body.validationType).toBe('phone');
      expect(response.body.isValid).toBe(true);
    });

    test('يجب التعرف على رقم الهوية', async () => {
      const response = await request(app).post('/api/auth/validate').send({ credential: '1234567890' });

      expect(response.status).toBe(200);
      expect(response.body.validationType).toBe('idNumber');
      expect(response.body.isValid).toBe(true);
    });

    test('يجب التعرف على اسم المستخدم', async () => {
      const response = await request(app).post('/api/auth/validate').send({ credential: 'testuser' });

      expect(response.status).toBe(200);
      expect(response.body.validationType).toBe('username');
      expect(response.body.isValid).toBe(true);
    });
  });

  describe('POST /password/strength', () => {
    test('يجب تقييم قوة كلمة المرور القوية', async () => {
      const response = await request(app).post('/api/auth/password/strength').send({ password: 'SecurePass123!' });

      expect(response.status).toBe(200);
      expect(response.body.isStrong).toBe(true);
    });

    test('يجب تقييم قوة كلمة المرور الضعيفة', async () => {
      const response = await request(app).post('/api/auth/password/strength').send({ password: 'weak' });

      expect(response.status).toBe(200);
      expect(response.body.isStrong).toBe(false);
    });
  });

  describe('POST /refresh-token', () => {
    test('يجب تحديث الـ Token', async () => {
      // أولاً، إنشاء token
      const user = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      };
      const refreshToken = AuthenticationService.generateRefreshToken(user);

      // ثم، تحديث الـ token
      const response = await request(app).post('/api/auth/refresh-token').send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
    });
  });

  describe('POST /logout', () => {
    test('يجب تسجيل الخروج بنجاح', async () => {
      const response = await request(app).post('/api/auth/logout').send({ userId: 'user-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

describe('Authentication Security Tests', () => {
  /**
   * ====================================
   * اختبارات الأمان
   * Security Tests
   * ====================================
   */

  test('يجب عدم عرض كلمة المرور في الرد', async () => {
    const response = await request(app).post('/api/auth/login').send({
      credential: 'test@example.com',
      password: 'TestPassword123!',
    });

    const responseString = JSON.stringify(response.body);
    expect(responseString).not.toContain('TestPassword123!');
  });

  test('يجب تشفير كلمات المرور قبل الحفظ', async () => {
    const password = 'TestPassword123!';
    const hashed = await AuthenticationService.hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(hashed.startsWith('$2')).toBe(true); // Bcrypt hash format
  });

  test('يجب التحقق من صحة الـ Token', () => {
    const user = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    };

    const tokenData = AuthenticationService.generateToken(user);

    expect(() => {
      AuthenticationService.verifyToken(tokenData.token);
    }).not.toThrow();
  });
});
