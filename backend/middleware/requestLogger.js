/**
 * =====================================================
 * ADVANCED REQUEST LOGGER MIDDLEWARE - Phase 6
 * =====================================================
 * Comprehensive request/response logging and tracking
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const requestLogFile = path.join(logsDir, 'requests.log');
const metricsFile = path.join(logsDir, 'metrics.json');

/**
 * Color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Get status color based on HTTP status code
 */
const getStatusColor = (status) => {
  if (status < 300) return colors.green;
  if (status < 400) return colors.blue;
  if (status < 500) return colors.yellow;
  return colors.red;
};

/**
 * Get HTTP method color
 */
const getMethodColor = (method) => {
  const methodColors = {
    GET: colors.blue,
    POST: colors.green,
    PUT: colors.yellow,
    PATCH: colors.cyan,
    DELETE: colors.red,
    OPTIONS: colors.reset,
  };
  return methodColors[method] || colors.reset;
};

/**
 * Format bytes to human readable
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Log request to file
 */
const logRequestToFile = (req, res, duration) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?._id || 'anonymous',
    contentLength: req.get('content-length') || 0,
    responseTime: new Date().toISOString(),
  };

  const logMessage = `${timestamp} ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip || 'unknown'}\n`;

  fs.appendFileSync(requestLogFile, logMessage);

  // Write metrics
  const metricsExist = fs.existsSync(metricsFile);
  const metrics = metricsExist ? JSON.parse(fs.readFileSync(metricsFile, 'utf8')) : [];
  metrics.push(logEntry);
  // Keep only last 5000 entries
  const recentMetrics = metrics.slice(-5000);
  fs.writeFileSync(metricsFile, JSON.stringify(recentMetrics, null, 2));
};

/**
 * Parse request body size
 */
const getRequestSize = (req) => {
  const contentLength = req.get('content-length');
  return contentLength ? parseInt(contentLength) : 0;
};

/**
 * Advanced request logger middleware
 */
module.exports = (req, res, next) => {
  // Record start time
  const startTime = Date.now();
  const startHrTime = process.hrtime();

  // Store original send method
  const originalSend = res.send;
  let responseSize = 0;

  // Override send to capture response details
  res.send = function (data) {
    // Calculate response size
    if (data) {
      responseSize = Buffer.byteLength(JSON.stringify(data));
    }

    // Call original send
    res.send = originalSend;
    return res.send(data);
  };

  // Listen to finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const [seconds, nanoseconds] = process.hrtime(startHrTime);
    const nanosecondDuration = seconds * 1000000000 + nanoseconds;
    const milliseconds = nanosecondDuration / 1000000;

    const method = req.method;
    const url = req.originalUrl;
    const status = res.statusCode;
    const requestSize = getRequestSize(req);
    const totalSize = requestSize + responseSize;

    // Console logging with colors
    const methodColor = getMethodColor(method);
    const statusColor = getStatusColor(status);

    const logMessage =
      `${colors.cyan}[${new Date().toLocaleTimeString()}]${colors.reset} ` +
      `${methodColor}${method}${colors.reset} ` +
      `${colors.reset}${url}${colors.reset} ` +
      `${statusColor}${status}${colors.reset} ` +
      `${colors.yellow}${Math.round(milliseconds)}ms${colors.reset} ` +
      `${colors.blue}${formatBytes(totalSize)}${colors.reset}`;

    // Different logging level based on status
    if (status >= 500) {
      console.error(`❌ ${logMessage}`);
    } else if (status >= 400) {
      console.warn(`⚠️  ${logMessage}`);
    } else {
      console.log(`✓  ${logMessage}`);
    }

    // Log to file
    try {
      logRequestToFile(req, res, Math.round(milliseconds));
    } catch (err) {
      console.error('Failed to log request to file:', err);
    }

    // Add custom headers
    res.set('X-Response-Time', `${Math.round(milliseconds)}ms`);
    res.set('X-Response-Size', formatBytes(responseSize));
    res.set('X-Request-Time', new Date().toISOString());
  });

  next();
};
