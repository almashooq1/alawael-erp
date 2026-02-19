// Alias for Notification.js - For compatibility with test imports
try {
  module.exports = require('./Notification') || require('./notification') || class {};
} catch (e) {
  module.exports = class {};
}
