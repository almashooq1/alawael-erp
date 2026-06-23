/**
 * Jest Global Teardown
 * Stops the MongoMemoryServer, removes its temp data directory, and cleans
 * up the URI / dbPath temp files so they don't leak across runs.
 */
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

const URI_FILE = path.join(__dirname, '.test-mongo-uri');
const DBPATH_FILE = path.join(__dirname, '.test-mongo-dbpath');

async function _rimraf(dir) {
  if (!dir || !fs.existsSync(dir)) return;
  // Best-effort cleanup with retries. On Windows mongod may still hold locks
  // briefly after mongod.stop() resolves, causing EPERM. Wait and retry.
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      rimraf.sync(dir);
      return;
    } catch (err) {
      if (attempt === 5) {
        console.warn(
          '[globalTeardown] could not remove temp dir after 5 attempts:',
          dir,
          err.message
        );
        return;
      }
      await new Promise(r => setTimeout(r, attempt * 300));
    }
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
    await _rimraf(dbPath);
  } catch {
    // no dbPath file — nothing to clean
  }

  // Remove the temp marker files regardless.
  _unlink(URI_FILE);
  _unlink(DBPATH_FILE);
};
