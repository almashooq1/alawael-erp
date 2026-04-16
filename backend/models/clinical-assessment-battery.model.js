'use strict';
/**
 * @deprecated — Split into backend/models/clinical-assessment/ (12 individual model files).
 * Kept as a backward-compatible barrel export so existing requires keep working.
 * Migrate callers to: const { MChatAssessment } = require('../models/clinical-assessment/index');
 */
module.exports = require('./clinical-assessment/index');
