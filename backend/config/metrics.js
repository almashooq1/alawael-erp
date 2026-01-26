/**
 * Prometheus Metrics Collection
 * تجميع مقاييس Prometheus
 */

const promClient = require('prom-client');

// Default metrics
promClient.collectDefaultMetrics();

// ================== CUSTOM METRICS ==================

/**
 * HTTP Request Duration Histogram
 * قياس مدة طلبات HTTP
 */
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

/**
 * Cache Hits/Misses Counter
 * عداد لـ Cache Hits و Misses
 */
const cacheCounter = new promClient.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'],
  registers: [promClient.register],
});

/**
 * Active Users Gauge
 * عدد المستخدمين النشطين
 */
const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users',
  registers: [promClient.register],
});

/**
 * Database Query Duration Histogram
 * مدة استعلامات قاعدة البيانات
 */
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['collection', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

/**
 * API Errors Counter
 * عداد أخطاء API
 */
const apiErrors = new promClient.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['method', 'route', 'status_code', 'error_type'],
  registers: [promClient.register],
});

/**
 * Redis Operations Counter
 * عداد عمليات Redis
 */
const redisOperations = new promClient.Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [promClient.register],
});

/**
 * Memory Usage Gauge
 * استخدام الذاكرة
 */
const memoryUsage = new promClient.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
  registers: [promClient.register],
});

/**
 * Socket.IO Connections Gauge
 * عدد اتصالات Socket.IO
 */
const socketConnections = new promClient.Gauge({
  name: 'socket_io_connections',
  help: 'Number of active Socket.IO connections',
  registers: [promClient.register],
});

/**
 * Request Queue Length Gauge
 * طول صف الطلبات
 */
const requestQueueLength = new promClient.Gauge({
  name: 'request_queue_length',
  help: 'Length of request queue',
  registers: [promClient.register],
});

/**
 * Business Metrics
 * مقاييس الأعمال
 */
const businessMetrics = {
  totalUsers: new promClient.Gauge({
    name: 'total_users',
    help: 'Total number of users',
    registers: [promClient.register],
  }),

  totalTransactions: new promClient.Counter({
    name: 'total_transactions',
    help: 'Total number of transactions',
    labelNames: ['type', 'status'],
    registers: [promClient.register],
  }),

  transactionValue: new promClient.Histogram({
    name: 'transaction_value',
    help: 'Value of transactions',
    labelNames: ['type'],
    buckets: [10, 100, 500, 1000, 5000, 10000],
    registers: [promClient.register],
  }),

  documentProcessing: new promClient.Histogram({
    name: 'document_processing_seconds',
    help: 'Time taken to process documents',
    labelNames: ['type'],
    buckets: [0.1, 0.5, 1, 5, 10, 30],
    registers: [promClient.register],
  }),
};

/**
 * Middleware for request timing
 * Middleware لقياس وقت الطلب
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';

    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);

    // Track errors
    if (res.statusCode >= 400) {
      apiErrors.labels(req.method, route, res.statusCode, 'http_error').inc();
    }
  });

  next();
};

/**
 * Update Memory Metrics
 * تحديث مقاييس الذاكرة
 */
const updateMemoryMetrics = () => {
  const mem = process.memoryUsage();
  memoryUsage.labels('heap_used').set(mem.heapUsed);
  memoryUsage.labels('heap_total').set(mem.heapTotal);
  memoryUsage.labels('rss').set(mem.rss);
  memoryUsage.labels('external').set(mem.external);
};

/**
 * Track Cache Operations
 * تتبع عمليات Cache
 */
const trackCacheHit = () => {
  cacheCounter.labels('access', 'hit').inc();
};

const trackCacheMiss = () => {
  cacheCounter.labels('access', 'miss').inc();
};

/**
 * Track Socket.IO Events
 * تتبع أحداث Socket.IO
 */
const trackSocketEvent = eventName => {
  // Can be extended for specific event tracking
};

/**
 * Track Database Queries
 * تتبع استعلامات قاعدة البيانات
 */
const trackDbQuery = (collection, operation, duration) => {
  dbQueryDuration.labels(collection, operation).observe(duration);
};

/**
 * Track Redis Operations
 * تتبع عمليات Redis
 */
const trackRedisOperation = (operation, success = true) => {
  redisOperations.labels(operation, success ? 'success' : 'failure').inc();
};

/**
 * Track Business Transaction
 * تتبع معاملة الأعمال
 */
const trackTransaction = (type, status, value = 0) => {
  businessMetrics.totalTransactions.labels(type, status).inc();

  if (value > 0) {
    businessMetrics.transactionValue.labels(type).observe(value);
  }
};

/**
 * Initialize Metrics Server
 * تهيئة خادم المقاييس
 */
const initMetricsServer = (app, port = 9091) => {
  app.get('/metrics', (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(promClient.register.metrics());
  });

  // Update memory metrics every 5 seconds
  setInterval(updateMemoryMetrics, 5000);

  console.log(`✅ Metrics server running on port ${port}`);
  return port;
};

/**
 * Get Current Metrics Snapshot
 * الحصول على لقطة من المقاييس الحالية
 */
const getMetricsSnapshot = async () => {
  return {
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    cpuUsage: process.cpuUsage(),
  };
};

module.exports = {
  // Middleware
  metricsMiddleware,
  initMetricsServer,

  // Metrics
  httpRequestDuration,
  cacheCounter,
  activeUsers,
  dbQueryDuration,
  apiErrors,
  redisOperations,
  memoryUsage,
  socketConnections,
  requestQueueLength,
  businessMetrics,

  // Tracking functions
  trackCacheHit,
  trackCacheMiss,
  trackSocketEvent,
  trackDbQuery,
  trackRedisOperation,
  trackTransaction,
  updateMemoryMetrics,
  getMetricsSnapshot,

  // Prometheus register
  register: promClient.register,
};
