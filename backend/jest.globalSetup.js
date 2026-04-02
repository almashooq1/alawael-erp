/**
 * Jest Global Setup
 * Starts a MongoMemoryServer instance shared by all integration tests.
 * The URI is written to a temp file so jest workers can read it.
 *
 * NOTE: Skipped in CI (process.env.CI === 'true') because:
 *  - tests use mocked mongoose (jest.mock in jest.setup.js)
 *  - MongoMemoryServer requires downloading a binary which is slow/unreliable in CI
 */
const path = require('path');
const fs = require('fs');

const URI_FILE = path.join(__dirname, '.test-mongo-uri');

module.exports = async () => {
  // Skip MongoMemoryServer in CI - tests use mocked mongoose
  if (process.env.CI === 'true') {
    return;
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({
      instance: { dbName: 'alawael-test' },
    });
    const uri = mongod.getUri();

    // Store reference for teardown
    globalThis.__MONGOD__ = mongod;

    // Write URI to file for jest workers (env vars don't propagate across processes)
    fs.writeFileSync(URI_FILE, uri, 'utf-8');
  } catch (err) {
    // Gracefully handle failure - tests use mocked mongoose anyway
    console.warn('[globalSetup] MongoMemoryServer failed to start:', err.message);
  }
};
