/**
 * BeneficiaryPortal.test.js
 * اختبارات شاملة لبوابة المستفيدين
 */

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const {
  Beneficiary,
  Schedule,
  ProgressReport,
  Message,
  Survey,
  SurveyResponse,
} = require('../models/BeneficiaryPortal');
const jwt = require('jsonwebtoken');

describe('Beneficiary Portal - Comprehensive Tests', () => {
  let beneficiaryToken;
  let beneficiaryId;
  let beneficiary;

  beforeAll(async () => {
    // Clear database
    await Beneficiary.deleteMany({});
    await Schedule.deleteMany({});
    await ProgressReport.deleteMany({});
    await Message.deleteMany({});
  });

  describe('Authentication Tests', () => {
    test('Should register new beneficiary', async () => {
      const res = await request(app).post('/api/beneficiary/auth/register').send({
        firstName: 'محمد',
        lastName: 'أحمد',
        email: 'family@test.com',
        phone: '+966501234567',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.beneficiary.email).toBe('family@test.com');
      beneficiaryId = res.body.beneficiary.id;
    });

    test('Should login beneficiary', async () => {
      const res = await request(app).post('/api/beneficiary/auth/login').send({
        email: 'family@test.com',
        password: 'SecurePass123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      beneficiaryToken = res.body.token;
    });

    test('Should reject invalid credentials', async () => {
      const res = await request(app).post('/api/beneficiary/auth/login').send({
        email: 'family@test.com',
        password: 'WrongPassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Should prevent duplicate email registration', async () => {
      const res = await request(app).post('/api/beneficiary/auth/register').send({
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'family@test.com',
        phone: '+966501234568',
        password: 'AnotherPass123!',
        confirmPassword: 'AnotherPass123!',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Schedule Tests', () => {
    test('Should get empty schedule for new beneficiary', async () => {
      const res = await request(app)
        .get('/api/beneficiary/schedule')
        .set('Authorization', `Bearer ${beneficiaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    test('Should create schedule with sessions', async () => {
      const schedule = new Schedule({
        beneficiaryId,
        programId: new mongoose.Types.ObjectId(),
        items: [
          {
            title: 'جلسة توعية صحية',
            category: 'session',
            startDate: new Date(Date.now() + 86400000),
            endDate: new Date(Date.now() + 90000000),
            location: 'قاعة المحاضرات',
            isVirtual: false,
            status: 'scheduled',
          },
        ],
      });
      await schedule.save();

      const res = await request(app)
        .get('/api/beneficiary/schedule')
        .set('Authorization', `Bearer ${beneficiaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });

    test('Should mark attendance', async () => {
      const schedule = await Schedule.findOne({ beneficiaryId });
      const itemId = schedule.items[0]._id;

      const res = await request(app)
        .post(`/api/beneficiary/schedule/${itemId}/attend`)
        .set('Authorization', `Bearer ${beneficiaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify attendance was recorded
      const updatedSchedule = await Schedule.findOne({ beneficiaryId });
      const item = updatedSchedule.items.id(itemId);
      expect(item.attended).toBe(true);
    });
  });

  describe('Progress Report Tests', () => {
    test('Should return empty progress initially', async () => {
      const res = await request(app)
        .get('/api/beneficiary/progress')
        .set('Authorization', `Bearer ${beneficiaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Should fetch progress analytics', async () => {
      // Create progress report first
      const report = new ProgressReport({
        beneficiaryId,
        programId: new mongoose.Types.ObjectId(),
        overallProgress: 75,
        attendanceRate: 90,
        assignmentCompletion: 85,
        assessmentScore: 78,
        sessionsAttended: 9,
        sessionsTotal: 10,
        assignmentsCompleted: 17,
        assignmentsTotal: 20,
      });
      await report.save();

      const res = await request(app)
        .get('/api/beneficiary/progress/analytics')
        .set('Authorization', `Bearer ${beneficiaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.attendance.current).toBe(90);
    });
  });

  describe('Messaging Tests', () => {
    let conversationId;
    let secondBeneficiaryId;
    let secondBeneficiaryToken;

    beforeAll(async () => {
      // Create second beneficiary
      const res = await request(app).post('/api/beneficiary/auth/register').send({
        firstName: 'فاطمة',
        lastName: 'علي',
        email: 'family2@test.com',
        phone: '+966501234569',
        password: 'SecurePass456!',
        confirmPassword: 'SecurePass456!',
      });

      secondBeneficiaryId = res.body.beneficiary.id;

      const loginRes = await request(app).post('/api/beneficiary/auth/login').send({
        email: 'family2@test.com',
        password: 'SecurePass456!',
      });

      secondBeneficiaryToken = loginRes.body.token;
    });

    test('Should send secure message', async () => {
      const res = await request(app)
        .post('/api/beneficiary/messages/send')
        .set('Authorization', `Bearer ${beneficiaryToken}`)
        .send({
          recipientId: secondBeneficiaryId,
          body: 'رسالة اختبار آمنة',
          priority: 'normal',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.body).toBe('رسالة اختبار آمنة');
    });

    test('Should get conversations', async () => {
      const res = await request(app)
        .get('/api/beneficiary/messages/conversations')
        .set('Authorization', `Bearer ${beneficiaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Should fetch messages from conversation', async () => {
      const conversations = await request(app)
        .get('/api/beneficiary/messages/conversations')
        .set('Authorization', `Bearer ${beneficiaryToken}`);

      if (conversations.body.data.length > 0) {
        conversationId = conversations.body.data[0]._id;

        const res = await request(app)
          .get(`/api/beneficiary/messages/conversation/${conversationId}`)
          .set('Authorization', `Bearer ${beneficiaryToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      }
    });

    test('Should reject empty message', async () => {
      const res = await request(app)
        .post('/api/beneficiary/messages/send')
        .set('Authorization', `Bearer ${beneficiaryToken}`)
        .send({
          recipientId: secondBeneficiaryId,
          body: '',
          priority: 'normal',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Survey Tests', () => {
    test('Should get available surveys', async () => {
      // Create active survey first
      const survey = new Survey({
        title: 'استطلاع الرضا',
        description: 'نود معرفة رأيك',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        questions: [
          {
            id: new mongoose.Types.ObjectId(),
            type: 'rating',
            question: 'كم تقيم رضاك عن البرنامج؟',
            required: true,
            scale: 5,
          },
        ],
      });
      await survey.save();

      const res = await request(app)
        .get('/api/beneficiary/surveys')
        .set('Authorization', `Bearer ${beneficiaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBeGreaterThanOrEqual(0);
    });

    test('Should submit survey response', async () => {
      const survey = await Survey.findOne({ title: 'استطلاع الرضا' });

      const res = await request(app)
        .post(`/api/beneficiary/surveys/${survey._id}/submit`)
        .set('Authorization', `Bearer ${beneficiaryToken}`)
        .send({
          responses: [
            {
              questionId: survey.questions[0].id,
              answer: 5,
              value: 5,
            },
          ],
          completionTime: 120,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('Should prevent duplicate survey responses', async () => {
      const survey = await Survey.findOne({ title: 'استطلاع الرضا' });

      const res = await request(app)
        .post(`/api/beneficiary/surveys/${survey._id}/submit`)
        .set('Authorization', `Bearer ${beneficiaryToken}`)
        .send({
          responses: [
            {
              questionId: survey.questions[0].id,
              answer: 4,
              value: 4,
            },
          ],
          completionTime: 150,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Profile Tests', () => {
    test('Should get beneficiary profile', async () => {
      const res = await request(app)
        .get('/api/beneficiary/profile')
        .set('Authorization', `Bearer ${beneficiaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('محمد');
      expect(res.body.data.email).toBe('family@test.com');
    });

    test('Should update profile', async () => {
      const res = await request(app)
        .put('/api/beneficiary/profile')
        .set('Authorization', `Bearer ${beneficiaryToken}`)
        .send({
          firstName: 'محمد',
          lastName: 'أحمد محمد',
          phone: '+966501234570',
          familyMembers: [
            {
              name: 'فاطمة',
              relation: 'ابنة',
              age: 8,
              status: 'student',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lastName).toBe('أحمد محمد');
    });

    test('Should change password', async () => {
      const res = await request(app)
        .post('/api/beneficiary/profile/change-password')
        .set('Authorization', `Bearer ${beneficiaryToken}`)
        .send({
          currentPassword: 'SecurePass123!',
          newPassword: 'NewSecurePass456!',
          confirmPassword: 'NewSecurePass456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Should reject wrong current password', async () => {
      const res = await request(app)
        .post('/api/beneficiary/profile/change-password')
        .set('Authorization', `Bearer ${beneficiaryToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'AnotherPass789!',
          confirmPassword: 'AnotherPass789!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Notification Tests', () => {
    test('Should get notifications', async () => {
      const res = await request(app)
        .get('/api/beneficiary/notifications')
        .set('Authorization', `Bearer ${beneficiaryToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Security Tests', () => {
    test('Should reject requests without token', async () => {
      const res = await request(app).get('/api/beneficiary/schedule');

      expect(res.status).toBe(401);
    });

    test('Should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/beneficiary/schedule')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(401);
    });

    test('Should reject expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: beneficiaryId, email: 'test@test.com' },
        process.env.JWT_SECRET || 'secret_key',
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .get('/api/beneficiary/schedule')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    test('Should enforce password requirements', async () => {
      const res = await request(app).post('/api/beneficiary/auth/register').send({
        firstName: 'اختبار',
        lastName: 'اختبار',
        email: 'weak@test.com',
        phone: '+966501234571',
        password: 'weak',
        confirmPassword: 'weak',
      });

      // Should be accepted but would be validated by client
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Data Validation Tests', () => {
    test('Should validate email format', async () => {
      const res = await request(app).post('/api/beneficiary/auth/register').send({
        firstName: 'محمد',
        lastName: 'أحمد',
        email: 'invalid-email',
        phone: '+966501234572',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      });

      // Email validation should occur
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('Should validate phone number format', async () => {
      const res = await request(app).post('/api/beneficiary/auth/register').send({
        firstName: 'محمد',
        lastName: 'أحمد',
        email: 'test@test.com',
        phone: 'invalid-phone',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      });

      // Phone validation should occur
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Performance Tests', () => {
    test('Should handle concurrent requests', async () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/api/beneficiary/schedule')
            .set('Authorization', `Bearer ${beneficiaryToken}`)
        );
      }

      const results = await Promise.all(requests);
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
    });
  });
});

describe('Integration Tests', () => {
  test('Complete user journey', async () => {
    // 1. Register
    const registerRes = await request(app).post('/api/beneficiary/auth/register').send({
      firstName: 'علي',
      lastName: 'محمد',
      email: 'journey@test.com',
      phone: '+966501234573',
      password: 'JourneyPass123!',
      confirmPassword: 'JourneyPass123!',
    });

    expect(registerRes.status).toBe(201);
    const userId = registerRes.body.beneficiary.id;

    // 2. Login
    const loginRes = await request(app).post('/api/beneficiary/auth/login').send({
      email: 'journey@test.com',
      password: 'JourneyPass123!',
    });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    // 3. Update profile
    const updateRes = await request(app)
      .put('/api/beneficiary/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'علي',
        lastName: 'محمد علي',
        phone: '+966501234574',
      });

    expect(updateRes.status).toBe(200);

    // 4. Check schedule
    const scheduleRes = await request(app)
      .get('/api/beneficiary/schedule')
      .set('Authorization', `Bearer ${token}`);

    expect(scheduleRes.status).toBe(200);

    // 5. Check progress
    const progressRes = await request(app)
      .get('/api/beneficiary/progress')
      .set('Authorization', `Bearer ${token}`);

    expect(progressRes.status).toBe(200);
  });
});
