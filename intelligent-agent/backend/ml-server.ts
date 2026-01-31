import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

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
import mlRoutes from './routes/ml.routes';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.ML_PORT || process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== MIDDLEWARE ====================
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ==================== HEALTH ====================
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ML Server',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.1.0',
  });
});

app.get('/status', (req: Request, res: Response) => {
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
app.use('/api/ai', aiRoutes);
app.use('/api/ai', aiPredictionRoutes);
app.use('/api/ai', aiMlRoutes);
app.use('/api/ai', aiNlpRoutes);
app.use('/api/ai', aiOptimizationRoutes);
app.use('/api/ai', aiPatternsRoutes);
app.use('/api/ai', aiAutomationRoutes);
app.use('/api/ai', aiAnalyticsRoutes);
app.use('/api/ai', aiDeepLearningRoutes);
app.use('/api/ai', aiClusteringRoutes);
app.use('/api/ai', aiAnomalyRoutes);
app.use('/api/ai', aiForecastingRoutes);

// Enhanced ML routes
app.use('/api/ml', mlRoutes);

// ==================== ROUTE MAP ====================
app.get('/api/ml/routes', (req: Request, res: Response) => {
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
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
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

  const shutdown = (signal: string) => {
    console.log(`\n⚠️  Received ${signal}, shutting down...`);
    server.close(() => {
      console.log('✅ ML server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
