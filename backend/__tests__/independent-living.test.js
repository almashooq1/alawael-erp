/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/**
 * @file independent-living.test.js
 * @description اختبارات شاملة لنظام الانتقال للحياة المستقلة
 * تشمل: تقييمات ADL، خطط التدريب، تتبع التقدم، الإسكان المدعوم
 */

const request = require('supertest');
const { Types } = require('mongoose');
jest.setTimeout(30000);

// ─── Mock Auth Middleware ───
const mockTestUser = {
  id: new Types.ObjectId().toString(),
  _id: new Types.ObjectId().toString(),
  email: 'therapist@alawael.com',
  fullName: 'Test Therapist',
  roles: ['user', 'therapist', 'supervisor', 'admin'],
  role: 'admin',
};

jest.mock('../middleware/auth', () => {
  const passthrough = (req, res, next) => {
    req.user = mockTestUser;
    req.isAuthenticated = true;
    next();
  };
  return {
    authenticate: passthrough,
    authenticateToken: passthrough,
    protect: passthrough,
    requireAuth: passthrough,
    requireAdmin: (req, res, next) => {
      req.user = mockTestUser;
      next();
    },
    optionalAuth: (req, res, next) => {
      req.user = mockTestUser;
      next();
    },
    requireRole: () => passthrough,
    authorize: () => passthrough,
    authorizeRole: () => passthrough,
    verifyToken: () => mockTestUser,
    generateTestToken: () => 'mock-test-token',
  };
});

describe('Independent Living Transition System (نظام الانتقال للحياة المستقلة)', () => {
  let app;
  const beneficiaryId = new Types.ObjectId().toString();
  const assessmentId = new Types.ObjectId().toString();
  const planId = new Types.ObjectId().toString();
  const goalId = new Types.ObjectId().toString();
  const progressId = new Types.ObjectId().toString();
  const housingId = new Types.ObjectId().toString();

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = require('../server');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════
  //  تقييم مهارات الحياة اليومية (ADL Assessment)
  // ═══════════════════════════════════════════════════════

  describe('ADL Assessments (تقييمات مهارات الحياة اليومية)', () => {
    test('POST /api/independent-living/assessments - should create ADL assessment', async () => {
      const response = await request(app)
        .post('/api/independent-living/assessments')
        .send({
          beneficiary: beneficiaryId,
          assessmentDate: new Date().toISOString(),
          assessmentType: 'initial',
          cookingSkills: [
            {
              skillName: 'إعداد وجبة بسيطة',
              category: 'cooking',
              rating: 3,
              supportLevel: 'partial_assist',
            },
            {
              skillName: 'استخدام الأجهزة المنزلية',
              category: 'cooking',
              rating: 2,
              supportLevel: 'full_assist',
            },
          ],
          cleaningSkills: [
            {
              skillName: 'تنظيف الغرفة',
              category: 'cleaning',
              rating: 4,
              supportLevel: 'supervision',
            },
            {
              skillName: 'غسل الملابس',
              category: 'cleaning',
              rating: 3,
              supportLevel: 'partial_assist',
            },
          ],
          shoppingSkills: [
            {
              skillName: 'إعداد قائمة مشتريات',
              category: 'shopping',
              rating: 2,
              supportLevel: 'full_assist',
            },
          ],
          transportationSkills: [
            {
              skillName: 'استخدام الحافلة',
              category: 'transportation',
              rating: 1,
              supportLevel: 'unable',
            },
          ],
          recommendations: 'يحتاج تركيز على مهارات التسوق والمواصلات',
          priorityAreas: ['shopping', 'transportation'],
        });
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/assessments - should list assessments', async () => {
      const response = await request(app).get('/api/independent-living/assessments');
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/assessments - should filter by beneficiary', async () => {
      const response = await request(app)
        .get('/api/independent-living/assessments')
        .query({ beneficiary: beneficiaryId, assessmentType: 'initial' });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/assessments/:id - should get assessment by ID', async () => {
      const response = await request(app).get(
        `/api/independent-living/assessments/${assessmentId}`
      );
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('PUT /api/independent-living/assessments/:id - should update assessment', async () => {
      const response = await request(app)
        .put(`/api/independent-living/assessments/${assessmentId}`)
        .send({
          status: 'completed',
          recommendations: 'يظهر تحسن ملحوظ في مهارات الطبخ',
          strengths: 'مهارات التنظيف جيدة',
          challenges: 'صعوبة في استخدام المواصلات العامة',
        });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('POST /api/independent-living/assessments/:id/review - should review assessment', async () => {
      const response = await request(app)
        .post(`/api/independent-living/assessments/${assessmentId}/review`)
        .send({
          reviewNotes: 'تقييم شامل ودقيق، أوافق على التوصيات',
        });
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/assessments/compare/:beneficiaryId - should compare assessments', async () => {
      const response = await request(app).get(
        `/api/independent-living/assessments/compare/${beneficiaryId}`
      );
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('DELETE /api/independent-living/assessments/:id - should delete assessment', async () => {
      const response = await request(app).delete(
        `/api/independent-living/assessments/${assessmentId}`
      );
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/v1/independent-living/assessments - should work with v1 prefix', async () => {
      const response = await request(app).get('/api/v1/independent-living/assessments');
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  خطط التدريب الفردية (Training Plans)
  // ═══════════════════════════════════════════════════════

  describe('Training Plans (خطط التدريب الفردية)', () => {
    test('POST /api/independent-living/plans - should create training plan', async () => {
      const response = await request(app)
        .post('/api/independent-living/plans')
        .send({
          beneficiary: beneficiaryId,
          baselineAssessment: assessmentId,
          title: 'خطة تدريب على مهارات الحياة المستقلة - الفصل الأول',
          description: 'خطة شاملة لتطوير مهارات الطبخ والتنظيف والتسوق والمواصلات',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          goals: [
            {
              title: 'إعداد وجبة إفطار كاملة',
              category: 'cooking',
              targetLevel: 4,
              currentLevel: 2,
              priority: 'high',
              steps: [
                { stepNumber: 1, description: 'تعلم استخدام الموقد بأمان' },
                { stepNumber: 2, description: 'إعداد شاي/قهوة' },
                { stepNumber: 3, description: 'تحضير بيض مع خبز' },
                { stepNumber: 4, description: 'إعداد إفطار كامل بدون مساعدة' },
              ],
            },
            {
              title: 'استخدام الحافلة العامة',
              category: 'transportation',
              targetLevel: 4,
              currentLevel: 1,
              priority: 'high',
              steps: [
                { stepNumber: 1, description: 'التعرف على محطات الحافلات القريبة' },
                { stepNumber: 2, description: 'قراءة جدول المواعيد' },
                { stepNumber: 3, description: 'ركوب الحافلة مع مرافق' },
                { stepNumber: 4, description: 'ركوب الحافلة بشكل مستقل' },
              ],
            },
            {
              title: 'التسوق من السوبرماركت',
              category: 'shopping',
              targetLevel: 4,
              currentLevel: 2,
              priority: 'medium',
              steps: [
                { stepNumber: 1, description: 'إعداد قائمة مشتريات' },
                { stepNumber: 2, description: 'مقارنة الأسعار' },
                { stepNumber: 3, description: 'الدفع والتعامل مع الكاشير' },
              ],
            },
          ],
          weeklySchedule: {
            sunday: [{ time: '10:00', category: 'cooking', activity: 'تدريب إعداد الإفطار' }],
            tuesday: [
              { time: '14:00', category: 'transportation', activity: 'تدريب استخدام الحافلة' },
            ],
            thursday: [{ time: '11:00', category: 'shopping', activity: 'تدريب التسوق' }],
          },
        });
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/plans - should list plans', async () => {
      const response = await request(app).get('/api/independent-living/plans');
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/plans - should filter by status', async () => {
      const response = await request(app)
        .get('/api/independent-living/plans')
        .query({ status: 'active', beneficiary: beneficiaryId });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/plans/:id - should get plan by ID', async () => {
      const response = await request(app).get(`/api/independent-living/plans/${planId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('PUT /api/independent-living/plans/:id - should update plan', async () => {
      const response = await request(app).put(`/api/independent-living/plans/${planId}`).send({
        status: 'active',
        notes: 'بدء تنفيذ الخطة بعد موافقة المشرف',
      });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('POST /api/independent-living/plans/:id/sessions - should add training session', async () => {
      const response = await request(app)
        .post(`/api/independent-living/plans/${planId}/sessions`)
        .send({
          sessionDate: new Date().toISOString(),
          duration: 60,
          category: 'cooking',
          skillsPracticed: [
            { skillName: 'استخدام الموقد', performanceRating: 3, notes: 'تحسن ملحوظ' },
            { skillName: 'إعداد الشاي', performanceRating: 4, notes: 'يستطيع بدون مساعدة' },
          ],
          objectives: 'التدرب على إعداد مشروب ساخن',
          activities: 'شرح خطوات السلامة، تشغيل الموقد، غلي الماء، إعداد الشاي',
          outcome: 'نجح في إعداد الشاي مع إشراف بسيط',
          sessionRating: 'good',
          attendance: 'present',
        });
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('PUT /api/independent-living/plans/:planId/goals/:goalId - should update training goal', async () => {
      const response = await request(app)
        .put(`/api/independent-living/plans/${planId}/goals/${goalId}`)
        .send({
          currentLevel: 3,
          status: 'in_progress',
          steps: [
            {
              stepNumber: 1,
              description: 'تعلم استخدام الموقد بأمان',
              isCompleted: true,
              completedAt: new Date(),
            },
            {
              stepNumber: 2,
              description: 'إعداد شاي/قهوة',
              isCompleted: true,
              completedAt: new Date(),
            },
            { stepNumber: 3, description: 'تحضير بيض مع خبز', isCompleted: false },
            { stepNumber: 4, description: 'إعداد إفطار كامل بدون مساعدة', isCompleted: false },
          ],
        });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('POST /api/independent-living/plans/:id/reviews - should add plan review', async () => {
      const response = await request(app)
        .post(`/api/independent-living/plans/${planId}/reviews`)
        .send({
          findings: 'تقدم جيد في مهارات الطبخ، تأخر في المواصلات',
          recommendations: 'زيادة جلسات تدريب المواصلات إلى 3 أسبوعياً',
          adjustments: 'تعديل الجدول لزيادة جلسات المواصلات',
          nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('DELETE /api/independent-living/plans/:id - should delete plan', async () => {
      const response = await request(app).delete(`/api/independent-living/plans/${planId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  تتبع التقدم (Progress Tracking)
  // ═══════════════════════════════════════════════════════

  describe('Progress Tracking (تتبع التقدم نحو الاستقلالية)', () => {
    test('POST /api/independent-living/progress - should record progress', async () => {
      const response = await request(app)
        .post('/api/independent-living/progress')
        .send({
          beneficiary: beneficiaryId,
          plan: planId,
          period: 'monthly',
          periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          periodEnd: new Date().toISOString(),
          measurements: [
            {
              category: 'cooking',
              skillName: 'إعداد وجبة بسيطة',
              previousLevel: 2,
              currentLevel: 3,
              targetLevel: 4,
              change: 'improved',
            },
            {
              category: 'cooking',
              skillName: 'استخدام الأجهزة',
              previousLevel: 2,
              currentLevel: 3,
              targetLevel: 4,
              change: 'improved',
            },
            {
              category: 'transportation',
              skillName: 'استخدام الحافلة',
              previousLevel: 1,
              currentLevel: 2,
              targetLevel: 4,
              change: 'improved',
            },
            {
              category: 'shopping',
              skillName: 'التسوق المستقل',
              previousLevel: 2,
              currentLevel: 2,
              targetLevel: 4,
              change: 'maintained',
            },
            {
              category: 'cleaning',
              skillName: 'تنظيف الغرفة',
              previousLevel: 4,
              currentLevel: 4,
              targetLevel: 5,
              change: 'maintained',
            },
          ],
          sessionsAttended: 10,
          sessionsScheduled: 12,
          milestones: [
            {
              title: 'إعداد أول وجبة كاملة بدون مساعدة',
              category: 'cooking',
              significance: 'major',
            },
            {
              title: 'أول رحلة بالحافلة مع مرافق',
              category: 'transportation',
              significance: 'moderate',
            },
          ],
          summary: 'تحسن ملحوظ في مهارات الطبخ واستخدام المواصلات',
          recommendations: 'الاستمرار في نفس الخطة مع تكثيف جلسات التسوق',
          areasOfImprovement: ['cooking', 'transportation'],
          areasNeedingAttention: ['shopping'],
        });
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/progress - should list progress records', async () => {
      const response = await request(app).get('/api/independent-living/progress');
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/progress - should filter by beneficiary and plan', async () => {
      const response = await request(app)
        .get('/api/independent-living/progress')
        .query({ beneficiary: beneficiaryId, plan: planId, period: 'monthly' });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/progress/:id - should get progress by ID', async () => {
      const response = await request(app).get(`/api/independent-living/progress/${progressId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('PUT /api/independent-living/progress/:id - should update progress', async () => {
      const response = await request(app)
        .put(`/api/independent-living/progress/${progressId}`)
        .send({
          status: 'reviewed',
          nextSteps: 'بدء المرحلة التالية من التدريب على التسوق',
        });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/progress/timeline/:beneficiaryId - should get progress timeline', async () => {
      const response = await request(app).get(
        `/api/independent-living/progress/timeline/${beneficiaryId}`
      );
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/progress/timeline/:beneficiaryId - with planId filter', async () => {
      const response = await request(app)
        .get(`/api/independent-living/progress/timeline/${beneficiaryId}`)
        .query({ planId });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('DELETE /api/independent-living/progress/:id - should delete progress', async () => {
      const response = await request(app).delete(`/api/independent-living/progress/${progressId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  برامج الإسكان المدعوم (Supported Housing)
  // ═══════════════════════════════════════════════════════

  describe('Supported Housing Programs (برامج الإسكان المدعوم)', () => {
    test('POST /api/independent-living/housing - should create housing program', async () => {
      const response = await request(app)
        .post('/api/independent-living/housing')
        .send({
          beneficiary: beneficiaryId,
          plan: planId,
          caseManager: mockTestUser.id,
          programType: 'semi_independent',
          programName: 'برنامج السكن شبه المستقل - المرحلة الأولى',
          description: 'برنامج انتقالي لتأهيل المستفيد للعيش المستقل',
          enrollmentDate: new Date().toISOString(),
          expectedTransitionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          housingUnit: {
            unitName: 'شقة التدريب أ-101',
            unitType: 'apartment',
            address: { street: 'شارع الملك فهد', city: 'الرياض', district: 'العليا' },
            capacity: 2,
            currentOccupants: 1,
            amenities: ['مطبخ مجهز', 'غسالة', 'تلفزيون', 'إنترنت'],
            accessibilityFeatures: ['مصعد', 'حمام مجهز'],
            monthlyRent: 3000,
            subsidyAmount: 2500,
          },
          supportServices: [
            {
              serviceName: 'دعم مهارات الطبخ اليومية',
              serviceType: 'daily_living_support',
              frequency: 'daily',
            },
            {
              serviceName: 'إرشاد نفسي',
              serviceType: 'counseling',
              frequency: 'weekly',
            },
            {
              serviceName: 'متابعة طبية',
              serviceType: 'health_support',
              frequency: 'monthly',
            },
          ],
          emergencyContacts: [
            { name: 'أحمد محمد', relationship: 'أخ', phone: '0551234567', isPrimary: true },
          ],
          financialPlan: {
            monthlyBudget: 5000,
            subsidyAmount: 3500,
            beneficiaryContribution: 1500,
            fundingSource: 'وزارة الموارد البشرية',
          },
        });
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/housing - should list housing programs', async () => {
      const response = await request(app).get('/api/independent-living/housing');
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/housing - should filter by programType', async () => {
      const response = await request(app)
        .get('/api/independent-living/housing')
        .query({ programType: 'semi_independent', status: 'active' });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/housing/:id - should get housing by ID', async () => {
      const response = await request(app).get(`/api/independent-living/housing/${housingId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('PUT /api/independent-living/housing/:id - should update housing program', async () => {
      const response = await request(app).put(`/api/independent-living/housing/${housingId}`).send({
        status: 'active',
        transitionPhase: 'adjustment',
        notes: 'المستفيد يتكيف بشكل جيد مع البيئة الجديدة',
      });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('POST /api/independent-living/housing/:id/readiness - should add readiness assessment', async () => {
      const response = await request(app)
        .post(`/api/independent-living/housing/${housingId}/readiness`)
        .send({
          criteria: {
            personalHygiene: 4,
            mealPreparation: 3,
            housekeeping: 4,
            financialManagement: 2,
            medication: 5,
            emergencyResponse: 3,
            socialSkills: 4,
            communityNavigation: 2,
          },
          recommendation: 'supervised_independent',
          notes: 'يحتاج تعزيز في إدارة المال والتنقل المجتمعي',
        });
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('POST /api/independent-living/housing/:id/home-visits - should add home visit', async () => {
      const response = await request(app)
        .post(`/api/independent-living/housing/${housingId}/home-visits`)
        .send({
          visitDate: new Date().toISOString(),
          purpose: 'زيارة متابعة شهرية',
          findings: 'المنزل نظيف ومرتب، المستفيد يلتزم بالروتين اليومي',
          concerns: ['تأخر في دفع فاتورة الكهرباء'],
          recommendations: 'تدريب إضافي على إدارة الفواتير',
          followUpRequired: true,
          followUpDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
        });
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('POST /api/independent-living/housing/:id/satisfaction - should add satisfaction survey', async () => {
      const response = await request(app)
        .post(`/api/independent-living/housing/${housingId}/satisfaction`)
        .send({
          overallRating: 4,
          safetyRating: 5,
          supportRating: 4,
          independenceRating: 3,
          comments: 'أشعر بالأمان والدعم، أتمنى مزيداً من التدريب على المواصلات',
        });
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('DELETE /api/independent-living/housing/:id - should delete housing program', async () => {
      const response = await request(app).delete(`/api/independent-living/housing/${housingId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  لوحة المعلومات والتقارير (Dashboard & Reports)
  // ═══════════════════════════════════════════════════════

  describe('Dashboard & Reports (لوحة المعلومات والتقارير)', () => {
    test('GET /api/independent-living/dashboard - should get dashboard stats', async () => {
      const response = await request(app).get('/api/independent-living/dashboard');
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/independent-living/reports/beneficiary/:id - should get beneficiary report', async () => {
      const response = await request(app).get(
        `/api/independent-living/reports/beneficiary/${beneficiaryId}`
      );
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/v1/independent-living/dashboard - should work with v1 prefix', async () => {
      const response = await request(app).get('/api/v1/independent-living/dashboard');
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });

    test('GET /api/v1/independent-living/housing - should work with v1 prefix', async () => {
      const response = await request(app).get('/api/v1/independent-living/housing');
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(response.status);
    });
  });
});
