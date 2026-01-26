const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  try {
    const infoPath = path.join(__dirname, '.mongo-info.json');
    if (!fs.existsSync(infoPath)) return;
    const data = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    // mongodb-memory-server doesn't provide a direct way to stop by uri,
    // but we can create a new MongoMemoryServer instance pointing to the same
    // instance (stop will be a best-effort). If this fails, ignore.
    // Clean up file
    fs.unlinkSync(infoPath);
  } catch (err) {
    // ignore
  }
};
