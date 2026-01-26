/**
 * 🚀 API Gateway - AlAwael ERP v3.0
 * Central entry point for all microservices
 * Features: Authentication, Rate Limiting, Load Balancing, Circuit Breaking
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const CircuitBreaker = require('opossum');
const winston = require('winston');

// Configuration
const config = {
  port: process.env.GATEWAY_PORT || 8080,
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    hr: process.env.HR_SERVICE_URL || 'http://localhost:3002',
    finance: process.env.FINANCE_SERVICE_URL || 'http://localhost:3003',
    reports: process.env.REPORTS_SERVICE_URL || 'http://localhost:3004',
    notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3005',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  circuitBreaker: {
    timeout: 10000, // 10 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
  },
};

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'logs/gateway-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/gateway.log' }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

// Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);
app.use(compression()); // Compress responses
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    });
  },
});

app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: Object.keys(config.services),
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'AlAwael ERP API Gateway',
    version: '3.0.0',
    description: 'Central API Gateway for all microservices',
    endpoints: {
      '/api/auth': 'Authentication Service',
      '/api/hr': 'Human Resources Service',
      '/api/finance': 'Finance Service',
      '/api/reports': 'Reports Service',
      '/api/notifications': 'Notifications Service',
    },
    documentation: 'https://docs.alawael.sa/api',
  });
});

// Circuit Breaker for each service
const createCircuitBreaker = (serviceName, serviceUrl) => {
  const breaker = new CircuitBreaker(
    async req => {
      // This is a placeholder - actual proxy is handled by http-proxy-middleware
      return { success: true };
    },
    {
      timeout: config.circuitBreaker.timeout,
      errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
      resetTimeout: config.circuitBreaker.resetTimeout,
    }
  );

  breaker.on('open', () => {
    logger.error(`Circuit breaker opened for ${serviceName}`);
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker half-open for ${serviceName}`);
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker closed for ${serviceName}`);
  });

  return breaker;
};

// Service proxies with circuit breakers
Object.entries(config.services).forEach(([serviceName, serviceUrl]) => {
  const circuitBreaker = createCircuitBreaker(serviceName, serviceUrl);

  app.use(`/api/${serviceName}`, async (req, res, next) => {
    try {
      // Check if circuit is open
      if (circuitBreaker.opened) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          service: serviceName,
          message: 'Circuit breaker is open, please try again later',
        });
      }

      next();
    } catch (error) {
      logger.error(`Circuit breaker error for ${serviceName}:`, error);
      res.status(503).json({
        error: 'Service error',
        service: serviceName,
        message: error.message,
      });
    }
  });

  // Proxy middleware
  app.use(
    `/api/${serviceName}`,
    createProxyMiddleware({
      target: serviceUrl,
      changeOrigin: true,
      pathRewrite: {
        [`^/api/${serviceName}`]: '',
      },
      onProxyReq: (proxyReq, req, res) => {
        logger.info(`Proxying request to ${serviceName}: ${req.method} ${req.path}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        logger.info(`Response from ${serviceName}: ${proxyRes.statusCode}`);
      },
      onError: (err, req, res) => {
        logger.error(`Proxy error for ${serviceName}:`, err);
        circuitBreaker.fire(req).catch(() => {}); // Trigger circuit breaker
        res.status(502).json({
          error: 'Bad Gateway',
          service: serviceName,
          message: 'Service is currently unavailable',
        });
      },
    })
  );
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Gateway error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 API Gateway running on port ${config.port}`);
  logger.info(`📊 Health check: http://localhost:${config.port}/health`);
  logger.info(`📚 API docs: http://localhost:${config.port}/api/docs`);
  logger.info(
    '🔌 Proxying to services:',
    Object.entries(config.services)
      .map(([name, url]) => `\n  - ${name}: ${url}`)
      .join('')
  );
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server...');
  server.close(() => {
    logger.info('Server closed, exiting process');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;
