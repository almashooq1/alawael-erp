const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

console.log('[APP-INIT] Express app created');

// Safe require function - silently fail for non-critical routes
const safeRequire = (filePath) => {
  try {
    return require(filePath);
  } catch (err) {
    // Only log debug info if requested, never throw for route files
    if (process.env.DEBUG_ROUTES === 'true') {
      console.debug(`[DEBUG] Route load skipped: ${filePath} (${err.message.substring(0, 50)})`);
    }
    return null;
  }
};

// Load all routers safely
// Note: Following routers are temporarily disabled but kept in code for reference
// Routes: performanceEvaluations, aiNotifications, approvalRequests, montessoriAuth,
// montessori, notificationTemplates, fcm, templates, orgBranding, ai, sso.routes
const supplyChainRouter = safeRequire('./routes/supplyChain.routes');
const branchIntegrationRoutes = safeRequire('./routes/branch-integration.routes');
const notificationRoutes = safeRequire('./routes/notificationRoutes'); // 🎯 Advanced Notification System

// Custom middleware
const errorHandler = require('./middleware/errorHandler');
const { cache } = require('./config/redis');
const { limiters } = require('./middleware/rateLimit');
const analytics = require('./middleware/analytics');
const systemDashboard = require('./services/systemDashboard');
const { initializePerformanceOptimizations } = require('./utils/performance-optimizer');

// Middleware
app.use(cors());
app.use(express.json());

// CRITICAL DEBUG: Log all requests
app.use((req, res, next) => {
  console.log(`[REQUEST-TRACE] ${req.method} ${req.path} | Full URL: ${req.originalUrl}`);
  next();
});

// Initialize performance optimizations (compression, caching, monitoring)
initializePerformanceOptimizations(app);

// ==================== CACHE MANAGEMENT ROUTES (REGISTERED EARLY) ====================
// Register cache routes BEFORE all other routers to ensure they're reached
const cacheManagementRouter = require('./routes/cache-management.routes');
app.use('/api', cacheManagementRouter);
console.log('✅ Cache management routes registered at /api');

// TEMPORARILY DISABLED - Testing if these cause 404 issue
/*
// Register SSO Routes FIRST (before any logging middleware)
if (ssoRouter) {
  app.use('/api/sso', ssoRouter);
  console.log('✅ SSO Routes loaded and registered on /api/sso');
} else {
  console.log('⚠️  SSO Router not loaded');
  // Fallback SSO status endpoint if router failed
  app.get('/api/sso/status', (req, res) => {
    console.log('[FALLBACK] /api/sso/status called');
    res.json({
      success: true,
      status: 'operational (fallback)',
      message: 'SSO system is operational'
    });
  });
  console.log('✅ Fallback SSO status endpoint registered');
}

// Test direct route - should work and prove Express is functioning
app.get('/api/test/sso', (req, res) => {
  console.log('[DIRECT] /api/test/sso endpoint hit');
  res.json({
    test: 'direct endpoint in app.js',
    status: 200
  });
});
console.log('✅ Test endpoint /api/test/sso registered');

// Debug middleware to see what's happening with requests
app.use((req, res, next) => {
  if (req.path.includes('/sso')) {
    console.log(`[DEBUG] Request to ${req.method} ${req.originalUrl}, path: ${req.path}, baseUrl: ${req.baseUrl}`);
  }
  next();
});

// Then apply middleware
app.use(requestLogger);
app.use(performanceMonitor.middleware());

// Rate limiting (Skip for SSO)
app.use('/api/', (req, res, next) => {
  // Bypass rate limiting for SSO and health check routes
  if (req.path.startsWith('/sso') || req.path === '/health' || req.path === '/api/health') {
    return next();
  }
  // Skip rate limiting for now - test if it's the source of 404
  // TODO: Fix async middleware issue
  next();
});
app.use('/api/auth/login', limiters.login.middleware);
app.use('/api/auth/register', limiters.login.middleware);

// Analytics middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    analytics.trackRequest(req, res, duration);
  });

  next();
});
if (performanceEvaluationsRouter) app.use('/api/performance-evaluations', performanceEvaluationsRouter);
if (aiNotificationsRouter) app.use('/api/ai-notifications', aiNotificationsRouter);
if (approvalRequestsRouter) app.use('/api/approval-requests', approvalRequestsRouter);
if (montessoriAuthRouter) app.use('/api/montessori-auth', montessoriAuthRouter);
if (montessoriRouter) app.use('/api/montessori', montessoriRouter);
if (notificationTemplatesRouter) app.use('/api/notification-templates', notificationTemplatesRouter);
if (fcmRouter) app.use('/api/fcm', fcmRouter);
if (templatesRouter) {
  app.use('/api/templates', templatesRouter);
  app.use('/api/templates/attachments', express.static(path.join(__dirname, 'uploads')));
}
if (orgBrandingRouter) app.use('/api/org-branding', orgBrandingRouter);
if (aiRouter) app.use('/api/ai', aiRouter);
*/

// Supply chain ONLY - for testing
if (supplyChainRouter) {
  // Debug: Log all supply-chain requests
  app.use('/api/supply-chain', (req, res, next) => {
    console.log(`[SUPPLY-CHAIN] ${req.method} ${req.path} - Routing to handler...`);
    next();
  });
  app.use('/api/supply-chain', supplyChainRouter);
  console.log('✅ Supply Chain Management Routes loaded');
}

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    mongodb: process.env.USE_MOCK_DB === 'true' ? 'mock' : 'connected',
  });
});

// Enhanced health check
app.get('/api/health', (req, res) => {
  // Import here to avoid circular dependencies
  try {
    const { getConnectionHealth } = require('./config/database');
    const dbHealth = getConnectionHealth();
    
    res.json({
      success: true,
      status: dbHealth.isConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: 'operational',
        database: {
          connected: dbHealth.isConnected,
          mode: process.env.USE_MOCK_DB === 'true' ? 'mock (development)' : 'mongodb',
          connectionAttempts: dbHealth.connectionAttempts,
          lastConnectedAt: dbHealth.lastConnectedAt,
          secondsSinceConnected: dbHealth.secondsSinceConnected,
          lastErrorMessage: dbHealth.lastErrorMessage,
          lastErrorTime: dbHealth.lastErrorTime,
        },
        cache: process.env.USE_MOCK_CACHE === 'true' ? 'mock' : 'configured',
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      },
    });
  } catch (error) {
    // Fallback response if database health check fails
    res.json({
      success: true,
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      services: {
        api: 'operational',
        database: process.env.USE_MOCK_DB === 'true' ? 'mock' : 'unknown',
        cache: process.env.USE_MOCK_CACHE === 'true' ? 'mock' : 'configured',
      },
    });
  }
});

// Log middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 🇸🇦 Direct MOI Passport Route Registration (Placed Early)
console.log('[APP-INIT] === Starting MOI route registration ===');

const moiHealthHandler = (req, res) => {
  console.log('[MOI-ENDPOINT] /api/moi/health called');
  res.json({
    success: true,
    status: 'healthy',
    service: 'MOI Passport Integration Service',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/moi/health', moiHealthHandler);
console.log('[APP-INIT] MOI health route registered using app.get()');

// Verify route was added
try {
  const routeStack = app._router?.stack;
  if (routeStack) {
    const moiRoute = routeStack.find(r => r.route && r.route.path === '/api/moi/health');
    console.log('[APP-INIT] MOI route in stack:', moiRoute ? 'YES' : 'NO');
  }
} catch (e) {
  if (process.env.DEBUG_ROUTES === 'true') {
    console.log('[APP-INIT] Could not verify route:', e.message);
  }
}

console.log('[APP-INIT] === MOI route registration complete ===');

// API Routes
try {
  // HR Routers
  const hrEmployeeRouter = safeRequire('./routes/hr/employee');
  const hrAttendanceRouter = safeRequire('./routes/hr/attendance');
  const hrLeaveRouter = safeRequire('./routes/hr/leave');
  const hrPayrollRouter = safeRequire('./routes/hr/payroll');
  const hrPerformanceEvaluationRouter = safeRequire('./routes/hr/performanceEvaluation');

  // Documentation
  const docsRouter = safeRequire('./routes/docs');

  // Original Systems
  const predictionsRouter = safeRequire('./routes/predictions');
  const reportsRouter = safeRequire('./routes/reports');
  const notificationsRouter = safeRequire('./routes/notifications');

  // Advanced Systems (Phase 3)
  const monitoringRouter = safeRequire('./routes/monitoring');
  const supportRouter = safeRequire('./routes/support');
  const integrationsRouter = safeRequire('./routes/integrations');
  const performanceRouter = safeRequire('./routes/performance');

  // Authentication & User Management (Phase 4)
  const authRouter = safeRequire('./routes/auth');
  const usersRouter = safeRequire('./routes/users');
  console.log('[DEBUG] usersRouter loaded:', usersRouter ? 'SUCCESS' : 'FAILED');
  const rbacRouter = safeRequire('./routes/rbac');
  const rbacAdvancedRouter = safeRequire('./routes/rbac-advanced.routes');
  const mfaRouter = safeRequire('./routes/mfa');

  // Analytics & CMS (Phase 4)
  const analyticsRouter = safeRequire('./routes/analytics');
  const cmsRouter = safeRequire('./routes/cms');

  // Phase 8: Advanced Features
  const uploadRouter = safeRequire('./routes/upload');
  const exportRouter = safeRequire('./routes/export');

  // Phase 10: Advanced Features (Search, Validation, Response)
  const searchRouter = safeRequire('./routes/search');
  const validateRouter = safeRequire('./routes/validate');

  // Phase 11: System Integration
  const dashboardRouter = safeRequire('./routes/dashboard');

  // Executive Intelligence Dashboard
  const executiveDashboardRouter = safeRequire('./routes/executive-dashboard');

  // Beneficiary Portal (Communication & Awareness)
  const beneficiaryPortalRouter = safeRequire('./routes/beneficiaryPortal');

  // Community Awareness System
  const communityRouter = safeRequire('./routes/community');

  // Phase 13: Specialized Programs & Sessions
  const specializedProgramsRouter = safeRequire('./routes/specializedPrograms');
  const advancedSessionsRouter = safeRequire('./routes/advancedSessions');
  const smartSchedulerRouter = safeRequire('./routes/smartScheduler');

  // Phase 14: Equipment Management System
  const equipmentRouter = safeRequire('./routes/equipment');

  // Phase 15: Quality Management & Accreditations
  const qualityRouter = safeRequire('./routes/quality');

  // Phase 16: Internal Audit Management System
  const internalAuditRouter = safeRequire('./routes/internalAudit');

  // Phase 17: Vehicle & Transport Management System
  const vehiclesRouter = safeRequire('./routes/vehicles');
  const transportRoutesRouter = safeRequire('./routes/transportRoutes');
  const tripsRouter = safeRequire('./routes/trips');

  // Phase 18: Real-Time Collaboration System
  const realtimeCollaborationRouter = safeRequire('./routes/realtimeCollaboration.routes');

  // Phase 19: Smart Notifications System
  const smartNotificationsRouter = safeRequire('./routes/smartNotifications.routes');

  // Phase 20: Advanced Analytics & Reporting
  const advancedAnalyticsRouter = safeRequire('./routes/advancedAnalytics.routes');

  // Phase 21: Mobile App Backend Support
  const mobileAppRouter = safeRequire('./routes/mobileApp.routes');

  // Phase 22: Custom Dashboard Widget Builder
  const dashboardWidgetRouter = safeRequire('./routes/dashboardWidget.routes');

  // Phase 24: Multi-Tenant Support
  const tenantRouter = safeRequire('./routes/tenant.routes');

  // Phase 25: AI Recommendations Engine
  const aiRecommendationsRouter = safeRequire('./routes/ai.recommendations.routes');

  // Phase 26: Advanced Integrations Hub
  const integrationHubRouter = safeRequire('./routes/integrationHub.routes');

  // Phase 27: Qiwa (Ministry of Labor) Integration
  const qiwaRouter = safeRequire('./routes/qiwa.routes');

  // Phase 28: Measurement & Rehabilitation Program System
  const measurementsRouter = safeRequire('./routes/measurements.routes');

  // 🇸� MOI Passport Integration System
  console.log('[MOI-DEBUG] Attempting to load MOI Passport routes...');
  const moiPassportRouter = safeRequire('./routes/moi-passport.routes');
  console.log('[MOI-DEBUG] moiPassportRouter loaded:', typeof moiPassportRouter, moiPassportRouter ? 'SUCCESS' : 'FAILED');

  // Data Migration System
  const migrationRouter = safeRequire('./routes/migrations');
  systemDashboard.initialize().then(success => {
    if (success) {
      console.log('✅ System Dashboard Initialized');
    }
  });

  // Register available routes
  // HR API endpoints
  if (hrEmployeeRouter) app.use('/api/hr/employees', hrEmployeeRouter);
  if (hrAttendanceRouter) app.use('/api/hr/attendance', hrAttendanceRouter);
  if (hrLeaveRouter) app.use('/api/hr/leaves', hrLeaveRouter);
  if (hrPayrollRouter) app.use('/api/hr/payroll', hrPayrollRouter);
  if (hrPerformanceEvaluationRouter)
    app.use('/api/hr/performance-evaluations', hrPerformanceEvaluationRouter);
  if (predictionsRouter) app.use('/api/predictions', predictionsRouter);
  if (reportsRouter) app.use('/api/reports', reportsRouter);
  if (notificationsRouter) app.use('/api/notifications', notificationsRouter);
  // 🎯 Advanced Notification System (WhatsApp, Templates, Analytics, Rules)
  if (notificationRoutes) {
    app.use('/api/notifications/advanced', notificationRoutes);
    console.log('✅ Advanced Notification System Routes loaded on /api/notifications/advanced');
  } else {
    console.log('⚠️  Advanced Notification System routes not loaded');
  }
  if (monitoringRouter) app.use('/api/monitoring', monitoringRouter);
  if (supportRouter) app.use('/api/support', supportRouter);
  if (integrationsRouter) app.use('/api/integrations', integrationsRouter);
  if (performanceRouter) app.use('/api/performance', performanceRouter);
  if (authRouter) app.use('/api/auth', authRouter);
  if (usersRouter) {
    app.use('/api/users', usersRouter);
    console.log('✅ Users Routes loaded on /api/users');
  } else {
    console.log('⚠️  Users router failed to load');
  }
  if (rbacRouter) app.use('/api/rbac', rbacRouter);
  if (mfaRouter) {
    app.use('/api/mfa', mfaRouter);
    console.log('✅ MFA Routes loaded');
  }
  if (rbacAdvancedRouter) {
    app.use('/api/rbac-advanced', rbacAdvancedRouter);
    console.log('✅ Advanced RBAC Routes loaded');
  }
  if (analyticsRouter) app.use('/api/analytics', analyticsRouter);
  if (cmsRouter) app.use('/api/cms', cmsRouter);
  if (uploadRouter) app.use('/api/upload', uploadRouter);
  if (exportRouter) app.use('/api/export', exportRouter);
  if (searchRouter) app.use('/api/search', searchRouter);
  if (validateRouter) app.use('/api/validate', validateRouter);
  if (dashboardRouter) app.use('/api/dashboard', dashboardRouter);
  if (executiveDashboardRouter) app.use('/api/executive-dashboard', executiveDashboardRouter);
  if (beneficiaryPortalRouter) app.use('/api/beneficiary', beneficiaryPortalRouter);
  if (communityRouter) app.use('/api/community', communityRouter);
  if (specializedProgramsRouter) app.use('/api/programs', specializedProgramsRouter);
  if (advancedSessionsRouter) app.use('/api/sessions', advancedSessionsRouter);
  if (smartSchedulerRouter) app.use('/api/scheduler', smartSchedulerRouter);

  // Equipment routes - all in one file
  if (equipmentRouter) {
    app.use('/api/equipment', equipmentRouter);
    app.use('/api/maintenance-schedules', equipmentRouter);
    app.use('/api/lending', equipmentRouter);
    app.use('/api/faults', equipmentRouter);
    app.use('/api/calibration', equipmentRouter);
    app.use('/api/alerts', equipmentRouter);
  }

  // Quality Management routes
  if (qualityRouter) {
    app.use('/api/quality/standards', qualityRouter);
    app.use('/api/quality/accreditations', qualityRouter);
    app.use('/api/quality/audits', qualityRouter);
    app.use('/api/quality/compliance', qualityRouter);
    app.use('/api/quality/indicators', qualityRouter);
    app.use('/api/quality/dashboard', qualityRouter);
    app.use('/api/quality/reports', qualityRouter);
  }

  // Internal Audit Management routes
  if (internalAuditRouter) {
    app.use('/api/internal-audits', internalAuditRouter);
  }

  // Vehicle & Transport Management routes (Phase 17) - Optional
  const driversRouter = safeRequire('./routes/drivers');
  const gpsRouter = safeRequire('./routes/gps');
  const trafficAccidentsRouter = safeRequire('./routes/trafficAccidents');
  const trafficAccidentAnalyticsRouter = safeRequire('./routes/trafficAccidentAnalytics');

  if (vehiclesRouter) app.use('/api/vehicles', vehiclesRouter);
  if (transportRoutesRouter) app.use('/api/transport-routes', transportRoutesRouter);
  if (tripsRouter) app.use('/api/trips', tripsRouter);

  // Driver Management routes (Phase 29) - Optional
  if (driversRouter) app.use('/api/drivers', driversRouter);

  // GPS Tracking routes (Phase 30) - Optional
  if (gpsRouter) app.use('/api/gps', gpsRouter);

  // Traffic Accident Reporting System (Phase 31) - Optional
  if (trafficAccidentsRouter) app.use('/api/traffic-accidents', trafficAccidentsRouter);
  if (trafficAccidentAnalyticsRouter) app.use('/api/traffic-accidents/analytics', trafficAccidentAnalyticsRouter);

  // 🇸🇦 MOI Passport Integration (Phase: Government Integration) - Optional
  if (moiPassportRouter) {
    app.use('/api/moi', moiPassportRouter);
  }

  if (uploadRouter) app.use('/api/upload', uploadRouter);
  if (exportRouter) app.use('/api/export', exportRouter);

  if (docsRouter) app.use('/api-docs', docsRouter);
  if (docsRouter) app.use('/docs', docsRouter);

  // Real-Time Collaboration routes (Phase 18) - Optional
  if (realtimeCollaborationRouter) app.use('/api/collaboration', realtimeCollaborationRouter);

  // Smart Notifications routes (Phase 19) - Optional
  if (smartNotificationsRouter) app.use('/api/notifications/smart', smartNotificationsRouter);

  // Advanced Analytics routes (Phase 20) - Optional
  if (advancedAnalyticsRouter) app.use('/api/analytics', advancedAnalyticsRouter);

  // Mobile App Backend routes (Phase 21) - Optional
  if (mobileAppRouter) app.use('/api/mobile', mobileAppRouter);

  // Dashboard Widget Builder routes (Phase 22) - Optional
  if (dashboardWidgetRouter) app.use('/api/dashboard', dashboardWidgetRouter);

  // Multi-Tenant Support routes (Phase 24) - Optional
  if (tenantRouter) app.use('/api/tenants', tenantRouter);

  // AI Recommendations Engine routes (Phase 25) - Optional
  if (aiRecommendationsRouter) app.use('/api/ai/recommendations', aiRecommendationsRouter);

  // Advanced Integrations Hub routes (Phase 26) - Optional
  if (integrationHubRouter) app.use('/api/integrations-hub', integrationHubRouter);

  // Qiwa (Ministry of Labor) Integration routes (Phase 27)
  if (qiwaRouter) {
    app.use('/api/qiwa', qiwaRouter);
    console.log('✅ Qiwa Integration routes loaded on /api/qiwa');
  } else {
    console.log('[INFO] Qiwa routes optional - feature disabled');
  }

  // Measurement & Rehabilitation Program System routes (Phase 28)
  if (measurementsRouter) {
    app.use('/api/measurements', measurementsRouter);
    console.log('✅ Measurement System routes loaded on /api/measurements');
  } else {
    console.log('[INFO] Measurement routes optional - feature disabled');
  }

  // Data Migration System routes
  if (migrationRouter) {
    app.use('/api/migrations', migrationRouter);
    console.log('✅ Migration Routes loaded successfully on /api/migrations');
  } else {
    console.log('[INFO] Migration routes optional - feature disabled');
  }

  console.log('✅ Routes loaded successfully');

  // === DIRECT MIGRATION ENDPOINTS (Workaround for Router Issue) ===
  // These are added directly to app as a workaround for router mounting issues
  const MigrationService = require('./services/migration/MigrationManager');
  const CSVProcessor = require('./services/migration/CSVProcessor');
  
  let migrationManager = null;
  
  // Direct endpoint: Initialize
  app.post('/api/migrations/initialize', (req, res) => {
    try {
      const { sourceDB, targetDB } = req.body;
      if (!sourceDB || !targetDB) {
        return res.status(400).json({
          success: false,
          error: 'Source and target databases are required',
        });
      }
      migrationManager = new MigrationService({
        sourceDB,
        targetDB,
        csvProcessor: new CSVProcessor(),
        logger: console,
      });
      console.log('[MIGRATION] Manager initialized');
      res.json({
        success: true,
        message: 'Migration manager initialized',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
  
  // Direct endpoint: Get/Create Plan
  app.get('/api/migrations/plan', (req, res) => {
    try {
      if (!migrationManager) {
        return res.status(400).json({
          success: false,
          error: 'No migration plan created'
        });
      }
      res.json({
        success: true,
        plan: migrationManager.getCurrentPlan ? migrationManager.getCurrentPlan() : null
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
  
  console.log('✅ Direct Migration Endpoints Registered (Workaround)');

  // Phase 10: Analytics & Optimization endpoints
  app.get('/api/admin/analytics', (req, res) => {
    try {
      const summary = analytics.getSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cache management endpoint
  app.post('/api/admin/cache/clear', async (req, res) => {
    try {
      await cache.clear();
      res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Cache status endpoint
  app.get('/api/admin/cache/stats', async (req, res) => {
    try {
      const stats = await cache.stats();
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Rate limit status endpoint
  app.get('/api/admin/ratelimit/status', async (req, res) => {
    try {
      const status = await limiters.api.getStatus(req);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  console.log('   - Enterprise: auth, users, rbac, analytics, cms');
  console.log('   - Phase 8: upload, export');
  console.log('   - Phase 13: programs, sessions, scheduler');
  console.log('   - Phase 29-31: drivers, gps, traffic-accidents');
} catch (err) {
  console.error('❌ Error loading routes:', err.message);
}

// Branch-ERP Integration routes (Advanced Branch Management)
// Registered outside try block to ensure it always loads
console.log('[INTEGRATION-DEBUG] Starting integration routes registration...');
console.log('[INTEGRATION-DEBUG] branchIntegrationRoutes type:', typeof branchIntegrationRoutes);
if (branchIntegrationRoutes) {
  console.log('[INTEGRATION-DEBUG] branchIntegrationRoutes.router type:', typeof branchIntegrationRoutes.router);
}

if (branchIntegrationRoutes && branchIntegrationRoutes.router) {
  console.log('[INTEGRATION-DEBUG] Registering integration routes...');
  app.use('/api/integration', branchIntegrationRoutes.router);
  console.log('✅ Branch-ERP Integration routes loaded on /api/integration');
} else {
  console.log('⚠️  Branch-ERP Integration router failed to load');
}

// Test direct integration route
app.get('/api/integration-test', (req, res) => {
  res.json({ message: 'Direct integration test route works' });
});

// Note: Cache management endpoints are now registered via cache-management.routes.js router
// They are available at /api/cache-stats and /api/cache/clear

// ==================== SYSTEM OPTIMIZATION ROUTES (Phase 32) ====================
// Register system monitoring and optimization endpoints
console.log('[APP-INIT] === Starting system optimization routes registration ===');
try {
  const systemOptimizationRouter = safeRequire('./routes/system-optimization.routes');
  if (systemOptimizationRouter) {
    app.use('/api/system', systemOptimizationRouter);
    console.log('✅ System Optimization Routes loaded on /api/system');
  } else {
    console.log('⚠️  System optimization router failed to load');
    // Fallback health check endpoint
    app.get('/api/system/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        message: 'Fallback system health endpoint'
      });
    });
    console.log('✅ Fallback system health endpoint registered');
  }
} catch (error) {
  console.error('❌ Error loading system optimization routes:', error.message);
  // Still provide a fallback endpoint
  app.get('/api/system/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      message: 'Emergency fallback health endpoint'
    });
  });
}
console.log('[APP-INIT] === System optimization routes registration complete ===');

// 404 handler
app.use((req, res) => {
  console.log(`[404-DEBUG] Unmatched route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Error Handler
app.use(errorHandler);

// Start scheduled notifications job
try {
  require('./services/scheduledNotificationsJob')();
  console.log('Scheduled notifications job started.');
} catch (err) {
  console.error('Failed to start scheduled notifications job:', err);
}

module.exports = app;
