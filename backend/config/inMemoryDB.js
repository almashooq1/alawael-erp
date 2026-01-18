const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');
const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
const defaultData = {
  users: [],
  employees: [],
  attendances: [],
  leaves: [],
  performance: [],
};

// Keep an in-memory store for tests to avoid cross-worker file races
let memoryDB = { ...defaultData };

function readFromDisk() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    return { ...defaultData };
  }
  const data = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(data);
}

/**
 * قراءة قاعدة البيانات
 */
function read() {
  try {
    if (isTestEnv) {
      return JSON.parse(JSON.stringify(memoryDB));
    }
    return readFromDisk();
  } catch (error) {
    console.error('خطأ في قراءة قاعدة البيانات:', error);
    return { ...defaultData };
  }
}

/**
 * كتابة إلى قاعدة البيانات
 */
function write(data) {
  try {
    const nextData = { ...defaultData, ...data };

    if (isTestEnv) {
      memoryDB = JSON.parse(JSON.stringify(nextData));
      return true;
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(nextData, null, 2));
    return true;
  } catch (error) {
    console.error('خطأ في كتابة قاعدة البيانات:', error);
    return false;
  }
}

module.exports = {
  read,
  write,
};
