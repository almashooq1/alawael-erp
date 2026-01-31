import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Existing routes
import riskRoutes from './routes/risk.routes';
import riskAttachmentsRoutes from './routes/risk.attachments.routes';
import riskIntegrationRoutes from './routes/risk.integration.routes';
import crmCustomerRoutes from './routes/crm.customer.routes';
import crmOpportunityRoutes from './routes/crm.opportunity.routes';
import crmTicketRoutes from './routes/crm.ticket.routes';
import { setupGraphQL } from './graphql-risk';
import { setupCrmGraphQL } from './graphql-crm';

import aiRoutes from './routes/ai.routes';
import aiPredictionRoutes from './routes/ai.prediction.routes';
import aiMlRoutes from './routes/ai.ml.routes';
import aiNlpRoutes from './routes/ai.nlp.routes';
import aiOptimizationRoutes from './routes/ai.optimization.routes';
import aiPatternsRoutes from './routes/ai.patterns.routes';
import aiAutomationRoutes from './routes/ai.automation.routes';
import aiAnalyticsRoutes from './routes/ai.analytics.routes';
import aiDeepLearningRoutes from './routes/ai.deeplearning.routes';
import aiClusteringRoutes from './routes/ai.clustering.routes';
import aiAnomalyRoutes from './routes/ai.anomaly.routes';
import aiForecastingRoutes from './routes/ai.forecasting.routes';
import notificationRoutes from './routes/notifications.routes';
import accountingAiRoutes from './routes/ai.accounting.routes';
import gatewayRoutes from './routes/gateway.routes';

// Phase 8: Enhanced ML System
import mlRoutes from './routes/ml.routes';
import { mlWebSocketService } from './websocket/ml-updates';

// Phase 6: Advanced Features (if files exist)
let createGraphQLServer: any, WebSocketService: any, queueService: any, cacheService: any;
let versionMiddleware: any, setupVersioningRoutes: any;
let globalRateLimiter: any, userRateLimiter: any, concurrentRequestsLimiter: any;
let tenantMiddleware: any;
let analyticsRoutes: any;

try {
  ({ createGraphQLServer } = require('./graphql/server'));
  ({ WebSocketService } = require('./websocket'));
  ({ queueService } = require('./services/queue'));
  ({ cacheService } = require('./services/cache'));
  ({ versionMiddleware, setupVersioningRoutes } = require('./middleware/versioning'));
  ({ globalRateLimiter, userRateLimiter, concurrentRequestsLimiter } = require('./middleware/rate-limiting'));
  ({ tenantMiddleware } = require('./middleware/multi-tenant'));
  analyticsRoutes = require('./routes/analytics').default;
  // Start job processors if available
  try { require('./workers/processors'); } catch {}
  console.log('✅ Advanced features loaded successfully');
} catch (err) {
  console.log('⚠️  Advanced features not available (optional)');
}

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
const httpServer = http.createServer(app);

// ==================== MIDDLEWARE ====================

// Security
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mock user middleware for testing
app.use((req, res, next) => {
  (req as any).user = { role: 'admin', username: 'test-admin', id: 'user_123' };
  next();
});

// ==================== ADVANCED FEATURES (if available) ====================

// Rate limiting
if (globalRateLimiter) {
  app.use(globalRateLimiter);
  app.use(concurrentRequestsLimiter);
}

// Multi-tenancy
if (tenantMiddleware) {
  app.use('/api', tenantMiddleware);
}

// API versioning
if (versionMiddleware && setupVersioningRoutes) {
  app.use('/api', versionMiddleware);
  setupVersioningRoutes(app);
}

// User rate limiting
if (userRateLimiter) {
  app.use('/api', userRateLimiter('minute'));
  app.use('/api', userRateLimiter('hour'));
  app.use('/api', userRateLimiter('day'));
}

// ==================== GRAPHQL ====================

// GraphQL API for risks
setupGraphQL(app);

// GraphQL API for CRM
setupCrmGraphQL(app);

// Risk Management API
app.use('/api', riskRoutes);
app.use('/api', riskAttachmentsRoutes);
app.use('/api', riskIntegrationRoutes);

// CRM API
app.use('/api/customers', crmCustomerRoutes);
app.use('/api/opportunities', crmOpportunityRoutes);
app.use('/api/tickets', crmTicketRoutes);

// AI API
app.use('/api/ai', aiRoutes);
app.use('/api/ai', aiPredictionRoutes);
app.use('/api/ai', aiMlRoutes);
app.use('/api/ai', aiNlpRoutes);
app.use('/api/ai', aiOptimizationRoutes);
app.use('/api/ai', aiPatternsRoutes);
app.use('/api/ai', aiAutomationRoutes);
app.use('/api/ai', aiAnalyticsRoutes);
app.use('/api/ai/accounting', accountingAiRoutes);

// Unified API Gateway
app.use('/api/gateway', gatewayRoutes);

// Phase 8: Enhanced ML API
app.use('/api/ml', mlRoutes);
console.log('✅ Enhanced ML routes loaded');

// Notifications API
app.use('/api/notifications', notificationRoutes);

// ==================== ADVANCED ROUTES (if available) ====================

// Analytics routes
if (analyticsRoutes) {
  app.use('/api/analytics', analyticsRoutes);
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
    environment: NODE_ENV,
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      cache: cacheService ? 'available' : 'not-available',
      queue: queueService ? 'available' : 'not-available'
    }
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.name || 'Error',
    message: err.message || 'Internal Server Error',
    ...(NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// ==================== SERVER STARTUP ====================

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai-agent';

async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Setup Advanced GraphQL (if available)
    if (createGraphQLServer) {
      await createGraphQLServer(app);
      console.log('✅ Advanced GraphQL API ready');
    }

    // Setup WebSocket (if available)
    if (WebSocketService) {
      const wsService = new WebSocketService(httpServer);
      // Initialize ML WebSocket
      mlWebSocketService.initialize(wsService.io);
      console.log('✅ WebSocket service ready');
      console.log('✅ ML WebSocket ready at /ml namespace');
    }

    // Start server
    httpServer.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 INTELLIGENT AGENT SERVER STARTED');
      console.log('='.repeat(60));
      console.log(`\n🌐 Environment:        ${NODE_ENV}`);
      console.log(`🚀 Main Server:        http://localhost:${PORT}`);
      console.log(`💚 Health Check:       http://localhost:${PORT}/health`);
      console.log(`📊 Risk GraphQL:       http://localhost:${PORT}/graphql`);
      console.log(`📊 CRM GraphQL:        http://localhost:${PORT}/crm-graphql`);

      if (createGraphQLServer) {
        console.log(`📊 Advanced GraphQL:   http://localhost:${PORT}/graphql`);
      }
      if (WebSocketService) {
        console.log(`🔌 WebSocket:          ws://localhost:${PORT}/ws`);
      }
      if (analyticsRoutes) {
        console.log(`📈 Analytics API:      http://localhost:${PORT}/api/analytics`);
      }

      console.log('\n' + '='.repeat(60));
      console.log('\n✨ Features available:');
      console.log('   ✅ Risk Management APIs');
      console.log('   ✅ CRM APIs');
      console.log('   ✅ AI/ML APIs');
      console.log('   ✅ Risk & CRM GraphQL');

      if (createGraphQLServer) console.log('   ✅ Advanced GraphQL with Subscriptions');
      if (WebSocketService) console.log('   ✅ WebSocket Real-time Support');
      if (queueService) console.log('   ✅ Message Queue (Bull/Redis)');
      if (cacheService) console.log('   ✅ Advanced Caching Strategy');
      if (versionMiddleware) console.log('   ✅ API Versioning System');
      if (globalRateLimiter) console.log('   ✅ Enhanced Rate Limiting');
      if (analyticsRoutes) console.log('   ✅ Advanced Analytics Dashboard');
      if (tenantMiddleware) console.log('   ✅ Multi-tenant Support');

      console.log('\n' + '='.repeat(60) + '\n');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n\n⚠️  Received ${signal}, shutting down gracefully...`);
      httpServer.close(() => console.log('✅ HTTP server closed'));

      try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
      } catch {}

      if (queueService) {
        try {
          await queueService.closeAll();
          console.log('✅ Queue service closed');
        } catch {}
      }

      if (cacheService) {
        try {
          await cacheService.close();
          console.log('✅ Cache service closed');
        } catch {}
      }

      console.log('\n👋 Goodbye!\n');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('\n❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server (skip during tests)
if (
  process.env.NODE_ENV !== 'test' &&
  process.env.SKIP_LISTEN !== 'true' &&
  !process.env.VITEST_WORKER_ID
) {
  startServer();
}

export default app;
