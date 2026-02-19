// Alias for backward compatibility
try {
  module.exports = require('./course.model');
} catch (e) {
  module.exports = class {};
}
