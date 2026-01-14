const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');

/**
 * قراءة قاعدة البيانات
 */
function read() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // إنشاء ملف db.json فارغ إذا لم يكن موجوداً
      const emptyDB = {
        users: [],
        employees: [],
        attendances: [],
        leaves: [],
        performance: [],
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(emptyDB, null, 2));
      return emptyDB;
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('خطأ في قراءة قاعدة البيانات:', error);
    return {
      users: [],
      employees: [],
      attendances: [],
      leaves: [],
      performance: [],
    };
  }
}

/**
 * كتابة إلى قاعدة البيانات
 */
function write(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
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
