/**
 * Request ID Middleware — معرّف الطلب
 *
 * Assigns a unique ID to each incoming request for traceability.
 * The ID is attached to `req.id` and sent back in the `X-Request-Id` header.
 */

const crypto = require('crypto');

/**
 * Generate a short, URL-safe unique ID (21 chars, ~126 bits entropy).
 * Uses crypto.randomBytes for cryptographic randomness.
 */
const generateRequestId = () => {
  return crypto.randomBytes(16).toString('base64url');
};

/**
 * Express middleware that assigns a request ID.
 * If the client sends an `X-Request-Id` header, it is preserved (useful for
 * distributed tracing). Otherwise a new ID is generated.
 */
const requestIdMiddleware = (req, res, next) => {
  const id = req.headers['x-request-id'] || generateRequestId();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};

module.exports = { requestIdMiddleware, generateRequestId };
