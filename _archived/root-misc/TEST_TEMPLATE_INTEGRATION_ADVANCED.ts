/**
 * ============================================================
 * 🔗 قالب اختبار Integration Test محسّن
 * ============================================================
 * 
 * استخدام: للاختبارات التي تتضمن عدة modules أو APIs
 * يختبر التفاعل بين الـ components المختلفة
 * 
 * ✅ يتضمن:
 * - Server/Database initialization
 * - API testing مع supertest
 * - Async/Await handling
 * - Cleanup بعد الاختبارات
 * - Full request/response cycle
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

/**
 * مثال: اختبار User API endpoints
 */
describe('User API - Integration Tests', () => {
  // ============================================================
  // 📋 إعداد السيرفر والـ Database
  // ============================================================
  let app;
  let server;
  let database;

  // استدعاء مرة واحدة قبل جميع الاختبارات
  beforeAll(async () => {
    // ✅ إنشاء Express app
    app = require('../src/app').createApp();

    // ✅ بدء السيرفر
    server = app.listen(3001);

    // ✅ إعداد database قاعدة بيانات الاختبار
    database = require('../src/database').getTestDatabase();
    await database.connect();

    // Wait للتأكد من أن كل شيء جاهز
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  // استدعاء مرة واحدة بعد جميع الاختبارات
  afterAll(async () => {
    // ✅ إغلاق الـ connections
    await database.disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  // قبل كل اختبار - تنظيف البيانات
  beforeEach(async () => {
    // ✅ حذف جميع المستخدمين من قاعدة البيانات
    await database.clearCollection('users');
  });

  // ============================================================
  // ✅ GET endpoint - استرجاع البيانات
  // ============================================================
  describe('GET /api/users', () => {
    it('يجب أن يرجع 200 للطلب الناجح', async () => {
      // Arrange - لا توجد مستخدمون حالياً

      // Act - إرسال الطلب
      const response = await request(app)
        .get('/api/users')
        .expect('Content-Type', /json/);

      // Assert - التحقق من الاستجابة
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('يجب أن يعيد قائمة فارغة عندما لا توجد مستخدمون', async () => {
      // Act
      const response = await request(app).get('/api/users');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('يجب أن يعيد قائمة المستخدمين الموجودين', async () => {
      // Arrange - إضافة مستخدمين للـ database
      const users = [
        { id: '1', name: 'أحمد', email: 'ahmed@example.com' },
        { id: '2', name: 'علي', email: 'ali@example.com' },
      ];

      for (const user of users) {
        await database.insert('users', user);
      }

      // Act
      const response = await request(app).get('/api/users');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('أحمد');
    });

    it('يجب أن يدعم pagination', async () => {
      // Arrange - إضافة 100 مستخدم
      for (let i = 1; i <= 100; i++) {
        await database.insert('users', {
          id: String(i),
          name: `User ${i}`,
          email: `user${i}@example.com`,
        });
      }

      // Act - اطلب الصفحة الأولى (10 نتائج)
      const response = await request(app)
        .get('/api/users')
        .query({ page: 1, limit: 10 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(10);
      expect(response.body[0].name).toBe('User 1');
    });

    it('يجب أن يدعم filtering', async () => {
      // Arrange
      await database.insert('users', {
        id: '1',
        name: 'محمد',
        email: 'mohammad@example.com',
        role: 'admin',
      });
      await database.insert('users', {
        id: '2',
        name: 'فاطمة',
        email: 'fatimah@example.com',
        role: 'user',
      });

      // Act - تصفية حسب الـ role
      const response = await request(app)
        .get('/api/users')
        .query({ role: 'admin' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].role).toBe('admin');
    });
  });

  // ============================================================
  // 📝 POST endpoint - إنشاء البيانات
  // ============================================================
  describe('POST /api/users', () => {
    it('يجب أن ينشئ مستخدماً جديداً برمز 201', async () => {
      // Arrange
      const userData = {
        name: 'نور محمود',
        email: 'noor@example.com',
        age: 25,
      };

      // Act
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('نور محمود');
      expect(response.body.email).toBe('noor@example.com');

      // تحقق من أنه تم حفظه في الـ database
      const savedUser = await database.findById('users', response.body.id);
      expect(savedUser).toBeDefined();
    });

    it('يجب أن يرفض request بدون email', async () => {
      // Arrange
      const userData = {
        name: 'ياسمين',
        age: 28,
        // Email مفقود
      };

      // Act
      const response = await request(app)
        .post('/api/users')
        .send(userData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('يجب أن يرفض email مكرر', async () => {
      // Arrange
      const email = 'duplicate@example.com';

      // أنشئ مستخدم أول
      await request(app).post('/api/users').send({
        name: 'أول',
        email: email,
      });

      // Act - محاولة إنشاء مستخدم بنفس الـ email
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'ثاني',
          email: email,
        });

      // Assert
      expect(response.status).toBe(409); // Conflict
      expect(response.body.error).toContain('already exists');
    });

    it('يجب أن يتحقق من صحة صيغة email', async () => {
      // Arrange
      const testCases = [
        { email: 'invalid-email', valid: false },
        { email: 'missing@domain', valid: false },
        { email: '@example.com', valid: false },
        { email: 'valid@example.com', valid: true },
      ];

      for (const testCase of testCases) {
        // Act
        const response = await request(app)
          .post('/api/users')
          .send({
            name: 'Test User',
            email: testCase.email,
          });

        // Assert
        if (testCase.valid) {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(400);
        }
      }
    });

    it('يجب أن يعيد الكائن الكامل المنشأ', async () => {
      // Arrange
      const userData = {
        name: 'مريم',
        email: 'maryam@example.com',
        age: 22,
      };

      // Act
      const response = await request(app)
        .post('/api/users')
        .send(userData);

      // Assert
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body.name).toBe('مريam');
    });
  });

  // ============================================================
  // ✏️ PUT endpoint - تحديث البيانات
  // ============================================================
  describe('PUT /api/users/:id', () => {
    let userId;

    beforeEach(async () => {
      // Arrange - إنشاء مستخدم للتعديل عليه
      const response = await request(app).post('/api/users').send({
        name: 'الأصلي',
        email: 'original@example.com',
      });

      userId = response.body.id;
    });

    it('يجب أن يحدث المستخدم بنجاح', async () => {
      // Arrange
      const updateData = {
        name: 'المحدث',
        age: 30,
      };

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send(updateData)
        .expect(200);

      // Assert
      expect(response.body.name).toBe('المحدث');
      expect(response.body.age).toBe(30);
      expect(response.body.email).toBe('original@example.com'); // يبقى كما هو
    });

    it('يجب أن يرفع 404 للمستخدم غير الموجود', async () => {
      // Act
      const response = await request(app)
        .put('/api/users/nonexistent-id')
        .send({ name: 'New Name' });

      // Assert
      expect(response.status).toBe(404);
    });

    it('يجب أن يحدث updatedAt timestamp', async () => {
      // Arrange
      const updateData = { name: 'محدث جديد' };
      const beforeUpdate = new Date();

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .send(updateData);

      // Assert
      const updatedAt = new Date(response.body.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  // ============================================================
  // 🗑️ DELETE endpoint - حذف البيانات
  // ============================================================
  describe('DELETE /api/users/:id', () => {
    let userId;

    beforeEach(async () => {
      const response = await request(app).post('/api/users').send({
        name: 'للحذف',
        email: 'todelete@example.com',
      });

      userId = response.body.id;
    });

    it('يجب أن يحذف المستخدم بنجاح', async () => {
      // Act
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .expect(204); // No Content

      // Assert - تحقق من أنه تم حذفه
      const deleted = await request(app).get(`/api/users/${userId}`);
      expect(deleted.status).toBe(404);
    });

    it('يجب أن يرفع 404 عند حذف مستخدم غير موجود', async () => {
      // Act
      const response = await request(app).delete('/api/users/nonexistent');

      // Assert
      expect(response.status).toBe(404);
    });

    it('يجب أن يزيل من قاعدة البيانات', async () => {
      // Act
      await request(app).delete(`/api/users/${userId}`);

      // Assert
      const user = await database.findById('users', userId);
      expect(user).toBeNull();
    });
  });

  // ============================================================
  // 🔐 اختبارات الأمان والـ Authentication
  // ============================================================
  describe('Authentication & Authorization', () => {
    it('يجب أن يرفع 401 للطلبات بدون token', async () => {
      // Act
      const response = await request(app).get('/api/users/protected');

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('يجب أن يرفع 401 للـ token غير الصالح', async () => {
      // Act
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token');

      // Assert
      expect(response.status).toBe(401);
    });

    it('يجب أن يقبل الطلب بـ valid token', async () => {
      // Arrange
      const validToken = 'valid-jwt-token-here';

      // Act (assuming endpoint requires auth)
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(response.status).not.toBe(401);
    });
  });

  // ============================================================
  // ⏱️ اختبارات الـ Timeout والـ Slow endpoints
  // ============================================================
  describe('Performance & Timeouts', () => {
    it('يجب أن ينهي الطلب في وقت معقول', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      const response = await request(app)
        .get('/api/users')
        .timeout(5000); // 5 ثواني

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
      expect(response.status).toBe(200);
    });

    it('يجب أن يتعامل مع large payloads', async () => {
      // Arrange - إنشاء payload كبير
      const largeData = {
        name: 'Test',
        email: 'test@example.com',
        description: 'a'.repeat(10000), // 10KB
      };

      // Act
      const response = await request(app)
        .post('/api/users')
        .send(largeData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.description).toBe(largeData.description);
    });
  });
});

/**
 * ============================================================
 * 📝 ملاحظات مهمة:
 * ============================================================
 * 
 * 1. استخدم beforeAll/afterAll لإعداد قاعدة البيانات:
 *    يتم استدعاؤها مرة واحدة فقط
 * 
 * 2. استخدم beforeEach/afterEach للتنظيف:
 *    تنظيف البيانات قبل كل اختبار
 * 
 * 3. استخدم supertest لاختبار APIs:
 *    - request(app).get/post/put/delete
 *    - .send() للـ body
 *    - .query() للـ query parameters
 *    - .set() للـ headers
 * 
 * 4. اختبر الـ HTTP status codes:
 *    - 200: OK
 *    - 201: Created
 *    - 400: Bad Request
 *    - 401: Unauthorized
 *    - 404: Not Found
 *    - 409: Conflict
 * 
 * 5. تحقق من الـ response body:
 *    - expect(response.body).toEqual()
 *    - expect(response.body).toHaveProperty()
 * 
 * 6. استخدم test database منفصلة:
 *    لا تختبر على production database!
 * 
 * 7. نظف البيانات بعد كل اختبار:
 *    لتجنب التأثير على الاختبارات الأخرى
 */
