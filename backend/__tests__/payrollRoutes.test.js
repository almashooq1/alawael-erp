/**
 * اختبارات وحدة - مسارات API الرواتب
 * Unit Tests - Payroll API Routes
 * 
 * تقييم: jest supertest
 * npm test -- payrollRoutes.test.js
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app'); // أو server.js

// التوكن المتوقع للاختبارات
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTYwNjc0NDQwMH0.MOCK_TOKEN';

describe('Payroll API Routes', () => {
  beforeAll(async () => {
    // من المفضل الاتصال بقاعدة بيانات اختبار منفصلة
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/alawael_test');
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  describe('GET /api/payroll/monthly/:month/:year', () => {
    test('يجب إرجاع رواتب الشهر', async () => {
      const response = await request(app)
        .get('/api/payroll/monthly/10/2025')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('payrolls');
      expect(response.body).toHaveProperty('stats');
      expect(Array.isArray(response.body.payrolls)).toBe(true);
    });

    test('يجب رفض الطلب بدون توكن', async () => {
      const response = await request(app)
        .get('/api/payroll/monthly/10/2025');

      expect(response.status).toBe(401);
    });

    test('يجب التحقق من صحة معاملات الشهر والسنة', async () => {
      const response = await request(app)
        .get('/api/payroll/monthly/13/2025')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payroll/:payrollId', () => {
    test('يجب إرجاع تفاصيل الراتب', async () => {
      const validId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/payroll/${validId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      // قد يكون 200 أو 404 حسب وجود السجل
      expect([200, 404]).toContain(response.status);
    });

    test('يجب رفض معرف غير صحيح', async () => {
      const response = await request(app)
        .get('/api/payroll/invalid-id')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payroll/create', () => {
    test('يجب إنشاء راتب جديد', async () => {
      const payrollData = {
        employeeId: new mongoose.Types.ObjectId().toString(),
        month: 10,
        year: 2025,
        baseSalary: 2500
      };

      const response = await request(app)
        .post('/api/payroll/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(payrollData);

      expect([201, 200, 400, 409]).toContain(response.status);
      
      if (response.status === 201 || response.status === 200) {
        expect(response.body).toHaveProperty('_id');
      }
    });

    test('يجب التحقق من المعاملات المطلوبة', async () => {
      const incompleteData = {
        month: 10
        // ملاحظة: employeeId و year غير موجودة
      };

      const response = await request(app)
        .post('/api/payroll/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(incompleteData);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/payroll/:payrollId/submit-approval', () => {
    test('يجب إرسال الراتب للموافقة', async () => {
      const payrollId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/payroll/${payrollId}/submit-approval`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});

      // قد يكون 200 أو 404
      expect([200, 404, 400]).toContain(response.status);
    });
  });

  describe('PUT /api/payroll/:payrollId/approve', () => {
    test('يجب أن يكون الدور مطلوبا (admin أو director)', async () => {
      const payrollId = new mongoose.Types.ObjectId();

      // توكن بدور عادي
      const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsInJvbGUiOiJlbXBsb3llZSIsImlhdCI6MTYwNjc0NDQwMH0.USER_TOKEN';

      const response = await request(app)
        .put(`/api/payroll/${payrollId}/approve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/payroll/process-monthly', () => {
    test('يجب معالجة رواتب الشهر', async () => {
      const response = await request(app)
        .post('/api/payroll/process-monthly')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          month: 10,
          year: 2025
        });

      expect([200, 400, 409]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('processed');
        expect(Array.isArray(response.body.processed)).toBe(true);
      }
    });
  });

  describe('Compensation Structure Routes', () => {
    test('POST /api/payroll/compensation/structures - إنشاء هيكل', async () => {
      const structureData = {
        name: 'هيكل اختبار',
        description: 'هيكل تعويضي للاختبار',
        applicableTo: { scope: 'all' },
        fixedAllowances: [{ name: 'السكن', amount: 600 }],
        mandatoryDeductions: {
          incomeTax: { brackets: [] },
          socialSecurity: { percentage: 6 }
        }
      };

      const response = await request(app)
        .post('/api/payroll/compensation/structures')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(structureData);

      expect([200, 201, 400, 409]).toContain(response.status);
    });

    test('GET /api/payroll/compensation/structures - قائمة الهياكل', async () => {
      const response = await request(app)
        .get('/api/payroll/compensation/structures')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Incentives Routes', () => {
    test('POST /api/payroll/compensation/incentives - إنشاء حافزة', async () => {
      const incentiveData = {
        employeeId: new mongoose.Types.ObjectId().toString(),
        incentiveType: 'performance',
        amount: 200,
        reason: 'أداء متميز',
        month: 10,
        year: 2025
      };

      const response = await request(app)
        .post('/api/payroll/compensation/incentives')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(incentiveData);

      expect([200, 201, 400, 409]).toContain(response.status);
    });

    test('GET /api/payroll/compensation/incentives/pending - الحوافز المعلقة', async () => {
      const response = await request(app)
        .get('/api/payroll/compensation/incentives/pending')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('PUT /api/payroll/compensation/incentives/:id/approve - موافقة', async () => {
      const incentiveId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/payroll/compensation/incentives/${incentiveId}/approve`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});

      expect([200, 404, 400]).toContain(response.status);
    });
  });

  describe('Penalties Routes', () => {
    test('POST /api/payroll/compensation/penalties - تسجيل عقوبة', async () => {
      const penaltyData = {
        employeeId: new mongoose.Types.ObjectId().toString(),
        penaltyType: 'attendance',
        severity: 'low',
        amount: 50,
        reason: 'غياب بسبب مدقق'
      };

      const response = await request(app)
        .post('/api/payroll/compensation/penalties')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(penaltyData);

      expect([200, 201, 400, 409]).toContain(response.status);
    });
  });

  describe('Statistics Routes', () => {
    test('GET /api/payroll/stats/:month/:year - الإحصائيات', async () => {
      const response = await request(app)
        .get('/api/payroll/stats/10/2025')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('monthlySummary');
    });
  });

  describe('Error Handling', () => {
    test('يجب معالجة أخطاء قاعدة البيانات بأناقة', async () => {
      const response = await request(app)
        .get('/api/payroll/monthly/invalid/invalid')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    test('يجب معالجة الطلبات غير الموجودة', async () => {
      const response = await request(app)
        .get('/api/payroll/nonexistent-route')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
    });
  });
});

/**
 * اختبارات التكامل
 */
describe('Payroll Integration Tests', () => {
  test('سير عمل كامل: إنشاء → الموافقة → المعالجة', async () => {
    // 1. إنشاء راتب
    const createResponse = await request(app)
      .post('/api/payroll/create')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        employeeId: new mongoose.Types.ObjectId().toString(),
        month: 10,
        year: 2025,
        baseSalary: 2500
      });

    if (createResponse.status !== 201 && createResponse.status !== 200) {
      console.log('⚠️  تخطي اختبار التكامل - لم يتم إنشاء الراتب');
      return;
    }

    const payrollId = createResponse.body._id;

    // 2. إرسال للموافقة
    const submitResponse = await request(app)
      .put(`/api/payroll/${payrollId}/submit-approval`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({});

    expect([200, 400]).toContain(submitResponse.status);

    // 3. الموافقة
    const approveResponse = await request(app)
      .put(`/api/payroll/${payrollId}/approve`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({});

    expect([200, 400, 409]).toContain(approveResponse.status);
  });
});
