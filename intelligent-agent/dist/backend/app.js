"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Existing routes
const risk_routes_1 = __importDefault(require("./routes/risk.routes"));
const risk_attachments_routes_1 = __importDefault(require("./routes/risk.attachments.routes"));
const risk_integration_routes_1 = __importDefault(require("./routes/risk.integration.routes"));
const crm_customer_routes_1 = __importDefault(require("./routes/crm.customer.routes"));
const crm_opportunity_routes_1 = __importDefault(require("./routes/crm.opportunity.routes"));
const crm_ticket_routes_1 = __importDefault(require("./routes/crm.ticket.routes"));
const graphql_risk_1 = require("./graphql-risk");
const graphql_crm_1 = require("./graphql-crm");
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const ai_prediction_routes_1 = __importDefault(require("./routes/ai.prediction.routes"));
const ai_ml_routes_1 = __importDefault(require("./routes/ai.ml.routes"));
const ai_nlp_routes_1 = __importDefault(require("./routes/ai.nlp.routes"));
const ai_optimization_routes_1 = __importDefault(require("./routes/ai.optimization.routes"));
const ai_patterns_routes_1 = __importDefault(require("./routes/ai.patterns.routes"));
const ai_automation_routes_1 = __importDefault(require("./routes/ai.automation.routes"));
const ai_analytics_routes_1 = __importDefault(require("./routes/ai.analytics.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const ai_accounting_routes_1 = __importDefault(require("./routes/ai.accounting.routes"));
const gateway_routes_1 = __importDefault(require("./routes/gateway.routes"));
// Phase 8: Enhanced ML System
const ml_routes_1 = __importDefault(require("./routes/ml.routes"));
const ml_updates_1 = require("./websocket/ml-updates");
// Phase 6: Advanced Features (if files exist)
let createGraphQLServer, WebSocketService, queueService, cacheService;
let versionMiddleware, setupVersioningRoutes;
let globalRateLimiter, userRateLimiter, concurrentRequestsLimiter;
let tenantMiddleware;
let analyticsRoutes;
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
    try {
        require('./workers/processors');
    }
    catch { }
    console.log('✅ Advanced features loaded successfully');
}
catch (err) {
    console.log('⚠️  Advanced features not available (optional)');
}
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
// ==================== MIDDLEWARE ====================
// Security
app.use((0, helmet_1.default)({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));
// CORS
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
// Body parsers
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Compression
app.use((0, compression_1.default)());
// Logging
if (NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
// Mock user middleware for testing
app.use((req, res, next) => {
    req.user = { role: 'admin', username: 'test-admin', id: 'user_123' };
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
(0, graphql_risk_1.setupGraphQL)(app);
// GraphQL API for CRM
(0, graphql_crm_1.setupCrmGraphQL)(app);
// Risk Management API
app.use('/api', risk_routes_1.default);
app.use('/api', risk_attachments_routes_1.default);
app.use('/api', risk_integration_routes_1.default);
// CRM API
app.use('/api/customers', crm_customer_routes_1.default);
app.use('/api/opportunities', crm_opportunity_routes_1.default);
app.use('/api/tickets', crm_ticket_routes_1.default);
// AI API
app.use('/api/ai', ai_routes_1.default);
app.use('/api/ai', ai_prediction_routes_1.default);
app.use('/api/ai', ai_ml_routes_1.default);
app.use('/api/ai', ai_nlp_routes_1.default);
app.use('/api/ai', ai_optimization_routes_1.default);
app.use('/api/ai', ai_patterns_routes_1.default);
app.use('/api/ai', ai_automation_routes_1.default);
app.use('/api/ai', ai_analytics_routes_1.default);
app.use('/api/ai/accounting', ai_accounting_routes_1.default);
// Unified API Gateway
app.use('/api/gateway', gateway_routes_1.default);
// Phase 8: Enhanced ML API
app.use('/api/ml', ml_routes_1.default);
console.log('✅ Enhanced ML routes loaded');
// Notifications API
app.use('/api/notifications', notifications_routes_1.default);
// ==================== ADVANCED ROUTES (if available) ====================
// Analytics routes
if (analyticsRoutes) {
    app.use('/api/analytics', analyticsRoutes);
}
// Serve uploaded files statically
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0',
        environment: NODE_ENV,
        services: {
            mongodb: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
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
app.use((err, req, res, next) => {
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
        await mongoose_1.default.connect(MONGODB_URI);
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
            ml_updates_1.mlWebSocketService.initialize(wsService.io);
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
            if (createGraphQLServer)
                console.log('   ✅ Advanced GraphQL with Subscriptions');
            if (WebSocketService)
                console.log('   ✅ WebSocket Real-time Support');
            if (queueService)
                console.log('   ✅ Message Queue (Bull/Redis)');
            if (cacheService)
                console.log('   ✅ Advanced Caching Strategy');
            if (versionMiddleware)
                console.log('   ✅ API Versioning System');
            if (globalRateLimiter)
                console.log('   ✅ Enhanced Rate Limiting');
            if (analyticsRoutes)
                console.log('   ✅ Advanced Analytics Dashboard');
            if (tenantMiddleware)
                console.log('   ✅ Multi-tenant Support');
            console.log('\n' + '='.repeat(60) + '\n');
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            console.log(`\n\n⚠️  Received ${signal}, shutting down gracefully...`);
            httpServer.close(() => console.log('✅ HTTP server closed'));
            try {
                await mongoose_1.default.connection.close();
                console.log('✅ MongoDB connection closed');
            }
            catch { }
            if (queueService) {
                try {
                    await queueService.closeAll();
                    console.log('✅ Queue service closed');
                }
                catch { }
            }
            if (cacheService) {
                try {
                    await cacheService.close();
                    console.log('✅ Cache service closed');
                }
                catch { }
            }
            console.log('\n👋 Goodbye!\n');
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        console.error('\n❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Start the server (skip during tests)
if (process.env.NODE_ENV !== 'test' &&
    process.env.SKIP_LISTEN !== 'true' &&
    !process.env.VITEST_WORKER_ID) {
    startServer();
}
exports.default = app;
