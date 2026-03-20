'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { v4: uuid } = require('uuid');
const routes = require('./routes.config');

const app = express();
const PORT = process.env.PORT || 3600;
const JWT_SECRET = process.env.JWT_SECRET || 'alawael-jwt-secret-2026';

/* ═══════════════════════════════════════════════════════════════ */
/*  Redis                                                         */
/* ═══════════════════════════════════════════════════════════════ */
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
  lazyConnect: true,
});
redis.connect().catch(() => console.warn('⚠️ Redis not available — gateway running without cache'));

/* ═══════════════════════════════════════════════════════════════ */
/*  Middleware Stack                                               */
/* ═══════════════════════════════════════════════════════════════ */
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID'],
  }),
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Request ID injection
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || uuid();
  req.headers['x-request-id'] = req.id;
  next();
});

// Access logging (combined format)
app.use(morgan(':method :url :status :response-time ms — :req[x-request-id]'));

/* ═══════════════════════════════════════════════════════════════ */
/*  Rate Limiting                                                 */
/* ═══════════════════════════════════════════════════════════════ */
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_PER_MIN) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تم تجاوز الحد الأقصى للطلبات. حاول لاحقاً', code: 'RATE_LIMIT_EXCEEDED' },
  keyGenerator: req => req.headers['x-forwarded-for'] || req.ip,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'محاولات تسجيل دخول كثيرة. انتظر 15 دقيقة', code: 'AUTH_RATE_LIMIT' },
});

const speedLimiter = slowDown({
  windowMs: 1 * 60 * 1000,
  delayAfter: 100,
  delayMs: hits => (hits - 100) * 50, // +50ms per request above 100
});

app.use(globalLimiter);
app.use(speedLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/identity/login', authLimiter);

/* ═══════════════════════════════════════════════════════════════ */
/*  JWT Authentication Middleware                                  */
/* ═══════════════════════════════════════════════════════════════ */
const PUBLIC_PATHS = [
  '/health',
  '/api/gateway/health',
  '/api/gateway/routes',
  '/api/gateway/status',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/identity/login',
  '/api/identity/register',
  '/api/certificates/verify',
];

function isPublicPath(path) {
  return PUBLIC_PATHS.some(p => path.startsWith(p)) || path === '/';
}

async function jwtMiddleware(req, res, next) {
  if (isPublicPath(req.path)) return next();
  if (req.method === 'OPTIONS') return next();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'التوكن مطلوب', code: 'TOKEN_REQUIRED' });
  }

  const token = authHeader.slice(7);
  try {
    // Check blacklist in Redis
    if (redis.status === 'ready') {
      const blacklisted = await redis.get(`bl:${token}`);
      if (blacklisted) return res.status(401).json({ error: 'تم إبطال التوكن', code: 'TOKEN_REVOKED' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.headers['x-user-id'] = decoded.userId || decoded.sub;
    req.headers['x-user-role'] = decoded.role || 'user';
    req.headers['x-user-name'] = encodeURIComponent(decoded.name || '');
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'انتهت صلاحية التوكن', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'توكن غير صالح', code: 'TOKEN_INVALID' });
  }
}

app.use(jwtMiddleware);

/* ═══════════════════════════════════════════════════════════════ */
/*  Request/Response Logging & Metrics                            */
/* ═══════════════════════════════════════════════════════════════ */
const metrics = { totalRequests: 0, byService: {}, errors: 0, startTime: Date.now() };

app.use((req, res, next) => {
  metrics.totalRequests++;
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const service = req._gatewayService || 'unknown';
    if (!metrics.byService[service]) metrics.byService[service] = { count: 0, errors: 0, totalTime: 0 };
    metrics.byService[service].count++;
    metrics.byService[service].totalTime += duration;
    if (res.statusCode >= 400) {
      metrics.errors++;
      metrics.byService[service].errors++;
    }

    // Async log to Redis (fire & forget)
    if (redis.status === 'ready') {
      redis
        .lpush(
          'gateway:access-log',
          JSON.stringify({
            id: req.id,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration,
            service,
            userId: req.headers['x-user-id'],
            ip: req.ip,
            timestamp: new Date().toISOString(),
          }),
        )
        .catch(() => {});
      redis.ltrim('gateway:access-log', 0, 9999).catch(() => {});
    }
  });
  next();
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Gateway Endpoints                                             */
/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', uptime: process.uptime(), redis: redis.status === 'ready' });
});

app.get('/api/gateway/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    uptime: process.uptime(),
    redis: redis.status === 'ready',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/gateway/routes', (_req, res) => {
  res.json(routes.map(r => ({ prefix: r.prefix, name: r.name, target: r.target.replace(/:[^:]+@/, ':***@') })));
});

app.get('/api/gateway/metrics', (_req, res) => {
  const uptime = (Date.now() - metrics.startTime) / 1000;
  const serviceStats = {};
  for (const [name, s] of Object.entries(metrics.byService)) {
    serviceStats[name] = { requests: s.count, errors: s.errors, avgResponseTime: s.count ? Math.round(s.totalTime / s.count) : 0 };
  }
  res.json({
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.errors,
    errorRate: metrics.totalRequests ? ((metrics.errors / metrics.totalRequests) * 100).toFixed(2) + '%' : '0%',
    uptime: Math.round(uptime),
    requestsPerSecond: (metrics.totalRequests / (uptime || 1)).toFixed(2),
    services: serviceStats,
  });
});

app.get('/api/gateway/status', async (_req, res) => {
  const checks = await Promise.allSettled(
    routes
      .filter(r => !r.isDefault)
      .map(async r => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 5000);
          const resp = await fetch(`${r.target}/health`, { signal: ctrl.signal });
          clearTimeout(timer);
          return { name: r.name, status: resp.ok ? 'healthy' : 'unhealthy', port: r.target.split(':').pop() };
        } catch {
          return { name: r.name, status: 'down', port: r.target.split(':').pop() };
        }
      }),
  );
  const services = checks.map(c => c.value || c.reason);
  const healthy = services.filter(s => s.status === 'healthy').length;
  res.json({ total: services.length, healthy, unhealthy: services.length - healthy, services });
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Proxy Routes                                                  */
/* ═══════════════════════════════════════════════════════════════ */
// Sort routes: longest prefix first (most specific first), default last
const sortedRoutes = [...routes].sort((a, b) => {
  if (a.isDefault) return 1;
  if (b.isDefault) return -1;
  return b.prefix.length - a.prefix.length;
});

for (const route of sortedRoutes) {
  const proxyOptions = {
    target: route.target,
    changeOrigin: true,
    pathRewrite: route.isDefault ? undefined : { [`^${route.prefix}`]: '/api' },
    timeout: 30000,
    proxyTimeout: 30000,
    on: {
      proxyReq: (proxyReq, req) => {
        req._gatewayService = route.name;
        proxyReq.setHeader('X-Gateway-Service', route.name);
        proxyReq.setHeader('X-Request-ID', req.id);
        if (req.headers['x-user-id']) proxyReq.setHeader('X-User-ID', req.headers['x-user-id']);
        if (req.headers['x-user-role']) proxyReq.setHeader('X-User-Role', req.headers['x-user-role']);
        if (req.headers['x-tenant-id']) proxyReq.setHeader('X-Tenant-ID', req.headers['x-tenant-id']);
      },
      proxyRes: (proxyRes, req) => {
        proxyRes.headers['x-gateway-service'] = route.name;
        proxyRes.headers['x-request-id'] = req.id;
      },
      error: (err, req, res) => {
        console.error(`❌ Proxy error [${route.name}]: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).json({
            error: `الخدمة غير متاحة: ${route.name}`,
            code: 'SERVICE_UNAVAILABLE',
            service: route.name,
            requestId: req.id,
          });
        }
      },
    },
  };

  if (route.isDefault) {
    app.use(route.prefix, createProxyMiddleware(proxyOptions));
  } else {
    app.use(route.prefix, createProxyMiddleware(proxyOptions));
  }
}

/* ═══════════════════════════════════════════════════════════════ */
/*  404 & Error Handling                                          */
/* ═══════════════════════════════════════════════════════════════ */
app.use((_req, res) => {
  res.status(404).json({ error: 'المسار غير موجود', code: 'NOT_FOUND' });
});

app.use((err, _req, res, _next) => {
  console.error('Gateway error:', err.message);
  res.status(500).json({ error: 'خطأ داخلي في البوابة', code: 'GATEWAY_ERROR' });
});

/* ═══════════════════════════════════════════════════════════════ */
/*  Start                                                         */
/* ═══════════════════════════════════════════════════════════════ */
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Routing ${routes.length} services`);
  console.log(`🔒 JWT validation: ${JWT_SECRET !== 'alawael-jwt-secret-2026' ? 'custom secret' : 'default secret'}`);
  console.log(`⚡ Rate limit: ${process.env.RATE_LIMIT_PER_MIN || 200} req/min`);
});
