/**
 * Advanced Compression Middleware
 * ضغط متقدم للبيانات
 *
 * Features:
 * - Gzip compression for responses
 * - Selective compression based on content type
 * - Size threshold configuration
 * - Performance optimization
 */

const compression = require('compression');
const logger = require('../utils/logger');

/**
 * Check if request should be compressed
 */
const shouldCompress = (req, res) => {
  // Skip compression if client doesn't support it
  if (req.headers['x-no-compression']) {
    return false;
  }

  // Skip compression for small responses (< 1KB)
  const contentLength = res.get('Content-Length');
  if (contentLength && parseInt(contentLength) < 1024) {
    return false;
  }

  // Use default compression filter
  return compression.filter(req, res);
};

/**
 * Advanced compression middleware with logging
 */
const compressionMiddleware = compression({
  // Compression level: 6 (balanced between speed and compression ratio)
  level: 6,

  // Minimum size threshold: 1KB
  threshold: 1024,

  // Custom filter function
  filter: shouldCompress,

  // Memory level: 8 (default, balanced memory usage)
  memLevel: 8,

  // Strategy: default (suitable for most data)
  strategy: compression.Z_DEFAULT_STRATEGY,
});

/**
 * Compression stats middleware (optional - for monitoring)
 */
const compressionStatsMiddleware = (req, res, next) => {
  const originalWrite = res.write;
  const originalEnd = res.end;
  const chunks = [];

  res.write = function (chunk) {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }
    return originalWrite.apply(res, arguments);
  };

  res.end = function (chunk) {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }

    const originalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const isCompressed = res.get('Content-Encoding') === 'gzip';

    if (isCompressed && originalSize > 1024) {
      // Log compression stats for large responses
      logger.debug('Response compressed', {
        path: req.path,
        originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
        encoding: 'gzip',
      });
    }

    return originalEnd.apply(res, arguments);
  };

  next();
};

/**
 * Content-Type based compression configuration
 */
const compressibleTypes = [
  'text/html',
  'text/css',
  'text/plain',
  'text/xml',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'application/xhtml+xml',
  'application/rss+xml',
  'application/atom+xml',
  'image/svg+xml',
];

/**
 * Check if content type is compressible
 */
const isCompressible = contentType => {
  if (!contentType) return false;

  return compressibleTypes.some(type => contentType.toLowerCase().includes(type));
};

module.exports = {
  compressionMiddleware,
  compressionStatsMiddleware,
  isCompressible,
  shouldCompress,
};
