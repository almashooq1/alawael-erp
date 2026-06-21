/**
 * Jest Global Teardown
 * Stops the MongoMemoryServer, removes its temp data directory, and cleans
 * up the URI / dbPath temp files so they don't leak across runs.
 */
const path = require('path');
const fs = require('fs');

const URI_FILE = path.join(__dirname, '.test-mongo-uri');
const DBPATH_FILE = path.join(__dirname, '.test-mongo-dbpath');

function _rimraf(dir) {
  if (!dir || !fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  } catch (err) {
    // Best-effort cleanup; don't fail the test run because of temp files.
    console.warn('[globalTeardown] could not remove temp dir:', dir, err.message);
  }
}

function _unlink(f) {
  try {
    fs.unlinkSync(f);
  } catch {
    // ignore if already deleted
  }
}

module.exports = async () => {
  // Stop the shared mongod first so its data files are unlocked.
  if (globalThis.__MONGOD__) {
    try {
      await globalThis.__MONGOD__.stop();
    } catch (err) {
      console.warn('[globalTeardown] mongod.stop() failed:', err.message);
    }
  }

  // Hard-delete the temp data directory. mongodb-memory-server usually does
  // this on stop(), but leaked dirs have been observed after crashes/OOMs.
  try {
    const dbPath = fs.readFileSync(DBPATH_FILE, 'utf-8').trim();
    _rimraf(dbPath);
  } catch {
    // no dbPath file — nothing to clean
  }

  // Remove the temp marker files regardless.
  _unlink(URI_FILE);
  _unlink(DBPATH_FILE);
};
