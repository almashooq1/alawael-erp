/**
 * Shared express-validator middleware
 * يمكن استخدامه في أي ملف مسارات لتبسيط التحقق من المدخلات
 *
 * Usage:
 *   const { validate } = require('../middleware/validate');
 *   const { body, param } = require('express-validator');
 *
 *   router.post('/items',
 *     validate([
 *       body('name').notEmpty().withMessage('الاسم مطلوب'),
 *       body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
 *     ]),
 *     async (req, res, next) => { ... }
 *   );
 */

const { validationResult } = require('express-validator');

/**
 * Collect express-validator results already attached to `req` and either
 * continue or return the first error as a 400.
 */
function _respond(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  return res.status(400).json({
    success: false,
    message: errors.array()[0].msg,
    errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
  });
}

/**
 * Polymorphic validation helper supporting BOTH call styles:
 *
 *   1. Factory form (documented):
 *        validate([ body('x').notEmpty(), ... ])   // runs the checks, then validates
 *
 *   2. Bare-middleware form (used by several route files that place the checks
 *      in a separate preceding array, e.g. `[v.page, v.limit], validate,`):
 *        router.get('/x', [v.page, v.limit], validate, handler)
 *      Here Express invokes validate(req, res, next) directly. The preceding
 *      chain array already ran the checks, so we just collect the results.
 *
 * The bare form previously hung the request: `validate` returned a middleware
 * function and never called next(), so ~22 attendance/payroll/gratuity/claims
 * endpoints never responded. Detecting the call shape fixes all of them
 * without rewriting every route, and stays backward-compatible with the
 * factory callers.
 *
 * @returns {Function|undefined} a middleware (factory form) or nothing (bare form)
 */
const validate = (...args) => {
  // Factory form: validate([ ...checks ])
  if (Array.isArray(args[0])) {
    const validations = args[0];
    return async (req, res, next) => {
      if (validations.length) await Promise.all(validations.map(v => v.run(req)));
      return _respond(req, res, next);
    };
  }

  // Bare-middleware form: validate(req, res, next)
  const [req, res, next] = args;
  if (req && res && typeof next === 'function') {
    return _respond(req, res, next);
  }

  // Defensive: called with no usable args → no-op passthrough middleware.
  return (_req, _res, nxt) => nxt();
};

module.exports = { validate };
