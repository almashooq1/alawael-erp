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
// const { errorHandler } = require('./utils/errorHandler'); // Unused

// Security middleware
const securityHeaders = require('./middleware/securityHeaders');
const sanitizeInput = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { suspiciousActivityDetector } = require('./utils/security');
const responseHandler = require('./middleware/responseHandler');
const { maintenanceMiddleware } = require('./middleware/maintenance.middleware');
const apiKeyAuth = require('./middleware/apiKey.middleware'); // Added API Key

// API Routes

const authRoutes = require('./api/routes/auth.routes');
const usersRoutes = require('./api/routes/users.routes');
const modulesRoutes = require('./api/routes/modules.routes');
const crmRoutes = require('./api/routes/crm.routes.legacy');
const hrRoutes = require('./routes/hr.routes');
// const hropsRoutes = require('./routes/hrops.routes'); // Unused
const hrAdvancedRoutes = require('./routes/hr-advanced.routes');
const reportsRoutes = require('./routes/reports.routes');
const financeRoutes = require('./routes/finance.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const inboxRoutes = require('./routes/notification.routes'); // New Persistent Inbox
const adminRoutes = require('./routes/admin.routes');
const hrMongoRoutes = require('./routes/hr_advanced.routes'); // REPLACED: Advanced HR (Mongo)
const financeMongoRoutes = require('./routes/finance_advanced.routes'); // REPLACED: Advanced Finance
const beneficiaryRoutes = require('./routes/beneficiary.routes'); // NEW: Patient Profiles
const aiRoutes = require('./routes/ai.routes');
// const backupRoutes = require('./routes/backup.routes'); // NEW: Backup & Restore - TEMPORARILY DISABLED

const predictionsRoutes = require('./routes/predictions.routes');
const documentRoutesOld = require('./routes/documentRoutes');
const documentsManagementRoutes = require('./api/routes/documents.routes');
const messagingRoutes = require('./routes/messaging.routes');
// const projectManagementRoutes = require('./routes/projectManagement.routes'); // Unused
const rehabilitationRoutes = require('./routes/rehabilitation.routes');
const workflowRoutes = require('./api/routes/workflows.routes');
const performanceRoutes = require('./routes/performanceRoutes');
const systemRoutes = require('./routes/system.routes'); // New System Routes
const dashboardRoutes = require('./routes/dashboard.routes'); // Integration Dashboard
const emailRoutes = require('./routes/emailRoutes'); // Email Service
const smsRoutes = require('./routes/smsRoutes'); // SMS Service
const searchRoutes = require('./routes/search.routes'); // Global Search
// Phase 13 Advanced Feature Routes
const userProfileRoutes = require('./routes/userProfileRoutes');
const twoFARoutes = require('./routes/twoFARoutes');
const advancedSearchRoutes = require('./routes/searchRoutes');
const paymentAdvancedRoutes = require('./routes/paymentRoutes');
const notificationAdvancedRoutes = require('./routes/notificationRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const aiAdvancedRoutes = require('./routes/aiRoutes');
const automationRoutes = require('./routes/automationRoutes');
const organizationRoutes = require('./routes/organization.routes'); // NEW: Organizational Structure

// Performance optimization modules
const { initializeRedis, compressionMiddleware, requestTimerMiddleware, cacheMiddleware } = require('./config/performance');

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
  socketManager.initialize(io);

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
    const modules = ['reports', 'finance', 'hr', 'security', 'elearning', 'rehab', 'appeals', 'biometrics'];
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
app.use(apiKeyAuth); // Allow API Key Authentication globally
app.use(maintenanceMiddleware);
// GLOBAL MAINTENANCE CHECK

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
    message: 'AlAwael ERP Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AlAwael ERP Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/employees', hrRoutes);
app.use('/api/v1/employees', hrRoutes);
// app.use('/api/hr', hropsRoutes); // Legacy - Commented to avoid conflict with Advanced HR
if (isTestEnv) {
  app.use('/api/hr/employees', hrRoutes);
}
// Always mount Advanced HR (Phase 6)
app.use('/api/hr', hrAdvancedRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/inbox', inboxRoutes); // Mount Inbox Routes
app.use('/api/integrations', require('./routes/integration.routes')); // Mount Integration Routes (Phase 9)
app.use('/api/analytics', require('./routes/analytics.routes')); // Mount Analytics Routes (Phase 10)
app.use('/api/dms', require('./routes/dms.routes')); // Mount DMS Routes (Phase 8)
app.use('/api/admin', adminRoutes);

// === Backup & Data Management ===
// app.use('/api/backup', backupRoutes); // Backup & Restore System - TEMPORARILY DISABLED
// Backup routes will be added when dependency issue is resolved

// === Communication Services ===
app.use('/api/email', emailRoutes); // Email Service
app.use('/api/sms', smsRoutes); // SMS Service

// === Enterprise Modules (MongoDB Backed) ===
app.use('/api/hr-advanced', hrMongoRoutes); // New HR System
app.use('/api/finance-advanced', financeMongoRoutes); // New Finance System
app.use('/api/beneficiaries', beneficiaryRoutes); // New Patient System
app.use('/api/rehabilitation-advanced', require('./routes/rehabilitation_advanced.routes')); // New Rehab System
app.use('/api/dashboard', dashboardRoutes); // New Executive Dashboard
app.use('/api/search', searchRoutes); // Global Search Engine
// === Phase 13: Advanced Feature Modules ===
app.use('/api/user-profile', userProfileRoutes);
app.use('/api/2fa', twoFARoutes);
app.use('/api/search-advanced', advancedSearchRoutes);
app.use('/api/payments-advanced', paymentAdvancedRoutes);
app.use('/api/notifications-advanced', notificationAdvancedRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/ai-advanced', aiAdvancedRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/organization', organizationRoutes); // Organizational Structure

// === Support Modules ===
app.use('/api/inventory', require('./routes/inventory_rehab.routes')); // Equipment & Rooms
app.use('/api/reports/rehab', require('./routes/reports_rehab.routes')); // Advanced Reports

// === External Portals ===
app.use('/api/portal', require('./routes/portal.routes')); // Parents Portal
app.use('/api/transport-smart', require('./routes/transport_smart.routes')); // Smart Transportation
app.use('/api/crm-smart', require('./routes/crm_smart.routes')); // Smart CRM & Leads
app.use('/api/clinical-smart', require('./routes/clinical_smart.routes')); // Clinical AI & Goal Bank
app.use('/api/hr-smart', require('./routes/hr_smart.routes')); // Smart Payroll & Commissions
app.use('/api/finance-smart', require('./routes/finance_smart.routes')); // Smart Billing & Revenue
app.use('/api/scheduling-smart', require('./routes/scheduling_smart.routes')); // Intelligent Capacity & Waitlist
app.use('/api/homecare-smart', require('./routes/homecare_smart.routes')); // Smart Home Goals & Family Engagement
app.use('/api/quality-smart', require('./routes/quality_smart.routes')); // QA & Compliance Watchdog
app.use('/api/gamification-smart', require('./routes/gamification_smart.routes')); // Loyalty & Child Motivation
app.use('/api/feedback-smart', require('./routes/feedback_smart.routes')); // NPS & Reputation Management
app.use('/api/patient-smart', require('./routes/patient_smart.routes')); // Advanced EMR & 360 Patient View
app.use('/api/reports-smart', require('./routes/reports_smart.routes')); // Auto-Generated Medical Reports
app.use('/api/training-smart', require('./routes/training_smart.routes')); // AI Staff Development (LMS)
app.use('/api/retention-smart', require('./routes/retention_smart.routes')); // Patient Risk & Churn Prediction
app.use('/api/substitution-smart', require('./routes/substitution_smart.routes')); // Intelligent Staff Replacement
app.use('/api/referral-smart', require('./routes/referral_smart.routes')); // AI OCR & Referral Processing
app.use('/api/voice-smart', require('./routes/voice_smart.routes')); // AI Clinical Voice Transcription
app.use('/api/integrated-care', require('./routes/integrated_care.routes')); // Integrated Educational, Therapeutic & Life Skills Plans
app.use('/api/documents-smart', require('./routes/smart_document.routes')); // Smart Documents Generator
app.use('/api/inventory-smart', require('./routes/inventory_smart.routes')); // Predictive Stock & Maintenance
app.use('/api/plan-smart', require('./routes/plan_smart.routes')); // Integrated Treatment Plan Generator
app.use('/api/admission-smart', require('./routes/admission_smart.routes')); // Strategic Admission Simulator
app.use('/api/telehealth-smart', require('./routes/telehealth_smart.routes')); // Remote Therapy & Engagement AI
app.use('/api/parent-coach-smart', require('./routes/parent_coach_smart.routes')); // 24/7 AI Clinical Assistant for Parents
app.use('/api/iot-smart', require('./routes/iot_smart.routes')); // Connected Rehab (Wearables & Kiosks)
app.use('/api/federation-smart', require('./routes/federation_smart.routes')); // Multi-Branch Enterprise Management
app.use('/api/security-smart', require('./routes/security_smart.routes')); // AI Anomaly Detection & Audit
app.use('/api/finance-core', require('./routes/finance_core.routes')); // General Ledger & Profitability
app.use('/api/hr-core', require('./routes/hr_core.routes')); // Contracts & Attendance
app.use('/api/notifications-center', require('./routes/notification_center.routes')); // Omni-channel Gateway
app.use('/api/family-portal', require('./routes/family_portal.routes')); // Mobile App Backend
app.use('/api/marketing-smart', require('./routes/marketing_smart.routes')); // Growth & Lead Scoring
app.use('/api/insurance-smart', require('./routes/insurance_smart.routes')); // Claims Scrubbing & Reconciliation
app.use('/api/archiving-smart', require('./routes/archiving_smart.routes')); // GDPR Compliance & Research
app.use('/api/cdss-smart', require('./routes/cdss_smart.routes')); // PHASE 45: Clinical Decision Support System
app.use('/api/facility-smart', require('./routes/facility_smart.routes')); // PHASE 47: Green Rehab & Predictive Maintenance
app.use('/api/community-smart', require('./routes/community_smart.routes')); // PHASE 48: Safe Social Network & Exchange
app.use('/api/operations-smart', require('./routes/operations_smart.routes')); // PHASE 49: Advanced Logistics, Support & BI
app.use('/api/strategy-smart', require('./routes/strategy_smart.routes')); // PHASE 50 & 51: Digital Twin & Accessibility

// === Phase 97 & 98: Smart Wearable & Voice Assistant ===
app.use('/api/wearable-smart', require('./routes/wearable_smart.routes'));
app.use('/api/voice-assistant-smart', require('./routes/voice_assistant_smart.routes'));

// === Phase 99: Global Tele-Health & Robotics ===
app.use('/api/robotics-smart', require('./routes/robotics_smart.routes'));

// === Phase 100: Cognitive Training & Integration ===
app.use('/api/cognitive-smart', require('./routes/cognitive_smart.routes'));

// Note: global-expert is likely already registered under Phase 60 section, ensuring it's updated.

app.use('/api/immersive-smart', require('./routes/immersive_smart.routes')); // PHASE 52: VR/AR Therapy Management
app.use('/api/genomics-smart', require('./routes/genomics_smart.routes')); // PHASE 53: Precision Medicine & Genomics
app.use('/api/academic-smart', require('./routes/academic_smart.routes')); // PHASE 54: Research Hub & Internship
app.use('/api/nutrition-smart', require('./routes/nutrition_smart.routes')); // PHASE 55: Smart Nutrition & Gut-Brain
app.use('/api/orchestrator-smart', require('./routes/orchestrator_smart.routes')); // PHASE 56: Autonomous Workflow & Self-Healing
app.use('/api/legal-smart', require('./routes/legal_smart.routes')); // PHASE 57: Compliance Sentinel & Audit
app.use('/api/school-smart', require('./routes/school_smart.routes')); // PHASE 58: School Collaboration & IEP Sync
app.use('/api/wellbeing-smart', require('./routes/wellbeing_smart.routes')); // PHASE 59: Staff Burnout & Resilience
app.use('/api/global-expert-smart', require('./routes/global_expert_smart.routes')); // PHASE 60: International Second Opinion
app.use('/api/media-analysis-smart', require('./routes/media_analysis_smart.routes')); // PHASE 61: Video/Audio Clinical AI
app.use('/api/appeals-smart', require('./routes/appeals_smart.routes')); // PHASE 62: AI Smart Appeals (Revenue Protection)
app.use('/api/biometrics-smart', require('./routes/biometrics_smart.routes')); // PHASE 63: Voice/Face High Security & Liveness
app.use('/api/vocational-smart', require('./routes/vocational_smart.routes')); // PHASE 64: Smart Vocational Rehab & Job Matching
app.use('/api/casemanager-smart', require('./routes/casemanager_smart.routes')); // PHASE 65: AI Case Management & Conflict Detection
app.use('/api/family-smart', require('./routes/family_smart.routes')); // PHASE 66: Enhanced Family Portal & AI Daily Digests
app.use('/api/audit-smart', require('./routes/audit_smart.routes')); // PHASE 67: Smart Audit, Compliance & DLP
app.use('/api/integration-smart', require('./routes/integration_smart.routes')); // PHASE 68: Gov Gateway & FHIR Interoperability
app.use('/api/philanthropy-smart', require('./routes/philanthropy_smart.routes')); // PHASE 69: Smart Grants & Donor Impact
app.use('/api/research-smart', require('./routes/research_smart.routes')); // PHASE 70: Clinical Trials & Data Science
app.use('/api/crisis-smart', require('./routes/crisis_smart.routes')); // PHASE 71: Emergency Response & Safety Protocols
app.use('/api/content-smart', require('./routes/content_smart.routes')); // PHASE 72: AI Therapeutic Content Generator
app.use('/api/knowledge-smart', require('./routes/knowledge_smart.routes')); // PHASE 73: Clinical Brain & Lessons Learned
app.use('/api/procurement-smart', require('./routes/procurement_smart.routes')); // PHASE 74: AI Supply Chain & Auto Restock
app.use('/api/roster-smart', require('./routes/roster_smart.routes')); // PHASE 75: AI Staff Scheduling & Burnout Prevention
app.use('/api/journey-smart', require('./routes/journey_smart.routes')); // PHASE 76: Patient Experience Analytics & Journey Mapping
app.use('/api/environment-smart', require('./routes/environment_smart.routes')); // PHASE 77: Smart Sensory Rooms & Green Energy
app.use('/api/reception-smart', require('./routes/reception_smart.routes')); // PHASE 78: Autonomous Kiosk & Visitor Management
app.use('/api/job-coach-smart', require('./routes/job_coach_smart.routes')); // PHASE 79: Supported Employment & Employer Portal
app.use('/api/iep-smart', require('./routes/iep_smart.routes')); // PHASE 80: Digital IEP & Meeting Orchestrator
app.use('/api/transport-smart', require('./routes/transport_logistics_smart.routes')); // PHASE 81: AI Route & Fleet Safety
app.use('/api/events-smart', require('./routes/events_smart.routes')); // PHASE 82: Workshop Marketplace & Certificates
app.use('/api/quality-smart', require('./routes/quality_control_smart.routes')); // PHASE 83: Accreditation & QC
app.use('/api/knowledge-graph-smart', require('./routes/knowledge_graph_smart.routes')); // PHASE 84: AI Knowledge Graph
app.use('/api/alumni-smart', require('./routes/alumni_smart.routes')); // PHASE 85: Alumni Success & Mentorship
app.use('/api/library-smart', require('./routes/library_smart.routes')); // PHASE 86: Sensory Library & Lending
app.use('/api/ethics-smart', require('./routes/ethics_smart.routes')); // PHASE 87: Bio-Ethics & Digital Consent
app.use('/api/sports-smart', require('./routes/sports_smart.routes')); // PHASE 88: Adaptive Sports & Special Olympics
app.use('/api/arts-smart', require('./routes/creative_arts_smart.routes')); // PHASE 89: Music & Art Therapy
app.use('/api/sleep-smart', require('./routes/sleep_smart.routes')); // PHASE 90: Sleep & Circadian Mgmt
app.use('/api/behavior-smart', require('./routes/behavior_smart.routes')); // PHASE 91: Smart Behavior (ABC)
app.use('/api/aac-smart', require('./routes/aac_smart.routes')); // PHASE 92: Smart AAC Prediction
app.use('/api/sensory-smart', require('./routes/sensory_diet_smart.routes')); // PHASE 93: Sensory Diet & Regulation
app.use('/api/neuro-smart', require('./routes/neuro_feedback_smart.routes')); // PHASE 94: EEG & Neuro-Feedback
app.use('/api/twin-smart', require('./routes/digital_twin_smart.routes')); // PHASE 95: Digital Twin Aggregator
app.use('/api/sim-smart', require('./routes/simulation_smart.routes')); // PHASE 96: Future Forecasting

app.use('/api/ai', aiRoutes);

app.use('/api/ai-predictions', predictionsRoutes);
app.use('/api/documents', documentsManagementRoutes);
app.use('/api/v1/documents', documentsManagementRoutes);
app.use('/api/documents-old', documentRoutesOld);
app.use('/api/messages', messagingRoutes);
// Phase 4: Project Management
app.use('/api/pm', require('./routes/projectManagement.routes'));
app.use('/api/v1', require('./routes/projectManagement.routes'));
// Phase 5: E-Learning Platform
app.use('/api/lms', require('./routes/eLearning.routes'));
// Phase 6: Advanced HR System
app.use('/api/hr-system', require('./routes/hr_phase6.routes'));
// Phase 7: Security & Compliance
app.use('/api/security', require('./routes/security.routes'));
// Phase 8: Enhanced DMS
app.use('/api/dms', require('./routes/dms.routes'));

app.use('/api/rehabilitation', rehabilitationRoutes);
app.use('/api', workflowRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/system', systemRoutes); // Mount System Routes
app.use('/api/payments', require('./routes/payments.routes')); // Phase 2: Payments for Phase 2

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
    { title: 'Average Response Time', value: '245ms', trend: '+5%', status: 'normal', icon: 'clock' },
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
app.use((err, req, res, _next) => {
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
