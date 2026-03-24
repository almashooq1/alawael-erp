/* eslint-disable no-unused-vars */
const AuditLog = require('../models/AuditLog');

// تسجيل حدث في السجل
async function logAction({ user, action, entity, entityId, details }) {
  try {
    await AuditLog.create({
      user: user?._id || user,
      action,
      entity,
      entityId,
      details,
      timestamp: new Date(),
    });
  } catch (err) {
    // يمكن تسجيل الخطأ في ملف لوج أو تجاهله
    process.stderr.write(`AuditLog error: ${err.message}\n`);
  }
}

module.exports = { logAction };
