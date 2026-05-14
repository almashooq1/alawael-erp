'use strict';

/**
 * Mongoose plugin: auto-issue a UniversalCode when a document is created.
 *
 * Usage:
 *   const universalCodePlugin = require('../services/universalCode/plugin');
 *   beneficiarySchema.plugin(universalCodePlugin, {
 *     entityType: 'BNF',
 *     labelFrom: doc => `${doc.firstName} ${doc.lastName}`,
 *   });
 *
 * Options:
 *   entityType: 3-letter code (required) — must match an entry in
 *     `models/UniversalCode.js > ENTITY_TYPES`.
 *   labelFrom: (doc) => string. Optional. Cached as `entityLabel` for
 *     fast scan responses.
 *
 * Behaviour:
 *   - On every successful save (insert OR update), check that a
 *     UniversalCode row exists for this doc. If not, create one.
 *     If the label has changed, refresh it.
 *   - Adds a virtual `universalCode` getter that returns the cached
 *     code string (loaded if available, otherwise null). For a synchronous
 *     fetch use the service directly.
 *   - Failures are LOGGED, not thrown — never block a save because the
 *     QR catalog hiccupped.
 */

const logger = require('../../utils/logger');

function universalCodePlugin(schema, opts = {}) {
  const { entityType, labelFrom } = opts || {};
  if (!entityType || !/^[A-Z]{3}$/.test(entityType)) {
    throw new Error('universalCodePlugin: opts.entityType (3 uppercase letters) is required');
  }

  // post('save') fires for both inserts and updates.
  schema.post('save', async function () {
    try {
      // Lazy-require to dodge circular-init issues — plugin is registered
      // at schema-definition time, before the model is fully built.
      const svc = require('./');
      const label = typeof labelFrom === 'function' ? labelFrom(this) : null;
      await svc.generate(entityType, this._id, label ? { entityLabel: label } : {});
    } catch (err) {
      logger.warn(
        `[UniversalCode] auto-issue failed for ${entityType}/${this._id}: ${err.message}`
      );
    }
  });

  // Cache lookup (returns Promise) — convenient for routes that want
  // to embed the code in API responses.
  schema.methods.getUniversalCode = async function () {
    const svc = require('./');
    return svc.generate(entityType, this._id);
  };
}

module.exports = universalCodePlugin;
