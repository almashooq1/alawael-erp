/**
 * API Gateway - بوابة API
 * Professional API Management for Alawael ERP
 */

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const slowDown = require('express-slow-down');
const compression = require('compression');
const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * API Gateway Configuration
 */
const gatewayConfig = {
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  
  // API Keys
  apiKeys: {
    header: 'X-API-Key',
    queryParam: 'api_key',
  },
  
  // Versioning
  versioning: {
    header: 'X-API-Version',
    defaultVersion: 'v1',
    supportedVersions: ['v1', 'v2'],
  },
  
  // Caching
  caching: {
    ttl: 300, // 5 minutes
    methods: ['GET'],
  },
};

// API Keys Store (In production, use database)
const apiKeysStore = new Map();

/**
 * Generate API Key
 */
const generateApiKey = (name, permissions = [], rateLimit = 1000) => {
  const crypto = require('crypto');
  const key = `alw_live_${crypto.randomBytes(24).toString('base64url')}`;
  const secret = crypto.randomBytes(32).toString('hex');
  
  const apiKey = {
    key,
    secret,
    name,
    permissions,
    rateLimit,
    createdAt: new Date(),
    lastUsed: null,
    enabled: true,
  };
  
  apiKeysStore.set(key, apiKey);
  return apiKey;
};

/**
 * Validate API Key
 */
const validateApiKey = (key) => {
  const apiKey = apiKeysStore.get(key);
  
  if (!apiKey) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  if (!apiKey.enabled) {
    return { valid: false, error: 'API key is disabled' };
  }
  
  // Update last used
  apiKey.lastUsed = new Date();
  
  return { valid: true, apiKey };
};

/**
 * API Key Middleware
 */
const apiKeyMiddleware = (options = {}) => {
  const {
    required = true,
    header = gatewayConfig.apiKeys.header,
    queryParam = gatewayConfig.apiKeys.queryParam,
  } = options;
  
  return async (req, res, next) => {
    // Get API key from header or query
    const key = req.get(header) || req.query[queryParam];
    
    if (!key) {
      if (required) {
        return res.status(401).json({
          success: false,
          code: 'API_KEY_REQUIRED',
          message: 'API key is required',
        });
      }
      return next();
    }
    
    const validation = validateApiKey(key);
    
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_API_KEY',
        message: validation.error,
      });
    }
    
    // Attach API key info to request
    req.apiKey = validation.apiKey;
    
    next();
  };
};

/**
 * Create Rate Limiter
 */
const createRateLimiter = (options = {}, redisClient = null) => {
  const config = { ...gatewayConfig.rateLimit, ...options };
  
  const limiter = rateLimit({
    ...config,
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }) : undefined,
    keyGenerator: (req) => {
      // Use API key if available, otherwise use IP
      return req.apiKey?.key || req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/healthz';
    },
  });
  
  return limiter;
};

/**
 * Create Speed Limiter (Slow Down)
 */
const createSpeedLimiter = (options = {}) => {
  return slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes at full speed
    delayMs: 500, // add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // maximum delay of 20 seconds
    ...options,
  });
};

/**
 * API Versioning Middleware
 */
const versioningMiddleware = (options = {}) => {
  const {
    header = gatewayConfig.versioning.header,
    defaultVersion = gatewayConfig.versioning.defaultVersion,
    supportedVersions = gatewayConfig.versioning.supportedVersions,
  } = options;
  
  return (req, res, next) => {
    // Get requested version
    const version = req.get(header) || defaultVersion;
    
    // Validate version
    if (!supportedVersions.includes(version)) {
      return res.status(400).json({
        success: false,
        code: 'UNSUPPORTED_VERSION',
        message: `API version '${version}' is not supported`,
        supportedVersions,
      });
    }
    
    // Attach version to request
    req.apiVersion = version;
    res.setHeader('X-API-Version', version);
    
    next();
  };
};

/**
 * Request Transformer Middleware
 */
const requestTransformer = (req, res, next) => {
  // Add request ID
  req.requestId = req.get('X-Request-ID') || require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  
  // Add timestamp
  req.requestTimestamp = new Date();
  
  // Normalize query parameters
  if (req.query) {
    // Convert string 'true'/'false' to boolean
    for (const key of Object.keys(req.query)) {
      if (req.query[key] === 'true') req.query[key] = true;
      if (req.query[key] === 'false') req.query[key] = false;
    }
  }
  
  next();
};

/**
 * Response Transformer Middleware
 */
const responseTransformer = (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json method
  res.json = (data) => {
    // Only transform if not already in standard format
    if (data && typeof data === 'object' && !('success' in data)) {
      data = {
        success: res.statusCode >= 400 ? false : true,
        data,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      };
    }
    
    return originalJson(data);
  };
  
  next();
};

/**
 * Compression Middleware
 */
const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Compression level (1-9)
});

/**
 * Request Logger Middleware
 */
const requestLoggerMiddleware = (logger) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logger.info('API Request', {
        method: req.method,
        path: req.path,
        query: req.query,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        requestId: req.requestId,
        apiVersion: req.apiVersion,
        apiKey: req.apiKey?.name,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    });
    
    next();
  };
};

/**
 * API Analytics Middleware
 */
const analyticsMiddleware = (analyticsStore) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const analytics = {
        timestamp: new Date(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: Date.now() - startTime,
        apiVersion: req.apiVersion,
        apiKey: req.apiKey?.name,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        contentLength: res.get('content-length'),
      };
      
      // Store analytics (in production, send to analytics service)
      if (analyticsStore) {
        analyticsStore.push(analytics);
      }
    });
    
    next();
  };
};

/**
 * CORS Middleware
 */
const corsMiddleware = (options = {}) => {
  const cors = require('cors');
  
  return cors({
    origin: (origin, callback) => {
      const allowedOrigins = options.origins || ['*'];
      
      if (allowedOrigins.includes('*') || !origin) {
        callback(null, true);
      } else if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: options.methods || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: options.allowedHeaders || ['Content-Type', 'Authorization', 'X-API-Key', 'X-API-Version', 'X-Request-ID'],
    exposedHeaders: options.exposedHeaders || ['X-Request-ID', 'X-API-Version', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: options.credentials || true,
    maxAge: options.maxAge || 86400,
  });
};

/**
 * Cache Middleware for GET requests
 */
const cacheMiddleware = (cacheClient, options = {}) => {
  const ttl = options.ttl || gatewayConfig.caching.ttl;
  
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip if no-cache header
    if (req.get('Cache-Control') === 'no-cache') {
      return next();
    }
    
    // Generate cache key
    const cacheKey = `api:cache:${req.apiVersion || 'v1'}:${req.path}:${JSON.stringify(req.query)}`;
    
    try {
      // Try to get from cache
      const cached = await cacheClient.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        return res.json(data);
      }
      
      // Store original json
      const originalJson = res.json.bind(res);
      
      // Override json to cache response
      res.json = (data) => {
        res.setHeader('X-Cache', 'MISS');
        
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheClient.setex(cacheKey, ttl, JSON.stringify(data)).catch(() => {});
        }
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};

/**
 * API Gateway Setup
 */
const setupApiGateway = (app, options = {}) => {
  const {
    redisClient,
    logger,
    analyticsStore,
    corsOrigins,
  } = options;
  
  // 1. Request Transformer
  app.use(requestTransformer);
  
  // 2. Compression
  app.use(compressionMiddleware);
  
  // 3. CORS
  app.use(corsMiddleware({ origins: corsOrigins }));
  
  // 4. Versioning
  app.use(versioningMiddleware());
  
  // 5. Rate Limiting
  app.use(createRateLimiter({}, redisClient));
  
  // 6. Speed Limiting
  app.use(createSpeedLimiter());
  
  // 7. Request Logger
  if (logger) {
    app.use(requestLoggerMiddleware(logger));
  }
  
  // 8. Analytics
  if (analyticsStore) {
    app.use(analyticsMiddleware(analyticsStore));
  }
  
  // 9. Response Transformer
  app.use(responseTransformer);
  
  console.log('✅ API Gateway configured');
  
  return {
    generateApiKey,
    validateApiKey,
    apiKeysStore,
  };
};

/**
 * Health Endpoint for Gateway
 */
const gatewayHealthEndpoint = async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      gateway: 'healthy',
    },
  };
  
  res.json(health);
};

module.exports = {
  setupApiGateway,
  apiKeyMiddleware,
  createRateLimiter,
  createSpeedLimiter,
  versioningMiddleware,
  requestTransformer,
  responseTransformer,
  compressionMiddleware,
  requestLoggerMiddleware,
  analyticsMiddleware,
  corsMiddleware,
  cacheMiddleware,
  gatewayHealthEndpoint,
  generateApiKey,
  validateApiKey,
  gatewayConfig,
};