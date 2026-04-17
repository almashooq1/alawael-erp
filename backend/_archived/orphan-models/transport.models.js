'use strict';
/**
 * @deprecated — Split into backend/models/transport/ (10 individual model files).
 * Kept as a backward-compatible barrel export so existing requires keep working.
 * Migrate callers to: const { Bus, Driver } = require('../models/transport/index');
 */
module.exports = require('./transport/index');
