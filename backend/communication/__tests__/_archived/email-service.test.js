/* eslint-disable no-unused-vars */

/**
 * Email Service Tests
 * اختبارات خدمة البريد الإلكتروني
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true),
    close: jest.fn(),
  })),
}));

// Import after mocking
const {
  EmailTemplate,
  EmailLog,
  EmailCampaign,
  EmailList,
  EmailQueue,
} = require('../email-models');
const emailRoutes = require('../email-routes');

let mongoServer;
let app;


jest.mock('../../rbac', () => ({
  createRBACMiddleware: () => (req, res, next) => next(),
  checkPermission: () => (req, res, next) => next(),
  RBAC_ROLES: {},
  RBAC_PERMISSIONS: {},
}));
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => { req.user = { id: 'user123', name: 'Test', role: 'admin', permissions: ['*'] }; next(); },
  requireAdmin: (req, res, next) => next(),
  requireAuth: (req, res, next) => { req.user = { id: 'user123', role: 'admin', permissions: ['*'] }; next(); },
  requireRole: (...r) => (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => { req.user = { id: 'user123', role: 'admin' }; next(); },
  authorize: (...r) => (req, res, next) => next(),
  authorizeRole: (...r) => (req, res, next) => next(),
  authenticate: (req, res, next) => { req.user = { id: 'user123', role: 'admin' }; next(); },
}));
describe('Email Service Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Setup express app
    app = express();
    app.use(express.json());
    app.use('/api/email', emailRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await EmailTemplate.deleteMany({});
    await EmailLog.deleteMany({});
    await EmailCampaign.deleteMany({});
    await EmailList.deleteMany({});
    await EmailQueue.deleteMany({});
  });

  // ============================================
  // TEMPLATE TESTS
  // ============================================
  describe('Template Management', () => {
    test('Should create a new email template', async () => {
      const response = await request(app).post('/api/email/templates').send({
        name: 'Welcome Email',
        slug: 'welcome',
        subject: 'مرحباً بك {{name}}',
        htmlContent: '<p>مرحباً {{name}}</p>',
        category: 'authentication',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Welcome Email');
      expect(response.body.data.slug).toBe('welcome');
    });

    test('Should get all templates', async () => {
      // Create test templates
      await EmailTemplate.create([
        {
          templateId: 'tpl_1',
          name: 'Template 1',
          slug: 'template-1',
          subject: 'Subject 1',
          htmlContent: '<p>Content 1</p>',
          category: 'notification',
        },
        {
          templateId: 'tpl_2',
          name: 'Template 2',
          slug: 'template-2',
          subject: 'Subject 2',
          htmlContent: '<p>Content 2</p>',
          category: 'marketing',
        },
      ]);

      const response = await request(app).get('/api/email/templates');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    test('Should get template by ID', async () => {
      const template = await EmailTemplate.create({
        templateId: 'tpl_test',
        name: 'Test Template',
        slug: 'test-template',
        subject: 'Test Subject',
        htmlContent: '<p>Test Content</p>',
      });

      const response = await request(app).get(`/api/email/templates/${template._id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Test Template');
    });

    test('Should update template', async () => {
      const template = await EmailTemplate.create({
        templateId: 'tpl_update',
        name: 'Original Name',
        slug: 'update-template',
        subject: 'Original Subject',
        htmlContent: '<p>Original Content</p>',
      });

      const response = await request(app)
        .put(`/api/email/templates/${template._id}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Name');
    });

    test('Should delete template', async () => {
      const template = await EmailTemplate.create({
        templateId: 'tpl_delete',
        name: 'To Delete',
        slug: 'delete-template',
        subject: 'Delete Subject',
        htmlContent: '<p>Delete Content</p>',
      });

      const response = await request(app).delete(`/api/email/templates/${template._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const deleted = await EmailTemplate.findById(template._id);
      expect(deleted).toBeNull();
    });
  });

  // ============================================
  // EMAIL LOG TESTS
  // ============================================
  describe('Email Logs', () => {
    test('Should get email logs', async () => {
      await EmailLog.create([
        {
          emailId: 'eml_1',
          from: { address: 'noreply@test.com' },
          to: [{ address: 'user1@test.com' }],
          subject: 'Test 1',
          status: 'sent',
          provider: 'smtp',
        },
        {
          emailId: 'eml_2',
          from: { address: 'noreply@test.com' },
          to: [{ address: 'user2@test.com' }],
          subject: 'Test 2',
          status: 'delivered',
          provider: 'smtp',
        },
      ]);

      const response = await request(app).get('/api/email/logs');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    test('Should filter logs by status', async () => {
      await EmailLog.create([
        {
          emailId: 'eml_sent',
          from: { address: 'noreply@test.com' },
          to: [{ address: 'user@test.com' }],
          subject: 'Sent Email',
          status: 'sent',
          provider: 'smtp',
        },
        {
          emailId: 'eml_failed',
          from: { address: 'noreply@test.com' },
          to: [{ address: 'user@test.com' }],
          subject: 'Failed Email',
          status: 'failed',
          provider: 'smtp',
        },
      ]);

      const response = await request(app).get('/api/email/logs?status=sent');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('sent');
    });

    test('Should get single email log', async () => {
      await EmailLog.create({
        emailId: 'eml_single',
        from: { address: 'noreply@test.com' },
        to: [{ address: 'user@test.com' }],
        subject: 'Single Email',
        status: 'sent',
        provider: 'smtp',
      });

      const response = await request(app).get('/api/email/logs/eml_single');

      expect(response.status).toBe(200);
      expect(response.body.data.emailId).toBe('eml_single');
    });
  });

  // ============================================
  // CAMPAIGN TESTS
  // ============================================
  describe('Campaign Management', () => {
    test('Should create a new campaign', async () => {
      const template = await EmailTemplate.create({
        templateId: 'tpl_camp',
        name: 'Campaign Template',
        slug: 'campaign-template',
        subject: 'Campaign',
        htmlContent: '<p>Campaign</p>',
      });

      const response = await request(app)
        .post('/api/email/campaigns')
        .send({
          name: 'Test Campaign',
          description: 'A test campaign',
          template: template._id,
          recipients: { type: 'manual' },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Test Campaign');
    });

    test('Should get campaigns', async () => {
      const template = await EmailTemplate.create({
        templateId: 'tpl_list',
        name: 'Template',
        slug: 'list-template',
        subject: 'Template',
        htmlContent: '<p>Template</p>',
      });

      await EmailCampaign.create([
        {
          campaignId: 'camp_1',
          name: 'Campaign 1',
          template: template._id,
          status: 'draft',
        },
        {
          campaignId: 'camp_2',
          name: 'Campaign 2',
          template: template._id,
          status: 'sent',
        },
      ]);

      const response = await request(app).get('/api/email/campaigns');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });
  });

  // ============================================
  // LIST TESTS
  // ============================================
  describe('Email Lists', () => {
    test('Should create a new email list', async () => {
      const response = await request(app)
        .post('/api/email/lists')
        .send({
          name: 'Newsletter Subscribers',
          type: 'subscribers',
          settings: {
            doubleOptIn: true,
            welcomeEmail: true,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Newsletter Subscribers');
    });

    test('Should add subscriber to list', async () => {
      const list = await EmailList.create({
        listId: 'list_1',
        name: 'Test List',
        type: 'subscribers',
      });

      const response = await request(app).post(`/api/email/lists/${list._id}/subscribers`).send({
        email: 'new@subscriber.com',
        name: 'New Subscriber',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should prevent duplicate subscribers', async () => {
      const list = await EmailList.create({
        listId: 'list_dup',
        name: 'Test List',
        type: 'subscribers',
        subscribers: [
          {
            email: 'existing@subscriber.com',
            status: 'active',
          },
        ],
      });

      const response = await request(app).post(`/api/email/lists/${list._id}/subscribers`).send({
        email: 'existing@subscriber.com',
        name: 'Existing',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already');
    });
  });

  // ============================================
  // QUEUE TESTS
  // ============================================
  describe('Email Queue', () => {
    test('Should get pending queue items', async () => {
      await EmailQueue.create([
        {
          queueId: 'eq_1',
          emailData: { to: ['user@test.com'], subject: 'Test' },
          status: 'pending',
          scheduledFor: new Date(),
        },
        {
          queueId: 'eq_2',
          emailData: { to: ['user@test.com'], subject: 'Test 2' },
          status: 'completed',
          scheduledFor: new Date(),
        },
      ]);

      const response = await request(app).get('/api/email/queue?status=pending');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================
  describe('Statistics', () => {
    test('Should get email statistics', async () => {
      await EmailLog.create([
        {
          emailId: 'stat_1',
          from: { address: 'noreply@test.com' },
          to: [{ address: 'user@test.com' }],
          subject: 'Stat 1',
          status: 'sent',
          provider: 'smtp',
          createdAt: new Date(),
        },
        {
          emailId: 'stat_2',
          from: { address: 'noreply@test.com' },
          to: [{ address: 'user@test.com' }],
          subject: 'Stat 2',
          status: 'delivered',
          provider: 'smtp',
          createdAt: new Date(),
        },
        {
          emailId: 'stat_3',
          from: { address: 'noreply@test.com' },
          to: [{ address: 'user@test.com' }],
          subject: 'Stat 3',
          status: 'opened',
          provider: 'smtp',
          createdAt: new Date(),
        },
      ]);

      const response = await request(app).get('/api/email/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overall).toBeDefined();
    });
  });

  // ============================================
  // HEALTH CHECK TESTS
  // ============================================
  describe('Health Check', () => {
    test('Should return health status', async () => {
      const response = await request(app).get('/api/email/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
    });
  });
});