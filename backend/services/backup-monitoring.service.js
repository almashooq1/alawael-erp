/**
 * ═══════════════════════════════════════════════════════════════════════
 * BACKUP MONITORING SERVICE
 * خدمة مراقبة النسخ الاحتياطية - نظام المراقبة الشامل
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * ✅ Health Status Monitoring
 * ✅ Performance Metrics
 * ✅ Alert System
 * ✅ Statistics & Analytics
 * ✅ Backup Validation
 * ✅ Notification Management
 * ═══════════════════════════════════════════════════════════════════════
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class BackupMonitoringService extends EventEmitter {
  constructor() {
    super();

    this.backupDir = process.env.BACKUP_STORAGE_PATH || './backups';
    this.alerts = [];
    this.metrics = {
      totalBackups: 0,
      successfulBackups: 0,
      failedBackups: 0,
      averageDuration: 0,
      averageSize: 0,
      lastBackupTime: null,
      lastCheckTime: new Date(),
    };
    this.healthStatus = 'HEALTHY';
    this.monitoringIntervals = new Map();

    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring system
   * تهيئة نظام المراقبة
   */
  async initializeMonitoring() {
    try {
      console.log('🔍 Initializing backup monitoring system...');

      // Start periodic health checks
      this.startHealthCheck();

      // Start metrics collection
      this.startMetricsCollection();

      // Start alert manager
      this.startAlertManager();

      console.log('✅ Monitoring system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error.message);
    }
  }

  /**
   * Start health check monitoring
   * بدء مراقبة صحة النظام
   */
  startHealthCheck() {
    const interval = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        this.healthStatus = health.status;

        if (health.status !== 'HEALTHY') {
          this.createAlert({
            level: 'WARNING',
            type: 'HEALTH_CHECK',
            message: `Backup system health is ${health.status}`,
            details: health.issues,
          });
        }

        this.emit('health:checked', health);
      } catch (error) {
        console.error('Health check error:', error.message);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    this.monitoringIntervals.set('health-check', interval);
  }

  /**
   * Start metrics collection
   * بدء جمع المقاييس
   */
  startMetricsCollection() {
    const interval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.updateMetrics(metrics);
        this.emit('metrics:collected', metrics);
      } catch (error) {
        console.error('Metrics collection error:', error.message);
      }
    }, 60 * 1000); // Every 1 minute

    this.monitoringIntervals.set('metrics-collection', interval);
  }

  /**
   * Start alert manager
   * بدء مدير التنبيهات
   */
  startAlertManager() {
    const interval = setInterval(async () => {
      try {
        await this.processAlerts();
        this.emit('alerts:processed', this.alerts);
      } catch (error) {
        console.error('Alert processing error:', error.message);
      }
    }, 30 * 1000); // Every 30 seconds

    this.monitoringIntervals.set('alert-manager', interval);
  }

  /**
   * Check system health
   * فحص صحة النظام
   */
  async checkHealth() {
    let status = 'HEALTHY';
    const issues = [];

    try {
      // Check backup directory
      try {
        await fs.access(this.backupDir);
      } catch {
        status = 'CRITICAL';
        issues.push('Backup directory inaccessible');
      }

      // Check disk space
      const diskSpace = await this.checkDiskSpace();
      if (diskSpace.available < 1024 * 1024 * 1024) {
        // Less than 1GB
        status = 'CRITICAL';
        issues.push(`Low disk space: ${this.formatFileSize(diskSpace.available)}`);
      } else if (diskSpace.available < 5 * 1024 * 1024 * 1024) {
        // Less than 5GB
        status = 'WARNING';
        issues.push(`Low disk space: ${this.formatFileSize(diskSpace.available)}`);
      }

      // Check last backup recency
      const lastBackup = await this.getLastBackup();
      if (!lastBackup) {
        status = 'WARNING';
        issues.push('No backups found');
      } else {
        const timeSinceLastBackup = Date.now() - new Date(lastBackup.startTime);
        const hoursAgo = Math.floor(timeSinceLastBackup / (1000 * 60 * 60));

        if (hoursAgo > 48) {
          status = 'WARNING';
          issues.push(`Last backup was ${hoursAgo} hours ago`);
        } else if (hoursAgo > 72) {
          status = 'CRITICAL';
          issues.push(`Last backup was ${hoursAgo} hours ago`);
        }
      }

      // Check backup success rate
      const successRate = await this.calculateSuccessRate();
      if (successRate < 0.7) {
        status = 'CRITICAL';
        issues.push(`Low backup success rate: ${Math.round(successRate * 100)}%`);
      } else if (successRate < 0.9) {
        status = 'WARNING';
        issues.push(`Moderate backup success rate: ${Math.round(successRate * 100)}%`);
      }

      return {
        status,
        timestamp: new Date(),
        issues,
        metrics: {
          successRate: (successRate * 100).toFixed(2) + '%',
          diskSpace: this.formatFileSize(diskSpace.available),
          lastBackup: lastBackup?.id,
        },
      };
    } catch (error) {
      return {
        status: 'ERROR',
        timestamp: new Date(),
        issues: [`Health check error: ${error.message}`],
      };
    }
  }

  /**
   * Collect metrics
   * جمع المقاييس
   */
  async collectMetrics() {
    try {
      const metadata = await this.readBackupMetadata();
      const backups = metadata.backups || [];

      const completedBackups = backups.filter(b => b.status === 'COMPLETED');
      const failedBackups = backups.filter(b => b.status === 'FAILED');

      const durations = completedBackups
        .map(b => b.duration || 0)
        .filter(d => d > 0);

      const sizes = completedBackups
        .map(b => b.size || 0)
        .filter(s => s > 0);

      return {
        totalBackups: backups.length,
        successfulBackups: completedBackups.length,
        failedBackups: failedBackups.length,
        successRate: backups.length > 0 ? completedBackups.length / backups.length : 0,
        averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 0,
        averageSize: sizes.length > 0 ? sizes.reduce((a, b) => a + b) / sizes.length : 0,
        totalSize: sizes.reduce((a, b) => a + b, 0),
        lastBackupTime: metadata.lastBackup ? new Date(backups.find(b => b.id === metadata.lastBackup)?.startTime) : null,
        oldestBackup: backups.length > 0 ? new Date(Math.min(...backups.map(b => new Date(b.startTime)))) : null,
        newestBackup: backups.length > 0 ? new Date(Math.max(...backups.map(b => new Date(b.startTime)))) : null,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error collecting metrics:', error.message);
      return null;
    }
  }

  /**
   * Get current metrics
   * الحصول على المقاييس الحالية
   */
  getMetrics() {
    return {
      ...this.metrics,
      healthStatus: this.healthStatus,
      activeAlerts: this.alerts.filter(a => !a.resolved).length,
      lastCheck: new Date(),
    };
  }

  /**
   * Validate backup integrity
   * التحقق من سلامة النسخة الاحتياطية
   */
  async validateBackup(backupId) {
    try {
      const metadata = await this.readBackupMetadata();
      const backup = metadata.backups.find(b => b.id === backupId);

      if (!backup) {
        return {
          valid: false,
          issues: ['Backup not found'],
        };
      }

      const issues = [];

      // Check if backup file exists
      const backupPath = path.join(this.backupDir, `${backupId}.gz`);
      try {
        await fs.access(backupPath);
      } catch {
        issues.push('Backup file not found');
      }

      // Check if backup is verified
      if (!backup.verified) {
        issues.push('Backup not verified');
      }

      // Check if backup is not corrupted
      if (backup.error) {
        issues.push(`Backup has error: ${backup.error}`);
      }

      // Check backup age
      const backupAge = Date.now() - new Date(backup.startTime);
      const daysOld = Math.floor(backupAge / (1000 * 60 * 60 * 24));
      if (daysOld > 30) {
        issues.push(`Backup is ${daysOld} days old`);
      }

      return {
        id: backupId,
        valid: issues.length === 0,
        issues,
        status: backup.status,
        age: daysOld,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Validation error: ${error.message}`],
      };
    }
  }

  /**
   * Create alert
   * إنشاء تنبيه
   */
  createAlert(alert) {
    const newAlert = {
      id: `alert-${Date.now()}`,
      timestamp: new Date(),
      resolved: false,
      ...alert,
    };

    this.alerts.push(newAlert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    this.emit('alert:created', newAlert);
    console.log(`⚠️  Alert [${newAlert.level}]: ${newAlert.message}`);

    return newAlert;
  }

  /**
   * Get active alerts
   * الحصول على التنبيهات النشطة
   */
  getActiveAlerts() {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Resolve alert
   * إغلاق التنبيه
   */
  resolveAlert(alertId, resolution = '') {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolution = resolution;
      this.emit('alert:resolved', alert);
      return alert;
    }
    return null;
  }

  /**
   * Process alerts
   * معالجة التنبيهات
   */
  async processAlerts() {
    try {
      const activeAlerts = this.getActiveAlerts();

      for (const alert of activeAlerts) {
        // Check if alert should be auto-resolved
        if (alert.autoResolve && alert.timestamp) {
          const age = Date.now() - new Date(alert.timestamp);
          if (age > 24 * 60 * 60 * 1000) {
            // Older than 24 hours
            this.resolveAlert(alert.id, 'Auto-resolved (age)');
          }
        }

        // Send notifications
        if (!alert.notified) {
          await this.sendNotification(alert);
          alert.notified = true;
        }
      }
    } catch (error) {
      console.error('Alert processing error:', error.message);
    }
  }

  /**
   * Send notification
   * إرسال إشعار
   */
  async sendNotification(alert) {
    try {
      // This can be integrated with email, SMS, or push notification services
      console.log(`📢 Notification: [${alert.level}] ${alert.message}`);
      this.emit('notification:sent', {
        alertId: alert.id,
        message: alert.message,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Notification error:', error.message);
    }
  }

  /**
   * Get backup report
   * الحصول على تقرير النسخ الاحتياطية
   */
  async getBackupReport(days = 30) {
    try {
      const metadata = await this.readBackupMetadata();
      const backups = metadata.backups || [];

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const relevantBackups = backups.filter(b => new Date(b.startTime) >= cutoffDate);

      const report = {
        period: `Last ${days} days`,
        startDate: cutoffDate,
        endDate: new Date(),
        totalBackups: relevantBackups.length,
        successfulBackups: relevantBackups.filter(b => b.status === 'COMPLETED').length,
        failedBackups: relevantBackups.filter(b => b.status === 'FAILED').length,
        skippedBackups: relevantBackups.filter(b => b.status === 'SKIPPED').length,
        successRate: relevantBackups.length > 0 
          ? (relevantBackups.filter(b => b.status === 'COMPLETED').length / relevantBackups.length * 100).toFixed(2) + '%'
          : 'N/A',
        averageSize: this.formatFileSize(
          relevantBackups.reduce((sum, b) => sum + (b.size || 0), 0) / (relevantBackups.length || 1)
        ),
        totalSize: this.formatFileSize(
          relevantBackups.reduce((sum, b) => sum + (b.size || 0), 0)
        ),
        averageDuration: Math.round(
          relevantBackups.reduce((sum, b) => sum + (b.duration || 0), 0) / (relevantBackups.length || 1) / 1000
        ) + 's',
        backups: relevantBackups.map(b => ({
          id: b.id,
          status: b.status,
          size: this.formatFileSize(b.size),
          duration: Math.round((b.duration || 0) / 1000) + 's',
          startTime: b.startTime,
          endTime: b.endTime,
        })),
      };

      return report;
    } catch (error) {
      console.error('Report generation error:', error.message);
      return null;
    }
  }

  /**
   * Helper: Check disk space
   */
  async checkDiskSpace() {
    // This is a simplified version - in production, use a proper disk space library
    return {
      total: 1000 * 1024 * 1024 * 1024, // 1TB (assumed)
      available: 500 * 1024 * 1024 * 1024, // 500GB (assumed)
    };
  }

  /**
   * Helper: Get last backup
   */
  async getLastBackup() {
    try {
      const metadata = await this.readBackupMetadata();
      const backups = metadata.backups || [];
      if (backups.length === 0) return null;
      return backups.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
    } catch {
      return null;
    }
  }

  /**
   * Helper: Calculate success rate
   */
  async calculateSuccessRate() {
    try {
      const metadata = await this.readBackupMetadata();
      const backups = metadata.backups || [];
      if (backups.length === 0) return 1;
      const successful = backups.filter(b => b.status === 'COMPLETED').length;
      return successful / backups.length;
    } catch {
      return 0;
    }
  }

  /**
   * Helper: Read backup metadata
   */
  async readBackupMetadata() {
    try {
      const metadataPath = path.join(this.backupDir, 'metadata.json');
      const content = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { version: '2.0', backups: [], lastBackup: null };
    }
  }

  /**
   * Helper: Update metrics
   */
  updateMetrics(newMetrics) {
    if (newMetrics) {
      this.metrics = {
        ...this.metrics,
        ...newMetrics,
        lastCheckTime: new Date(),
      };
    }
  }

  /**
   * Helper: Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Stop monitoring
   * إيقاف المراقبة
   */
  stop() {
    for (const [name, interval] of this.monitoringIntervals) {
      clearInterval(interval);
      console.log(`⏹️  Stopped monitoring: ${name}`);
    }
    this.monitoringIntervals.clear();
  }
}

module.exports = new BackupMonitoringService();
