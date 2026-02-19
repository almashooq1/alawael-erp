// Alias for backward compatibility
try {
  module.exports = require('./Token') || require('./token') || class {};
} catch (e) {
  module.exports = class {};
}
