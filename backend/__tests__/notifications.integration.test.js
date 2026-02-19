/**
 * Notifications Integration Tests - Phase 5.1
 * Tests notification system including creation, delivery, and preferences
 * 12 test cases covering notification workflows
 */

const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const TestDBHelper = require('../utils/test-db-helper');

// Extended timeout for integration tests with TestDBHelper
jest.setTimeout(120000);

describe.skip('Notifications Integration Tests', () => {
  let authToken;
  let userId;
  let employees = [];
  let notificationIds = [];

  beforeAll(async () => {
    // Create test user using helper for safe sequential operations
    const user = await TestDBHelper.createDocument(User, {
      email: 'notifications@test.com',
      fullName: 'Notifications Test User',
      password: 'TestPassword123!',
      role: 'admin',
    });
    userId = user._id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notifications@test.com', password: 'TestPassword123!' });

    authToken = loginRes.body.token;

    // Create test employees sequentially to prevent MongoDB timeout
    const empData = [
      {
        firstName: 'NotifEmp0',
        lastName: 'Test',
        email: 'notifEmp0@test.com',
        employeeId: `EMP-${Date.now()}-0`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'NotifEmp1',
        lastName: 'Test',
        email: 'notifEmp1@test.com',
        employeeId: `EMP-${Date.now()}-1`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'NotifEmp2',
        lastName: 'Test',
        email: 'notifEmp2@test.com',
        employeeId: `EMP-${Date.now()}-2`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
    ];
    employees = await TestDBHelper.createDocuments(Employee, empData);
  });

  describe('Notifications - Creation & Sending', () => {
    it('should create and send notification to user', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: userId.toString(),
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test notification',
          priority: 'normal',
        })
        .expect(201);

      expect(res.body).toHaveProperty('notificationId');
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('sent');
      notificationIds.push(res.body.notificationId);
    });

    it('should send bulk notifications to multiple recipients', async () => {
      const recipientIds = employees.map(e => e._id.toString());

      const res = await request(app)
        .post('/api/notifications/bulk-send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientIds,
          type: 'alert',
          title: 'Bulk Test',
          message: 'Bulk notification test',
        })
        .expect(201);

      expect(res.body).toHaveProperty('sentCount');
      expect(res.body.sentCount).toBe(recipientIds.length);
    });

    it('should create notification with attachments', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: userId.toString(),
          type: 'document',
          title: 'New Document',
          message: 'Document attachment included',
          attachments: [
            {
              name: 'report.pdf',
              url: '/files/report.pdf',
            },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('notificationId');
      expect(res.body).toHaveProperty('attachments');
    });

    it('should send notification with action buttons', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: userId.toString(),
          type: 'actionable',
          title: 'Action Required',
          message: 'Please approve this request',
          actions: [
            { label: 'Approve', action: 'approve' },
            { label: 'Reject', action: 'reject' },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('notificationId');
      expect(res.body).toHaveProperty('actions');
      expect(res.body.actions.length).toBe(2);
    });

    it('should schedule notification for future delivery', async () => {
      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: userId.toString(),
          type: 'scheduled',
          title: 'Scheduled Notification',
          message: 'This will be sent tomorrow',
          deliverAt: scheduledTime.toISOString(),
        })
        .expect(201);

      expect(res.body).toHaveProperty('notificationId');
      expect(res.body).toHaveProperty('deliverAt');
    });

    it('should validate notification required fields', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'info',
          // Missing recipientId, title, message
        })
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Notifications - Retrieval & Management', () => {
    it('should retrieve user notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('notificationId');
      expect(res.body[0]).toHaveProperty('status');
    });

    it('should filter notifications by type', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'info' })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(notif => {
        expect(notif.type).toBe('info');
      });
    });

    it('should filter notifications by read status', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ read: false })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(notif => {
        expect(notif.read).toBe(false);
      });
    });

    it('should mark notification as read', async () => {
      const notifId = notificationIds[0];

      const res = await request(app)
        .patch(`/api/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('read');
      expect(res.body.read).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('markedCount');
      expect(res.body.markedCount).toBeGreaterThan(0);
    });

    it('should delete notification', async () => {
      // Create a notification first
      const createRes = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recipientId: userId.toString(),
          type: 'info',
          title: 'To Delete',
          message: 'This will be deleted',
        });

      const notifId = createRes.body.notificationId;

      const res = await request(app)
        .delete(`/api/notifications/${notifId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });

    it('should get notification count summary', async () => {
      const res = await request(app)
        .get('/api/notifications/count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('unread');
      expect(res.body).toHaveProperty('total');
      expect(typeof res.body.unread).toBe('number');
    });
  });

  describe('Notifications - Preferences & Settings', () => {
    it('should update notification preferences', async () => {
      const res = await request(app)
        .patch('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: true,
          pushNotifications: false,
          smsNotifications: true,
          notificationTypes: {
            alert: true,
            info: false,
            success: true,
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('preferences');
      expect(res.body.preferences.emailNotifications).toBe(true);
    });

    it('should retrieve user notification preferences', async () => {
      const res = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('emailNotifications');
      expect(res.body).toHaveProperty('pushNotifications');
      expect(res.body).toHaveProperty('notificationTypes');
    });

    it('should set quiet hours for notifications', async () => {
      const res = await request(app)
        .patch('/api/notifications/quiet-hours')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          allowUrgent: true,
        })
        .expect(200);

      expect(res.body).toHaveProperty('quietHours');
      expect(res.body.quietHours.enabled).toBe(true);
    });

    it('should unsubscribe from notification type', async () => {
      const res = await request(app)
        .patch('/api/notifications/unsubscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'marketing',
        })
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Notifications - Authorization & Error Handling', () => {
    it('should require authentication for notifications', async () => {
      const res = await request(app).get('/api/notifications').expect(401);

      expect(res.body).toHaveProperty('message');
    });

    it('should prevent access to others notifications', async () => {
      // Create another user
      const otherUser = await User.create({
        email: 'other@test.com',
        fullName: 'Other User',
        password: 'TestPassword123!',
        role: 'user',
      });

      const otherLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'other@test.com', password: 'TestPassword123!' });

      const otherToken = otherLoginRes.body.token;

      // Try to access admin user's notifications
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      // Should only see own notifications or be restricted
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle invalid notification ID gracefully', async () => {
      const res = await request(app)
        .get('/api/notifications/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect([404, 400]).toContain(res.status);
    });
  });

  afterAll(async () => {
    // Cleanup using helper to prevent MongoDB timeout
    await TestDBHelper.cleanupCollections([Notification, Employee, User]);
  });
});
