// Alias for backward compatibility
try {
  module.exports =
    require('./JournalEntry') || require('./Payment') || require('./payment.model') || class {};
} catch (e) {
  module.exports = class {};
}
