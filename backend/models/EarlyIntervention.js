'use strict';
/**
 * @deprecated — Split into backend/models/early-intervention/ (5 individual model files).
 * Kept as a backward-compatible barrel export so existing requires keep working.
 * Migrate callers to: const { EarlyInterventionChild } = require('../models/early-intervention/index');
 */
module.exports = require('./early-intervention/index');
