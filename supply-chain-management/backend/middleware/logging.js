// middleware/logging.js
// Advanced Logging & Monitoring Middleware

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
  constructor() {
    this.logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    this.errors = [];
    this.requests = [];
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    // Sanitize message to prevent log injection (newlines, control chars)
    const safeMessage = typeof message === 'string'
      ? message.replace(/[\r\n]/g, ' ').replace(/[^\x20-\x7E\u0600-\u06FF ]/g, '')
      : String(message);
    const logEntry = {
      timestamp,
      level,
      message: safeMessage,
      data,
      pid: process.pid,
    };

    // Write to file (use safeMessage to avoid log injection)
    const logString = `[${timestamp}] [${level}] ${safeMessage} ${JSON.stringify(data)}\n`;
    fs.appendFileSync(this.logFile, logString);

    // Console output
    const colors = {
      INFO: '\x1b[36m', // Cyan
      WARN: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m', // Red
      DEBUG: '\x1b[35m', // Magenta
      SUCCESS: '\x1b[32m', // Green
    };

    const color = colors[level] || '\x1b[0m';
    // console.log(`${color}[${level}] ${message}\x1b[0m`, data);

    // Store critical errors
    if (level === 'ERROR') {
      this.errors.push(logEntry);
    }

    return logEntry;
  }

  info(message, data) {
    return this.log('INFO', message, data);
  }

  warn(message, data) {
    return this.log('WARN', message, data);
  }

  error(message, data) {
    return this.log('ERROR', message, data);
  }

  debug(message, data) {
    return this.log('DEBUG', message, data);
  }

  success(message, data) {
    return this.log('SUCCESS', message, data);
  }

  // Get recent logs
  getRecentLogs(count = 50) {
    try {
      const data = fs.readFileSync(this.logFile, 'utf8');
      const lines = data.split('\n').filter(line => line.trim());
      return lines.slice(-count);
    } catch (err) {
      return [];
    }
  }

  // Get error logs
  getErrors(count = 20) {
    return this.errors.slice(-count);
  }

  // Clear old logs
  clearOldLogs(daysToKeep = 7) {
    const files = fs.readdirSync(logsDir);
    const now = new Date();

    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const ageInDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);

      if (ageInDays > daysToKeep) {
        fs.unlinkSync(filePath);
      }
    });
  }
}

// Create global logger instance
const logger = new Logger();

// Request logging middleware
const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Store original send
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - startTime;

    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error(`Request failed: ${req.method} ${req.originalUrl}`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`Request warning: ${req.method} ${req.originalUrl}`, logData);
    } else {
      logger.info(`Request completed: ${req.method} ${req.originalUrl}`, logData);
    }

    res.set('X-Request-ID', requestId);
    return originalSend.call(this, data);
  };

  next();
};

// Sensitive keys that must never appear in logs
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'creditCard', 'ssn', 'apiKey'];

/** Redact sensitive fields from an object (shallow clone) */
const redactSensitive = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk))) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
};

/** Sanitize a string for safe log output (prevent log injection) */
const sanitizeLogString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[\r\n]/g, ' ').replace(/[^\x20-\x7E\u0600-\u06FF ]/g, '');
};

// Error logging middleware
const errorLoggingMiddleware = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const errorData = {
    message: sanitizeLogString(err.message),
    ...(isProd ? {} : { stack: err.stack }),
    method: req.method,
    url: sanitizeLogString(req.originalUrl),
    body: redactSensitive(req.body),
  };

  logger.error(`Error: ${sanitizeLogString(err.message)}`, errorData);

  // Don't lose the error
  next(err);
};

module.exports = {
  logger,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  Logger,
};
