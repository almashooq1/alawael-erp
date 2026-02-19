// middleware/logging.js
// Advanced Logging & Monitoring Middleware

const fs = require('fs');
const path = require('path');

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
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      pid: process.pid,
    };

    // Write to file
    const logString = `[${timestamp}] [${level}] ${message} ${JSON.stringify(data)}\n`;
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
    console.log(`${color}[${level}] ${message}\x1b[0m`, data);

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
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

// Error logging middleware
const errorLoggingMiddleware = (err, req, res, next) => {
  const errorData = {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
  };

  logger.error(`Error: ${err.message}`, errorData);

  // Don't lose the error
  next(err);
};

module.exports = {
  logger,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  Logger,
};
