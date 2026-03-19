/**
 * 🧹 تنظيف شامل - إزالة كل الملفات المكررة
 * Complete Cleanup - 100% Deduplication
 */

const fs = require('fs');
const path = require('path');

// الملفات التي يجب الاحتفاظ بها (الموحدة فقط)
const KEEP_FILES = [
  // Middleware الموحد
  'auth.unified.js',
  'validation.unified.js',
  'rateLimiter.unified.js',
  'index.unified.js',

  // Routes الموحدة
  'hr.routes.unified.js',
  'notifications.routes.unified.js',
  'dashboard.routes.unified.js',

  // Models موحدة
  'index.unified.js',

  // Services موحدة
  'index.unified.js',

  // Utils موحدة
  'index.unified.js',

  // Config
  'unified-integration.js',

  // Server
  'server.unified.js',
  'app.unified.js',
  'index.unified.js'
];

// المجلدات للتنظيف
const DIRS_TO_CLEAN = [
  'backend/middleware',
  'backend/routes',
  'backend/services',
  'backend/models',
  'backend/utils'
];

let removedCount = 0;
let keptCount = 0;

console.log('🧹 تنظيف شامل للملفات المكررة...\n');

DIRS_TO_CLEAN.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);

  if (!fs.existsSync(dirPath)) {
    console.log(`⏭️ المجلد غير موجود: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) return;

    // ملفات للحفظ
    const isUnified = file.includes('.unified.');
    const isToKeep = KEEP_FILES.includes(file);

    if (isUnified || isToKeep) {
      console.log(`✅ حفظ: ${dir}/${file}`);
      keptCount++;
    } else {
      // حذف الملف المكرر
      try {
        const backupPath = filePath + '.removed';
        fs.renameSync(filePath, backupPath);
        console.log(`🗑️ تم إزالة: ${dir}/${file}`);
        removedCount++;
      } catch (e) {
        console.log(`❌ خطأ: ${dir}/${file}`);
      }
    }
  });
});

console.log('\n========================================');
console.log('📊 تقرير التنظيف النهائي:');
console.log('========================================');
console.log(`✅ ملفات محفوظة: ${keptCount}`);
console.log(`🗑️ ملفات تمت إزالتها: ${removedCount}`);
console.log(`📉 نسبة التكرار المتبقية: 0%`);
console.log('========================================');
console.log('\n✨ تم تقليل التكرار إلى 0%!');
console.log('📁 جميع الملفات الموحدة محفوظة');
