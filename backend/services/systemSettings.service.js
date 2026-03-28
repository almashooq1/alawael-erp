/**
 * SystemSettings Service — خدمة إعدادات النظام
 *
 * Singleton pattern: only one document exists in the collection.
 * GET returns the current settings (or creates defaults).
 * PUT updates specific sections.
 */

const SystemSettings = require('../models/SystemSettings');
const logger = require('../utils/logger');

class SystemSettingsService {
  /**
   * Get current system settings (upsert defaults if none exist).
   */
  async get() {
    let settings = await SystemSettings.findOne().lean();
    if (!settings) {
      settings = await SystemSettings.create({});
      logger.info('SystemSettings: created default singleton document');
      settings = settings.toObject();
    }
    return settings;
  }

  /**
   * Update system settings.
   * Accepts partial updates (sections like general, appearance, security, etc.)
   */
  async update(data, userId) {
    // Build $set with dot-notation for nested partial updates
    const setFields = {};
    for (const [section, values] of Object.entries(data)) {
      if (typeof values === 'object' && values !== null && !Array.isArray(values)) {
        for (const [key, val] of Object.entries(values)) {
          setFields[`${section}.${key}`] = val;
        }
      } else {
        setFields[section] = values;
      }
    }

    // Remove meta fields
    delete setFields._id;
    delete setFields.createdAt;
    delete setFields.updatedAt;

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      { $set: setFields },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    logger.info(
      `SystemSettings updated by user ${userId}: sections=${Object.keys(data).join(',')}`
    );
    return settings;
  }

  /**
   * Reset a specific section to defaults.
   */
  async resetSection(section) {
    const defaults = new SystemSettings();
    const defaultValues = defaults.toObject()[section];
    if (!defaultValues) {
      throw Object.assign(new Error(`القسم غير موجود: ${section}`), { status: 400 });
    }

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      { $set: { [section]: defaultValues } },
      { new: true, upsert: true }
    ).lean();

    logger.info(`SystemSettings: section "${section}" reset to defaults`);
    return settings;
  }

  /**
   * Toggle maintenance mode.
   */
  async toggleMaintenance(enabled, message) {
    const update = { 'general.maintenanceMode': enabled };
    if (message) update['general.maintenanceMessage'] = message;

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true }
    ).lean();
    logger.info(`Maintenance mode: ${enabled ? 'ON' : 'OFF'}`);
    return settings;
  }
}

module.exports = new SystemSettingsService();
