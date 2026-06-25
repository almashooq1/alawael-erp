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
const DBPATH_FILE = path.join(__dirname, '.test-mongo-dbpath');
const MAINTENANCE_FLAG = path.join(__dirname, '..', 'maintenance.flag');

module.exports = async () => {
  // Always delete any stale URI/DBPATH files from a previous interrupted run FIRST.
  // If MMS creation below fails (try/catch), the files won't exist and tests
  // that read them will correctly fall back to creating their own MMS.
  for (const f of [URI_FILE, DBPATH_FILE]) {
    try {
      fs.unlinkSync(f);
    } catch {
      // file didn't exist — that's fine
    }
  }

  // Remove any stale maintenance flag left by a previous crashed/abort run.
  // Its presence makes the maintenance middleware return 503 globally.
  try {
    if (fs.existsSync(MAINTENANCE_FLAG)) fs.unlinkSync(MAINTENANCE_FLAG);
  } catch {
    // ignore permission errors
  }

  // Skip MongoMemoryServer in CI - tests use mocked mongoose
  if (process.env.CI === 'true') {
    return;
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbName: 'alawael-test',
      },
      binary: { checkMD5: false },
    });
    const uri = mongod.getUri();

    // Store reference for teardown
    globalThis.__MONGOD__ = mongod;

    // Write URI to file for jest workers (env vars don't propagate across processes)
    fs.writeFileSync(URI_FILE, uri, 'utf-8');

    // Persist dbPath so teardown can hard-delete the temp dir even if
    // mongod.stop() leaves it behind (observed on Windows after crashes).
    const instanceInfo = mongod.instanceInfo;
    if (instanceInfo && instanceInfo.dbPath) {
      fs.writeFileSync(DBPATH_FILE, instanceInfo.dbPath, 'utf-8');
    }
  } catch (err) {
    // Gracefully handle failure - tests use mocked mongoose anyway
    console.warn('[globalSetup] MongoMemoryServer failed to start:', err.message);
  }
};
