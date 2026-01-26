const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Lightweight mocks to bypass authentication and service calls
jest.mock('../../middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user-1', role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => {
    req.user = { id: 'user-1', role: 'admin' };
    next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) => {
      req.user = { id: 'user-1', role: 'admin' };
      next();
    },
  authorizeRole:
    (...roles) =>
    (req, res, next) => {
      req.user = { id: 'user-1', role: 'admin' };
      next();
    },
}));

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { _id: 'user-1', role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => {
    req.user = { _id: 'user-1', role: 'admin' };
    next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) => {
      req.user = { _id: 'user-1', role: 'admin' };
      next();
    },
  authorizeRole:
    (...roles) =>
    (req, res, next) => {
      req.user = { _id: 'user-1', role: 'admin' };
      next();
    },
}));

jest.mock('../../services/messaging.service', () => ({
  sendMessage: jest.fn(async () => ({ success: true })),
  getConversationMessages: jest.fn(async () => ({ success: true, messages: [] })),
  markAllAsRead: jest.fn(async () => ({ success: true })),
  deleteMessage: jest.fn(async () => ({ success: true })),
  searchMessages: jest.fn(async () => ({ success: true, results: [] })),
  getMessagingStats: jest.fn(async () => ({ success: true, stats: {} })),
  getUserConversations: jest.fn(async () => ({ success: true, conversations: [] })),
  createPrivateConversation: jest.fn(async () => ({ success: true, conversationId: 'c1' })),
  createGroupConversation: jest.fn(async () => ({ success: true, conversationId: 'g1' })),
  getConversationDetails: jest.fn(async () => ({ success: true, conversation: {} })),
  addParticipant: jest.fn(async () => ({ success: true })),
  removeParticipant: jest.fn(async () => ({ success: true })),
}));

jest.mock('../../services/smsService', () => ({
  sendSMS: jest.fn(async () => ({ success: true })),
  sendSMSWithTemplate: jest.fn(async () => ({ success: true })),
  sendBulkSMS: jest.fn(async () => [{ success: true }]),
  checkSMSBalance: jest.fn(async () => ({ balance: 100 })),
  smsTemplates: {},
}));

jest.mock(
  '../services/transport.services',
  () => ({
    BusService: {
      createBus: async body => ({ id: 'bus-1', ...body }),
      getAllBuses: async () => [{ id: 'bus-1' }],
      getBusById: async () => ({ id: 'bus-1' }),
      updateBus: async () => ({ id: 'bus-1', updated: true }),
      deleteBus: async () => true,
      updateBusLocation: async () => ({ id: 'bus-1', location: { lat: 0, lng: 0 } }),
    },
    DriverService: {
      createDriver: async body => ({ id: 'drv-1', ...body }),
      getAllDrivers: async () => [{ id: 'drv-1' }],
      getDriverById: async () => ({ id: 'drv-1' }),
      updateDriver: async () => ({ id: 'drv-1', updated: true }),
      deleteDriver: async () => true,
      verifyLicenseValidity: async () => ({ valid: true }),
    },
    RouteService: {
      createRoute: async body => ({ id: 'r1', ...body }),
    },
    StudentTransportService: {
      assignStudentToRoute: async () => ({ success: true }),
    },
    AttendanceService: {
      recordAttendance: async () => ({ success: true }),
    },
    PaymentService: {
      processPayment: async () => ({ success: true }),
    },
    ComplaintService: {
      createComplaint: async () => ({ success: true }),
    },
    NotificationService: {
      sendNotification: async () => ({ success: true }),
    },
  }),
  { virtual: true }
);

jest.mock('../../models/Notification.memory', () => ({
  Notification: {
    findByUserId: () => [],
    getUnreadCount: () => 0,
    markAsRead: () => ({ id: 'n1', read: true }),
    create: data => ({ id: 'n1', ...data }),
  },
  EmailService: {},
  SMSService: {
    sendBulkSMS: async () => 'sent',
    sendOTP: async () => 'otp',
  },
  PushNotificationService: {
    sendPushNotification: async () => ({ id: 'push-1' }),
    sendToMultiple: async () => [{ id: 'push-1' }],
  },
  NotificationPreferences: {},
}));

jest.mock('../../services/smartNotificationService', () => {
  return jest
    .fn()
    .mockImplementation(() => ({ sendSmartNotification: async () => ({ ok: true }) }));
});

jest.mock('../../services/advancedMessagingAlertSystem', () => {
  return jest.fn().mockImplementation(() => ({ sendAlert: async () => ({ ok: true }) }));
});

jest.mock('../../routes/hr.routes', () => require('express').Router());
jest.mock('../../routes/hrops.routes', () => require('express').Router());
jest.mock('../../routes/hr-advanced.routes', () => require('express').Router());
jest.mock('../../routes/performanceRoutes', () => require('express').Router());

// Prevent start.js from pulling the real users routes during smoke import
jest.mock('../routes/users.routes', () => require('express').Router());

const buildApp = router => {
  const app = express();
  app.use(express.json());
  app.use(router);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  });
  return app;
};

describe('AI routes smoke', () => {
  const app = buildApp(require('../routes/ai.routes'));

  test('predict attendance', async () => {
    const res = await request(app)
      .post('/ai/predict/attendance')
      .send({ employeeData: { id: 1 }, historyData: [{ date: '2025-01-01', present: true }] });
    expect(res.status).toBe(200);
  });

  test('predict performance', async () => {
    const res = await request(app)
      .post('/ai/predict/performance')
      .send({ employeeId: 'emp-1', metrics: { score: 80 } });
    expect(res.status).toBe(200);
  });

  test('detect anomalies', async () => {
    const res = await request(app)
      .post('/ai/detect/anomalies')
      .send({ data: [1, 2, 3], type: 'general' });
    expect(res.status).toBe(200);
  });

  test('smart recommendations', async () => {
    const res = await request(app)
      .post('/ai/recommendations')
      .send({ userId: 'user-1', userProfile: { role: 'manager' }, contextData: { module: 'hr' } });
    expect(res.status).toBe(200);
  });

  test('analyze trends', async () => {
    const res = await request(app)
      .post('/ai/analyze/trends')
      .send({ data: [{ date: '2025-01-01', value: 1 }], timeField: 'date' });
    expect(res.status).toBe(200);
  });

  test('list models', async () => {
    const res = await request(app).get('/ai/models');
    expect(res.status).toBe(200);
  });

  test('missing model returns 404', async () => {
    const res = await request(app).get('/ai/models/missing/info');
    expect(res.status).toBe(404);
  });
});

describe('Project routes smoke', () => {
  const app = buildApp(require('../routes/project.routes'));
  let projectId;
  let phaseId;

  beforeAll(async () => {
    const created = await request(app)
      .post('/projects')
      .send({ name: 'Smoke Project', startDate: '2025-01-01', endDate: '2025-02-01' });
    projectId = created.body.id;
  });

  test('add phase', async () => {
    const res = await request(app)
      .post(`/projects/${projectId}/phases`)
      .send({ name: 'Phase 1', startDate: '2025-01-02', endDate: '2025-01-10', owner: 'owner' });
    expect(res.status).toBe(201);
    phaseId = res.body.phase?.id;
  });

  test('add task', async () => {
    const res = await request(app)
      .post(`/projects/${projectId}/tasks`)
      .send({ phaseId, name: 'Task 1', startDate: '2025-01-03', dueDate: '2025-01-05' });
    expect(res.status).toBe(201);
  });

  test('allocate resource', async () => {
    const res = await request(app)
      .post(`/projects/${projectId}/resources`)
      .send({ name: 'Designer', allocation: 25 });
    expect(res.status).toBe(201);
  });

  test('report and progress', async () => {
    const progress = await request(app).get(`/projects/${projectId}/progress`);
    expect(progress.status).toBe(200);
    const report = await request(app).get(`/projects/${projectId}/report`);
    expect(report.status).toBe(200);
  });

  test('close project', async () => {
    const res = await request(app).post(`/projects/${projectId}/close`).send({ notes: 'done' });
    expect(res.status).toBe(200);
  });
});

describe('Integration routes smoke', () => {
  const app = buildApp(require('../routes/integration.routes'));

  test('configure slack', async () => {
    const res = await request(app)
      .post('/integrations/slack/configure')
      .send({ webhookUrl: 'http://example.com', channels: ['general'] });
    expect(res.status).toBe(200);
  });

  test('register webhook and trigger', async () => {
    const created = await request(app)
      .post('/webhooks/register')
      .send({ event: 'user.created', url: 'http://example.com/hook' });
    expect(created.status).toBe(201);
    const webhookId = created.body.id;
    const trigger = await request(app)
      .post(`/webhooks/${webhookId}/trigger`)
      .send({ data: { ok: true } });
    expect(trigger.status === 200 || trigger.status === 404).toBe(true);
  });

  test('integration status', async () => {
    const res = await request(app).get('/integrations/status');
    expect(res.status).toBe(200);
  });
});

describe('Reporting routes smoke', () => {
  const app = buildApp(require('../routes/reporting.routes'));
  let reportId;

  test('create report', async () => {
    const res = await request(app)
      .post('/reports')
      .send({ template: { name: 't1' }, data: [{ value: 1 }] });
    expect(res.status).toBe(201);
    reportId = res.body.reportId;
  });

  test('get report', async () => {
    const res = await request(app).get(`/reports/${reportId}`);
    expect(res.status === 200 || res.status === 404).toBe(true);
  });
});

describe('Utility coverage smokes', () => {
  test('in-memory db basic operations', async () => {
    const db = require('../../config/in-memory-db');
    const created = await db.create('tests', { name: 'x' });
    const found = await db.findById('tests', created._id);
    expect(found?.name).toBe('x');
  });

  test('start wrapper loads server', () => {
    jest.isolateModules(() => {
      expect(() => require('../../start')).not.toThrow();
    });
  });
});

describe('Search routes smoke', () => {
  const app = buildApp(require('../routes/search.routes'));
  const sampleData = [
    { id: 1, name: 'alpha', category: 'x' },
    { id: 2, name: 'beta', category: 'y' },
  ];

  test('advanced search', async () => {
    const res = await request(app)
      .post('/search')
      .send({ data: sampleData, query: { field: 'name', value: 'alpha' } });
    expect(res.status).toBe(200);
  });

  test('filters and facets', async () => {
    const filters = [{ field: 'category', operator: 'eq', value: 'x' }];
    const filterRes = await request(app)
      .post('/search/filters')
      .send({ data: sampleData, filters });
    expect(filterRes.status).toBe(200);

    const facetRes = await request(app).get('/search/facets/name').send({ data: sampleData });
    expect(facetRes.status).toBe(200);
  });

  test('autocomplete and stats', async () => {
    const autoRes = await request(app)
      .post('/search/autocomplete')
      .send({ data: sampleData, query: 'a', field: 'name' });
    expect(autoRes.status).toBe(200);

    const statsRes = await request(app).get('/search/stats');
    expect(statsRes.status).toBe(200);
  });

  test('compound and export', async () => {
    const compoundRes = await request(app)
      .post('/search/compound')
      .send({ data: sampleData, searchCriteria: [{ field: 'category', value: 'x' }] });
    expect(compoundRes.status).toBe(200);

    const exportRes = await request(app)
      .post('/search/export')
      .send({ results: sampleData, format: 'json' });
    expect(exportRes.status).toBe(200);
  });
});

describe('Setup routes registration smoke', () => {
  test('registers routes without crashing', () => {
    const app = express();
    const setupRoutes = require('../routes/setupRoutes');
    expect(() => setupRoutes(app)).not.toThrow();
  });
});

describe('Transport routes smoke', () => {
  const router = require('../routes/transport.routes');
  const app = buildApp(router);
  const token = jwt.sign(
    { id: 'user-1', role: 'admin' },
    process.env.JWT_SECRET || 'your-secret-key'
  );
  const authHeader = { Authorization: `Bearer ${token}` };

  test('list buses', async () => {
    const res = await request(app).get('/buses').set(authHeader);
    expect(res.status).toBe(200);
  });

  test('create bus', async () => {
    const res = await request(app).post('/buses').set(authHeader).send({ name: 'Test Bus' });
    expect(res.status).toBe(201);
  });
});

describe('Messaging routes smoke', () => {
  const router = require('../../routes/messaging.routes');
  const app = buildApp(router);
  const token = jwt.sign(
    { id: 'user-1', role: 'admin' },
    process.env.JWT_SECRET || 'your-secret-key'
  );

  test('send message', async () => {
    const res = await request(app)
      .post('/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ conversationId: 'c1', content: 'hello' });
    expect(res.status).toBe(200);
  });
});

describe('SMS routes smoke', () => {
  const router = require('../../routes/smsRoutes');
  const app = buildApp(router);
  const token = jwt.sign(
    { id: 'user-1', role: 'admin' },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
  );

  test('send SMS notification', async () => {
    const res = await request(app)
      .post('/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ toNumber: '+100000000', message: 'hi' });
    expect(res.status).toBe(200);
  });
});

describe('Notifications routes smoke', () => {
  const router = require('../../routes/notifications.routes');
  const app = buildApp(router);
  const token = jwt.sign(
    { _id: 'user-1', role: 'admin' },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
  );

  test('list notifications', async () => {
    const res = await request(app).get('/').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
