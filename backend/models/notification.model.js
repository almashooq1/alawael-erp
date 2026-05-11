/* eslint-disable no-unused-vars */
// Alias for Notification.js - For compatibility with test imports
try {
  module.exports = require('./Notification') || class {};
} catch (e) {
  module.exports = class {};
}
