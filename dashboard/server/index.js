/**
 * ALAWAEL Quality Dashboard - Server
 * Real-time quality monitoring API with advanced features
 * Version 2.0.0 - Enhanced Edition
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Week 2 Infrastructure - Database & Redis
const db = require('./config/database');
const redis = require('./config/redis');
const queryOptimizer = require('./utils/queryOptimizer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 🔧 PHASE 12 OPTIMIZATION: Connection and Performance Tuning
// Keep-alive settings for better connection reuse
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds
server.requestTimeout = 30000; // 30 second request timeout

// Socket keep-alive configuration
server.on('connection', socket => {
  socket.setKeepAlive(true, 60000); // 60s idle before probe
  socket.setNoDelay(true); // Disable Nagle algorithm for low latency
});

// Request concurrency limiter - Phase 12 Optimization
let activeRequests = 0;
const maxConcurrentRequests = 100; // Allow up to 100 concurrent requests

app.use((req, res, next) => {
  activeRequests++;

  if (activeRequests > maxConcurrentRequests) {
    activeRequests--;
    return res.status(503).json({
      error: 'Service temporarily unavailable - too many concurrent requests',
      active: activeRequests,
      max: maxConcurrentRequests,
      timestamp: new Date().toISOString(),
    });
  }

  res.on('finish', () => activeRequests--);
  res.on('close', () => activeRequests--);

  next();
});

// Import middleware
const { requestLogger, errorLogger, performanceMetrics } = require('./middleware/logger');
const { smartCache, clearCache, getCacheStats } = require('./middleware/cache');
const {
  configureSecurityHeaders,
  apiLimiter,
  strictLimiter,
  validateInput,
  configureCORS,
} = require('./middleware/security');
const { healthMonitor, healthMiddleware } = require('./services/health-monitor');
const { performanceOptimizer } = require('./services/performance-optimizer');

// Configure security headers
configureSecurityHeaders(app);

// CORS with security
app.use(cors(configureCORS()));

// Body parsers with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging & performance tracking
app.use(requestLogger);
app.use(performanceMetrics);
app.use(healthMiddleware);

// Input validation
app.use(validateInput);

// API rate limiting
app.use('/api', apiLimiter);

// Check if build folder exists (production mode)
const buildPath = path.join(__dirname, '../client/build');
const buildExists = fs.existsSync(buildPath);

if (buildExists) {
  console.log('📦 Serving React build from:', buildPath);
  app.use(express.static(buildPath));
} else {
  console.log('⚠️  No build folder found - running in development mode');
  console.log('   Start React client separately: cd dashboard/client && npm start');
}

// Import routes
const apiRoutes = require('./routes/api');
const { setupWebSocket } = require('./routes/websocket');
const scheduler = require('./services/scheduler');

// API Routes (with smart caching for GET requests)
app.use('/api', smartCache, apiRoutes);

// Performance tracking for all API endpoints
app.use('/api', performanceOptimizer.trackEndpointPerformance.bind(performanceOptimizer));

// WebSocket setup
setupWebSocket(wss);

// Start scheduler for automated reports
scheduler.start();

// Root route - API info (Enhanced)
app.get('/', (req, res) => {
  res.json({
    name: 'ALAWAEL Quality Dashboard API',
    version: '1.0.0',
    status: 'running',
    mode: buildExists ? 'production' : 'development',
    endpoints: {
      health: '/health',
      api: {
        status: 'GET /api/status - Get all services status',
        service: 'GET /api/service/:name - Get service details',
        run: 'POST /api/run/:service - Run quality check',
        job: 'GET /api/job/:jobId - Get job status',
        trends: 'GET /api/trends?service=X&days=7 - Get quality trends',
        recent: 'GET /api/recent?limit=20 - Get recent test runs',
      },
      websocket: 'ws://localhost:' + (process.env.PORT || 3001),
    },
    frontend: buildExists
      ? 'Serving React app on this URL'
      : 'Start React client: cd dashboard/client && npm start (Port 3002)',
  });
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await healthMonitor.getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'حدث خطأ داخلي',
      timestamp: new Date().toISOString(),
    });
  }
});

// Health history endpoint
app.get('/health/history', (req, res) => {
  res.json({
    history: healthMonitor.getHealthHistory(),
    timestamp: new Date().toISOString(),
  });
});

// System metrics endpoint
app.get('/metrics/system', (req, res) => {
  res.json({
    metrics: healthMonitor.getSystemMetrics(),
    timestamp: new Date().toISOString(),
  });
});

// Performance report endpoint
app.get('/metrics/performance', (req, res) => {
  res.json({
    report: performanceOptimizer.getPerformanceReport(),
    suggestions: performanceOptimizer.getOptimizationSuggestions(),
    memory: performanceOptimizer.getMemoryProfile(),
    timestamp: new Date().toISOString(),
  });
});

// Cache statistics endpoint
app.get('/metrics/cache', (req, res) => {
  res.json({
    stats: getCacheStats(),
    timestamp: new Date().toISOString(),
  });
});

// Database metrics endpoint (Week 2)
app.get('/metrics/database', async (req, res) => {
  try {
    const stats = db.getPoolStats();
    res.json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database metrics unavailable',
      message: 'حدث خطأ داخلي',
      timestamp: new Date().toISOString(),
    });
  }
});

// Redis metrics endpoint (Week 2)
app.get('/metrics/redis', async (req, res) => {
  try {
    const stats = redis.getStats();
    res.json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Redis metrics unavailable',
      message: 'حدث خطأ داخلي',
      timestamp: new Date().toISOString(),
    });
  }
});

// Query optimizer metrics endpoint (Week 2)
app.get('/metrics/queries', async (req, res) => {
  try {
    const stats = queryOptimizer.getStats();
    res.json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Query metrics unavailable',
      message: 'حدث خطأ داخلي',
      timestamp: new Date().toISOString(),
    });
  }
});

// Infrastructure health endpoint (Week 2)
app.get('/health/infrastructure', async (req, res) => {
  try {
    const [dbHealth, redisHealth] = await Promise.all([db.healthCheck(), redis.healthCheck()]);

    const overallHealthy = dbHealth.primary.healthy && redisHealth.healthy;

    res.status(overallHealthy ? 200 : 503).json({
      status: overallHealthy ? 'healthy' : 'degraded',
      infrastructure: {
        database: dbHealth,
        redis: redisHealth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'حدث خطأ داخلي',
      timestamp: new Date().toISOString(),
    });
  }
});

// Clear cache endpoint (POST with rate limiting)
app.post('/admin/cache/clear', strictLimiter, (req, res) => {
  const { pattern } = req.body;
  const cleared = clearCache(pattern);
  res.json({
    success: true,
    cleared: cleared === 'all' ? 'all keys' : `${cleared} keys`,
    timestamp: new Date().toISOString(),
  });
});

// Reset metrics endpoint (POST with rate limiting)
app.post('/admin/metrics/reset', strictLimiter, (req, res) => {
  healthMonitor.resetMetrics();
  performanceOptimizer.resetMetrics();
  res.json({
    success: true,
    message: 'All metrics have been reset',
    timestamp: new Date().toISOString(),
  });
});

// Serve React app for all other routes (only in production)
if (buildExists) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Enhanced error handler
app.use(errorLogger);
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId: req.requestId,
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
});

// Async initialization function (Week 2 Integration)
async function initialize() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 ALAWAEL Quality Dashboard v2.0.0 - Enhanced Edition  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('📦 Phase 13 Week 2: Database & Redis Optimization\n');

    // Initialize Database
    console.log('🔧 Initializing PostgreSQL connection pool...');
    await db.initialize();
    console.log('   ✅ Database pool ready');

    // Initialize Redis
    console.log('🔧 Initializing Redis client...');
    await redis.initialize();
    console.log('   ✅ Redis connection ready');

    // Health checks
    console.log('\n🏥 Running infrastructure health checks...');
    const [dbHealth, redisHealth] = await Promise.all([db.healthCheck(), redis.healthCheck()]);

    if (dbHealth.primary.healthy) {
      console.log(`   ✅ Database: Healthy (${dbHealth.primary.latency}ms latency)`);
      if (dbHealth.replicas && dbHealth.replicas.length > 0) {
        console.log(`   📊 Read replicas: ${dbHealth.replicas.length} active`);
      }
    } else {
      console.log('   ⚠️  Database: Degraded');
    }

    if (redisHealth.healthy) {
      console.log(`   ✅ Redis: Healthy (${redisHealth.latency}ms latency)`);
    } else {
      console.log('   ⚠️  Redis: Degraded');
    }

    // Start HTTP server
    const PORT = process.env.PORT || 3001;
    await new Promise(resolve => {
      server.listen(PORT, () => {
        console.log('\n🌐 Server Endpoints:');
        console.log(`   ✅ Server:      http://localhost:${PORT}`);
        console.log(`   📊 API:         http://localhost:${PORT}/api`);
        console.log(`   🔌 WebSocket:   ws://localhost:${PORT}`);
        console.log(`   💚 Health:      http://localhost:${PORT}/health`);
        console.log(`   🏥 Infra:       http://localhost:${PORT}/health/infrastructure`);
        console.log(`   📈 Performance: http://localhost:${PORT}/metrics/performance`);
        console.log(`   🗄️  Cache:       http://localhost:${PORT}/metrics/cache`);
        console.log(`   💾 Database:    http://localhost:${PORT}/metrics/database`);
        console.log(`   ⚡ Redis:       http://localhost:${PORT}/metrics/redis`);
        console.log(`   🔍 Queries:     http://localhost:${PORT}/metrics/queries`);
        console.log(`\n🔐 Security:    ✅ Enabled (Helmet, Rate Limiting, Validation)`);
        console.log(`⚡ Performance: ✅ Optimized (Caching, Monitoring, Logging)`);
        console.log(`💾 Database:    ✅ Connection Pooling (Primary + Replicas)`);
        console.log(
          `⚡ Redis:       ✅ Cache-Aside Pattern (Mode: ${redisHealth.mode || 'standalone'})`
        );
        console.log(`📝 Logging:     ✅ Active (File + Console)`);
        console.log(`\nPress Ctrl+C to stop\n`);
        resolve();
      });
    });
  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error('\n⚠️  Starting server without database/redis integration...');
    console.error('   Check DATABASE_OPTIMIZATION_GUIDE.md for setup instructions\n');

    // Start server anyway in degraded mode
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`\n⚠️  Server running in DEGRADED mode on port ${PORT}`);
      console.log('   Database and Redis features unavailable\n');
    });
  }
}

// Start the application
initialize().catch(err => {
  console.error('Fatal error during initialization:', err);
  process.exit(1);
});

// Graceful shutdown with database and redis cleanup (Week 2)
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM signal received: closing HTTP server...');
  scheduler.stop();

  try {
    console.log('🔧 Closing database connections...');
    await db.shutdown();
    console.log('   ✅ Database closed');

    console.log('🔧 Closing Redis connection...');
    await redis.shutdown();
    console.log('   ✅ Redis closed');
  } catch (error) {
    console.error('⚠️  Error during shutdown:', error.message);
  }

  server.close(() => {
    console.log('✅ HTTP server closed');
  });
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server...');
  scheduler.stop();

  try {
    console.log('🔧 Closing database connections...');
    await db.shutdown();
    console.log('   ✅ Database closed');

    console.log('🔧 Closing Redis connection...');
    await redis.shutdown();
    console.log('   ✅ Redis closed');
  } catch (error) {
    console.error('⚠️  Error during shutdown:', error.message);
  }

  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});
