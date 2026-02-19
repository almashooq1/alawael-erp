/**
 * Advanced Logger Middleware
 * نظام logging متقدم شامل مع تتبع الأداء والأخطاء
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  HTTP: 'HTTP',
  DEBUG: 'DEBUG',
  TRACE: 'TRACE',
};

// Color codes for console output
const colors = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m', // Yellow
  INFO: '\x1b[36m', // Cyan
  HTTP: '\x1b[32m', // Green
  DEBUG: '\x1b[35m', // Magenta
  TRACE: '\x1b[37m', // White
  RESET: '\x1b[0m',
};

class AdvancedLogger {
  constructor() {
    this.requestMap = new Map();
    this.errorCount = 0;
    this.requestCount = 0;
    this.startTime = Date.now();
  }

  /**
   * Write log to file
   */
  writeLog(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      level,
      message,
      ...data,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };

    // Console output
    const logLine = `[${timestamp}] [${level}] ${message}`;
    console.log(`${colors[level]}${logLine}${colors.RESET}`, data);

    // File output
    const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logMessage) + '\n');

    // All logs file
    const allLogsFile = path.join(logsDir, 'all.log');
    fs.appendFileSync(allLogsFile, JSON.stringify(logMessage) + '\n');
  }

  /**
   * Log error
   */
  error(message, error, context = {}) {
    this.errorCount++;
    this.writeLog(LogLevel.ERROR, message, {
      error: error?.message || error,
      stack: error?.stack?.split('\n').slice(0, 3),
      ...context,
    });
  }

  /**
   * Log warning
   */
  warn(message, context = {}) {
    this.writeLog(LogLevel.WARN, message, context);
  }

  /**
   * Log info
   */
  info(message, context = {}) {
    this.writeLog(LogLevel.INFO, message, context);
  }

  /**
   * Log HTTP request
   */
  http(method, url, statusCode, duration, context = {}) {
    this.requestCount++;
    const status = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'HTTP';
    this.writeLog(status, `${method} ${url} → ${statusCode}`, {
      duration: `${duration}ms`,
      requestCount: this.requestCount,
      ...context,
    });
  }

  /**
   * Log debug info
   */
  debug(message, context = {}) {
    this.writeLog(LogLevel.DEBUG, message, context);
  }

  /**
   * Log trace
   */
  trace(message, context = {}) {
    this.writeLog(LogLevel.TRACE, message, context);
  }

  /**
   * Get system stats
   */
  getStats() {
    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      requests: this.requestCount,
      errors: this.errorCount,
      errorRate:
        this.requestCount > 0
          ? ((this.errorCount / this.requestCount) * 100).toFixed(2) + '%'
          : '0%',
    };
  }

  /**
   * Get log files summary
   */
  getLogsSummary() {
    const files = fs.readdirSync(logsDir);
    const summary = {};

    files.forEach(file => {
      if (file.endsWith('.log')) {
        const filePath = path.join(logsDir, file);
        const size = fs.statSync(filePath).size;
        const lines = fs
          .readFileSync(filePath, 'utf8')
          .split('\n')
          .filter(l => l).length;
        summary[file] = { size: `${(size / 1024).toFixed(2)}KB`, lines };
      }
    });

    return summary;
  }
}

// Singleton instance
const logger = new AdvancedLogger();

/**
 * Middleware for request logging
 */
const advancedLoggerMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Store request info
  logger.requestMap.set(requestId, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    startTime,
  });

  // Capture original send
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    const duration = Date.now() - startTime;
    const shouldLog = true; // You can add conditions here

    if (shouldLog) {
      logger.http(req.method, req.originalUrl, res.statusCode, duration, {
        requestId,
        size: data?.length || 0,
        userId: req.user?.id || 'anonymous',
      });
    }

    // Clean up
    logger.requestMap.delete(requestId);

    return res.send(data);
  };

  next();
};

/**
 * Error logging middleware
 */
const errorLoggerMiddleware = (err, req, res, next) => {
  logger.error('Unhandled Error', err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: req.body,
    query: req.query,
  });

  next(err);
};

module.exports = {
  logger,
  advancedLoggerMiddleware,
  errorLoggerMiddleware,
  LogLevel,
};
