/* eslint-disable no-unused-vars */
/**
 * ═══════════════════════════════════════════════════════════════════════
 * BACKUP SYSTEM INTEGRATION
 * ملف التكامل - دمج نظام النسخ الاحتياطية في التطبيق
 * ═══════════════════════════════════════════════════════════════════════
 *
 * This file shows how to integrate the Enhanced Backup System
 * into your Express application.
 *
 * استخدم هذا الملف لإضافة نظام النسخ الاحتياطية إلى تطبيق Express الخاص بك
 */

// ═══════════════════════════════════════════════════════════════════════
// 1. IMPORTS
// ═══════════════════════════════════════════════════════════════════════

const express = require('express');
const consolidate = require('consolidate');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Backup Services
const enhancedBackup = require('./services/enhanced-backup.service');
const backupMonitoring = require('./services/backup-monitoring.service');
const multiLocationStorage = require('./services/backup-multi-location.service');

// Backup Routes
const backupRoutes = require('./routes/backups.routes');

// ═══════════════════════════════════════════════════════════════════════
// 2. INITIALIZATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Initialize Backup System
 * تهيئة نظام النسخ الاحتياطية
 */
async function initializeBackupSystem() {
  try {
    console.log('\n🔄 Initializing Backup System...');

    // Validate configuration
    validateBackupConfiguration();

    // Initialize services
    await enhancedBackup.initializeBackupDirectory();
    backupMonitoring.initializeMonitoring();

    // Setup event listeners
    setupBackupEventListeners();

    // Start automatic backups if enabled
    if (process.env.ENABLE_AUTO_BACKUP === 'true') {
      console.log(`📅 Starting automatic backups...`);
      const cronExpression = process.env.BACKUP_CRON_EXPRESSION || '0 2 * * *';
      enhancedBackup.scheduleBackups(cronExpression);
    } else {
      console.log('⚠️  Auto-backup disabled');
    }

    console.log('✅ Backup System initialized successfully\n');
  } catch (error) {
    console.error('❌ Failed to initialize Backup System:', error.message);
    process.exit(1);
  }
}

/**
 * Validate Backup Configuration
 * التحقق من إعدادات النسخ الاحتياطية
 */
function validateBackupConfiguration() {
  const required = ['BACKUP_STORAGE_PATH', 'MONGODB_URI'];

  const warnings = [];

  required.forEach(env => {
    if (!process.env[env]) {
      throw new Error(`Missing required environment variable: ${env}`);
    }
  });

  // Check encryption key if encryption enabled
  if (process.env.BACKUP_ENCRYPTION_KEY) {
    if (process.env.BACKUP_ENCRYPTION_KEY.length !== 64) {
      throw new Error('BACKUP_ENCRYPTION_KEY must be 64 characters (32 bytes in hex)');
    }
  } else {
    warnings.push('Warning: BACKUP_ENCRYPTION_KEY not set - backups will not be encrypted');
  }

  // Warn about cloud storage if not configured
  if (!process.env.AWS_S3_BUCKET && !process.env.GCS_BUCKET && !process.env.AZURE_STORAGE_ACCOUNT) {
    warnings.push('Warning: No cloud storage configured - only local storage will be used');
  }

  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`⚠️  ${w}`));
  }
}

/**
 * Setup Backup Event Listeners
 * إعداد مستمعي أحداث النسخ الاحتياطية
 */
function setupBackupEventListeners() {
  // Enhanced Backup Events
  enhancedBackup.on('backup:started', backup => {
    console.log(`🔄 Backup started: ${backup.id}`);
  });

  enhancedBackup.on('backup:progress', data => {
    const progress = Math.round(data.progress);
    console.log(`   Progress: ${progress}% (${formatBytes(data.size)})`);
  });

  enhancedBackup.on('backup:completed', backup => {
    console.log(`✅ Backup completed: ${backup.id}`);
    console.log(`   Size: ${formatBytes(backup.size)}`);
    console.log(`   Duration: ${Math.round(backup.duration / 1000)}s`);
  });

  enhancedBackup.on('backup:failed', data => {
    console.error(`❌ Backup failed: ${data.backupId}`);
    console.error(`   Error: ${data.error}`);
  });

  enhancedBackup.on('backup:deleted', data => {
    console.log(`🗑️  Backup deleted: ${data.backupId}`);
  });

  // Monitoring Events
  backupMonitoring.on('health:checked', health => {
    if (health.status !== 'HEALTHY') {
      console.warn(`⚠️  Backup system health: ${health.status}`);
      health.issues.forEach(issue => console.warn(`   - ${issue}`));
    }
  });

  backupMonitoring.on('alert:created', alert => {
    console.warn(`📢 Alert [${alert.level}]: ${alert.message}`);
  });

  backupMonitoring.on('alert:resolved', alert => {
    console.log(`✅ Alert resolved: ${alert.id}`);
  });

  backupMonitoring.on('metrics:collected', metrics => {
    console.log(`📊 Metrics updated - Success Rate: ${(metrics.successRate * 100).toFixed(2)}%`);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 3. EXPRESS MIDDLEWARE SETUP
// ═══════════════════════════════════════════════════════════════════════

/**
 * Setup Express Middleware with Backup Monitoring
 * إعداد وسيط Express مع مراقبة النسخ الاحتياطية
 */
function setupMiddleware(app) {
  // Security
  app.use(helmet());
  app.use(cors());

  // Compression
  app.use(compression());

  // Logging
  app.use(morgan('combined'));

  // Body parsing
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Health check endpoint
  app.get('/api/health/backup', (req, res) => {
    const health = {
      status: backupMonitoring.healthStatus,
      backupSystem: {
        enabled: process.env.ENABLE_AUTO_BACKUP === 'true',
        encryption: !!process.env.BACKUP_ENCRYPTION_KEY,
        monitoring: true,
      },
      timestamp: new Date(),
    };

    res.json({ success: true, health });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 4. ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Register Backup Routes
 * تسجيل مسارات النسخ الاحتياطية
 */
function registerBackupRoutes(app) {
  // Import backup routes
  app.use('/api/backups', backupRoutes);

  console.log('✅ Backup routes registered');
  console.log('   POST   /api/backups/create');
  console.log('   GET    /api/backups/list');
  console.log('   GET    /api/backups/:backupId');
  console.log('   POST   /api/backups/:backupId/restore');
  console.log('   POST   /api/backups/:backupId/validate');
  console.log('   DELETE /api/backups/:backupId');
  console.log('   GET    /api/backups/health/status');
  console.log('   GET    /api/backups/metrics/current');
  console.log('   GET    /api/backups/alerts/active');
  console.log('   GET    /api/backups/storage/locations');
}

// ═══════════════════════════════════════════════════════════════════════
// 5. GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════

/**
 * Setup Graceful Shutdown
 * إعداد الإيقاف الآمن
 */
function setupGracefulShutdown(server) {
  const gracefulShutdown = async signal => {
    console.log(`\n⚠️  ${signal} signal received: closing gracefully`);

    // Stop monitoring
    backupMonitoring.stop();

    // Close server
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// ═══════════════════════════════════════════════════════════════════════
// 6. HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Format Bytes to Human Readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ═══════════════════════════════════════════════════════════════════════
// 7. MAIN APPLICATION SETUP
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create and Configure Express App
 * إنشاء وتكوين تطبيق Express
 */
async function createApp() {
  const app = express();

  // Setup middleware
  setupMiddleware(app);

  // Initialize backup system
  await initializeBackupSystem();

  // Register backup routes
  registerBackupRoutes(app);

  return app;
}

// ═══════════════════════════════════════════════════════════════════════
// 8. STARTUP FUNCTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Start Application
 * بدء التطبيق
 */
async function startApplication() {
  try {
    // Create app
    const app = await createApp();

    // Get port from environment or use default
    const PORT = process.env.PORT || 3001;
    const HOST = process.env.HOST || 'localhost';

    // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log(`\n╔═══════════════════════════════════════════════════════╗`);
      console.log(`║  📦 ENHANCED BACKUP SYSTEM RUNNING                   ║`);
      console.log(`╠═══════════════════════════════════════════════════════╣`);
      console.log(`║  🌐 Server: http://${HOST}:${PORT}`);
      console.log(
        `║  🔐 Encryption: ${process.env.BACKUP_ENCRYPTION_KEY ? '✅ Enabled' : '❌ Disabled'}`
      );
      console.log(
        `║  📅 Auto-Backup: ${process.env.ENABLE_AUTO_BACKUP === 'true' ? '✅ Enabled' : '❌ Disabled'}`
      );
      console.log(`║  📊 Monitoring: ✅ Enabled`);
      console.log(`║  📍 Storage: ${process.env.BACKUP_STORAGE_PATH}`);
      console.log(`╚═══════════════════════════════════════════════════════╝\n`);
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 9. EXAMPLE USAGE WITH DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Example: Automatic Backup Before Critical Operations
 * مثال: نسخة احتياطية تلقائية قبل العمليات الحرجة
 */
const backupBeforeCriticalOperation = async operationName => {
  try {
    console.log(`\n📦 Creating backup before: ${operationName}`);

    const backup = await enhancedBackup.createBackup({
      type: 'FULL',
      description: `Automatic backup before ${operationName}`,
      triggeredBy: 'SYSTEM_AUTO',
    });

    console.log(`✅ Backup created: ${backup.id}`);
    return backup.id;
  } catch (error) {
    console.error(`❌ Failed to create backup: ${error.message}`);
    throw error;
  }
};

/**
 * Example: Automated Recovery
 * مثال: استعادة آلية
 */
const recoverFromBackup = async backupId => {
  try {
    console.log(`\n🔄 Starting recovery from backup: ${backupId}`);

    const result = await enhancedBackup.restoreBackup(backupId, {
      verify: true,
      force: false,
    });

    console.log(`✅ Recovery completed`);
    return result;
  } catch (error) {
    console.error(`❌ Recovery failed: ${error.message}`);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════
// 10. EXPORTS
// ═══════════════════════════════════════════════════════════════════════

module.exports = {
  createApp,
  startApplication,
  initializeBackupSystem,
  setupMiddleware,
  registerBackupRoutes,
  setupGracefulShutdown,
  backupBeforeCriticalOperation,
  recoverFromBackup,
  // Services
  enhancedBackup,
  backupMonitoring,
  multiLocationStorage,
};

// ═══════════════════════════════════════════════════════════════════════
// 11. START APPLICATION IF RUN DIRECTLY
// ═══════════════════════════════════════════════════════════════════════

if (require.main === module) {
  startApplication();
}
