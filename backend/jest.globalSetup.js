/**
 * Jest Global Setup
 * Starts a MongoMemoryServer instance shared by all integration tests.
 * The URI is written to a temp file so worker processes can read it.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');
const fs = require('fs');

const URI_FILE = path.join(__dirname, '.test-mongo-uri');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: 'alawael-test' },
  });
  const uri = mongod.getUri();

  // Store reference for teardown
  globalThis.__MONGOD__ = mongod;

  // Write URI to file for jest workers (env vars don't propagate across processes)
  fs.writeFileSync(URI_FILE, uri, 'utf-8');
};
