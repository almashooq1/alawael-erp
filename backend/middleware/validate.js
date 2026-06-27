/**
 * middleware/validate.js — Request Validation Middleware
 * ═══════════════════════════════════════════════════════
 * Wraps Joi schemas into Express middleware.
 * Rejects with 400 if validation fails.
 *
 * Usage:
 *   const { validate } = require('../middleware/validate');
 *   router.post('/', validate(createSchema), controller.create);
 */

'use strict';

const Joi = require('joi');

function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) errors.push(...error.details.map(d => `params.${d.message}`));
    }

    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false });
      if (error) errors.push(...error.details.map(d => `query.${d.message}`));
    }

    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) errors.push(...error.details.map(d => `body.${d.message}`));
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      });
    }

    next();
  };
}

module.exports = { validate };
