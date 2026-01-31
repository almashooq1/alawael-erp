"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const ai_prediction_routes_1 = __importDefault(require("./routes/ai.prediction.routes"));
const ai_ml_routes_1 = __importDefault(require("./routes/ai.ml.routes"));
const ai_nlp_routes_1 = __importDefault(require("./routes/ai.nlp.routes"));
const ai_optimization_routes_1 = __importDefault(require("./routes/ai.optimization.routes"));
const ai_patterns_routes_1 = __importDefault(require("./routes/ai.patterns.routes"));
const ai_automation_routes_1 = __importDefault(require("./routes/ai.automation.routes"));
const ai_analytics_routes_1 = __importDefault(require("./routes/ai.analytics.routes"));
const ai_deeplearning_routes_1 = __importDefault(require("./routes/ai.deeplearning.routes"));
const ai_clustering_routes_1 = __importDefault(require("./routes/ai.clustering.routes"));
const ai_anomaly_routes_1 = __importDefault(require("./routes/ai.anomaly.routes"));
const ai_forecasting_routes_1 = __importDefault(require("./routes/ai.forecasting.routes"));
const ml_routes_1 = __importDefault(require("./routes/ml.routes"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.ML_PORT || process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
// ==================== MIDDLEWARE ====================
app.use((0, helmet_1.default)({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
}));
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
if (NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
// ==================== HEALTH ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'ML Server',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.1.0',
    });
});
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        service: 'Intelligent Agent ML Server',
        timestamp: new Date().toISOString(),
        features: [
            'Advanced ML API',
            'Risk Classification',
            'Delay Prediction',
            'Bottleneck Detection',
            'Batch Prediction',
            'Model Training',
            'Explainability',
            'Optimization Recommendations',
        ],
    });
});
// ==================== ML / AI ROUTES ====================
app.use('/api/ai', ai_routes_1.default);
app.use('/api/ai', ai_prediction_routes_1.default);
app.use('/api/ai', ai_ml_routes_1.default);
app.use('/api/ai', ai_nlp_routes_1.default);
app.use('/api/ai', ai_optimization_routes_1.default);
app.use('/api/ai', ai_patterns_routes_1.default);
app.use('/api/ai', ai_automation_routes_1.default);
app.use('/api/ai', ai_analytics_routes_1.default);
app.use('/api/ai', ai_deeplearning_routes_1.default);
app.use('/api/ai', ai_clustering_routes_1.default);
app.use('/api/ai', ai_anomaly_routes_1.default);
app.use('/api/ai', ai_forecasting_routes_1.default);
// Enhanced ML routes
app.use('/api/ml', ml_routes_1.default);
// ==================== ROUTE MAP ====================
app.get('/api/ml/routes', (req, res) => {
    res.json({
        success: true,
        data: {
            health: 'GET /health',
            status: 'GET /status',
            ml: {
                classify: 'POST /api/ml/classify',
                predictDelay: 'POST /api/ml/predict/delay',
                predictBatch: 'POST /api/ml/predict/batch',
                train: 'POST /api/ml/train',
                metrics: 'GET /api/ml/metrics',
                analyze: 'POST /api/ml/analyze/complete',
                explain: 'POST /api/ml/explain',
                compare: 'POST /api/ml/compare',
                optimize: 'POST /api/ml/optimize',
                health: 'GET /api/ml/health',
            },
            ai: {
                base: 'GET /api/ai',
                prediction: 'POST /api/ai/prediction',
                nlp: 'POST /api/ai/nlp',
                optimization: 'POST /api/ai/optimization',
                patterns: 'POST /api/ai/patterns',
                automation: 'POST /api/ai/automation',
                analytics: 'GET /api/ai/analytics',
                deepLearning: 'POST /api/ai/deeplearning',
                clustering: 'POST /api/ai/clustering',
                anomaly: 'POST /api/ai/anomaly',
                forecasting: 'POST /api/ai/forecasting',
            },
        },
    });
});
// ==================== ERROR HANDLING ====================
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
    });
});
app.use((err, req, res, _next) => {
    console.error('ML Server Error:', err);
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
        error: err.name || 'Error',
        message: err.message || 'Internal Server Error',
        ...(NODE_ENV === 'development' && { stack: err.stack }),
        timestamp: new Date().toISOString(),
    });
});
// ==================== STARTUP ====================
if (require.main === module) {
    server.listen(PORT, () => {
        console.log('\n' + '='.repeat(60));
        console.log('🤖 INTELLIGENT AGENT ML SERVER STARTED');
        console.log('='.repeat(60));
        console.log(`🌐 Environment:  ${NODE_ENV}`);
        console.log(`🚀 Server:       http://localhost:${PORT}`);
        console.log(`💚 Health:       http://localhost:${PORT}/health`);
        console.log(`📋 Routes:       http://localhost:${PORT}/api/ml/routes`);
        console.log('='.repeat(60) + '\n');
    });
    const shutdown = (signal) => {
        console.log(`\n⚠️  Received ${signal}, shutting down...`);
        server.close(() => {
            console.log('✅ ML server closed');
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
exports.default = app;
