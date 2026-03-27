/**
 * Request ID Middleware — معرّف الطلب
 *
 * Assigns a unique ID to each incoming request for traceability.
 * The ID is attached to `req.id` and sent back in the `X-Request-Id` header.
 */

'use strict';

const crypto = require('crypto');

// Only allow alphanumeric, hyphens, underscores, dots, and base64url chars
// Max 128 chars to prevent header injection and log poisoning
const VALID_REQUEST_ID = /^[a-zA-Z0-9_\-.=+/]{1,128}$/;

/**
 * Generate a URL-safe unique ID (22 chars, 128 bits entropy).
 * Uses crypto.randomBytes for cryptographic randomness.
 */
const generateRequestId = () => {
  return crypto.randomBytes(16).toString('base64url');
};

/**
 * Validate a client-supplied request ID.
 * Rejects IDs that could be used for header injection or log poisoning.
 */
const isValidRequestId = id => {
  return typeof id === 'string' && VALID_REQUEST_ID.test(id);
};

/**
 * Express middleware that assigns a request ID.
 * If the client sends a valid `X-Request-Id` header, it is preserved
 * (useful for distributed tracing). Otherwise a new ID is generated.
 */
const requestIdMiddleware = (req, res, next) => {
  const clientId = req.headers['x-request-id'];
  const id = clientId && isValidRequestId(clientId) ? clientId : generateRequestId();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};

module.exports = { requestIdMiddleware, generateRequestId, isValidRequestId };
