'use strict';
/**
 * Canonical validator middleware — Wave 285.
 *
 * Usage:
 *   const { validateBody, validateQuery, validateParams } = require('../intelligence/canonical/validator.middleware');
 *
 *   router.post('/beneficiaries', validateBody('Beneficiary'), handler);
 *   router.get('/beneficiaries', validateQuery(MyQuerySchema), handler);
 *
 * Behaviour:
 *   - On failure → 400 with { reason: 'CANONICAL_VALIDATION_FAILED', entity, errors: [...] }
 *   - On success → mutates req.body to the parsed/coerced value, so downstream
 *     handlers receive the canonical-shape payload.
 *   - `options.partial = true` allows PATCH-style partial updates.
 *   - `options.strip  = true` (default) removes unknown keys silently; pass
 *     `false` to reject unknown keys (stricter — recommended for new routes).
 *   - `options.preview = true` does NOT reject on validation failure; instead
 *     it logs the violations (rate-limited via the caller's logger). Use this
 *     to roll out canonical validation on existing routes without breaking
 *     in-flight clients. Flip to `false` once telemetry is clean.
 */

const registry = require('./registry');

const REASON_CODE = 'CANONICAL_VALIDATION_FAILED';

/** Format zod issues into a flat client-friendly array. */
function formatErrors(zodError) {
  return zodError.issues.map(i => ({
    path: i.path.join('.'),
    code: i.code,
    message: i.message,
  }));
}

/**
 * @param {string|import('zod').ZodTypeAny} entityOrSchema
 * @param {{partial?:boolean,strip?:boolean}} [options]
 */
function resolve(entityOrSchema, options = {}) {
  let schema;
  let entityName = null;
  if (typeof entityOrSchema === 'string') {
    const entry = registry.require(entityOrSchema);
    schema = entry.schema;
    entityName = entityOrSchema;
  } else if (entityOrSchema && typeof entityOrSchema.safeParse === 'function') {
    schema = entityOrSchema;
  } else {
    throw new Error('validator: expected entity name or Zod schema');
  }

  if (options.partial && typeof schema.partial === 'function') {
    schema = schema.partial();
  }
  // Note: zod object schemas default to "strip" behaviour. To "strict"-reject
  // unknown keys, callers pass options.strip = false → schema.strict().
  if (options.strip === false && typeof schema.strict === 'function') {
    schema = schema.strict();
  }
  return { schema, entityName };
}

function makeMiddleware(source) {
  return function validate(entityOrSchema, options = {}) {
    const { schema, entityName } = resolve(entityOrSchema, options);
    const preview = options.preview === true;
    const logger = options.logger; // optional; fallback to console
    return function validateMiddleware(req, res, next) {
      const input = req[source];
      const result = schema.safeParse(input);
      if (!result.success) {
        const errors = formatErrors(result.error);
        if (preview) {
          const log = logger || console;
          (log.warn || log.log || console.warn).call(
            log,
            '[canonical-validator:preview] %s on %s failed (%d issue(s)) — request allowed through',
            entityName || 'schema',
            source,
            errors.length,
            { errors: errors.slice(0, 5) }
          );
          return next();
        }
        return res.status(400).json({
          ok: false,
          reason: REASON_CODE,
          entity: entityName,
          source,
          errors,
        });
      }
      // Replace request property with parsed value so handlers see the
      // coerced, canonical-shape payload.
      req[source] = result.data;
      return next();
    };
  };
}

const validateBody = makeMiddleware('body');
const validateQuery = makeMiddleware('query');
const validateParams = makeMiddleware('params');

module.exports = {
  REASON_CODE,
  validateBody,
  validateQuery,
  validateParams,
  // exported for unit tests
  _formatErrors: formatErrors,
  _resolve: resolve,
};
