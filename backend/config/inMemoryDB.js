/* eslint-disable no-unused-vars */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

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

async function readFromDisk() {
  try {
    const data = await fs.promises.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.promises.writeFile(DB_PATH, JSON.stringify(defaultData, null, 2));
      return { ...defaultData };
    }
    throw err;
  }
}

/**
 * قراءة قاعدة البيانات
 */
async function read() {
  try {
    if (isTestEnv) {
      return JSON.parse(JSON.stringify(memoryDB));
    }
    return await readFromDisk();
  } catch (error) {
    logger.error('خطأ في قراءة قاعدة البيانات:', error);
    return { ...defaultData };
  }
}

/**
 * كتابة إلى قاعدة البيانات
 */
async function write(data) {
  try {
    const nextData = { ...defaultData, ...data };

    if (isTestEnv) {
      memoryDB = JSON.parse(JSON.stringify(nextData));
      return true;
    }

    await fs.promises.writeFile(DB_PATH, JSON.stringify(nextData, null, 2));
    return true;
  } catch (error) {
    logger.error('خطأ في كتابة قاعدة البيانات:', error);
    return false;
  }
}

module.exports = {
  read,
  write,
};
