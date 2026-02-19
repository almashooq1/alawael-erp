// Alias for backward compatibility
try {
  module.exports = require('./User') || require('./user') || require('./Student') || class {};
} catch (e) {
  module.exports = class {};
}
