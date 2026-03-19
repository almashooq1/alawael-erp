/**
 * Request Logger Middleware
 * Comprehensive logging for API requests
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Log levels
const LogLevels = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

// Colors for console output
const Colors = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m', // Green
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m',
};

class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'INFO';
    this.logToFile = options.logToFile !== false;
    this.logDir = options.logDir || path.join(__dirname, '../logs');
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB

    // Create logs directory
    if (this.logToFile && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.currentLogFile = this.getLogFileName();
  }

  getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `dashboard-${date}.log`);
  }

  log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
    };

    // Console output
    const color = Colors[level] || Colors.RESET;
    console.log(
      `${color}[${timestamp}] ${level}${Colors.RESET}: ${message}`,
      Object.keys(meta).length > 0 ? meta : ''
    );

    // File output
    if (this.logToFile) {
      const logLine = JSON.stringify(logEntry) + '\n';

      // Check log file size and rotate if needed
      const logFile = this.getLogFileName();
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.maxLogSize) {
          this.rotateLog(logFile);
        }
      }

      fs.appendFileSync(logFile, logLine);
    }
  }

  rotateLog(logFile) {
    const timestamp = Date.now();
    const rotatedFile = logFile.replace('.log', `.${timestamp}.log`);
    fs.renameSync(logFile, rotatedFile);
    this.log(LogLevels.INFO, `Log rotated to ${rotatedFile}`);
  }

  debug(message, meta) {
    this.log(LogLevels.DEBUG, message, meta);
  }

  info(message, meta) {
    this.log(LogLevels.INFO, message, meta);
  }

  warn(message, meta) {
    this.log(LogLevels.WARN, message, meta);
  }

  error(message, meta) {
    this.log(LogLevels.ERROR, message, meta);
  }
}

// Global logger instance
const logger = new Logger({
  logLevel: process.env.LOG_LEVEL || 'INFO',
  logToFile: process.env.LOG_TO_FILE !== 'false',
});

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const startTime = performance.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Attach request ID
  req.requestId = requestId;

  // Log request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  // Capture response
  const originalSend = res.send.bind(res);
  res.send = body => {
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    // Log response
    const logLevel =
      res.statusCode >= 500
        ? LogLevels.ERROR
        : res.statusCode >= 400
          ? LogLevels.WARN
          : LogLevels.INFO;

    logger.log(logLevel, 'Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: Buffer.byteLength(body, 'utf8'),
    });

    return originalSend(body);
  };

  next();
}

/**
 * Error logging middleware
 */
function errorLogger(err, req, res, next) {
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  next(err);
}

/**
 * Get log statistics
 */
function getLogStats() {
  const logFiles = fs.readdirSync(logger.logDir);
  const stats = {
    totalFiles: logFiles.length,
    files: logFiles.map(file => {
      const filePath = path.join(logger.logDir, file);
      const fileStats = fs.statSync(filePath);
      return {
        name: file,
        size: fileStats.size,
        created: fileStats.birthtime,
        modified: fileStats.mtime,
      };
    }),
  };

  return stats;
}

/**
 * Performance metrics middleware
 */
function performanceMetrics(req, res, next) {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;

    if (duration > 1000) {
      // Log slow requests (> 1 second)
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta: {
          heapUsed: `${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`,
          external: `${((endMemory.external - startMemory.external) / 1024 / 1024).toFixed(2)} MB`,
        },
      });
    }

    // Add performance header (only if headers not sent yet)
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
    }
  });

  next();
}

module.exports = {
  logger,
  Logger,
  LogLevels,
  requestLogger,
  errorLogger,
  getLogStats,
  performanceMetrics,
};
