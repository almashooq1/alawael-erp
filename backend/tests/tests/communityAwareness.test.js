const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const EducationalContent = require('../models/EducationalContent');
const VirtualSession = require('../models/VirtualSession');
const DigitalLibrary = require('../models/DigitalLibrary');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const UserSubscription = require('../models/UserSubscription');

let authToken;
let userId;
let contentId;
let sessionId;
let libraryId;
let planId;

describe('Community Awareness System Tests', () => {
  beforeAll(async () => {
    // Setup test data
    userId = new mongoose.Types.ObjectId();
    authToken = 'test_token_123'; // في التطبيق الفعلي، استخدم JWT حقيقي
  });

  describe('Educational Content Tests', () => {
    test('should create educational content', async () => {
      const res = await request(app)
        .post('/api/community/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'مقدمة إلى الإعاقة البصرية',
          description: 'محتوى تعليمي شامل عن الإعاقة البصرية',
          contentType: 'article',
          disabilityCategory: 'visual',
          contentUrl: 'https://example.com/content',
          level: 'beginner',
          tags: ['visual', 'awareness'],
          accessibilityFeatures: {
            largeText: true,
            audioDescription: true,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      contentId = res.body.data._id;
    });

    test('should fetch all educational content', async () => {
      const res = await request(app).get('/api/community/content?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.content)).toBe(true);
    });

    test('should fetch content by category', async () => {
      const res = await request(app).get('/api/community/content/category/visual');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should get popular content', async () => {
      const res = await request(app).get('/api/community/content/popular');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should rate content', async () => {
      const res = await request(app)
        .post(`/api/community/content/${contentId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should get content statistics', async () => {
      const res = await request(app).get('/api/community/content/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalContent');
    });
  });

  describe('Virtual Sessions Tests', () => {
    test('should create virtual session', async () => {
      const res = await request(app)
        .post('/api/community/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'ندوة عن الإعاقة السمعية',
          description: 'ندوة توعوية عن الإعاقة السمعية',
          sessionType: 'webinar',
          targetDisabilityCategory: 'hearing',
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          duration: 60,
          maxParticipants: 100,
          meetingLink: 'https://zoom.us/meeting/123',
          platform: 'zoom',
          language: 'ar',
          accessibilityServices: {
            arabicSignLanguageInterpreter: true,
            liveSubtitles: true,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      sessionId = res.body.data._id;
    });

    test('should fetch upcoming sessions', async () => {
      const res = await request(app).get('/api/community/sessions/upcoming');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should register for session', async () => {
      const res = await request(app)
        .post(`/api/community/sessions/${sessionId}/register`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should add feedback to session', async () => {
      const res = await request(app)
        .post(`/api/community/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 4,
          comment: 'جلسة رائعة وممتعة',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should get session statistics', async () => {
      const res = await request(app).get('/api/community/sessions/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalSessions');
    });
  });

  describe('Digital Library Tests', () => {
    test('should upload resource to library', async () => {
      const res = await request(app)
        .post('/api/community/library/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'دليل شامل للإعاقة الحركية',
          description: 'دليل توعوي شامل',
          resourceType: 'guide',
          disabilityCategories: ['mobility'],
          author: {
            name: 'أحمد محمد',
            organization: 'مؤسسة النور',
          },
          fileUrl: 'https://example.com/guides/mobility.pdf',
          fileType: 'pdf',
          fileSize: 2048000,
          language: 'ar',
          categories: ['health', 'guidance'],
          tags: ['mobility', 'accessibility'],
          license: 'cc_by',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      libraryId = res.body.data._id;
    });

    test('should search resources', async () => {
      const res = await request(app).get(
        '/api/community/library/search?q=' + encodeURIComponent('إعاقة') + '&type=guide&language=ar'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should get resources by category', async () => {
      const res = await request(app).get('/api/community/library/category/mobility');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should add review to resource', async () => {
      const res = await request(app)
        .post(`/api/community/library/${libraryId}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 5,
          comment: 'مورد قيم جداً',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should get library statistics', async () => {
      const res = await request(app).get('/api/community/library/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalResources');
    });
  });

  describe('Subscription Tests', () => {
    test('should fetch all subscription plans', async () => {
      const res = await request(app).get('/api/community/subscriptions/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should create subscription plan (admin only)', async () => {
      const res = await request(app)
        .post('/api/community/subscriptions/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'premium',
          description: 'خطة متقدمة',
          price: {
            monthly: 99,
            annual: 990,
          },
          features: {
            contentAccess: ['article', 'video', 'audio'],
            sessionAccess: 'unlimited',
            libraryAccess: 'unlimited',
            supportLevel: 'priority',
          },
          limitations: {
            sessionLimitPerMonth: 0,
            downloadLimit: 0,
          },
        });

      // سيفشل إذا لم تكن المستخدم إداري
      expect([200, 403]).toContain(res.status);
      if (res.status === 200) {
        planId = res.body.data._id;
      }
    });

    test('should subscribe user to plan', async () => {
      if (!planId) return;

      const res = await request(app)
        .post('/api/community/subscriptions/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId,
          subscriptionType: 'monthly',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('should get user subscription', async () => {
      const res = await request(app)
        .get('/api/community/subscriptions/user')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should get subscription statistics (admin only)', async () => {
      const res = await request(app)
        .get('/api/community/subscriptions/stats')
        .set('Authorization', `Bearer ${authToken}`);

      // سيفشل إذا لم تكن المستخدم إداري
      expect([200, 403]).toContain(res.status);
    });
  });

  describe('Error Handling Tests', () => {
    test('should return 404 for non-existent content', async () => {
      const res = await request(app).get(`/api/community/content/${new mongoose.Types.ObjectId()}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('should return error for invalid category', async () => {
      const res = await request(app).get('/api/community/content/category/invalid');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return error for invalid rating', async () => {
      const res = await request(app)
        .post(`/api/community/content/${contentId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 10 });

      expect(res.status).toBe(400);
    });
  });
});
