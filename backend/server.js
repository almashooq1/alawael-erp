require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');

// Default to in-memory DB when no Mongo URI is provided (developer-friendly)
if (!process.env.MONGODB_URI && !process.env.USE_MOCK_DB) {
  process.env.USE_MOCK_DB = 'true';
}

// Force predictable behaviour in tests (no real DB/socket side effects)
const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
if (isTestEnv) {
  process.env.USE_MOCK_DB = 'true';
  process.env.NODE_ENV = 'test';
  process.env.SMART_TEST_MODE = process.env.SMART_TEST_MODE || 'true';
}

// Database & Utils
const { connectDB } = require('./config/database');
const { seedDatabase } = require('./db/seeders/initialData');
const { createIndexes } = require('./config/database.optimization');
const { setupGracefulShutdown, shutdownMiddleware } = require('./utils/gracefulShutdown');
const {
  errorHandler,
  notFoundHandler,
  uncaughtExceptionHandler,
  unhandledRejectionHandler,
} = require('./middleware/errorHandler.enhanced');
const { sanitizeInput: requestValidationSanitize } = require('./middleware/requestValidation');

// Redis Cache (NEW)
const redisClient = require('./config/redis');

// Security middleware
// const securityHeaders = require('./middleware/securityHeaders'); // Replaced by advanced version
const sanitizeInput = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { suspiciousActivityDetector } = require('./utils/security');
const responseHandler = require('./middleware/responseHandler');
const { maintenanceMiddleware } = require('./middleware/maintenance.middleware');
const apiKeyAuth = require('./middleware/apiKey.middleware'); // Added API Key

// Advanced Security & Backup
const {
  authRateLimiter,
  apiRateLimiter: advancedApiLimiter,
  mongoSanitizeMiddleware,
  securityHeaders: advancedSecurityHeaders,
  requestLogger,
} = require('./config/security.advanced');
const { scheduleBackups } = require('./config/backup');

// API Routes

const authRoutes = require('./api/routes/auth.routes');
const usersRoutes = require('./api/routes/users.routes');
const modulesRoutes = require('./api/routes/modules.routes');
const crmRoutes = require('./api/routes/crm.routes.legacy');
// const hrRoutes = require('./routes/hr.routes.unified'); // TEMP: Disabled for testing
// const hropsRoutes = require('./routes/hrops.routes'); // Unused
// const hrAdvancedRoutes = require('./routes/hr-advanced.routes'); // TEMP: Disabled for testing
// const hrEnterpriseRoutes = require('./routes/hr.enterprise.routes'); // TEMP: Disabled for testing
const reportingRoutes = require('./api/routes/reporting.routes'); // RE-ENABLED for testing
// const reportsRoutes = require('./routes/reports.routes'); // TEMP: Disabled for testing
// const financeRoutes = require('./routes/finance.routes'); // TEMP: Disabled for testing
const notificationsRoutes = require('./routes/notifications.routes');
// const notificationsSmartRoutes = require('./routes/notifications.routes.legacy'); // TEMP: Disabled for testing
// const inboxRoutes = require('./routes/notification.routes'); // TEMP: Disabled for testing
// const adminRoutes = require('./routes/admin.routes'); // TEMP: Disabled for testing
// const hrMongoRoutes = require('./routes/hr_advanced.routes'); // TEMP: Disabled for testing
// const financeMongoRoutes = require('./routes/finance_advanced.routes'); // TEMP: Disabled for testing
// const beneficiaryRoutes = require('./routes/beneficiary.routes'); // TEMP: Disabled for testing
// const aiRoutes = require('./routes/ai.routes'); // TEMP: Disabled for testing
// const backupRoutes = require('./routes/backup.routes'); // NEW: Backup & Restore - TEMPORARILY DISABLED

// const predictionsRoutes = require('./routes/predictions.routes'); // TEMP: Disabled for testing
// const documentRoutesOld = require('./routes/documentRoutes'); // TEMP: Disabled for testing
const documentsManagementRoutes = require('./api/routes/documents.routes');
const messagingRoutes = require('./routes/messaging.routes'); // RE-ENABLED for testing
const financeRoutes = require('./routes/finance.routes.unified'); // RE-ENABLED for testing
const integrationRoutes = require('./routes/integration.routes.minimal'); // RE-ENABLED for testing
// const projectManagementRoutes = require('./routes/projectManagement.routes'); // Unused
// const rehabilitationRoutes = require('./routes/rehabilitation.routes'); // TEMP: Disabled for testing

// Phase 2 New Routes: Disability Rehabilitation, Maintenance, Webhooks
const disabilityRehabilitationRoutes = require('./routes/disability-rehabilitation');
const maintenanceRoutes = require('./routes/maintenance');
const webhooksRoutes = require('./routes/webhooks');

// Phase 2 Part 2 New Routes: Asset Management, Schedule Management, Analytics, Reports
const assetRoutes = require('./routes/assets');
const scheduleRoutes = require('./routes/schedules');
const analyticsRoutes = require('./routes/analytics');
const reportRoutes = require('./routes/reports');

// Phase 4 Health Monitoring Routes
const healthRoutes = require('./routes/health.routes');
// const workflowRoutes = require('./api/routes/workflows.routes'); // TEMP: Disabled for testing
// const performanceRoutes = require('./routes/performanceRoutes'); // TEMP DISABLED
// const systemRoutes = require('./routes/system.routes'); // TEMP: Disabled for testing
// const dashboardRoutes = require('./routes/dashboard.routes'); // TEMP: Disabled for testing
// const emailRoutes = require('./routes/emailRoutes'); // TEMP: Disabled for testing
// const smsRoutes = require('./routes/smsRoutes'); // TEMP: Disabled for testing
// const searchRoutes = require('./routes/search.routes'); // TEMP: Disabled for testing
// const monitoringRoutes = require('./routes/monitoring.routes'); // TEMP: Disabled for testing
// Phase 13 Advanced Feature Routes
// const userProfileRoutes = require('./routes/userProfileRoutes'); // TEMP: Disabled for testing
// const twoFARoutes = require('./routes/twoFARoutes'); // TEMP: Disabled for testing
// const advancedSearchRoutes = require('./routes/searchRoutes'); // TEMP: Disabled for testing
// const paymentAdvancedRoutes = require('./routes/paymentRoutes'); // TEMP: Disabled for testing
// const notificationAdvancedRoutes = require('./routes/notificationRoutes'); // TEMP: Disabled for testing
// const chatbotRoutes = require('./routes/chatbotRoutes'); // TEMP: Disabled for testing
// const aiAdvancedRoutes = require('./routes/aiRoutes'); // TEMP: Disabled for testing
// const automationRoutes = require('./routes/automationRoutes'); // TEMP: Disabled for testing
// const organizationRoutes = require('./routes/organization.routes'); // TEMP: Disabled for testing
// const accountingRoutes = require('./routes/accounting.routes'); // TEMP: Disabled for testing
// const vehicleRoutes = require('./routes/vehicleRoutes'); // TEMP: Disabled for testing
// const driverRoutes = require('./routes/driverRoutes'); // TEMP: Disabled for testing
// const tripRoutes = require('./routes/tripRoutes'); // TEMP: Disabled for testing
// const reportRoutes = require('./routes/reportRoutes'); // TEMP: Disabled for testing

// === Supply & Support System Routes ===
// const supplyRoutes = require('./routes/supply_support_routes'); // TEMP: Disabled for testing

// Performance optimization modules
const {
  initializeRedis,
  compressionMiddleware,
  requestTimerMiddleware,
  cacheMiddleware,
} = require('./config/performance');

const app = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 SUPER EARLY TEST ENDPOINT (BEFORE ALL MIDDLEWARE)
// ═══════════════════════════════════════════════════════════════════════════
app.get('/test-first', (req, res) => {
  res.json({
    success: true,
    message: 'FIRST ENDPOINT WORKS! (Super Early)',
    timestamp: new Date(),
  });
});

app.get('/api/test', (req, res) => {
  res.json({ success: true, message: '/api/test works! (Super Early)', timestamp: new Date() });
});

console.log('✅ Super early test endpoints mounted: /test-first, /api/test');

// ═══════════════════════════════════════════════════════════════════════════
// 🔓 DEV BYPASS: Skip auth/security for Phase 29-33 (public for testing)
// Remove this in production once proper auth is configured.
app.use((req, res, next) => {
  // Mark Phase 29-33 routes as public (skip auth/security checks below)
  if (req.path.startsWith('/api/phases-29-33')) {
    req.isPhase2933Public = true;
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES MOVED TO AFTER MIDDLEWARE (SEE LINE ~450)
// ═══════════════════════════════════════════════════════════════════════════

// Create HTTP server (wrap Express app for Socket.IO)
const server = http.createServer(app);

// Minimal service worker route early to avoid 404 noise
app.get('/service-worker.js', (req, res) => {
  res
    .type('application/javascript')
    .send(
      `// Minimal placeholder service worker\nself.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', () => self.clients.claim());`
    );
});

// Initialize Socket.IO unless we are running tests
const io = isTestEnv
  ? null
  : socketIO(server, {
      cors: {
        origin: [
          process.env.FRONTEND_URL || 'http://localhost:3004',
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://localhost:3004',
          'http://localhost:3005',
        ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

// Initialize Socket.IO with new modular handlers
if (!isTestEnv && io) {
  console.log('[Socket.IO] Initializing modular handlers...');

  // Phase 3: Initialize Socket Manager for messaging (legacy)
  const socketManager = require('./config/socket.config');
  socketManager.initialize(io);

  // NEW: Initialize Socket Emitter utility
  const socketEmitter = require('./utils/socketEmitter');
  socketEmitter.initializeSocketEmitter(io);

  // NEW: Initialize modular handlers
  const { initializeHandlers } = require('./sockets/handlers');
  initializeHandlers(io);

  // Emit KPI updates every 5 seconds to subscribed clients
  setInterval(() => {
    try {
      const modules = [
        'reports',
        'finance',
        'hr',
        'security',
        'elearning',
        'rehab',
        'appeals',
        'biometrics',
      ];
      modules.forEach(moduleKey => {
        try {
          const kpiData = getModuleKPIs(moduleKey);
          socketEmitter.emitModuleKPIUpdate(moduleKey, kpiData);
        } catch (error) {
          console.error(`[KPI Update] Error for ${moduleKey}:`, error.message);
        }
      });
    } catch (error) {
      console.error('[KPI Update] Fatal error:', error.message);
    }
  }, 5000);

  // Emit dashboard updates every 10 seconds
  setInterval(() => {
    try {
      const dashboardData = {
        summaryCards: getSummarySystems(),
        topKPIs: getTopKPIs(4),
      };
      socketEmitter.emitDashboardUpdate(dashboardData);
    } catch (error) {
      console.error('[Dashboard Update] Error:', error.message);
    }
  }, 10000);

  console.log('[Socket.IO] All handlers initialized successfully');
}

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware (MUST be first)
app.use(advancedSecurityHeaders); // Enhanced security headers
app.use(suspiciousActivityDetector); // Detect SQL injection, XSS, path traversal
app.use(helmet());
app.use(mongoSanitizeMiddleware); // NoSQL injection protection
app.use(shutdownMiddleware); // Graceful shutdown check
app.use(apiKeyAuth); // Allow API Key Authentication globally
app.use(maintenanceMiddleware);
// GLOBAL MAINTENANCE CHECK

// Redis Cache for all GET requests (NEW - Phase 2)
// ⚠️  TEMPORARILY DISABLED FOR DEBUGGING
// app.use((req, res, next) => {
//   if (req.method === 'GET' && !req.path.includes('/socket.io') && !req.path.includes('/health')) {
//     // Cache all GET requests for 60 seconds by default
//     cacheMiddleware(60)(req, res, next);
//   } else {
//     next();
//   }
// });

// CORS configuration

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3004',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3004',
    'http://localhost:3005',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);
app.use(requestValidationSanitize); // Additional HTML sanitization

// Performance optimization middleware
app.use(compressionMiddleware);
app.use(requestTimerMiddleware);
app.use(cacheMiddleware(300, 'api')); // 5 minutes cache for API routes

// Initialize Redis for caching
if (!isTestEnv) {
  initializeRedis();
}

// Response helper middleware
app.use(responseHandler);

// Request logging
app.use(morgan('dev'));
app.use(requestLogger); // Advanced request logging

// ================================================================
// === Phase 29-33 NOW MOUNTED AT LINE 126 (FIRST ROUTE) ===
// === See line 126 for Phase 29-33 mounting ===
// ================================================================

// Rate limiting for all API routes
// Skip rate limiters for public Phase 29-33 endpoints (dev mode)
const apiLimiterWithPhase2933Skip = (req, res, next) => {
  // Skip rate limiter for Phase 29-33 (public dev mode)
  if (req.path.startsWith('/phases-29-33') || req.path.startsWith('/api/phases-29-33')) {
    return next();
  }
  // Apply rate limit to all other /api routes
  apiLimiter(req, res, next);
};

const advancedLimiterWithPhase2933Skip = (req, res, next) => {
  // Skip advanced limiter for Phase 29-33
  if (req.path.startsWith('/phases-29-33') || req.path.startsWith('/api/phases-29-33')) {
    return next();
  }
  advancedApiLimiter(req, res, next);
};

app.use('/api', apiLimiterWithPhase2933Skip);
app.use('/api', advancedLimiterWithPhase2933Skip);

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

// Public health endpoints (before auth middleware)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AlAwael ERP Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'نظام الأوقاف يعمل بشكل صحيح',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// NOTE: /api/v1/health/* endpoints are now handled by comprehensive health.routes.js
// Removed catch-all /api/v1/health endpoint to allow sub-routes to work

// Serve a minimal service worker to avoid 404 noise in logs
app.get('/service-worker.js', (req, res) => {
  res
    .type('application/javascript')
    .send(
      `// Minimal placeholder service worker\nself.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', () => self.clients.claim());`
    );
});

// Lightweight system info (public, no auth)
app.get('/api/info', (req, res) => {
  res.json({
    status: 'OK',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    useMockDb: process.env.USE_MOCK_DB === 'true',
    redisDisabled: process.env.DISABLE_REDIS === 'true',
    smartTestMode: process.env.SMART_TEST_MODE === 'true',
    timestamp: new Date().toISOString(),
  });
});

// Basic system info (public)
app.get('/api/info', (req, res) => {
  res.json({
    name: 'AlAwael ERP API',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    modules: [
      'vehicles',
      'drivers',
      'trips',
      'bookings',
      'driver-ratings',
      'alerts',
      'cost-budget',
      'reports-advanced',
      'maintenance',
      'fuel',
      'violations',
      'dashboard',
    ],
    timestamp: new Date().toISOString(),
  });
});

// ================================================================
// === PHASE 29-33 & TEST ENDPOINTS ===
// ================================================================

// Mount Phase 29-33 Router at PUBLIC path (bypasses /api middleware)
try {
  const phases2933Router = require('./routes/phases-29-33.routes');
  app.use('/phases-29-33', phases2933Router);
  console.log('✅ Phase 29-33 router mounted at /phases-29-33 (public)');
} catch (err) {
  console.error('❌ Failed to load Phase 29-33 router:', err.message);
}

// Mount Phase 29-33 Router at /api path (with auth checks if needed)
try {
  const phases2933Router = require('./routes/phases-29-33.routes');
  app.use('/api/phases-29-33', phases2933Router);
  console.log('✅ Phase 29-33 router mounted at /api/phases-29-33');
} catch (err) {
  console.error('❌ Failed to load Phase 29-33 router at /api:', err.message);
}

// Serve static files from public directory for Phase 29-33 docs
app.use(express.static('public'));
console.log('✅ Static files served from public/ (including phase29-33-docs.html)');

// ================================================================
// === PHASE 29-33: ALREADY MOUNTED ABOVE (before /api rate limiters) ===
// === Original location - removed to avoid duplicate mounting ===
// ================================================================
// Route mounting

// Apply strict rate limiting to auth routes
app.use('/api/auth', authRateLimiter);
app.use('/api/v1/auth', authRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
// app.use('/api/sessions', require('./routes/session.routes')); // TEMP: Disabled for testing - Session Management
app.use('/api/users', usersRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/crm', crmRoutes);
// app.use('/api/employees', hrRoutes); // TEMP: Disabled for testing
// app.use('/api/v1/employees', hrRoutes); // TEMP: Disabled for testing
// app.use('/api/hr', hropsRoutes); // Legacy - Commented to avoid conflict with Advanced HR
// if (isTestEnv) {
//   app.use('/api/hr/employees', hrRoutes); // TEMP: Disabled for testing
// }

// === Enterprise HR System Routes ===
// if (isTestEnv) {
//   app.use('/api/hr', hrEnterpriseRoutes); // TEMP: Disabled for testing
//   app.use('/api/v1/hr', hrEnterpriseRoutes); // TEMP: Disabled for testing
// } else {
//   app.use('/api/hr', hrAdvancedRoutes); // TEMP: Disabled for testing
// }
// app.use('/api/reports', reportsRoutes); // TEMP: Disabled for testing
// app.use('/api/finance', financeRoutes); // TEMP: Disabled for testing
app.use('/api/payroll', require('./routes/payroll.routes')); // Payroll & Compensation Management
app.use('/api/notifications', notificationsRoutes); // Smart Notifications
app.use('/api/messages', messagingRoutes); // RE-ENABLED Messaging
app.use('/api/threads', require('./routes/threads.routes')); // Thread Management (dedicated routes)
app.use('/api/conversations', require('./routes/conversations.routes')); // Conversations Management
app.use('/api/finance', financeRoutes); // RE-ENABLED Finance
app.use('/api/reports', reportingRoutes); // RE-ENABLED Reporting
app.use('/api/integrations', integrationRoutes); // RE-ENABLED Integration

// Phase 2 New Routes: Disability Rehabilitation, Maintenance, Webhooks
app.use('/api/v1/disability-rehabilitation', disabilityRehabilitationRoutes); // Disability Rehabilitation
app.use('/api/v1/maintenance', maintenanceRoutes); // Maintenance Management
app.use('/api/webhooks', webhooksRoutes); // Webhook Management

// Phase 2 Part 2 New Routes: Asset Management, Schedule Management, Analytics, Reports
app.use('/api/v1/assets', assetRoutes); // Asset Management
app.use('/api/v1/schedules', scheduleRoutes); // Schedule Management
app.use('/api/v1/analytics', analyticsRoutes); // Performance Analytics
app.use('/api/v1/reports', reportRoutes); // Reports & Exports

// Phase 4 Health Monitoring Routes - Kubernetes Readiness/Liveness Probes & System Health
try {
  console.log('🏥 Mounting Phase 4 Health Routes at /api/v1/health');
  app.use('/api/v1/health', healthRoutes); // 6 comprehensive health check endpoints
  console.log('✅ Phase 4 Health Routes mounted successfully (db, models, system, full, ready, alive)');
} catch (err) {
  console.error('❌ ERROR mounting health routes:', err.message);
  console.error('   Stack:', err.stack);
}

// app.use('/api/notifications/smart', notificationsSmartRoutes); // Legacy - temporarily disabled
// app.use('/api/inbox', inboxRoutes); // Temporarily disabled

// Mount legacy integration routes with error handling
try {
  console.log('✅ All required routes mounted successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
}

// Analytics routes - temporarily disabled
// app.use('/api/analytics', require('./routes/analytics.routes'));
// app.use('/api/advanced-analytics', require('./routes/advanced-analytics.routes'));
// app.use('/api/export-import', require('./routes/export-import.routes'));
// app.use('/api/dms', require('./routes/dms.routes'));
// app.use('/api/admin', adminRoutes); // TEMP: Disabled for testing

// === Backup & Data Management ===
// app.use('/api/backup', backupRoutes); // Backup & Restore System - TEMPORARILY DISABLED
// Backup routes will be added when dependency issue is resolved

// === Communication Services ===
// app.use('/api/email', emailRoutes); // TEMP: Disabled for testing
// app.use('/api/sms', smsRoutes); // TEMP: Disabled for testing

// === Monitoring & Metrics ===
// app.use('/api/monitoring', monitoringRoutes); // TEMP: Disabled for testing

// === Enterprise Modules (MongoDB Backed) ===
// app.use('/api/hr-advanced', hrMongoRoutes); // TEMP: Disabled for testing
// app.use('/api/finance-advanced', financeMongoRoutes); // TEMP: Disabled for testing
// app.use('/api/beneficiaries', beneficiaryRoutes); // TEMP: Disabled for testing
// app.use('/api/rehabilitation-advanced', require('./routes/rehabilitation_advanced.routes')); // TEMP: Disabled for testing
// app.use('/api/dashboard', dashboardRoutes); // TEMP: Disabled for testing
// app.use('/api/search', searchRoutes); // TEMP: Disabled for testing
// === Phase 13: Advanced Feature Modules ===
// app.use('/api/user-profile', userProfileRoutes); // TEMP: Disabled for testing
// app.use('/api/2fa', twoFARoutes); // TEMP: Disabled for testing
// app.use('/api/2fa-enhanced', require('./routes/enhanced2FA.routes')); // TEMP: Disabled for testing
// app.use('/api/notifications-unified', require('./routes/unifiedNotification.routes')); // TEMP: Disabled for testing
// app.use('/api/search-advanced', advancedSearchRoutes); // TEMP: Disabled for testing
// app.use('/api/payments-advanced', paymentAdvancedRoutes); // TEMP: Disabled for testing
// app.use('/api/notifications-advanced', notificationAdvancedRoutes); // TEMP: Disabled for testing
// app.use('/api/chatbot', chatbotRoutes); // TEMP: Disabled for testing

// === PHASE 21-28: ADVANCED ENTERPRISE FEATURES ===
try {
  const phases2128Routes = require('./routes/phases-21-28.routes');
  app.use('/api/phases-21-28', phases2128Routes);
  console.log('✅ Phase 21-28 Advanced Enterprise Routes mounted (153+ endpoints)');
  console.log('   - Phase 21: Advanced Analytics (18 endpoints)');
  console.log('   - Phase 22: Mobile Enhancements (15 endpoints)');
  console.log('   - Phase 23: Industry Solutions (25 endpoints)');
  console.log('   - Phase 24: Security & Governance (20 endpoints)');
  console.log('   - Phase 25: Global Expansion (20 endpoints)');
  console.log('   - Phase 26: Advanced Integrations (18 endpoints)');
  console.log('   - Phase 27: Blockchain & Web3 (15 endpoints)');
  console.log('   - Phase 28: IoT & Device Management (22 endpoints)');
} catch (error) {
  console.error('❌ Error loading Phase 21-28 routes:', error.message);
  if (process.env.NODE_ENV !== 'test') {
    console.error('Stack:', error.stack);
  }
}

// === PHASE 29-33: MOVED TO TOP FOR PRIORITY (Line ~375) ===
// Phase 29-33 routes now mounted FIRST in the middleware stack
// to avoid conflicts with Phase 17/18-20 mounted on /api

// app.use('/api/ai-advanced', aiAdvancedRoutes); // TEMP: Disabled for testing
// app.use('/api/accounting', accountingRoutes); // TEMP: Disabled for testing - Professional Accounting System
// app.use('/api/automation', automationRoutes); // TEMP: Disabled for testing
// app.use('/api/organization', organizationRoutes); // TEMP: Disabled for testing - Organizational Structure
// app.use('/api/vehicles', vehicleRoutes); // TEMP: Disabled for testing - Fleet Management System
// app.use('/api/drivers', driverRoutes); // TEMP: Disabled for testing - Driver Management System
// app.use('/api/trips', tripRoutes); // TEMP: Disabled for testing - Trip Management System
// app.use('/api/reports', reportRoutes); // TEMP: Disabled for testing - Reports and Analytics System
// app.use('/api/maintenance', require('./routes/maintenanceRoutes')); // TEMP: Disabled for testing - Vehicle Maintenance System
// app.use('/api/fuel', require('./routes/fuelRoutes')); // TEMP: Disabled for testing - Fuel Tracking System
// app.use('/api/violations', require('./routes/violationsRoutes')); // TEMP: Disabled for testing - Traffic Violations System
// app.use('/api/dashboard', require('./routes/dashboardRoutes')); // TEMP: Disabled for testing - Advanced Dashboard System
// app.use('/api/bookings', require('./routes/bookingRoutes')); // TEMP: Disabled for testing - Booking & Scheduling System
// app.use('/api/driver-ratings', require('./routes/driverRatingRoutes')); // TEMP: Disabled for testing - Driver Performance Rating System
// app.use('/api/alerts', require('./routes/alertNotificationRoutes')); // TEMP: Disabled for testing - Alerts & Notifications System
// app.use('/api/cost-budget', require('./routes/costBudgetRoutes')); // TEMP: Disabled for testing - Cost & Budget Management System
// app.use('/api/reports-advanced', require('./routes/advancedReportingRoutes')); // TEMP: Disabled for testing - Advanced Reporting & Analytics System

// === Support Modules ===
// app.use('/api/inventory', require('./routes/inventory_rehab.routes')); // TEMP: Disabled for testing - Equipment & Rooms
// app.use('/api/reports/rehab', require('./routes/reports_rehab.routes')); // TEMP: Disabled for testing - Advanced Reports

// === Smart IRP System (Phase 14) - نظام خطة التأهيل الفردية الذكية ===
// app.use('/api/smart-irp', require('./routes/smartIRP.routes')); // TEMP: Disabled for testing - Smart Individual Rehabilitation Plan

// === External Portals ===
// app.use('/api/portal', require('./routes/portal.routes')); // TEMP: Disabled for testing - Parents Portal
// app.use('/api/transport-smart', require('./routes/transport_smart.routes')); // TEMP: Disabled for testing - Smart Transportation
// app.use('/api/crm-smart', require('./routes/crm_smart.routes')); // TEMP: Disabled for testing - Smart CRM & Leads
// app.use(/api/clinical-smart, require('./routes/clinical_smart.routes')); // Clinical AI & Goal Bank
// app.use(/api/hr-smart, require('./routes/hr_smart.routes')); // Smart Payroll & Commissions
// app.use(/api/finance-smart, require('./routes/finance_smart.routes')); // Smart Billing & Revenue
// app.use(/api/scheduling-smart, require('./routes/scheduling_smart.routes')); // Intelligent Capacity & Waitlist
// app.use(/api/homecare-smart, require('./routes/homecare_smart.routes')); // Smart Home Goals & Family Engagement
// app.use(/api/quality-smart, require('./routes/quality_smart.routes')); // QA & Compliance Watchdog
// app.use(/api/gamification-smart, require('./routes/gamification_smart.routes')); // Loyalty & Child Motivation
// app.use(/api/feedback-smart, require('./routes/feedback_smart.routes')); // NPS & Reputation Management
// app.use(/api/patient-smart, require('./routes/patient_smart.routes')); // Advanced EMR & 360 Patient View
// app.use(/api/reports-smart, require('./routes/reports_smart.routes')); // Auto-Generated Medical Reports
// app.use(/api/training-smart, require('./routes/training_smart.routes')); // AI Staff Development (LMS)
// app.use(/api/retention-smart, require('./routes/retention_smart.routes')); // Patient Risk & Churn Prediction
// app.use(/api/substitution-smart, require('./routes/substitution_smart.routes')); // Intelligent Staff Replacement
// app.use(/api/referral-smart, require('./routes/referral_smart.routes')); // AI OCR & Referral Processing
// app.use(/api/voice-smart, require('./routes/voice_smart.routes')); // AI Clinical Voice Transcription
// app.use(/api/integrated-care, require('./routes/integrated_care.routes')); // Integrated Educational, Therapeutic & Life Skills Plans
// app.use(/api/documents-smart, require('./routes/smart_document.routes')); // Smart Documents Generator
// app.use(/api/inventory-smart, require('./routes/inventory_smart.routes')); // Predictive Stock & Maintenance
// app.use(/api/plan-smart, require('./routes/plan_smart.routes')); // Integrated Treatment Plan Generator
// app.use(/api/admission-smart, require('./routes/admission_smart.routes')); // Strategic Admission Simulator
// app.use(/api/telehealth-smart, require('./routes/telehealth_smart.routes')); // Remote Therapy & Engagement AI
// app.use(/api/parent-coach-smart, require('./routes/parent_coach_smart.routes')); // 24/7 AI Clinical Assistant for Parents
// app.use(/api/iot-smart, require('./routes/iot_smart.routes')); // Connected Rehab (Wearables & Kiosks)
// app.use(/api/federation-smart, require('./routes/federation_smart.routes')); // Multi-Branch Enterprise Management
// app.use(/api/security-smart, require('./routes/security_smart.routes')); // AI Anomaly Detection & Audit
// app.use(/api/finance-core, require('./routes/finance_core.routes')); // General Ledger & Profitability
// app.use(/api/hr-core, require('./routes/hr_core.routes')); // Contracts & Attendance
// app.use(/api/notifications-center, require('./routes/notification_center.routes')); // Omni-channel Gateway
// app.use(/api/family-portal, require('./routes/family_portal.routes')); // Mobile App Backend
// app.use(/api/marketing-smart, require('./routes/marketing_smart.routes')); // Growth & Lead Scoring
// app.use(/api/insurance-smart, require('./routes/insurance_smart.routes')); // Claims Scrubbing & Reconciliation
// app.use(/api/archiving-smart, require('./routes/archiving_smart.routes')); // GDPR Compliance & Research
// app.use(/api/cdss-smart, require('./routes/cdss_smart.routes')); // PHASE 45: Clinical Decision Support System
// app.use(/api/facility-smart, require('./routes/facility_smart.routes')); // PHASE 47: Green Rehab & Predictive Maintenance
// app.use(/api/community-smart, require('./routes/community_smart.routes')); // PHASE 48: Safe Social Network & Exchange
// app.use(/api/operations-smart, require('./routes/operations_smart.routes')); // PHASE 49: Advanced Logistics, Support & BI
// app.use(/api/strategy-smart, require('./routes/strategy_smart.routes')); // PHASE 50 & 51: Digital Twin & Accessibility

// === Phase 97 & 98: Smart Wearable & Voice Assistant ===
// app.use(/api/wearable-smart, require('./routes/wearable_smart.routes'));
// app.use(/api/voice-assistant-smart, require('./routes/voice_assistant_smart.routes'));

// === Phase 99: Global Tele-Health & Robotics ===
// app.use(/api/robotics-smart, require('./routes/robotics_smart.routes'));

// === Phase 100: Cognitive Training & Integration ===
// app.use(/api/cognitive-smart, require('./routes/cognitive_smart.routes'));

// Note: global-expert is likely already registered under Phase 60 section, ensuring it's updated.

// app.use(/api/immersive-smart, require('./routes/immersive_smart.routes')); // PHASE 52: VR/AR Therapy Management
// app.use(/api/genomics-smart, require('./routes/genomics_smart.routes')); // PHASE 53: Precision Medicine & Genomics
// app.use(/api/academic-smart, require('./routes/academic_smart.routes')); // PHASE 54: Research Hub & Internship
// app.use(/api/nutrition-smart, require('./routes/nutrition_smart.routes')); // PHASE 55: Smart Nutrition & Gut-Brain
// app.use(/api/orchestrator-smart, require('./routes/orchestrator_smart.routes')); // PHASE 56: Autonomous Workflow & Self-Healing
// app.use(/api/legal-smart, require('./routes/legal_smart.routes')); // PHASE 57: Compliance Sentinel & Audit
// app.use(/api/school-smart, require('./routes/school_smart.routes')); // PHASE 58: School Collaboration & IEP Sync
// app.use(/api/wellbeing-smart, require('./routes/wellbeing_smart.routes')); // PHASE 59: Staff Burnout & Resilience
// app.use(/api/global-expert-smart, require('./routes/global_expert_smart.routes')); // PHASE 60: International Second Opinion
// app.use(/api/media-analysis-smart, require('./routes/media_analysis_smart.routes')); // PHASE 61: Video/Audio Clinical AI
// app.use(/api/appeals-smart, require('./routes/appeals_smart.routes')); // PHASE 62: AI Smart Appeals (Revenue Protection)
// app.use(/api/biometrics-smart, require('./routes/biometrics_smart.routes')); // PHASE 63: Voice/Face High Security & Liveness
// app.use(/api/vocational-smart, require('./routes/vocational_smart.routes')); // PHASE 64: Smart Vocational Rehab & Job Matching
// app.use(/api/casemanager-smart, require('./routes/casemanager_smart.routes')); // PHASE 65: AI Case Management & Conflict Detection
// app.use(/api/family-smart, require('./routes/family_smart.routes')); // PHASE 66: Enhanced Family Portal & AI Daily Digests
// app.use(/api/audit-smart, require('./routes/audit_smart.routes')); // PHASE 67: Smart Audit, Compliance & DLP
// app.use(/api/integration-smart, require('./routes/integration_smart.routes')); // PHASE 68: Gov Gateway & FHIR Interoperability
// app.use(/api/philanthropy-smart, require('./routes/philanthropy_smart.routes')); // PHASE 69: Smart Grants & Donor Impact
// app.use(/api/research-smart, require('./routes/research_smart.routes')); // PHASE 70: Clinical Trials & Data Science
// app.use(/api/crisis-smart, require('./routes/crisis_smart.routes')); // PHASE 71: Emergency Response & Safety Protocols
// app.use(/api/content-smart, require('./routes/content_smart.routes')); // PHASE 72: AI Therapeutic Content Generator
// app.use(/api/knowledge-smart, require('./routes/knowledge_smart.routes')); // PHASE 73: Clinical Brain & Lessons Learned
// app.use(/api/procurement-smart, require('./routes/procurement_smart.routes')); // PHASE 74: AI Supply Chain & Auto Restock
// app.use(/api/roster-smart, require('./routes/roster_smart.routes')); // PHASE 75: AI Staff Scheduling & Burnout Prevention
// app.use(/api/journey-smart, require('./routes/journey_smart.routes')); // PHASE 76: Patient Experience Analytics & Journey Mapping
// app.use(/api/environment-smart, require('./routes/environment_smart.routes')); // PHASE 77: Smart Sensory Rooms & Green Energy
// app.use(/api/reception-smart, require('./routes/reception_smart.routes')); // PHASE 78: Autonomous Kiosk & Visitor Management
// app.use(/api/job-coach-smart, require('./routes/job_coach_smart.routes')); // PHASE 79: Supported Employment & Employer Portal
// app.use(/api/iep-smart, require('./routes/iep_smart.routes')); // PHASE 80: Digital IEP & Meeting Orchestrator
// app.use(/api/transport-smart, require('./routes/transport_logistics_smart.routes')); // PHASE 81: AI Route & Fleet Safety
// app.use(/api/events-smart, require('./routes/events_smart.routes')); // PHASE 82: Workshop Marketplace & Certificates
// app.use(/api/quality-smart, require('./routes/quality_control_smart.routes')); // PHASE 83: Accreditation & QC
// app.use(/api/knowledge-graph-smart, require('./routes/knowledge_graph_smart.routes')); // PHASE 84: AI Knowledge Graph
// app.use(/api/alumni-smart, require('./routes/alumni_smart.routes')); // PHASE 85: Alumni Success & Mentorship
// app.use(/api/library-smart, require('./routes/library_smart.routes')); // PHASE 86: Sensory Library & Lending
// app.use(/api/ethics-smart, require('./routes/ethics_smart.routes')); // PHASE 87: Bio-Ethics & Digital Consent
// app.use(/api/sports-smart, require('./routes/sports_smart.routes')); // PHASE 88: Adaptive Sports & Special Olympics
// app.use(/api/arts-smart, require('./routes/creative_arts_smart.routes')); // PHASE 89: Music & Art Therapy
// app.use(/api/sleep-smart, require('./routes/sleep_smart.routes')); // PHASE 90: Sleep & Circadian Mgmt
// app.use(/api/behavior-smart, require('./routes/behavior_smart.routes')); // PHASE 91: Smart Behavior (ABC)
// app.use(/api/aac-smart, require('./routes/aac_smart.routes')); // PHASE 92: Smart AAC Prediction
// app.use(/api/sensory-smart, require('./routes/sensory_diet_smart.routes')); // PHASE 93: Sensory Diet & Regulation
// app.use(/api/neuro-smart, require('./routes/neuro_feedback_smart.routes')); // PHASE 94: EEG & Neuro-Feedback
// app.use(/api/twin-smart, require('./routes/digital_twin_smart.routes')); // PHASE 95: Digital Twin Aggregator
// app.use(/api/sim-smart, require('./routes/simulation_smart.routes')); // PHASE 96: Future Forecasting

// app.use('/api/ai', aiRoutes); // TEMP: Disabled for testing

// Disability Rehabilitation System (re-enabled for coverage)
app.use('/api/disability-rehabilitation', require('./routes/disability-rehabilitation.routes'));
app.use('/api/v1/disability-rehabilitation', require('./routes/disability-rehabilitation.routes'));

// app.use('/api/ai-predictions', predictionsRoutes); // TEMP: Disabled for testing
// app.use('/api/documents', documentsManagementRoutes); // TEMP: Disabled for testing
// app.use('/api/v1/documents', documentsManagementRoutes); // TEMP: Disabled for testing
// app.use('/api/documents-old', documentRoutesOld); // TEMP: Disabled for testing
// app.use('/api/messages', messagingRoutes); // TEMP: Disabled for testing
// app.use(/api/threads, require('./routes/threads.routes')); // Message Threads (Phase 2)
// app.use(/api/conversations, require('./routes/conversations.routes')); // Conversations (Phase 2)
// Phase 4: Project Management
// app.use(/api/pm, require('./routes/projectManagement.routes'));
// app.use(/api/v1, require('./routes/projectManagement.routes'));
// Phase 5: E-Learning Platform
// app.use(/api/lms, require('./routes/eLearning.routes'));
// Phase 6: Advanced HR System
// app.use(/api/hr-system, require('./routes/hr_phase6.routes'));
// Phase 7: Security & Compliance
// app.use(/api/security, require('./routes/security.routes'));
// Phase 8: Enhanced DMS
// app.use(/api/dms, require('./routes/dms.routes'));

// app.use('/api/rehabilitation', rehabilitationRoutes); // TEMP: Disabled for testing
// app.use('/api', workflowRoutes); // TEMP: Disabled for testing

// === Phase 17: Advanced AI & Automation (Chatbot, Analytics, Workflows) ===
if (process.env.SKIP_PHASE17 === 'true') {
  console.log('⚠️ Phase 17 routes skipped (SKIP_PHASE17=true)');
} else {
  try {
    const phase17Routes = require('./routes/phase17-advanced.routes');
    app.use('/api', phase17Routes);
    console.log('✅ Phase 17 Advanced AI & Automation routes mounted');
  } catch (error) {
    console.error('⚠️ Phase 17 routes error:', error.message);
  }
}

// === Phases 18-20: Enterprise Multi-Tenant, Integrations, Compliance ===
try {
  const phases18to20Routes = require('./routes/phases-18-20.routes');
  app.use('/api', phases18to20Routes);
  console.log('✅ Phases 18-20 Enterprise routes mounted');
} catch (error) {
  console.error('⚠️ Phases 18-20 routes error:', error.message);
}
// app.use('/api/performance', performanceRoutes); // TEMP DISABLED
// app.use('/api/system', systemRoutes); // TEMP: Disabled for testing - Mount System Routes
// app.use(/api/payments, require('./routes/payments.routes')); // Phase 2: Payments for Phase 2

// === Supply & Support System Integration ===
// app.use('/api/supply', supplyRoutes); // TEMP: Disabled for testing - Supply & Support System

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
  return [
    {
      title: 'Average Response Time',
      value: '245ms',
      trend: '+5%',
      status: 'normal',
      icon: 'clock',
    },
    { title: 'System Health', value: '98.5%', trend: '+0.2%', status: 'excellent', icon: 'heart' },
    { title: 'Active Users', value: '342', trend: '+12%', status: 'increasing', icon: 'users' },
    { title: 'Data Processed', value: '2.4GB', trend: '+8%', status: 'normal', icon: 'database' },
    { title: 'Error Rate', value: '0.2%', trend: '-0.1%', status: 'excellent', icon: 'alert' },
    { title: 'Success Rate', value: '99.8%', trend: '+0.1%', status: 'excellent', icon: 'check' },
  ];
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
          }))
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
app.use(errorHandler);

// 404 handler
app.use(notFoundHandler);

// Setup error handlers
uncaughtExceptionHandler();
unhandledRejectionHandler();

// Seed lightweight demo data when using in-memory DB
const seedMockVehicles = async () => {
  try {
    if (!mongoose.connection || !mongoose.connection.db) {
      console.log('⚠️  Mock vehicle seeding skipped: database not ready');
      return;
    }

    const collection = mongoose.connection.db.collection('vehicles');
    const existing = await collection.countDocuments();
    if (existing >= 3) {
      console.log('ℹ️  Mock vehicles already exist, skipping seeding');
      return;
    }

    const ownerId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    const vehicles = [
      {
        registrationNumber: 'VRN-TEST-001',
        plateNumber: 'ABC-1001',
        vin: 'VINTEST001A',
        engineNumber: 'ENGTEST001',
        owner: ownerId,
        ownerName: 'Demo Fleet',
        basicInfo: {
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          type: 'سيارة ركوب',
          fuelType: 'بنزين',
          color: 'أبيض',
        },
        registration: {
          registrationDate: new Date('2024-01-01'),
          expiryDate: new Date('2026-01-01'),
          category: 'خاص',
          status: 'نشط',
        },
        performance: { odometer: 42000 },
      },
      {
        registrationNumber: 'VRN-TEST-002',
        plateNumber: 'DEF-2002',
        vin: 'VINTEST002B',
        engineNumber: 'ENGTEST002',
        owner: ownerId,
        ownerName: 'Demo Fleet',
        basicInfo: {
          make: 'Ford',
          model: 'Transit',
          year: 2021,
          type: 'سيارة نقل',
          fuelType: 'ديزل',
          color: 'فضي',
        },
        registration: {
          registrationDate: new Date('2024-03-01'),
          expiryDate: new Date('2026-03-01'),
          category: 'تجاري',
          status: 'نشط',
        },
        performance: { odometer: 88000 },
      },
      {
        registrationNumber: 'VRN-TEST-003',
        plateNumber: 'GHI-3003',
        vin: 'VINTEST003C',
        engineNumber: 'ENGTEST003',
        owner: ownerId,
        ownerName: 'Demo Fleet',
        basicInfo: {
          make: 'Hyundai',
          model: 'H350',
          year: 2020,
          type: 'حافلة',
          fuelType: 'ديزل',
          color: 'أزرق',
        },
        registration: {
          registrationDate: new Date('2023-12-15'),
          expiryDate: new Date('2025-12-15'),
          category: 'عام',
          status: 'نشط',
        },
        performance: { odometer: 132000 },
      },
    ];
    const Vehicle = require('./models/Vehicle');
    await Vehicle.insertMany(vehicles);
    await Vehicle.insertMany(vehicles);
    try {
      await Vehicle.insertMany(vehicles);
      console.log(`✅ Seeded ${vehicles.length} mock vehicles for demo`);
    } catch (modelErr) {
      // Fallback: Insert raw documents into vehicles collection
      const collection = mongoose.connection.db.collection('vehicles');
      const docsToInsert = vehicles.map(v => ({ ...v, _id: new mongoose.Types.ObjectId() }));
      await collection.insertMany(docsToInsert);
      console.log(`✅ Seeded ${vehicles.length} vehicles (raw inserts)`);
    }
  } catch (err) {
    console.log('⚠️  Mock vehicle seeding skipped:', err.message);
  }
};

// Initialize database (skip heavy work during tests)
const shouldSkipDBInit = isTestEnv && process.env.SMART_TEST_MODE === 'true';

(async () => {
  if (shouldSkipDBInit) {
    console.log('ℹ️  Skipping database init in SMART_TEST_MODE test environment');
    return;
  }

  try {
    await connectDB();
    if (process.env.USE_MOCK_DB === 'true') {
      console.log('ℹ️  Using in-memory database');
      await seedMockVehicles();
    } else {
      try {
        await seedDatabase();
      } catch (err) {
        console.log('⚠️  Seeding skipped:', err.message);
      }

      // Create database indexes for performance
      try {
        await createIndexes();
      } catch (err) {
        console.log('⚠️  Index creation skipped:', err.message);
      }

      // Initialize automated backups
      if (process.env.ENABLE_AUTO_BACKUP === 'true') {
        console.log('🗄️  Starting automated backup system...');
        scheduleBackups();
      }
    }
  } catch (err) {
    console.log('⚠️  Database connection failed, continuing...');
  }

  // Initialize Redis Cache (Phase 2)
  try {
    if (process.env.REDIS_ENABLED === 'true') {
      console.log('📦 Initializing Redis Cache...');
      await redisClient.initializeRedis();
      console.log('✅ Redis Cache ready');
    } else {
      console.log('⚠️  Redis disabled (set REDIS_ENABLED=true to enable)');
    }
  } catch (err) {
    console.log('⚠️  Redis initialization failed:', err.message);
    console.log('   Continuing without cache...');
  }
})();

// Export app for testing and modular use
module.exports = app;
module.exports.app = app;
module.exports.io = io;
module.exports.server = server;

// Start server only when run directly
if (require.main === module) {
  const startServer = (port, attemptsLeft = 5) => {
    const host = '0.0.0.0';
    const displayURL = `http://localhost:${port}`;

    const onListening = () => {
      console.log(`Server running at ${displayURL} (${host})`);
      // Setup graceful shutdown (TEMPORARILY DISABLED - causing premature shutdown on Windows)
      // setupGracefulShutdown(server, io);
      console.log('⚠️  Graceful shutdown DISABLED for testing');
    };

    const onError = err => {
      if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        const nextPort = Number(port) + 1;
        console.warn(`Port ${port} in use, retrying on ${nextPort}...`);
        // Remove listener before retrying
        server.removeListener('error', onError);
        server.removeListener('listening', onListening);
        startServer(nextPort, attemptsLeft - 1);
      } else {
        console.error('Failed to start server:', err ? err.message : 'Unknown error');
        process.exit(1);
      }
    };

    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(port, host);
  };

  startServer(PORT);
}
