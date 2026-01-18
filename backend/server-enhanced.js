/**
 * ملف البدء السريع للخادم الخلفي المحسّن
 * Backend Enhanced Server Startup
 *
 * يشمل:
 * - WebSocket server للإشعارات الفعلية
 * - تلك نقاط النهاية للتقارير الذكية
 * - نظام إدارة الإشعارات
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const NotificationServer = require('./services/notificationServer');
const reportsRoutes = require('./routes/reportsRoutes');
const logger = require('./utils/logger');

// إعدادات
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// إنشاء تطبيق Express
const app = express();

// Middleware
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'http://192.168.1.100:3000',
      'http://192.168.1.100:3001',
    ],
    credentials: true,
  }),
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    services: {
      api: 'running',
      websocket: 'initializing',
    },
  });
});

// API Routes
app.use('/api/reports', reportsRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

/**
 * دالة البدء
 * Startup function
 */
async function startServers() {
  try {
    // بدء خادم API
    const apiServer = app.listen(PORT, () => {
      logger.info(`[API] Server listening on port ${PORT}`);
    });

    // بدء خادم WebSocket
    const notificationServer = new NotificationServer(WS_PORT);
    await notificationServer.start();

    // معالجات الإيقاف
    const gracefulShutdown = async () => {
      logger.info('Shutting down servers...');

      await new Promise(resolve => {
        apiServer.close(() => {
          logger.info('[API] Server closed');
          resolve();
        });
      });

      await notificationServer.stop();
      process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    logger.info(`
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║     ✅ الخادم المحسّن بدأ بنجاح!                          ║
    ║     ✅ Enhanced Backend Server Started!                   ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝

    🌐 API Server:         http://localhost:${PORT}
    📡 WebSocket Server:   ws://localhost:${WS_PORT}
    🔧 Environment:        ${NODE_ENV}
    🕐 Started at:         ${new Date().toISOString()}

    📌 نقاط النهاية المتاحة | Available Endpoints:
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    📊 التقارير | Reports:
      POST /api/reports/comprehensive
      POST /api/reports/performance
      POST /api/reports/trends
      POST /api/reports/comparative
      POST /api/reports/:type/detailed
      POST /api/reports/recommendations
      POST /api/reports/executive-summary
      POST /api/reports/kpis
      POST /api/reports/swot
      POST /api/reports/forecasts
      POST /api/reports/anomalies
      POST /api/reports/save
      GET  /api/reports/saved
      POST /api/reports/send-email
      POST /api/reports/analyze

    🔌 WebSocket:
      ws://localhost:${WS_PORT}/notifications

    🏥 صحة الخادم | Server Health:
      GET  /health

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  } catch (error) {
    logger.error('Fatal error starting servers:', error);
    process.exit(1);
  }
}

// بدء الخوادم
if (require.main === module) {
  startServers();
}

module.exports = { app, startServers };
