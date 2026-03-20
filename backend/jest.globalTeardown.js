/**
 * Jest Global Teardown
 * Stops the MongoMemoryServer and cleans up the URI temp file.
 */
const path = require('path');
const fs = require('fs');

const URI_FILE = path.join(__dirname, '.test-mongo-uri');

module.exports = async () => {
  if (globalThis.__MONGOD__) {
    await globalThis.__MONGOD__.stop();
  }
  try {
    fs.unlinkSync(URI_FILE);
  } catch {
    // ignore if already deleted
  }
};
