/**
 * Safe Model Helper
 * Prevents "Cannot overwrite model once compiled" errors
 * when a model file is required more than once.
 */
const mongoose = require('mongoose');

function safeModel(name, schema) {
  if (mongoose.models[name]) {
    return mongoose.models[name];
  }
  return mongoose.model(name, schema);
}

module.exports = { safeModel };
