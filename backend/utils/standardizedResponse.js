/**
 * standardizedResponse.js — Unified API Response Middleware
 * ════════════════════════════════════════════════════════════
 * Standardizes all API responses to the format:
 *   {
 *     success: boolean,
 *     data?: any,
 *     error?: { code: string, message: string, details?: any },
 *     meta?: { timestamp, requestId, pagination?, durationMs? }
 *   }
 *
 * Usage: Apply as the LAST middleware before error handlers.
 *   app.use(standardizedResponse());
 */

'use strict';

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Standardized response middleware factory
 * @param {Object} options
 * @param {boolean} options.includeTimestamp - Include ISO timestamp
 * @param {boolean} options.includeRequestId - Include request ID
 * @param {boolean} options.includeDuration - Include response duration
 */
function standardizedResponse(options = {}) {
  const { includeTimestamp = true, includeRequestId = true, includeDuration = true } = options;

  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || generateRequestId();
    req.requestId = requestId;

    const startTime = Date.now();

    // Override res.json to wrap responses
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      // If already wrapped or is an error response, pass through
      if (body && (body.__standardized || body.__raw)) {
        return originalJson(body);
      }

      const statusCode = res.statusCode || 200;
      const isSuccess = statusCode < 400;

      const response = {
        success: isSuccess,
      };

      if (isSuccess) {
        response.data = body;
      } else {
        // Error responses may already be shaped
        if (body && (body.error || body.message)) {
          response.error = {
            code: body.code || `HTTP_${statusCode}`,
            message: body.message || body.error || 'An error occurred',
            details: body.details || undefined,
          };
        } else {
          response.error = {
            code: `HTTP_${statusCode}`,
            message: body || 'An error occurred',
          };
        }
      }

      // Meta information
      response.meta = {};
      if (includeTimestamp) {
        response.meta.timestamp = new Date().toISOString();
      }
      if (includeRequestId) {
        response.meta.requestId = requestId;
      }
      if (includeDuration) {
        response.meta.durationMs = Date.now() - startTime;
      }

      // Pagination from query
      if (req.query.page || req.query.limit) {
        response.meta.pagination = {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
        };
      }

      response.__standardized = true;
      return originalJson(response);
    };

    // Override res.send to wrap non-JSON responses
    const originalSend = res.send.bind(res);
    res.send = function(body) {
      if (typeof body === 'string' && body.startsWith('{')) {
        // Likely JSON, let res.json handle it
        return originalSend(body);
      }
      return originalSend(body);
    };

    next();
  };
}

/**
 * Helper to send standardized error responses
 */
function sendStandardizedError(res, statusCode, message, code, details) {
  res.status(statusCode).json({
    __raw: true, // Prevent re-wrapping
    success: false,
    error: {
      code: code || `ERR_${statusCode}`,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = {
  standardizedResponse,
  sendStandardizedError,
};
