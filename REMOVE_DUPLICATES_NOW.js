/**
 * 🧹 إزالة الملفات المكررة - التنفيذ الفوري
 * Remove All Duplicate Files - 100% Cleanup
 * @run: node REMOVE_DUPLICATES_NOW.js
 */

const fs = require('fs');
const path = require('path');

// الملفات المكررة للإزالة (33 ملف)
const DUPLICATES_TO_REMOVE = [
  // Middleware المكررة (12 ملف)
  'backend/middleware/auth.js',
  'backend/middleware/auth.middleware.js',
  'backend/middleware/authentication.js',
  'backend/middleware/authorization.js',
  'backend/middleware/validate.js',
  'backend/middleware/validator.js',
  'backend/middleware/validation.middleware.js',
  'backend/middleware/rateLimit.js',
  'backend/middleware/rate-limiter.js',
  'backend/middleware/limiter.js',
  'backend/middleware/auth.old.js',
  'backend/middleware/validation.old.js',

  // Services المكررة (16 ملف)
  'backend/services/auth.js',
  'backend/services/auth.service.js',
  'backend/services/authentication.js',
  'backend/services/user.js',
  'backend/services/user.service.js',
  'backend/services/users.js',
  'backend/services/notification.js',
  'backend/services/notification.service.js',
  'backend/services/notifications.js',
  'backend/services/analytics.js',
  'backend/services/analytics.service.js',
  'backend/services/logger.js',
  'backend/services/logger.service.js',
  'backend/services/cache.js',
  'backend/services/cache.service.js',
  'backend/services/index.js',

  // Models المكررة (5 ملف)
  'backend/models/User.js',
  'backend/models/Employee.js',
  'backend/models/Department.js',
  'backend/models/Attendance.js',
  'backend/models/index.js'
];

// الملفات الموحدة البديلة
const UNIFIED_REPLACEMENTS = {
  'backend/middleware/': 'backend/middleware/index.unified.js',
  'backend/services/': 'backend/services/index.unified.js',
  'backend/models/': 'backend/models/index.unified.js'
};

let removedCount = 0;
let notFoundCount = 0;
let errorCount = 0;

console.log('🧹 بدء إزالة الملفات المكررة...\n');

DUPLICATES_TO_REMOVE.forEach(file => {
  const fullPath = path.join(process.cwd(), file);

  try {
    if (fs.existsSync(fullPath)) {
      // إنشاء نسخة احتياطية قبل الحذف
      const backupPath = fullPath + '.backup';
      fs.copyFileSync(fullPath, backupPath);

      // حذف الملف
      fs.unlinkSync(fullPath);
      console.log(`✅ تم حذف: ${file}`);
      removedCount++;
    } else {
      console.log(`⏭️ غير موجود: ${file}`);
      notFoundCount++;
    }
  } catch (error) {
    console.log(`❌ خطأ في: ${file} - ${error.message}`);
    errorCount++;
  }
});

// حذف المجلدات الفارغة
const emptyDirs = [
  'backend/middleware/old',
  'backend/services/old',
  'backend/models/old'
];

emptyDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  try {
    if (fs.existsSync(fullPath)) {
      fs.rmdirSync(fullPath, { recursive: true });
      console.log(`📁 تم حذف مجلد: ${dir}`);
    }
  } catch (e) {
    // تجاهل أخطاء المجلدات
  }
});

console.log('\n========================================');
console.log('📊 تقرير التنظيف:');
console.log('========================================');
console.log(`✅ ملفات تم حذفها: ${removedCount}`);
console.log(`⏭️ ملفات غير موجودة: ${notFoundCount}`);
console.log(`❌ أخطاء: ${errorCount}`);
console.log('========================================');
console.log(`📉 نسبة التكرار المتبقية: ${Math.max(0, 100 - Math.round((removedCount / 33) * 100))}%`);
console.log('========================================');

console.log('\n🎉 تم الانتهاء من التنظيف!');
console.log('\n📋 الملفات الموحدة البديلة:');
console.log('   - backend/middleware/index.unified.js');
console.log('   - backend/services/index.unified.js');
console.log('   - backend/models/index.unified.js');
console.log('   - backend/utils/index.unified.js');
console.log('   - backend/routes/index.unified.js');

console.log('\n💡 نصيحة: احذف الملفات .backup بعد التأكد من عمل النظام');
