/**
 * Advanced Logging Configuration
 * نظام تسجيل متقدم للنظام
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// إنشاء مجلد logs إذا لم يكن موجودًا
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom format للـ logs
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (metadata && Object.keys(metadata).length > 0) {
      try {
        const seen = new WeakSet();
        log += ` | ${JSON.stringify(metadata, (_key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
          }
          return value;
        })}`;
      } catch {
        log += ' | [unserializable metadata]';
      }
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

/**
 * JSON format للـ logs
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * إنشاء logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'alawael-erp',
    environment: process.env.NODE_ENV || 'development',
    version: require('../package.json').version,
  },
  transports: [
    // Console transport — JSON in production for log aggregators, colorized in dev
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? jsonFormat
          : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),

    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: jsonFormat,
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: jsonFormat,
    }),

    // Performance log file
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      level: 'debug',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: jsonFormat,
    }),
  ],

  // استثناءات غير معالجة
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: jsonFormat,
    }),
  ],

  // رفضات Promise غير معالجة
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: jsonFormat,
    }),
  ],
});

/**
 * Sensitive-field sanitizer.
 * Strips passwords, tokens, secrets, and credit card numbers from log metadata.
 * Use before passing user-supplied data to any log call.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'oldPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'resetToken',
  'apiKey',
  'apiSecret',
  'secret',
  'authorization',
  'cookie',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
]);

const sanitizeLogData = (data, depth = 0) => {
  if (depth > 5 || data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(item => sanitizeLogData(item, depth + 1));

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase ? key.toLowerCase() : key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Middleware لـ logging الطلبات والاستجابات
 * Includes requestId from req.id for end-to-end tracing
 */
const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  const requestId = req.id || undefined;

  // تسجيل بيانات الطلب (sanitized to strip tokens/passwords from query params)
  const requestLog = sanitizeLogData({
    requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  });

  logger.debug('Incoming Request', { request: requestLog });

  // تجاوز send لـ logging الاستجابة
  res.send = function (data) {
    const duration = Date.now() - startTime;

    const responseLog = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'Request Completed', { response: responseLog });

    // تحذير إذا كان الطلب بطيئًا
    if (duration > 1000) {
      logger.warn('Slow Request Detected', {
        response: responseLog,
        threshold: '1000ms',
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * تسجيل أخطاء مع context
 */
const logError = (error, context = {}) => {
  logger.error('Application Error', {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode || 500,
    },
    context,
    timestamp: new Date().toISOString(),
  });
};

/**
 * تسجيل مقاييس الأداء
 */
const logPerformance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';

  logger.log(level, 'Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata,
  });
};

/**
 * تسجيل أحداث الأمان
 */
const logSecurityEvent = (event, severity = 'info', details = {}) => {
  logger.log(severity, `[SECURITY] ${event}`, {
    timestamp: new Date().toISOString(),
    severity,
    details,
  });
};

/**
 * تسجيل عمليات قاعدة البيانات
 */
const logDatabaseOperation = (operation, collection, duration, success = true) => {
  const level = success ? 'debug' : 'error';

  logger.log(level, `Database Operation: ${operation}`, {
    collection,
    operation,
    duration: `${duration}ms`,
    success,
    timestamp: new Date().toISOString(),
  });
};

/**
 * الحصول على logger instance
 */
const getLogger = () => logger;

/**
 * Create a child logger with a bound requestId for scoped tracing.
 * Usage: const log = createChildLogger(req.id);
 *        log.info('Something happened');
 */
const createChildLogger = requestId => {
  if (!requestId) return logger;
  return logger.child({ requestId });
};

/**
 * تنظيف logs القديمة
 */
const cleanupOldLogs = (daysToKeep = 7) => {
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

  fs.readdirSync(logsDir).forEach(file => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);

    if (stats.mtime.getTime() < cutoffTime) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted old log file: ${file}`);
    }
  });
};

module.exports = {
  logger,
  getLogger,
  createChildLogger,
  sanitizeLogData,
  requestLoggingMiddleware,
  logError,
  logPerformance,
  logSecurityEvent,
  logDatabaseOperation,
  cleanupOldLogs,
};
