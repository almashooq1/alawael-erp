/**
 * Request Logger Middleware
 * Middleware لتسجيل جميع الطلبات تلقائياً
 */
const logger = require('../utils/logger');

/**
 * Enhanced request logging middleware
 * سجل تلقائي لكل طلبAPI
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request start
  logger.debug(`→ ${req.method} ${req.originalUrl}`, {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    const duration = Date.now() - startTime;

    // Log request completion
    logger.logRequest(req, res, duration);

    return res.send(data);
  };

  next();
};

/**
 * Error request logging
 * تسجيل الطلبات التي فشلت
 */
const errorLogger = (err, req, res, next) => {
  logger.error(`Error in ${req.method} ${req.originalUrl}`, {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
  });

  next(err);
};

module.exports = {
  requestLogger,
  errorLogger,
};
