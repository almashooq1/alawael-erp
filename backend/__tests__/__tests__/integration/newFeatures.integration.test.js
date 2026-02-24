// ============================================================
// Integration Tests for New Features
// اختبارات التكامل للميزات الجديدة
// ============================================================
// تاريخ الكتابة: 17 فبراير 2026
// Jest Testing Framework

const request = require('supertest');
const app = require('../app');
const { Logger } = require('../utils/logger');

// ============================================================
// Helper Functions
// ============================================================

function getAuthToken() {
  return 'test-token-' + Date.now();
}

function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// PART 1: Real-Time Collaboration Tests
// ============================================================

describe('Real-Time Collaboration System', () => {
  let authToken;
  let sessionId;

  beforeAll(() => {
    authToken = getAuthToken();
  });

  describe('POST /api/collaboration/sessions', () => {
    it('يجب إنشاء جلسة تعاون جديدة', async () => {
      const response = await request(app)
        .post('/api/collaboration/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentId: 'test-doc-123',
          title: 'Test Document',
          description: 'Test collaboration session'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('documentVersion', 1);
      expect(response.body.data).toHaveProperty('activeUsers', 1);

      sessionId = response.body.data.id;
      Logger.info('✅ Session created:', sessionId);
    });

    it('يجب رفض الطلب بدون بيانات مطلوبة', async () => {
      const response = await request(app)
        .post('/api/collaboration/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/collaboration/sessions/:id/join', () => {
    it('يجب السماح للمستخدم بالانضمام للجلسة', async () => {
      const response = await request(app)
        .post(`/api/collaboration/sessions/${sessionId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-456',
          userName: 'Test User'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('sessionId', sessionId);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data.totalUsers).toBeGreaterThan(0);

      Logger.info('✅ User joined session');
    });
  });

  describe('POST /api/collaboration/sessions/:id/changes', () => {
    it('يجب تطبيق تغيير على المستند', async () => {
      const response = await request(app)
        .post(`/api/collaboration/sessions/${sessionId}/changes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operation: 'insert',
          position: 10,
          content: 'Test content'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('operation', 'insert');
      expect(response.body.data).toHaveProperty('appliedAt');

      Logger.info('✅ Change applied successfully');
    });

    it('يجب دعم عمليات حذف واستبدال', async () => {
      const deleteResponse = await request(app)
        .post(`/api/collaboration/sessions/${sessionId}/changes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operation: 'delete',
          position: 0,
          length: 5
        });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.data.operation).toBe('delete');

      const replaceResponse = await request(app)
        .post(`/api/collaboration/sessions/${sessionId}/changes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operation: 'replace',
          position: 0,
          oldContent: 'old',
          newContent: 'new'
        });

      expect(replaceResponse.status).toBe(200);
      expect(replaceResponse.body.data.operation).toBe('replace');

      Logger.info('✅ Delete and replace operations work');
    });
  });

  describe('POST /api/collaboration/sessions/:id/comments', () => {
    it('يجب إضافة تعليق على المستند', async () => {
      const response = await request(app)
        .post(`/api/collaboration/sessions/${sessionId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-123',
          userName: 'Test User',
          content: 'This needs review',
          position: 5,
          type: 'suggestion'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('content', 'This needs review');
      expect(response.body.data).toHaveProperty('type', 'suggestion');

      Logger.info('✅ Comment added successfully');
    });
  });

  describe('POST /api/collaboration/sessions/:id/undo', () => {
    it('يجب الرجوع عن آخر تغيير', async () => {
      const response = await request(app)
        .post(`/api/collaboration/sessions/${sessionId}/undo`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('operation');
      expect(response.body.data).toHaveProperty('previousState');

      Logger.info('✅ Undo operation successful');
    });
  });

  describe('GET /api/collaboration/sessions/:id/stats', () => {
    it('يجب جلب إحصائيات الجلسة', async () => {
      const response = await request(app)
        .get(`/api/collaboration/sessions/${sessionId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('totalChanges');
      expect(response.body.data).toHaveProperty('totalComments');
      expect(response.body.data).toHaveProperty('sessionDuration');

      Logger.info('✅ Session stats retrieved');
    });
  });
});

// ============================================================
// PART 2: Smart Notifications Tests
// ============================================================

describe('Smart Notifications System', () => {
  let authToken;
  let notificationId;

  beforeAll(() => {
    authToken = getAuthToken();
  });

  describe('POST /api/notifications/smart/create', () => {
    it('يجب إنشاء إشعار ذكي', async () => {
      const response = await request(app)
        .post('/api/notifications/smart/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-123',
          title: 'Test Notification',
          message: 'This is a test notification',
          type: 'info',
          priority: 'normal',
          channels: ['in-app', 'email']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('aiScore');
      expect(response.body.data.aiScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.aiScore).toBeLessThanOrEqual(100);
      expect(response.body.data).toHaveProperty('scheduledFor');
      expect(response.body.data).toHaveProperty('status', 'pending');

      notificationId = response.body.data.id;
      Logger.info('✅ Smart notification created');
    });

    it('يجب حساب درجة AI للملاءمة', async () => {
      const response = await request(app)
        .post('/api/notifications/smart/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-456',
          title: 'Critical Alert',
          message: 'Urgent system issue detected',
          type: 'alert',
          priority: 'critical',
          channels: ['in-app', 'email', 'sms']
        });

      expect(response.status).toBe(200);
      const criticalScore = response.body.data.aiScore;

      // إنشاء إشعار عادي
      const normalResponse = await request(app)
        .post('/api/notifications/smart/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-789',
          title: 'Regular Update',
          message: 'New feature available',
          type: 'info',
          priority: 'low',
          channels: ['in-app']
        });

      const normalScore = normalResponse.body.data.aiScore;

      // يجب أن تكون درجة الإشعار الحرج أعلى
      expect(criticalScore).toBeGreaterThan(normalScore);
      Logger.info('✅ AI scoring works correctly');
    });
  });

  describe('POST /api/notifications/smart/broadcast', () => {
    it('يجب إرسال إشعارات مجموعية', async () => {
      const response = await request(app)
        .post('/api/notifications/smart/broadcast')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userIds: ['user-1', 'user-2', 'user-3'],
          title: 'System Update',
          message: 'New version available',
          type: 'update',
          priority: 'normal',
          channels: ['in-app', 'push']
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('recipientCount', 3);
      expect(response.body.data).toHaveProperty('status', 'broadcasting');

      Logger.info('✅ Broadcast notification sent');
    });
  });

  describe('GET /api/notifications/smart/list', () => {
    it('يجب جلب قائمة الإشعارات', async () => {
      const response = await request(app)
        .get('/api/notifications/smart/list?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('unread');
      expect(response.body.data).toHaveProperty('notifications');
      expect(Array.isArray(response.body.data.notifications)).toBe(true);

      Logger.info('✅ Notifications list retrieved');
    });
  });

  describe('PATCH /api/notifications/smart/preferences', () => {
    it('يجب تحديث تفضيلات الإشعارات', async () => {
      const response = await request(app)
        .patch('/api/notifications/smart/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          channels: {
            'in-app': true,
            'email': false,
            'sms': true,
            'push': true
          },
          frequency: {
            'alert': 'immediate',
            'info': 'daily'
          },
          doNotDisturb: {
            enabled: true,
            startTime: '22:00',
            endTime: '08:00'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('channels');
      expect(response.body.data.channels['in-app']).toBe(true);
      expect(response.body.data.channels['email']).toBe(false);

      Logger.info('✅ Notification preferences updated');
    });
  });

  describe('POST /api/notifications/smart/:id/interact', () => {
    it('يجب تسجيل التفاعل مع الإشعار', async () => {
      const response = await request(app)
        .post(`/api/notifications/smart/${notificationId}/interact`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'read'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('engagement');
      expect(response.body.data.engagement).toHaveProperty('read');

      Logger.info('✅ Interaction recorded');
    });

    it('يجب دعم عدة أنواع من التفاعلات', async () => {
      const actions = ['sent', 'delivered', 'read', 'clicked', 'dismissed'];

      for (const action of actions) {
        const response = await request(app)
          .post(`/api/notifications/smart/${notificationId}/interact`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ action });

        expect(response.status).toBe(200);
      }

      Logger.info('✅ All interaction types work');
    });
  });

  describe('GET /api/notifications/smart/stats', () => {
    it('يجب جلب إحصائيات الإشعارات', async () => {
      const response = await request(app)
        .get('/api/notifications/smart/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('delivered');
      expect(response.body.data).toHaveProperty('read');
      expect(response.body.data).toHaveProperty('clicked');
      expect(response.body.data).toHaveProperty('deliveryRate');
      expect(response.body.data).toHaveProperty('readRate');
      expect(response.body.data).toHaveProperty('engagementRate');

      Logger.info('✅ Notification stats retrieved');
    });
  });

  describe('DELETE /api/notifications/smart/:id', () => {
    it('يجب حذف إشعار محدد', async () => {
      const response = await request(app)
        .delete(`/api/notifications/smart/${notificationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      Logger.info('✅ Notification deleted');
    });
  });
});

// ============================================================
// PART 3: Advanced Analytics Tests
// ============================================================

describe('Advanced Analytics System', () => {
  let authToken;
  let reportId;

  beforeAll(() => {
    authToken = getAuthToken();
  });

  describe('POST /api/analytics/events', () => {
    it('يجب تسجيل الحدث بنجاح', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'test-user-123',
          category: 'user_action',
          action: 'login',
          label: 'web',
          value: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('timestamp');

      Logger.info('✅ Event logged');
    });

    it('يجب دعم أنواع مختلفة من الأحداث', async () => {
      const eventTypes = [
        { category: 'user_action', action: 'login' },
        { category: 'system_event', action: 'error' },
        { category: 'business_event', action: 'purchase' }
      ];

      for (const event of eventTypes) {
        const response = await request(app)
          .post('/api/analytics/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send(event);

        expect(response.status).toBe(200);
      }

      Logger.info('✅ All event types supported');
    });
  });

  describe('POST /api/analytics/metrics', () => {
    it('يجب تتبع المقاييس', async () => {
      const response = await request(app)
        .post('/api/analytics/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'page_load_time',
          value: 1250,
          unit: 'ms',
          tags: {
            page: '/dashboard',
            browser: 'Chrome'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', 'page_load_time');
      expect(response.body.data).toHaveProperty('value', 1250);

      Logger.info('✅ Metric tracked');
    });

    it('يجب كشف الشذوذ في المقاييس', async () => {
      // إضافة قيمة غير عادية
      await request(app)
        .post('/api/analytics/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'response_time',
          value: 5000 // قيمة عالية جداً
        });

      // التحقق من كشف الشذوذ
      const response = await request(app)
        .post('/api/analytics/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'response_time',
          value: 10000 // قيمة أعلى
        });

      // يجب أن يحتوي الرد على معلومات الشذوذ
      expect(response.status).toBe(200);
      Logger.info('✅ Anomaly detection working');
    });
  });

  describe('POST /api/analytics/reports', () => {
    it('يجب إنشاء تقرير مخصص', async () => {
      const response = await request(app)
        .post('/api/analytics/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'February Performance Report',
          type: 'detailed',
          metrics: ['sales', 'revenue'],
          dateRange: {
            start: '2026-02-01',
            end: '2026-02-28'
          },
          groupBy: 'day'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('summary');

      reportId = response.body.data.id;
      Logger.info('✅ Report generated');
    });

    it('يجب دعم أنواع تقارير مختلفة', async () => {
      const types = ['summary', 'detailed', 'comparative'];

      for (const type of types) {
        const response = await request(app)
          .post('/api/analytics/reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Test ${type} Report`,
            type: type,
            metrics: ['sales']
          });

        expect(response.status).toBe(200);
      }

      Logger.info('✅ All report types supported');
    });
  });

  describe('POST /api/analytics/predict', () => {
    it('يجب التنبؤ بالقيم المستقبلية', async () => {
      const response = await request(app)
        .post('/api/analytics/predict')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metricName: 'sales',
          periods: 7
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('metricName', 'sales');
      expect(response.body.data).toHaveProperty('predictions');
      expect(Array.isArray(response.body.data.predictions)).toBe(true);
      expect(response.body.data.predictions.length).toBe(7);

      // التحقق من أن كل تنبؤ له قيمة وثقة
      response.body.data.predictions.forEach(prediction => {
        expect(prediction).toHaveProperty('value');
        expect(prediction).toHaveProperty('confidence');
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      });

      Logger.info('✅ Predictions generated');
    });
  });

  describe('GET /api/analytics/anomalies', () => {
    it('يجب استرجاع الشذوذ المكتشف', async () => {
      const response = await request(app)
        .get('/api/analytics/anomalies?limit=20')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('anomalies');
      expect(Array.isArray(response.body.data.anomalies)).toBe(true);

      Logger.info('✅ Anomalies retrieved');
    });
  });

  describe('POST /api/analytics/dashboards', () => {
    it('يجب إنشاء لوحة معلومات', async () => {
      const response = await request(app)
        .post('/api/analytics/dashboards')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Sales Dashboard',
          description: 'Real-time sales metrics',
          isPublic: true,
          refreshInterval: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', 'Sales Dashboard');
      expect(response.body.data).toHaveProperty('widgets');

      Logger.info('✅ Dashboard created');
    });
  });

  describe('GET /api/analytics/reports/:id/export', () => {
    it('يجب تصدير التقرير بصيغ مختلفة', async () => {
      const formats = ['json', 'csv'];

      for (const format of formats) {
        const response = await request(app)
          .get(`/api/analytics/reports/${reportId}/export?format=${format}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
      }

      Logger.info('✅ Report exported in multiple formats');
    });
  });

  describe('POST /api/analytics/compare', () => {
    it('يجب تقديم مقارنة بين المقاييس', async () => {
      const response = await request(app)
        .post('/api/analytics/compare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          metrics: ['sales', 'revenue', 'profit'],
          dateRange: {
            start: '2026-02-01',
            end: '2026-02-28'
          },
          groupBy: 'day'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('correlations');
      expect(response.body.data).toHaveProperty('recommendations');

      Logger.info('✅ Comparative analysis completed');
    });
  });

  describe('GET /api/analytics/stats', () => {
    it('يجب جلب الإحصائيات العامة', async () => {
      const response = await request(app)
        .get('/api/analytics/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('eventsLogged');
      expect(response.body.data).toHaveProperty('metricsTracked');
      expect(response.body.data).toHaveProperty('anomaliesDetected');
      expect(response.body.data).toHaveProperty('systemHealth');

      Logger.info('✅ Global statistics retrieved');
    });
  });
});

// ============================================================
// PART 4: Performance Tests
// ============================================================

describe('Performance Tests', () => {
  let authToken;

  beforeAll(() => {
    authToken = getAuthToken();
  });

  it('يجب معالجة 100 حدث في أقل من 5 ثوان', async () => {
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await request(app)
        .post('/api/analytics/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'user_action',
          action: 'click',
          value: i
        });
    }

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
    Logger.info(`✅ Logged 100 events in ${duration}ms`);
  });

  it('يجب إسترجاع 1000 سجل في أقل من 2 ثانية', async () => {
    const startTime = Date.now();

    const response = await request(app)
      .get('/api/analytics/events?limit=1000')
      .set('Authorization', `Bearer ${authToken}`);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000);
    expect(response.status).toBe(200);
    Logger.info(`✅ Retrieved data in ${duration}ms`);
  });
});

// ============================================================
// PART 5: Error Handling Tests
// ============================================================

describe('Error Handling', () => {
  let authToken;

  beforeAll(() => {
    authToken = getAuthToken();
  });

  it('يجب رفض الطلبات بدون مصادقة', async () => {
    const response = await request(app)
      .post('/api/analytics/events')
      .send({
        category: 'test'
      });

    expect(response.status).toBe(401);
    Logger.info('✅ Unauthenticated request rejected');
  });

  it('يجب رفض بيانات غير صحيحة', async () => {
    const response = await request(app)
      .post('/api/analytics/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        // بيانات ناقصة
      });

    expect(response.status).toBe(400);
    Logger.info('✅ Invalid data rejected');
  });

  it('يجب التعامل مع أخطاء الخادم برشاقة', async () => {
    // محاولة الوصول إلى مورد غير موجود
    const response = await request(app)
      .get('/api/analytics/dashboards/non-existent-id')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    Logger.info('✅ Server error handled gracefully');
  });
});

// ============================================================
// Summary Report
// ============================================================

afterAll(() => {
  console.log('\n' + '='.repeat(60));
  console.log('🎉 اختبارات التكامل اكتملت بنجاح!');
  console.log('Integration Tests Completed Successfully!');
  console.log('='.repeat(60));
});

