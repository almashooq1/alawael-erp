/**
 * اختبارات خادم التقارير والإشعارات
 * Backend Reports and Notifications Tests
 */

const supertest = require('supertest');
const { app } = require('../server-enhanced');
const NotificationServer = require('../services/notificationServer');
const WebSocket = require('ws');

// Use the Express app from the enhanced server for all HTTP tests
const request = supertest(app);

describe('Backend Advanced Features Tests', () => {
  let server;
  let notificationServer;
  let wsPort;

  beforeAll(async () => {
    // Initialize notification server
    notificationServer = new NotificationServer(0); // let OS choose a free port to avoid EADDRINUSE
    await notificationServer.start();
    wsPort = notificationServer.port;
  });

  afterAll(async () => {
    if (notificationServer) {
      await notificationServer.stop();
    }
  });

  // ============================================
  // اختبارات نقاط نهاية التقارير
  // Reports Endpoints Tests
  // ============================================

  describe('Reports API Endpoints', () => {
    test('POST /api/reports/comprehensive - should return comprehensive report', async () => {
      const response = await request.post('/api/reports/comprehensive').send({ filters: {} }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('comprehensive');
      expect(response.body.data.data).toBeDefined();
    });

    test('POST /api/reports/performance - should return performance analysis', async () => {
      const response = await request.post('/api/reports/performance').send({ period: 'monthly' }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('performance');
      expect(response.body.data.metrics).toBeDefined();
    });

    test('POST /api/reports/trends - should return trend analysis', async () => {
      const response = await request.post('/api/reports/trends').send({ metric: 'sessions', days: 30 }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('trends');
      expect(response.body.data.data).toBeDefined();
    });

    test('POST /api/reports/comparative - should return comparative report', async () => {
      const response = await request
        .post('/api/reports/comparative')
        .send({ periods: ['Jan', 'Feb', 'Mar'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comparison).toBeDefined();
    });

    test('POST /api/reports/performance/detailed - should return detailed report', async () => {
      const response = await request.post('/api/reports/performance/detailed').send({ filters: {} }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sections).toBeDefined();
    });

    test('POST /api/reports/recommendations - should return recommendations', async () => {
      const response = await request.post('/api/reports/recommendations').send({}).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations).toBeDefined();
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    test('POST /api/reports/executive-summary - should return executive summary', async () => {
      const response = await request.post('/api/reports/executive-summary').send({}).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.keyMetrics).toBeDefined();
    });

    test('POST /api/reports/kpis - should return KPIs', async () => {
      const response = await request.post('/api/reports/kpis').send({}).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.kpis).toBeDefined();
      expect(Array.isArray(response.body.data.kpis)).toBe(true);
    });

    test('POST /api/reports/swot - should return SWOT analysis', async () => {
      const response = await request.post('/api/reports/swot').send({}).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.strengths).toBeDefined();
      expect(response.body.data.weaknesses).toBeDefined();
      expect(response.body.data.opportunities).toBeDefined();
      expect(response.body.data.threats).toBeDefined();
    });

    test('POST /api/reports/forecasts - should return forecasts', async () => {
      const response = await request.post('/api/reports/forecasts').send({ metric: 'revenue', days: 90 }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.forecast).toBeDefined();
    });

    test('POST /api/reports/anomalies - should detect anomalies', async () => {
      const response = await request.post('/api/reports/anomalies').send({}).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.anomalies).toBeDefined();
    });

    test('POST /api/reports/save - should save report', async () => {
      const response = await request
        .post('/api/reports/save')
        .send({
          name: 'Test Report',
          type: 'comprehensive',
          filters: {},
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    test('GET /api/reports/saved - should retrieve saved reports', async () => {
      const response = await request.get('/api/reports/saved').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/reports/send-email - should send report via email', async () => {
      const response = await request
        .post('/api/reports/send-email')
        .send({
          reportId: 'test_1',
          recipients: ['test@example.com'],
          format: 'pdf',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('queued');
    });

    test('POST /api/reports/analyze - should analyze data', async () => {
      const response = await request
        .post('/api/reports/analyze')
        .send({
          data: [1, 2, 3, 4, 5],
          analysisType: 'descriptive',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
    });
  });

  // ============================================
  // اختبارات WebSocket
  // WebSocket Tests
  // ============================================

  describe('WebSocket Notifications', () => {
    const createClient = () =>
      new Promise((resolve, reject) => {
        const messageQueue = [];
        const socket = new WebSocket(`ws://localhost:${wsPort}`);
        const timer = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        socket.on('message', data => {
          messageQueue.push(JSON.parse(data));
        });

        socket.once('open', () => {
          clearTimeout(timer);
          resolve({ socket, messageQueue });
        });

        socket.once('error', err => {
          clearTimeout(timer);
          reject(err);
        });
      });

    const waitForMessage = ({ socket, messageQueue }, predicate, timeout = 5000) =>
      new Promise((resolve, reject) => {
        // Check any queued messages first (e.g., welcome message sent before listeners attach)
        const queued = messageQueue.find(msg => (!predicate ? true : predicate(msg)));
        if (queued) {
          return resolve(queued);
        }

        const timer = setTimeout(() => {
          socket.removeListener('message', handler);
          reject(new Error('Timed out waiting for message'));
        }, timeout);

        const handler = data => {
          const raw = typeof data === 'string' ? data : data.toString();
          const message = JSON.parse(raw);
          if (!predicate || predicate(message)) {
            clearTimeout(timer);
            socket.removeListener('message', handler);
            resolve(message);
          }
        };

        socket.on('message', handler);
      });

    test('should connect to WebSocket server', async () => {
      const { socket } = await createClient();
      expect(socket.readyState).toBe(WebSocket.OPEN);
      socket.close();
    });

    test('should receive connection confirmation', async () => {
      const client = await createClient();
      const message = await waitForMessage(client, msg => msg.type === 'connected');
      expect(message.type).toBe('connected');
      expect(message.clientId).toBeDefined();
      client.socket.close();
    });

    test('should respond to ping with pong', async () => {
      const client = await createClient();
      await waitForMessage(client, msg => msg.type === 'connected');

      client.socket.send(JSON.stringify({ type: 'ping' }));
      const response = await waitForMessage(client, msg => msg.type === 'pong');
      expect(response.type).toBe('pong');
      client.socket.close();
    });

    test('should handle subscription', async () => {
      const client = await createClient();
      await waitForMessage(client, msg => msg.type === 'connected');

      client.socket.send(
        JSON.stringify({
          type: 'subscribe',
          channel: 'reports',
        }),
      );

      // Server does not echo subscription, just ensure the socket stays open
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(client.socket.readyState).toBe(WebSocket.OPEN);
      client.socket.close();
    });

    test('should broadcast notification', async () => {
      const client = await createClient();
      await waitForMessage(client, msg => msg.type === 'connected');

      const notificationPromise = waitForMessage(client, msg => msg.type === 'notification');
      notificationServer.broadcast({
        title: 'Test Notification',
        message: 'This is a test',
      });

      const message = await notificationPromise;
      expect(message.timestamp).toBeDefined();
      client.socket.close();
    });
  });

  // ============================================
  // اختبارات Health Check
  // Health Check Tests
  // ============================================

  describe('Server Health', () => {
    test('GET /health - should return server status', async () => {
      const response = await request.get('/health').expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.services).toBeDefined();
    });

    test('WebSocket server should be operational', () => {
      expect(notificationServer).toBeDefined();
      const stats = notificationServer.getStats();
      expect(stats.queuedNotifications).toBeDefined();
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });

  // ============================================
  // اختبارات معالجة الأخطاء
  // Error Handling Tests
  // ============================================

  describe('Error Handling', () => {
    test('should handle invalid request gracefully', async () => {
      const response = await request.post('/api/reports/invalid').send({}).expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should handle missing parameters', async () => {
      const response = await request.post('/api/reports/comprehensive').send({}).expect(200); // Returns default data

      expect(response.body.success).toBe(true);
    });
  });
});
