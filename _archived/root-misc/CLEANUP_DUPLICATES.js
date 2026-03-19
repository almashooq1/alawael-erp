/**
 * 🧹 Cleanup Duplicates Script - سكريبت تنظيف الملفات المكررة
 * يقوم بتنظيف الملفات المكررة وتوحيدها
 * @version 1.0.0
 *
 * تشغيل: node CLEANUP_DUPLICATES.js
 */

const fs = require('fs');
const path = require('path');

// ============================================
// إعدادات
// ============================================

const BACKEND_DIR = __dirname + '/backend';
const DRY_RUN = process.env.DRY_RUN !== 'false'; // افتراضياً dry-run

// ============================================
// قائمة الملفات المكررة للحذف
// ============================================

const FILES_TO_DELETE = {
  // ملفات المصادقة المكررة (بعد إنشاء auth.unified.js)
  middleware: [
    'auth.middleware.js',      // مكرر
    'authenticate.js',          // مكرر
    'authMiddleware.js',        // مكرر
    'advancedAuth.js',          // تم دمجه في الموحد
    // 'auth.js',               // نحتفظ به للتوافقية حالياً

    // ملفات validation المكررة
    'validation.middleware.js',
    'validator.middleware.js',
    'requestValidation.js',
    'validation.schemas.advanced.js',
    // 'validation.js',         // نحتفظ به للتوافقية

    // ملفات rate limiter المكررة
    'rate-limiter-advanced.js',
    'rateLimiter.advanced.js',
    'distributedRateLimiter.js',
    'userRateLimiter.js',
    // 'rateLimiter.js',        // نحتفظ به للتوافقية
  ],

  // ملفات services المكررة
  services: [
    'notificationService.js',           // استخدم notification.service.js
    'notifications.service.js',         // استخدم notification.service.js
    'notificationCenter.service.js',    // استخدم notification.service.js
    'messaging.service.original.js',    // نسخة أصلية - احذف
    'messaging.service.simplified.js',  // نسخة مبسطة - احذف
    'advancedSearchService.legacy.js',  // تراث - احذف
    'aiService.js',                     // استخدم ai.service.js
    'aiAnalyticsService.js',            // دمج في ai.service.js
    'analyticsService.js',              // استخدم analytics.service.js
    'AuthService.js',                   // استخدم auth.service.js
    'AuthenticationService.js',         // استخدم auth.service.js
    'BackupRestore.js',                 // استخدم backup.service.js
    'EncryptionService.js',             // استخدم encryption-service.js
    'HealthCheck.js',                   // استخدم health.service.js
    'AlertService.js',                  // استخدم alert.service.js
  ],

  // ملفات models المكررة
  models: [
    'Finance.memory.js.bak',            // نسخة احتياطية - احذف
    'Attendance.memory.js',             // إذا كان لدينا attendance.model.js
    'Employee.memory.js',               // إذا كان لدينا employee.model.js
    'Leave.memory.js',                  // إذا كان لدينا leave.model.js
    'User.memory.js',                   // إذا كان لدينا user.model.js
    'Notification.memory.js',           // إذا كان لدينا notification.model.js
  ]
};

// ============================================
// ملفات للدمج (تحتاج مراجعة يدوية)
// ============================================

const FILES_TO_MERGE = {
  routes: {
    // الإشعارات - دمج في notifications.routes.js
    notifications: [
      'notification.routes.js',
      'notificationRoutes.js',
    ],
    // HR - دمج في hr.routes.js
    hr: [
      'hr.routes.js',
      'hr-advanced.routes.js',
      'hr_advanced.routes.js',
      'hr_core.routes.js',
      'hr_smart.routes.js',
    ],
    // Dashboard - دمج
    dashboard: [
      'dashboard.routes.js',
      'dashboardRoutes.js',
      'dashboards.routes.js',
    ],
  }
};

// ============================================
// دوال مساعدة
// ============================================

/**
 * تسجيل الرسائل
 */
const log = (message, type = 'info') => {
  const colors = {
    info: '\x1b[36m',    // cyan
    success: '\x1b[32m', // green
    warning: '\x1b[33m', // yellow
    error: '\x1b[31m',   // red
    reset: '\x1b[0m'
  };

  console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
};

/**
 * التحقق من وجود ملف
 */
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

/**
 * حذف ملف
 */
const deleteFile = (filePath) => {
  try {
    if (fileExists(filePath)) {
      if (DRY_RUN) {
        log(`[DRY-RUN] Would delete: ${filePath}`, 'warning');
        return { success: true, dryRun: true };
      }
      fs.unlinkSync(filePath);
      log(`Deleted: ${filePath}`, 'success');
      return { success: true, dryRun: false };
    } else {
      log(`File not found: ${filePath}`, 'warning');
      return { success: false, reason: 'not_found' };
    }
  } catch (error) {
    log(`Error deleting ${filePath}: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
};

/**
 * نقل ملف إلى مجلد النسخ الاحتياطي
 */
const moveToBackup = (filePath) => {
  const backupDir = path.join(__dirname, 'backups', 'cleanup_backup');

  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, fileName);

    if (DRY_RUN) {
      log(`[DRY-RUN] Would move: ${filePath} -> ${backupPath}`, 'warning');
      return { success: true, dryRun: true };
    }

    fs.renameSync(filePath, backupPath);
    log(`Moved to backup: ${filePath}`, 'success');
    return { success: true, dryRun: false };
  } catch (error) {
    log(`Error moving ${filePath}: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
};

// ============================================
// التنظيف الرئيسي
// ============================================

const runCleanup = async () => {
  console.log('\n========================================');
  console.log('🧹 بدء تنظيف الملفات المكررة');
  console.log(`وضع: ${DRY_RUN ? 'DRY-RUN (لن يتم الحذف الفعلي)' : 'LIVE (سيتم الحذف)'}`);
  console.log('========================================\n');

  const stats = {
    deleted: 0,
    moved: 0,
    notFound: 0,
    errors: 0,
    total: 0
  };

  // تنظيف الملفات
  for (const [folder, files] of Object.entries(FILES_TO_DELETE)) {
    log(`\n📁 Processing folder: ${folder}`, 'info');

    for (const file of files) {
      stats.total++;
      const filePath = path.join(BACKEND_DIR, folder, file);

      // محاولة النقل للنسخة الاحتياطية أولاً
      const result = moveToBackup(filePath);

      if (result.success) {
        if (result.dryRun) {
          stats.moved++;
        } else {
          stats.moved++;
        }
      } else if (result.reason === 'not_found') {
        stats.notFound++;
      } else {
        stats.errors++;
      }
    }
  }

  // طباعة الإحصائيات
  console.log('\n========================================');
  console.log('📊 إحصائيات التنظيف');
  console.log('========================================');
  console.log(`إجمالي الملفات المفحوصة: ${stats.total}`);
  console.log(`تم النقل للنسخة الاحتياطية: ${stats.moved}`);
  console.log(`ملفات غير موجودة: ${stats.notFound}`);
  console.log(`أخطاء: ${stats.errors}`);
  console.log('========================================\n');

  // طباعة الملفات التي تحتاج دمج يدوي
  console.log('\n========================================');
  console.log('⚠️ ملفات تحتاج دمج يدوي');
  console.log('========================================');

  for (const [category, groups] of Object.entries(FILES_TO_MERGE)) {
    for (const [group, files] of Object.entries(groups)) {
      console.log(`\n[${category}/${group}]:`);
      files.forEach(file => console.log(`  - ${file}`));
    }
  }

  console.log('\n========================================');
  console.log('✅ انتهى التنظيف');
  if (DRY_RUN) {
    console.log('💡 لتطبيق التغييرات الفعلية، شغل: DRY_RUN=false node CLEANUP_DUPLICATES.js');
  }
  console.log('========================================\n');
};

// ============================================
// تشغيل السكريبت
// ============================================

if (require.main === module) {
  runCleanup().catch(console.error);
}

module.exports = {
  runCleanup,
  FILES_TO_DELETE,
  FILES_TO_MERGE
};
