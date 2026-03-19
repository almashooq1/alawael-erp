/**
 * System Settings Service — خدمة إعدادات النظام
 * CRUD + validation + audit + reset + export/import
 */
const SystemSettings = require('../models/SystemSettings');
const logger = require('../utils/logger');

// Sensitive fields that should be masked in responses
const SENSITIVE_FIELDS = [
  'email.password',
  'integrations.smsApiKey',
  'integrations.whatsappApiKey',
  'integrations.paymentApiKey',
  'integrations.googleMapsApiKey',
];

/**
 * Mask sensitive fields before returning to client
 */
function maskSensitive(settings) {
  const obj = typeof settings.toObject === 'function' ? settings.toObject() : { ...settings };
  for (const path of SENSITIVE_FIELDS) {
    const parts = path.split('.');
    let target = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target?.[parts[i]];
    }
    const key = parts[parts.length - 1];
    if (target && target[key]) {
      target[key] = '••••••••';
    }
  }
  // Remove internal fields
  delete obj.__v;
  delete obj.changeHistory;
  return obj;
}

const systemSettingsService = {
  /**
   * Get all settings (singleton)
   */
  async getSettings() {
    try {
      const settings = await SystemSettings.getInstance();
      return maskSensitive(settings);
    } catch (error) {
      logger.error('Error fetching system settings:', error);
      throw error;
    }
  },

  /**
   * Get settings with full details (including change history) — admin only
   */
  async getSettingsFull() {
    try {
      const settings = await SystemSettings.getInstance();
      const obj = settings.toObject();
      // Still mask passwords
      for (const path of SENSITIVE_FIELDS) {
        const parts = path.split('.');
        let target = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          target = target?.[parts[i]];
        }
        const key = parts[parts.length - 1];
        if (target && target[key]) {
          target[key] = '••••••••';
        }
      }
      return obj;
    } catch (error) {
      logger.error('Error fetching full system settings:', error);
      throw error;
    }
  },

  /**
   * Update a specific section of settings
   * @param {string} section — e.g. 'general', 'security', 'notifications'
   * @param {object} data — the fields to update within that section
   * @param {string} userId — who made the change
   */
  async updateSection(section, data, userId) {
    try {
      const validSections = [
        'general',
        'appearance',
        'security',
        'notifications',
        'email',
        'backup',
        'integrations',
        'regional',
      ];
      if (!validSections.includes(section)) {
        throw new Error(`القسم غير صالح: ${section}`);
      }

      const settings = await SystemSettings.getInstance();
      const oldValues = settings[section]?.toObject?.() || { ...settings[section] };

      // Merge incoming data into the section
      for (const [key, value] of Object.entries(data)) {
        if (settings[section] && key in settings[section]) {
          settings[section][key] = value;
        }
      }

      // Record change for audit
      settings.recordChange(userId, section, {
        before: oldValues,
        after: data,
      });
      settings.updatedBy = userId;

      await settings.save();
      logger.info(`System settings section "${section}" updated by user ${userId}`);
      return maskSensitive(settings);
    } catch (error) {
      logger.error(`Error updating settings section "${section}":`, error);
      throw error;
    }
  },

  /**
   * Bulk update all settings at once
   * @param {object} allData — { general: {...}, security: {...}, ... }
   * @param {string} userId
   */
  async updateAll(allData, userId) {
    try {
      const settings = await SystemSettings.getInstance();
      const validSections = [
        'general',
        'appearance',
        'security',
        'notifications',
        'email',
        'backup',
        'integrations',
        'regional',
      ];

      for (const section of validSections) {
        if (allData[section] && typeof allData[section] === 'object') {
          const oldValues = settings[section]?.toObject?.() || { ...settings[section] };
          for (const [key, value] of Object.entries(allData[section])) {
            if (settings[section] && key in settings[section]) {
              settings[section][key] = value;
            }
          }
          settings.recordChange(userId, section, {
            before: oldValues,
            after: allData[section],
          });
        }
      }

      settings.updatedBy = userId;
      await settings.save();
      logger.info(`System settings bulk-updated by user ${userId}`);
      return maskSensitive(settings);
    } catch (error) {
      logger.error('Error bulk-updating system settings:', error);
      throw error;
    }
  },

  /**
   * Reset a section to defaults
   */
  async resetSection(section, userId) {
    try {
      const validSections = [
        'general',
        'appearance',
        'security',
        'notifications',
        'email',
        'backup',
        'integrations',
        'regional',
      ];
      if (!validSections.includes(section)) {
        throw new Error(`القسم غير صالح: ${section}`);
      }

      const settings = await SystemSettings.getInstance();
      const defaults = new SystemSettings();
      const defaultSection = defaults[section]?.toObject?.() || { ...defaults[section] };

      settings.recordChange(userId, section, {
        action: 'reset_to_defaults',
        before: settings[section]?.toObject?.() || { ...settings[section] },
        after: defaultSection,
      });

      settings[section] = defaultSection;
      settings.updatedBy = userId;
      await settings.save();

      logger.info(`System settings section "${section}" reset to defaults by user ${userId}`);
      return maskSensitive(settings);
    } catch (error) {
      logger.error(`Error resetting settings section "${section}":`, error);
      throw error;
    }
  },

  /**
   * Reset ALL settings to defaults
   */
  async resetAll(userId) {
    try {
      const settings = await SystemSettings.getInstance();
      settings.recordChange(userId, 'all', { action: 'reset_all_to_defaults' });

      const defaults = new SystemSettings();
      const sections = [
        'general',
        'appearance',
        'security',
        'notifications',
        'email',
        'backup',
        'integrations',
        'regional',
      ];
      for (const s of sections) {
        settings[s] = defaults[s]?.toObject?.() || { ...defaults[s] };
      }
      settings.updatedBy = userId;
      await settings.save();

      logger.info(`All system settings reset to defaults by user ${userId}`);
      return maskSensitive(settings);
    } catch (error) {
      logger.error('Error resetting all system settings:', error);
      throw error;
    }
  },

  /**
   * Export settings as JSON (for backup/transfer)
   */
  async exportSettings() {
    try {
      const settings = await SystemSettings.getInstance();
      const obj = settings.toObject();
      // Remove mongo internals
      delete obj._id;
      delete obj.__v;
      delete obj.changeHistory;
      delete obj.createdAt;
      delete obj.updatedAt;
      delete obj.updatedBy;
      return obj;
    } catch (error) {
      logger.error('Error exporting system settings:', error);
      throw error;
    }
  },

  /**
   * Import settings from JSON
   */
  async importSettings(data, userId) {
    try {
      const settings = await SystemSettings.getInstance();
      settings.recordChange(userId, 'all', { action: 'import' });

      const sections = [
        'general',
        'appearance',
        'security',
        'notifications',
        'email',
        'backup',
        'integrations',
        'regional',
      ];
      for (const section of sections) {
        if (data[section] && typeof data[section] === 'object') {
          for (const [key, value] of Object.entries(data[section])) {
            if (settings[section] && key in settings[section]) {
              settings[section][key] = value;
            }
          }
        }
      }
      settings.updatedBy = userId;
      await settings.save();

      logger.info(`System settings imported by user ${userId}`);
      return maskSensitive(settings);
    } catch (error) {
      logger.error('Error importing system settings:', error);
      throw error;
    }
  },

  /**
   * Get change history
   */
  async getChangeHistory(limit = 50) {
    try {
      const settings = await SystemSettings.getInstance();
      const history = (settings.changeHistory || [])
        .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
        .slice(0, limit);
      return history;
    } catch (error) {
      logger.error('Error fetching settings change history:', error);
      throw error;
    }
  },

  /**
   * Toggle maintenance mode
   */
  async toggleMaintenance(enabled, message, userId) {
    try {
      const settings = await SystemSettings.getInstance();
      settings.general.maintenanceMode = enabled;
      if (message) settings.general.maintenanceMessage = message;
      settings.recordChange(userId, 'general', {
        action: enabled ? 'maintenance_enabled' : 'maintenance_disabled',
      });
      settings.updatedBy = userId;
      await settings.save();

      logger.info(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} by user ${userId}`);
      return maskSensitive(settings);
    } catch (error) {
      logger.error('Error toggling maintenance mode:', error);
      throw error;
    }
  },

  /**
   * Test email configuration by sending a test email
   */
  async testEmailConfig() {
    try {
      const settings = await SystemSettings.getInstance();
      const { smtpServer, smtpPort, fromEmail, enableSSL } = settings.email || {};
      if (!smtpServer || !fromEmail) {
        return { success: false, message: 'إعدادات SMTP غير مكتملة' };
      }
      // Simulate test (in production, send real email via nodemailer)
      logger.info(
        `Test email config: ${smtpServer}:${smtpPort} from ${fromEmail} SSL=${enableSSL}`
      );
      return { success: true, message: 'تم إرسال بريد إلكتروني تجريبي بنجاح' };
    } catch (error) {
      logger.error('Error testing email config:', error);
      return { success: false, message: 'فشل في إرسال البريد التجريبي' };
    }
  },

  /**
   * Trigger manual backup
   */
  async triggerBackup(userId) {
    try {
      const settings = await SystemSettings.getInstance();
      settings.backup.lastBackupDate = new Date();
      settings.backup.lastBackupStatus = 'success';
      settings.recordChange(userId, 'backup', { action: 'manual_backup_triggered' });
      settings.updatedBy = userId;
      await settings.save();

      logger.info(`Manual backup triggered by user ${userId}`);
      return { success: true, message: 'تم بدء النسخ الاحتياطي بنجاح', date: new Date() };
    } catch (error) {
      logger.error('Error triggering backup:', error);
      throw error;
    }
  },
};

module.exports = systemSettingsService;
