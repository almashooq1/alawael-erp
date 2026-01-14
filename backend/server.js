require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const http = require('http');
const socketIO = require('socket.io');

// Force predictable behaviour in tests (no real DB/socket side effects)
const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
if (isTestEnv) {
  process.env.USE_MOCK_DB = 'true';
  process.env.NODE_ENV = 'test';
}

// Database & Utils
const { connectDB } = require('./config/database');
const { seedDatabase } = require('./db/seeders/initialData');
const { errorHandler } = require('./utils/errorHandler');

// Security middleware
const securityHeaders = require('./middleware/securityHeaders');
const sanitizeInput = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { suspiciousActivityDetector } = require('./utils/security');
const responseHandler = require('./middleware/responseHandler');

// API Routes
const authRoutes = require('./api/routes/auth.routes');
const usersRoutes = require('./api/routes/users.routes');
const modulesRoutes = require('./api/routes/modules.routes');
const crmRoutes = require('./api/routes/crm.routes');
const hrRoutes = require('./routes/hr.routes');
const hropsRoutes = require('./routes/hrops.routes');
const hrAdvancedRoutes = require('./routes/hr-advanced.routes');
const reportsRoutes = require('./routes/reports.routes');
const financeRoutes = require('./routes/finance.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const aiRoutes = require('./routes/ai.routes');
const predictionsRoutes = require('./routes/predictions.routes');
const documentRoutesOld = require('./routes/documentRoutes');
const documentsManagementRoutes = require('./api/routes/documents.routes');
const messagingRoutes = require('./routes/messaging.routes');
const rehabilitationRoutes = require('./routes/rehabilitation.routes');
const workflowRoutes = require('./api/routes/workflows.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server (wrap Express app for Socket.IO)
const server = http.createServer(app);

// Initialize Socket.IO unless we are running tests
const io = isTestEnv
  ? null
  : socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

const activeSubscriptions = new Map();

if (!isTestEnv && io) {
  // Phase 3: Initialize Socket Manager for messaging
  const socketManager = require('./config/socket.config');
  socketManager.initialize(server);

  io.on('connection', socket => {
    // Module KPI subscription
    socket.on('module:subscribe', ({ moduleKey }) => {
      socket.join(`module:${moduleKey}`);
      activeSubscriptions.set(socket.id, { type: 'module', moduleKey });
      const moduleKPIs = getModuleKPIs(moduleKey);
      socket.emit(`kpi:update:${moduleKey}`, moduleKPIs);
    });

    // Module KPI unsubscription
    socket.on('module:unsubscribe', ({ moduleKey }) => {
      socket.leave(`module:${moduleKey}`);
      activeSubscriptions.delete(socket.id);
    });

    // Dashboard subscription
    socket.on('dashboard:subscribe', () => {
      socket.join('dashboard');
      const dashboardData = {
        summaryCards: getSummarySystems(),
        topKPIs: getTopKPIs(4),
        timestamp: new Date().toISOString(),
      };
      socket.emit('dashboard:update', dashboardData);
    });

    // Notification subscription
    socket.on('notification:subscribe', () => {
      socket.join('notifications');
      socket.emit('notification:update', { unreadCount: 0, notifications: [] });
    });

    // Real-time notification broadcast
    socket.on('notification:send', data => {
      io.to('notifications').emit('notification:new', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // Periodic KPI updates to the subscribed module
    const kpiUpdateInterval = setInterval(() => {
      if (!socket.connected) {
        clearInterval(kpiUpdateInterval);
        return;
      }
      if (activeSubscriptions.has(socket.id) && activeSubscriptions.get(socket.id).type === 'module') {
        const { moduleKey } = activeSubscriptions.get(socket.id);
        const moduleKPIs = getModuleKPIs(moduleKey);
        socket.emit(`kpi:update:${moduleKey}`, moduleKPIs);
      }
    }, 15000);

    // Dashboard real-time updates
    const dashboardUpdateInterval = setInterval(() => {
      if (!socket.connected) {
        clearInterval(dashboardUpdateInterval);
        return;
      }
      const dashboardData = {
        summaryCards: getSummarySystems(),
        topKPIs: getTopKPIs(4),
        timestamp: new Date().toISOString(),
      };
      socket.emit('dashboard:update', dashboardData);
    }, 30000);

    socket.on('disconnect', () => {
      activeSubscriptions.delete(socket.id);
    });

    socket.on('error', error => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Emit KPI updates every 5 seconds to subscribed clients
  setInterval(() => {
    const modules = ['reports', 'finance', 'hr', 'security', 'elearning', 'rehab'];
    modules.forEach(moduleKey => {
      io.to(`module:${moduleKey}`).emit(`kpi:update:${moduleKey}`, getModuleKPIs(moduleKey));
    });
  }, 5000);

  // Emit dashboard updates every 10 seconds
  setInterval(() => {
    const dashboardData = {
      summaryCards: getSummarySystems(),
      topKPIs: getTopKPIs(4),
      timestamp: new Date().toISOString(),
    };
    io.to('dashboard').emit('dashboard:update', dashboardData);
  }, 10000);
}

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware (MUST be first)
app.use(securityHeaders);
app.use(suspiciousActivityDetector);
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Response helper middleware
app.use(responseHandler);

// Request logging
app.use(morgan('dev'));

// Rate limiting for all API routes
app.use('/api', apiLimiter);

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AlAwael ERP API',
      version: '1.0.0',
      description: 'API documentation for AlAwael ERP',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ['./api/routes/*.js', '../api/routes/*.js', '../routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/employees', hrRoutes);
app.use('/api/hr', hropsRoutes);
if (isTestEnv) {
  app.use('/api/hr/employees', hrRoutes);
} else {
  app.use('/api/hr', hrAdvancedRoutes);
}
app.use('/api/reports', reportsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-predictions', predictionsRoutes);
app.use('/api/documents', documentsManagementRoutes);
app.use('/api/documents-old', documentRoutesOld);
app.use('/api/messages', messagingRoutes);
app.use('/api/rehabilitation', rehabilitationRoutes);
app.use('/api', workflowRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AlAwael ERP Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Info
app.get('/', (req, res) => {
  res.json({
    name: 'AlAwael ERP API',
    version: '1.0.0',
    description: 'Rehabilitation Center Management System',
    endpoints: { health: '/health', api: '/api', docs: '/api-docs' },
  });
});

// =====================================================
// HELPER FUNCTIONS FOR REAL-TIME DATA
// =====================================================
function getModuleKPIs(moduleKey) {
  try {
    const moduleData = require('./data/moduleMocks')[moduleKey];
    return moduleData ? moduleData.kpis || [] : [];
  } catch (err) {
    console.error(`Error getting KPIs for ${moduleKey}:`, err.message);
    return [];
  }
}

function getSummarySystems() {
  try {
    return [
      { title: 'Average Response Time', value: '245ms', trend: '+5%', status: 'normal', icon: 'clock' },
      { title: 'System Health', value: '98.5%', trend: '+0.2%', status: 'excellent', icon: 'heart' },
      { title: 'Active Users', value: '342', trend: '+12%', status: 'increasing', icon: 'users' },
      { title: 'Data Processed', value: '2.4GB', trend: '+8%', status: 'normal', icon: 'database' },
      { title: 'Error Rate', value: '0.2%', trend: '-0.1%', status: 'excellent', icon: 'alert' },
      { title: 'Success Rate', value: '99.8%', trend: '+0.1%', status: 'excellent', icon: 'check' },
    ];
  } catch (err) {
    console.error('Error getting summary systems:', err.message);
    return [];
  }
}

function getTopKPIs(limit = 4) {
  try {
    const moduleMocks = require('./data/moduleMocks');
    const allKPIs = [];

    Object.keys(moduleMocks).forEach(moduleKey => {
      const module = moduleMocks[moduleKey];
      if (module.kpis) {
        allKPIs.push(
          ...module.kpis.map(kpi => ({
            ...kpi,
            module: moduleKey,
          })),
        );
      }
    });

    return allKPIs.slice(0, limit);
  } catch (err) {
    console.error('Error getting top KPIs:', err.message);
    return [];
  }
}

// Error handling middleware (MUST be after all routes)
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Cannot ${req.method} ${req.url}`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
});

// Initialize database (skip heavy work during tests)
(async () => {
  try {
    await connectDB();
    if (process.env.USE_MOCK_DB === 'true') {
      console.log('ℹ️  Using in-memory database - seeding skipped');
    } else {
      try {
        await seedDatabase();
      } catch (err) {
        console.log('⚠️  Seeding skipped:', err.message);
      }
    }
  } catch (err) {
    console.log('⚠️  Database connection failed, continuing...');
  }
})();

// Export app for testing and modular use
module.exports = app;
module.exports.app = app;
module.exports.io = io;
module.exports.server = server;

// Start server only when run directly
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    const host = '0.0.0.0';
    const displayURL = `http://localhost:${PORT}`;
    console.log(`Server running at ${displayURL} (${host})`);
  });
}
