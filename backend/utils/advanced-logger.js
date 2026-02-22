/**
 * Advanced Logging System - نظام التسجيل المتقدم
 * Professional Logging for Alawael ERP
 */

const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Log levels
const LOG_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  security: 70, // Custom level for security events
  audit: 80,    // Custom level for audit logs
};

/**
 * Logger Configuration
 */
const config = {
  level: process.env.LOG_LEVEL || 'info',
  
  // Output
  prettyPrint: process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV !== 'production',
  
  // File logging
  fileLogging: process.env.LOG_FILE === 'true',
  logDirectory: process.env.LOG_DIRECTORY || './logs',
  maxFileSize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
  
  // Redaction (sensitive fields to hide)
  redactFields: [
    'password',
    'passwordConfirm',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'creditCard',
    'cvv',
    'ssn',
  ],
  
  // Sampling (for high-volume logs)
  sampleRate: parseFloat(process.env.LOG_SAMPLE_RATE || '1.0'),
  
  // Context
  service: process.env.SERVICE_NAME || 'alawael-erp',
  version: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
};

/**
 * Custom Log Formatter
 */
const formatters = {
  /**
   * Format timestamp in ISO 8601
   */
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  
  /**
   * Format log level
   */
  level: (label, number) => {
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === number) || label;
    return { level: number, levelName };
  },
  
  /**
   * Format bindings (base fields)
   */
  bindings: (bindings) => ({
    pid: bindings.pid,
    hostname: bindings.hostname,
    service: config.service,
    version: config.version,
    environment: config.environment,
  }),
};

/**
 * Redaction paths for sensitive data
 */
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.passwordConfirm',
  'req.body.token',
  'req.body.accessToken',
  'req.body.refreshToken',
  'req.body.apiKey',
  'req.body.secret',
  'req.body.creditCard',
  'req.body.cvv',
  'res.body.token',
  '*.password',
  '*.token',
  '*.secret',
  '*.apiKey',
];

/**
 * Create base logger
 */
const createBaseLogger = () => {
  const transport = config.prettyPrint
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '{msg}',
        },
      }
    : undefined;
  
  const streams = [];
  
  // Console stream
  streams.push({
    level: config.level,
    stream: process.stdout,
  });
  
  // File stream (if enabled)
  if (config.fileLogging) {
    // Ensure log directory exists
    if (!fs.existsSync(config.logDirectory)) {
      fs.mkdirSync(config.logDirectory, { recursive: true });
    }
    
    // All logs
    streams.push({
      level: 'trace',
      stream: fs.createWriteStream(
        path.join(config.logDirectory, 'app.log'),
        { flags: 'a' }
      ),
    });
    
    // Error logs only
    streams.push({
      level: 'error',
      stream: fs.createWriteStream(
        path.join(config.logDirectory, 'error.log'),
        { flags: 'a' }
      ),
    });
  }
  
  return pino({
    level: config.level,
    customLevels: LOG_LEVELS,
    formatters,
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
    transport,
  }, pino.multistream(streams));
};

// Base logger instance
const baseLogger = createBaseLogger();

/**
 * Logger Class with context support
 */
class Logger {
  constructor(context = {}) {
    this.context = context;
    this.child = baseLogger.child(context);
  }
  
  /**
   * Add context to logger
   */
  withContext(context) {
    return new Logger({ ...this.context, ...context });
  }
  
  /**
   * Add request context
   */
  withRequest(req) {
    return this.withContext({
      requestId: req.id || uuidv4(),
      method: req.method,
      path: req.path,
      userId: req.user?._id || req.user?.id,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    });
  }
  
  /**
   * Trace level
   */
  trace(message, data = {}) {
    if (this._shouldSample()) {
      this.child.trace(data, message);
    }
  }
  
  /**
   * Debug level
   */
  debug(message, data = {}) {
    if (this._shouldSample()) {
      this.child.debug(data, message);
    }
  }
  
  /**
   * Info level
   */
  info(message, data = {}) {
    this.child.info(data, message);
  }
  
  /**
   * Warn level
   */
  warn(message, data = {}) {
    this.child.warn(data, message);
  }
  
  /**
   * Error level
   */
  error(message, error = null, data = {}) {
    const errorData = error
      ? {
          ...data,
          error: {
            message: error.message,
            stack: error.stack,
            code: error.code,
            name: error.name,
          },
        }
      : data;
    
    this.child.error(errorData, message);
  }
  
  /**
   * Fatal level
   */
  fatal(message, error = null, data = {}) {
    const errorData = error
      ? {
          ...data,
          error: {
            message: error.message,
            stack: error.stack,
            code: error.code,
          },
        }
      : data;
    
    this.child.fatal(errorData, message);
  }
  
  /**
   * Security event (custom level)
   */
  security(event, data = {}) {
    this.child.security({
      event,
      ...data,
      security: true,
    }, `Security Event: ${event}`);
  }
  
  /**
   * Audit log (custom level)
   */
  audit(action, data = {}) {
    this.child.audit({
      action,
      ...data,
      audit: true,
    }, `Audit: ${action}`);
  }
  
  /**
   * Log API request
   */
  logRequest(req, res, responseTime) {
    const data = {
      method: req.method,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('content-length'),
    };
    
    if (res.statusCode >= 400) {
      this.warn('API Request Failed', data);
    } else {
      this.info('API Request', data);
    }
  }
  
  /**
   * Log database query
   */
  logQuery(operation, collection, duration, query = {}) {
    this.debug('Database Query', {
      operation,
      collection,
      duration: `${duration}ms`,
      query: JSON.stringify(query).substring(0, 200),
    });
  }
  
  /**
   * Log cache operation
   */
  logCache(operation, key, hit = null) {
    this.trace('Cache Operation', {
      operation,
      key,
      hit,
    });
  }
  
  /**
   * Log performance metric
   */
  logMetric(name, value, unit = 'ms') {
    this.debug('Performance Metric', {
      metric: name,
      value,
      unit,
    });
  }
  
  /**
   * Log business event
   */
  logBusinessEvent(event, data = {}) {
    this.info(`Business Event: ${event}`, {
      businessEvent: true,
      event,
      ...data,
    });
  }
  
  /**
   * Check sampling
   */
  _shouldSample() {
    if (config.sampleRate >= 1) return true;
    return Math.random() < config.sampleRate;
  }
}

/**
 * Create logger instance
 */
const createLogger = (context = {}) => {
  return new Logger(context);
};

// Default logger instance
const logger = createLogger();

/**
 * Express Request Logging Middleware
 */
const requestLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Set request ID
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Create request-scoped logger
  req.logger = logger.withRequest(req);
  
  // Log request start
  req.logger.debug('Request Started', {
    headers: req.headers,
    body: req.body,
  });
  
  // Log response on finish
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    req.logger.logRequest(req, res, responseTime);
  });
  
  // Log response error on error
  res.on('error', (error) => {
    req.logger.error('Response Error', error);
  });
  
  next();
};

/**
 * Error Logging Middleware
 */
const errorLoggingMiddleware = (err, req, res, next) => {
  const requestLogger = req.logger || logger;
  
  requestLogger.error('Unhandled Error', err, {
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user?._id || req.user?.id,
  });
  
  next(err);
};

/**
 * Morgan-like stream for HTTP logging
 */
const logStream = {
  write: (message) => {
    logger.info(message.trim(), { source: 'http' });
  },
};

/**
 * Log rotation (simple implementation)
 */
const rotateLogs = () => {
  if (!config.fileLogging) return;
  
  const logFiles = ['app.log', 'error.log'];
  
  logFiles.forEach(filename => {
    const filepath = path.join(config.logDirectory, filename);
    
    try {
      const stats = fs.statSync(filepath);
      
      if (stats.size >= config.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const newFilepath = path.join(config.logDirectory, `${filename}.${timestamp}`);
        
        fs.renameSync(filepath, newFilepath);
        logger.info(`Log rotated: ${filename}`);
        
        // Clean old logs
        cleanOldLogs(filename);
      }
    } catch (error) {
      // File doesn't exist, ignore
    }
  });
};

/**
 * Clean old log files
 */
const cleanOldLogs = (basename) => {
  const files = fs.readdirSync(config.logDirectory)
    .filter(f => f.startsWith(basename) && f !== basename)
    .map(f => ({
      name: f,
      path: path.join(config.logDirectory, f),
      time: fs.statSync(path.join(config.logDirectory, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);
  
  // Remove files beyond maxFiles
  files.slice(config.maxFiles).forEach(file => {
    fs.unlinkSync(file.path);
    logger.info(`Removed old log: ${file.name}`);
  });
};

/**
 * Flush logs (for graceful shutdown)
 */
const flushLogs = async () => {
  return new Promise((resolve) => {
    baseLogger.flush(() => {
      resolve();
    });
  });
};

// Schedule log rotation check every hour
setInterval(rotateLogs, 60 * 60 * 1000);

module.exports = {
  Logger,
  createLogger,
  logger,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  logStream,
  rotateLogs,
  flushLogs,
  config,
  LOG_LEVELS,
};